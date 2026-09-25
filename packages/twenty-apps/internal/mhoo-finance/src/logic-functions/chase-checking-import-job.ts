import { createHash } from 'node:crypto';

import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineLogicFunction } from 'twenty-sdk/define';
import { enqueueJobs, RetryableLogicFunctionError } from 'twenty-sdk/logic-function';

import {
  CHASE_CHECKING_BATCH_KEY,
  CHASE_CHECKING_FACT_BATCH_SIZE,
  HASS_CHASE_CHECKING_ACCOUNT_ID,
  REVIEWED_CHASE_CHECKING_PERIODS,
  createChaseCheckingBatchState,
  nextChaseCheckingBatchCommand,
  parseChaseCheckingBatchState,
  transitionChaseCheckingBatch,
  type ChaseCheckingBatchCommand,
  type ChaseCheckingBatchEvent,
  type ChaseCheckingBatchState,
} from '../ingestion/chase-checking-batch-state';
import {
  CHASE_CHECKING_PDF_CONTROLS_PROFILE,
  normalizeChasePdfTextPageBoundaries,
  parseChaseCheckingPdfControlsText,
  parseChaseCheckingPdfRowsText,
  reconcileChaseCheckingPdfRows,
  type ChaseCheckingPdfControls,
  type ChasePdfTransactionRow,
} from '../ingestion/chase-pdf-controls';

export const CHASE_CHECKING_IMPORT_FUNCTION =
  'f15d64a4-f6d6-4c5e-a28b-1a7b8fa2e684';
export const CHASE_CHECKING_EXTRACTION_HANDOFF_PROFILE =
  CHASE_CHECKING_PDF_CONTROLS_PROFILE.id;
export const CHASE_CHECKING_EXTRACTION_HANDOFF_VERSION =
  CHASE_CHECKING_PDF_CONTROLS_PROFILE.version;
export const CHASE_CHECKING_IMPORT_FILE_FOLDER = 'files-field';

const MAX_READBACK_FACTS = 250;
const READBACK_PAGE_SIZE = 100;
const RETRY_LIMIT = 3;
const RETRY_DELAY_MS = 1_000;
const SHA256 = /^[0-9a-f]{64}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,200}$/;

type JsonRecord = Record<string, unknown>;

export type ChaseCheckingImportJob = Readonly<{
  batchKey: typeof CHASE_CHECKING_BATCH_KEY;
  periodIndex: number;
  expectedRevision: number;
}>;

export type ChaseCheckingNativeFile = Readonly<{
  fileId: string;
  label?: string | null;
  url?: string | null;
}>;

export type ChaseCheckingNativeArtifact = Readonly<{
  id: string;
  artifactKey: string;
  financialAccountId?: string | null;
  financialAccount?: { id?: string | null } | null;
  accountKey: string;
  period: string;
  sourceKind: string;
  mimeType: string;
  originalFileName: string;
  byteLength: number;
  contentHash: string;
  acquiredAt: string;
  acquiredBy: string;
  status?: string | null;
  rowCount?: number | null;
  statementControls?: string | null;
  originalFiles: readonly ChaseCheckingNativeFile[];
}>;

export type ChaseCheckingExtractionHandoff = Readonly<{
  id: string;
  handoffKey: string;
  sourceArtifact?: { id?: string | null } | null;
  sourcePdfHash: string;
  extractionHash: string;
  parserProfile: string;
  parserVersion: number;
  extractionMimeType: string;
  textByteLength: number;
  pageCount: number;
  extractionFiles: readonly ChaseCheckingNativeFile[];
}>;

export type ChaseCheckingNativeAccount = Readonly<{
  id: string;
  sourceKind: string;
}>;

export type ChaseCheckingParsedPeriod = Readonly<{
  artifact: ChaseCheckingNativeArtifact;
  account: ChaseCheckingNativeAccount;
  handoff: ChaseCheckingExtractionHandoff;
  controls: ChaseCheckingPdfControls;
  rows: readonly ChasePdfTransactionRow[];
  facts: readonly JsonRecord[];
  receiptKey: string;
  statementControls: string;
}>;

export type ChaseCheckingCoreClient = Readonly<{
  query: (request: unknown) => Promise<unknown>;
  mutation: (request: unknown) => Promise<unknown>;
}>;

export type ChaseCheckingBatchStateStore = Readonly<{
  get: (batchKey: string) => Promise<unknown | null>;
  create: (batchKey: string, value: ChaseCheckingBatchState) => Promise<void>;
  compareAndSet: (
    batchKey: string,
    expectedRevision: number,
    value: ChaseCheckingBatchState,
  ) => Promise<boolean>;
}>;

export type ChaseCheckingImportDependencies = Readonly<{
  core: ChaseCheckingCoreClient;
  stateStore: ChaseCheckingBatchStateStore;
  fetchFile: (file: ChaseCheckingNativeFile) => Promise<Uint8Array>;
  now: () => string;
  enqueue: (command: ChaseCheckingBatchCommand) => Promise<void>;
  /** Test-only source seam; production uses loadParsedPeriodFromNativeFiles. */
  loadPeriod?: (
    periodIndex: number,
    state: ChaseCheckingBatchState,
  ) => Promise<ChaseCheckingParsedPeriod>;
}>;

export type ChaseCheckingImportResult = Readonly<{
  status: 'ADVANCED' | 'STALE' | 'COMPLETE';
  stage: ChaseCheckingBatchState['stage'];
  revision: number;
  currentPeriodIndex: number;
  queued: boolean;
  nextCommand: ChaseCheckingBatchCommand | null;
}>;

export class ChaseCheckingImportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChaseCheckingImportValidationError';
  }
}

const hash = (bytes: Uint8Array): string =>
  createHash('sha256').update(bytes).digest('hex');

const stableUuid = (key: string): string => {
  const hex = hash(new TextEncoder().encode(key));
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

const amount = (minor: number): string =>
  `${minor < 0 ? '-' : ''}${Math.floor(Math.abs(minor) / 100)}.${String(Math.abs(minor) % 100).padStart(2, '0')}`;

const asRecord = (value: unknown, label: string): JsonRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ChaseCheckingImportValidationError(`${label} is missing.`);
  }
  return value as JsonRecord;
};

const asString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ChaseCheckingImportValidationError(`${label} is missing.`);
  }
  return value;
};

const asSafeId = (value: unknown, label: string): string => {
  const result = asString(value, label);
  if (!SAFE_ID.test(result)) {
    throw new ChaseCheckingImportValidationError(`${label} is invalid.`);
  }
  return result;
};

const asInteger = (value: unknown, label: string): number => {
  if (!Number.isSafeInteger(value)) {
    throw new ChaseCheckingImportValidationError(`${label} is invalid.`);
  }
  return value as number;
};

const firstNode = (result: unknown, field: string, label: string): JsonRecord => {
  const root = asRecord(result, label);
  const connection = asRecord(root[field], `${label}.${field}`);
  const edges = connection.edges;
  if (!Array.isArray(edges) || edges.length !== 1) {
    throw new ChaseCheckingImportValidationError(
      `${label} must resolve exactly one ${field} record.`,
    );
  }
  return asRecord(asRecord(edges[0], `${label}.${field}.edge`).node, `${label}.${field}.node`);
};

const optionalString = (value: unknown): string | null =>
  value === null || value === undefined ? null : typeof value === 'string' ? value : null;

const toNativeFile = (value: unknown, label: string): ChaseCheckingNativeFile => {
  const file = asRecord(value, label);
  return {
    fileId: asSafeId(file.fileId, `${label}.fileId`),
    label: optionalString(file.label),
    url: optionalString(file.url),
  };
};

const toNativeArtifact = (value: unknown): ChaseCheckingNativeArtifact => {
  const record = asRecord(value, 'SourceArtifact');
  const originalFiles = record.originalFiles;
  if (!Array.isArray(originalFiles)) {
    throw new ChaseCheckingImportValidationError('SourceArtifact original files are missing.');
  }
  const relation = record.financialAccount;
  const financialAccountId = optionalString(record.financialAccountId);
  const relatedAccountId = relation && typeof relation === 'object'
    ? optionalString((relation as JsonRecord).id)
    : null;
  return {
    id: asSafeId(record.id, 'SourceArtifact ID'),
    artifactKey: asString(record.artifactKey, 'SourceArtifact key'),
    financialAccountId,
    financialAccount: relatedAccountId ? { id: relatedAccountId } : null,
    accountKey: asString(record.accountKey, 'SourceArtifact account key'),
    period: asString(record.period, 'SourceArtifact period'),
    sourceKind: asString(record.sourceKind, 'SourceArtifact source kind'),
    mimeType: asString(record.mimeType, 'SourceArtifact MIME type'),
    originalFileName: asString(record.originalFileName, 'SourceArtifact filename'),
    byteLength: asInteger(record.byteLength, 'SourceArtifact byte length'),
    contentHash: asString(record.contentHash, 'SourceArtifact content hash'),
    acquiredAt: asString(record.acquiredAt, 'SourceArtifact acquiredAt'),
    acquiredBy: asString(record.acquiredBy, 'SourceArtifact acquiredBy'),
    status: optionalString(record.status),
    rowCount: record.rowCount === null || record.rowCount === undefined ? null : asInteger(record.rowCount, 'SourceArtifact row count'),
    statementControls: optionalString(record.statementControls),
    originalFiles: originalFiles.map((file, index) => toNativeFile(file, `SourceArtifact originalFiles[${index}]`)),
  };
};

const toNativeAccount = (value: unknown): ChaseCheckingNativeAccount => {
  const record = asRecord(value, 'FinancialAccount');
  return {
    id: asSafeId(record.id, 'FinancialAccount ID'),
    sourceKind: asString(record.sourceKind, 'FinancialAccount source kind'),
  };
};

const toExtractionHandoff = (value: unknown): ChaseCheckingExtractionHandoff => {
  const record = asRecord(value, 'Chase PDF extraction handoff');
  const extractionFiles = record.extractionFiles;
  if (!Array.isArray(extractionFiles)) {
    throw new ChaseCheckingImportValidationError('Extraction handoff File is missing.');
  }
  const sourceArtifact = record.sourceArtifact;
  return {
    id: asSafeId(record.id, 'Extraction handoff ID'),
    handoffKey: asString(record.handoffKey, 'Extraction handoff key'),
    sourceArtifact: sourceArtifact && typeof sourceArtifact === 'object'
      ? { id: optionalString((sourceArtifact as JsonRecord).id) }
      : null,
    sourcePdfHash: asString(record.sourcePdfHash, 'Extraction source PDF hash'),
    extractionHash: asString(record.extractionHash, 'Extraction text hash'),
    parserProfile: asString(record.parserProfile, 'Extraction parser profile'),
    parserVersion: asInteger(record.parserVersion, 'Extraction parser version'),
    extractionMimeType: asString(record.extractionMimeType, 'Extraction MIME type'),
    textByteLength: asInteger(record.textByteLength, 'Extraction text byte length'),
    pageCount: asInteger(record.pageCount, 'Extraction page count'),
    extractionFiles: extractionFiles.map((file, index) => toNativeFile(file, `Extraction files[${index}]`)),
  };
};

const fileBytesAsUtf8 = (bytes: Uint8Array): string => {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return text.startsWith('\uFEFF') ? text.slice(1) : text;
  } catch {
    throw new ChaseCheckingImportValidationError('Extraction handoff is not valid UTF-8.');
  }
};

const validateJob = (value: unknown): ChaseCheckingImportJob => {
  const payload = asRecord(value, 'Chase checking import job');
  if (payload.batchKey !== CHASE_CHECKING_BATCH_KEY ||
      !Number.isSafeInteger(payload.periodIndex) ||
      (payload.periodIndex as number) < 0 ||
      (payload.periodIndex as number) >= REVIEWED_CHASE_CHECKING_PERIODS.length ||
      !Number.isSafeInteger(payload.expectedRevision) ||
      (payload.expectedRevision as number) < 0) {
    throw new ChaseCheckingImportValidationError('Chase checking import job payload is invalid.');
  }
  return payload as unknown as ChaseCheckingImportJob;
};

const handoffKeyFor = (contentHash: string): string =>
  `chase-pdf-extraction:${contentHash}`;

const receiptKeyFor = (artifactKey: string, contentHash: string): string =>
  `receipt:${HASS_CHASE_CHECKING_ACCOUNT_ID}:${artifactKey}:${contentHash}:${CHASE_CHECKING_PDF_CONTROLS_PROFILE.id}@${CHASE_CHECKING_PDF_CONTROLS_PROFILE.version}`;

const sourceArtifactQuery = (filter: Record<string, unknown>) => ({
  sourceArtifacts: {
    __args: { first: 2, filter },
    edges: {
      node: {
        id: true,
        artifactKey: true,
        accountKey: true,
        financialAccount: { id: true },
        period: true,
        sourceKind: true,
        mimeType: true,
        originalFileName: true,
        byteLength: true,
        contentHash: true,
        acquiredAt: true,
        acquiredBy: true,
        status: true,
        rowCount: true,
        statementControls: true,
        originalFiles: { fileId: true, label: true, url: true },
      },
    },
  },
});

const accountQuery = (accountId: string) => ({
  financialAccounts: {
    __args: { first: 2, filter: { id: { eq: accountId } } },
    edges: { node: { id: true, sourceKind: true } },
  },
});

const extractionQuery = (handoffKey: string) => ({
  chasePdfExtractions: {
    __args: { first: 2, filter: { handoffKey: { eq: handoffKey } } },
    edges: {
      node: {
        id: true,
        handoffKey: true,
        sourceArtifact: { id: true },
        sourcePdfHash: true,
        extractionHash: true,
        parserProfile: true,
        parserVersion: true,
        extractionMimeType: true,
        textByteLength: true,
        pageCount: true,
        extractionFiles: { fileId: true, label: true, url: true },
      },
    },
  },
});

const batchStateQuery = (batchKey: string) => ({
  chaseCheckingBatchStates: {
    __args: { first: 2, filter: { batchKey: { eq: batchKey } } },
    edges: {
      node: {
        id: true,
        batchKey: true,
        revision: true,
        serializedState: true,
      },
    },
  },
});

const parsePersistedBatchState = (value: unknown): ChaseCheckingBatchState => {
  const record = asRecord(value, 'Chase checking batch state record');
  if (asString(record.batchKey, 'Chase checking batch state key') !== CHASE_CHECKING_BATCH_KEY) {
    throw new ChaseCheckingImportValidationError('Persisted batch record key is not the reviewed batch.');
  }
  const revision = asInteger(record.revision, 'Chase checking batch state revision');
  let serialized: unknown;
  try {
    serialized = JSON.parse(asString(record.serializedState, 'Chase checking serialized state'));
  } catch {
    throw new ChaseCheckingImportValidationError('Persisted batch serialized state is not valid JSON.');
  }
  const state = parseChaseCheckingBatchState(serialized);
  if (state.revision !== revision) {
    throw new ChaseCheckingImportValidationError('Persisted batch revision does not match its serialized state.');
  }
  return state;
};

const persistedBatchStatePayload = (state: ChaseCheckingBatchState): JsonRecord => ({
  batchKey: state.batchKey,
  revision: state.revision,
  serializedState: JSON.stringify(state),
});

export const createNativeChaseCheckingBatchStateStore = (
  core: ChaseCheckingCoreClient,
): ChaseCheckingBatchStateStore => ({
  get: async (batchKey) => {
    const result = await core.query(batchStateQuery(batchKey));
    const root = asRecord(result, 'Chase checking batch state lookup');
    const connection = asRecord(root.chaseCheckingBatchStates, 'Chase checking batch state connection');
    if (!Array.isArray(connection.edges) || connection.edges.length > 1) {
      throw new ChaseCheckingImportValidationError('Chase checking batch state key is not unique.');
    }
    return connection.edges.length === 0
      ? null
      : parsePersistedBatchState(asRecord(asRecord(connection.edges[0], 'Chase checking batch state edge').node, 'Chase checking batch state node'));
  },
  create: async (batchKey, state) => {
    const result = asRecord(await core.mutation({
      createChaseCheckingBatchState: {
        __args: { data: persistedBatchStatePayload(state) },
        id: true,
        batchKey: true,
        revision: true,
      },
    }), 'Chase checking batch state creation');
    const created = asRecord(result.createChaseCheckingBatchState, 'Chase checking batch state creation result');
    if (created.batchKey !== batchKey || created.revision !== state.revision) {
      throw new ChaseCheckingImportValidationError('Created batch state did not match the reviewed state.');
    }
  },
  compareAndSet: async (batchKey, expectedRevision, state) => {
    const result = asRecord(await core.mutation({
      updateChaseCheckingBatchStates: {
        __args: {
          data: persistedBatchStatePayload(state),
          filter: { batchKey: { eq: batchKey }, revision: { eq: expectedRevision } },
        },
        id: true,
        batchKey: true,
        revision: true,
      },
    }), 'Chase checking batch state compare-and-set');
    const updated = result.updateChaseCheckingBatchStates;
    if (!Array.isArray(updated)) {
      throw new ChaseCheckingImportValidationError('Batch state compare-and-set did not return a record list.');
    }
    if (updated.length > 1) {
      throw new ChaseCheckingImportValidationError('Batch state compare-and-set matched more than one record.');
    }
    if (updated.length === 0) return false;
    const record = asRecord(updated[0], 'Chase checking batch state compare-and-set record');
    if (record.batchKey !== batchKey || record.revision !== state.revision) {
      throw new ChaseCheckingImportValidationError('Batch state compare-and-set readback differs from the requested state.');
    }
    return true;
  },
});

const loadParsedPeriodFromNativeFiles = async (
  periodIndex: number,
  state: ChaseCheckingBatchState,
  dependencies: Pick<ChaseCheckingImportDependencies, 'core' | 'fetchFile'>,
): Promise<ChaseCheckingParsedPeriod> => {
  const expected = REVIEWED_CHASE_CHECKING_PERIODS[periodIndex];
  const persistedPeriod = state.periods[periodIndex];
  if (!persistedPeriod) throw new ChaseCheckingImportValidationError('Batch period is missing.');

  const artifact = toNativeArtifact(firstNode(
    await dependencies.core.query(sourceArtifactQuery(
      state.stage === 'PREFLIGHT'
        ? { contentHash: { eq: expected.contentHash } }
        : { id: { eq: persistedPeriod.sourceArtifactId } },
    )),
    'sourceArtifacts',
    'SourceArtifact lookup',
  ));
  const accountId = artifact.financialAccount?.id ?? artifact.financialAccountId;
  if (accountId !== HASS_CHASE_CHECKING_ACCOUNT_ID) {
    throw new ChaseCheckingImportValidationError('SourceArtifact is not bound to the reviewed BANK account.');
  }
  const account = toNativeAccount(firstNode(
    await dependencies.core.query(accountQuery(HASS_CHASE_CHECKING_ACCOUNT_ID)),
    'financialAccounts',
    'FinancialAccount lookup',
  ));
  if (account.id !== HASS_CHASE_CHECKING_ACCOUNT_ID || account.sourceKind !== 'BANK' || artifact.sourceKind !== 'BANK') {
    throw new ChaseCheckingImportValidationError('CARD or non-reviewed account binding detected.');
  }
  if (artifact.mimeType !== 'application/pdf' || artifact.originalFiles.length !== 1 || (persistedPeriod.sourceFileId !== null && artifact.originalFiles[0]!.fileId !== persistedPeriod.sourceFileId)) {
    throw new ChaseCheckingImportValidationError('SourceArtifact must retain exactly the persisted native PDF File.');
  }
  if (artifact.contentHash !== expected.contentHash || !SHA256.test(artifact.contentHash)) {
    throw new ChaseCheckingImportValidationError('SourceArtifact hash differs from the reviewed PDF manifest.');
  }
  if (artifact.period !== expected.period && artifact.period !== `${expected.periodStart}/${expected.periodEnd}`) {
    throw new ChaseCheckingImportValidationError('SourceArtifact period differs from the reviewed PDF manifest.');
  }

  const pdfBytes = await dependencies.fetchFile(artifact.originalFiles[0]!);
  if (pdfBytes.byteLength !== artifact.byteLength || hash(pdfBytes) !== artifact.contentHash) {
    throw new ChaseCheckingImportValidationError('Native PDF File bytes do not match SourceArtifact custody.');
  }

  const handoff = toExtractionHandoff(firstNode(
    await dependencies.core.query(extractionQuery(handoffKeyFor(expected.contentHash))),
    'chasePdfExtractions',
    'Extraction handoff lookup',
  ));
  if (handoff.handoffKey !== handoffKeyFor(expected.contentHash) || handoff.sourceArtifact?.id !== artifact.id || handoff.sourcePdfHash !== artifact.contentHash || handoff.parserProfile !== CHASE_CHECKING_EXTRACTION_HANDOFF_PROFILE || handoff.parserVersion !== CHASE_CHECKING_EXTRACTION_HANDOFF_VERSION || handoff.extractionMimeType !== 'text/plain' || handoff.extractionFiles.length !== 1) {
    throw new ChaseCheckingImportValidationError('Extraction handoff is not bound to the reviewed PDF and parser profile.');
  }
  const extractionBytes = await dependencies.fetchFile(handoff.extractionFiles[0]!);
  if (extractionBytes.byteLength !== handoff.textByteLength || hash(extractionBytes) !== handoff.extractionHash) {
    throw new ChaseCheckingImportValidationError('Retained extraction File bytes do not match its handoff hash.');
  }
  const normalizedText = normalizeChasePdfTextPageBoundaries(fileBytesAsUtf8(extractionBytes));
  const controls = parseChaseCheckingPdfControlsText(normalizedText);
  if (controls.profileId !== CHASE_CHECKING_PDF_CONTROLS_PROFILE.id || controls.profileVersion !== CHASE_CHECKING_PDF_CONTROLS_PROFILE.version || controls.periodStart !== expected.periodStart || controls.periodEnd !== expected.periodEnd || controls.expectedPageCount !== handoff.pageCount || controls.reportedTransactionCount !== expected.expectedRows) {
    throw new ChaseCheckingImportValidationError('Extraction controls do not match the reviewed period manifest.');
  }
  const rows = parseChaseCheckingPdfRowsText(normalizedText, {
    periodStart: controls.periodStart,
    periodEnd: controls.periodEnd,
  });
  reconcileChaseCheckingPdfRows(controls, rows);
  if (rows.length !== expected.expectedRows) {
    throw new ChaseCheckingImportValidationError('Parsed row count differs from the reviewed period manifest.');
  }

  const facts = rows.map((row, index) => {
    const sourceRecordId = `chase-pdf:${row.sourceLine}:${index + 1}`;
    const factKey = `fact-${artifact.accountKey}-${artifact.artifactKey}-${sourceRecordId}-r1`;
    return {
      id: stableUuid(factKey),
      factKey,
      sourceRowKey: `pdf:text-line:${row.sourceLine}`,
      sourceLocation: `pdf:text-line:${row.sourceLine}`,
      sourceAmount: amount(row.amountMinor),
      sourceSignConvention: 'SIGNED_AMOUNT_POSITIVE_INFLOW',
      transactionDate: row.date,
      postedDate: row.date,
      rawValues: JSON.stringify({
        category: row.category,
        extractedTextSha256: handoff.extractionHash,
      }),
      artifactId: artifact.id,
      financialAccountId: HASS_CHASE_CHECKING_ACCOUNT_ID,
      period: row.date.slice(0, 7),
      amount: {
        amountMicros: (BigInt(row.amountMinor) * 10_000n).toString(),
        currencyCode: 'USD',
      },
      exactAmountMinor: String(row.amountMinor),
      sourceCurrency: 'USD',
      classification: 'UNCLASSIFIED',
      status: 'POSTED',
      revision: 1,
      includedInTotals: false,
      exclusionReason: 'SOURCE_UNRECONCILED',
      description: row.description,
    } satisfies JsonRecord;
  });

  return {
    artifact,
    account,
    handoff,
    controls,
    rows,
    facts,
    receiptKey: receiptKeyFor(artifact.artifactKey, artifact.contentHash),
    statementControls: JSON.stringify({
      periodStart: controls.periodStart,
      periodEnd: controls.periodEnd,
      openingBalanceMinor: controls.openingBalanceMinor,
      closingBalanceMinor: controls.closingBalanceMinor,
    }),
  };
};

const readFacts = async (
  core: ChaseCheckingCoreClient,
  artifactId: string,
): Promise<readonly JsonRecord[]> => {
  const result: JsonRecord[] = [];
  const seenCursors = new Set<string>();
  let after: string | undefined;
  for (;;) {
    const page = asRecord(await core.query({
      financeFacts: {
        __args: {
          first: READBACK_PAGE_SIZE,
          after,
          filter: { artifactId: { eq: artifactId } },
        },
        edges: {
          node: {
            id: true,
            factKey: true,
            artifactId: true,
            financialAccountId: true,
            financialAccount: { id: true },
            sourceAmount: true,
            sourceRowKey: true,
            sourceLocation: true,
            sourceSignConvention: true,
            transactionDate: true,
            postedDate: true,
            rawValues: true,
            period: true,
            exactAmountMinor: true,
            sourceCurrency: true,
            amount: { amountMicros: true, currencyCode: true },
            classification: true,
            status: true,
            revision: true,
            includedInTotals: true,
            exclusionReason: true,
            description: true,
          },
        },
        pageInfo: { hasNextPage: true, endCursor: true },
      },
    }), 'Finance fact readback');
    const connection = asRecord(page.financeFacts, 'Finance fact readback connection');
    if (!Array.isArray(connection.edges)) throw new ChaseCheckingImportValidationError('Finance fact readback edges are missing.');
    for (const edge of connection.edges) result.push(asRecord(asRecord(edge, 'Finance fact edge').node, 'Finance fact node'));
    if (result.length > MAX_READBACK_FACTS) throw new ChaseCheckingImportValidationError(`Finance fact readback exceeds ${MAX_READBACK_FACTS} facts.`);
    const pageInfo = asRecord(connection.pageInfo, 'Finance fact readback page info');
    if (pageInfo.hasNextPage !== true) return result;
    const cursor = pageInfo.endCursor;
    if (typeof cursor !== 'string' || cursor.length === 0 || seenCursors.has(cursor)) throw new ChaseCheckingImportValidationError('Finance fact readback cursor is missing or repeated.');
    seenCursors.add(cursor);
    after = cursor;
  }
};

const assertFactsExact = (
  actual: readonly JsonRecord[],
  expected: readonly JsonRecord[],
  expectedCount: number,
): void => {
  if (actual.length !== expectedCount) throw new ChaseCheckingImportValidationError(`Finance fact readback count ${actual.length} does not equal ${expectedCount}.`);
  const expectedByKey = new Map(expected.map((fact) => [String(fact.factKey), fact]));
  const expectedPrefix = expected.slice(0, expectedCount);
  const seen = new Set<string>();
  for (const fact of actual) {
    const key = asString(fact.factKey, 'Finance fact key');
    if (seen.has(key)) throw new ChaseCheckingImportValidationError('Finance fact readback contains duplicate keys.');
    seen.add(key);
    const candidate = expectedByKey.get(key);
    const relation = fact.financialAccount;
    const actualAccountId = typeof fact.financialAccountId === 'string'
      ? fact.financialAccountId
      : relation && typeof relation === 'object'
        ? (relation as JsonRecord).id
        : undefined;
    const actualAmount = fact.amount && typeof fact.amount === 'object'
      ? fact.amount as JsonRecord
      : undefined;
    const expectedAmount = candidate?.amount && typeof candidate.amount === 'object'
      ? candidate.amount as JsonRecord
      : undefined;
    const exactFields = [
      'sourceRowKey', 'sourceLocation', 'sourceAmount', 'sourceSignConvention',
      'transactionDate', 'postedDate', 'rawValues', 'period', 'classification',
      'status', 'revision', 'includedInTotals', 'exclusionReason', 'description',
    ];
    if (!candidate || fact.artifactId !== candidate.artifactId || actualAccountId !== HASS_CHASE_CHECKING_ACCOUNT_ID ||
        exactFields.some((field) => fact[field] !== candidate[field]) ||
        fact.exactAmountMinor !== candidate.exactAmountMinor || fact.sourceCurrency !== 'USD' ||
        actualAmount?.amountMicros !== expectedAmount?.amountMicros || actualAmount?.currencyCode !== 'USD') {
      throw new ChaseCheckingImportValidationError('Finance fact readback contains an unexpected or conflicting fact.');
    }
  }
  for (const fact of expectedPrefix) {
    if (!seen.has(String(fact.factKey))) {
      throw new ChaseCheckingImportValidationError('Finance fact readback omitted a committed prefix fact.');
    }
  }
};

const upsertFactChunk = async (
  core: ChaseCheckingCoreClient,
  facts: readonly JsonRecord[],
): Promise<void> => {
  if (facts.length < 1 || facts.length > CHASE_CHECKING_FACT_BATCH_SIZE) throw new ChaseCheckingImportValidationError('Fact chunk size is outside the bounded limit.');
  const result = asRecord(await core.mutation({
    createFinanceFacts: {
      __args: { data: facts, upsert: true },
      id: true,
      factKey: true,
    },
  }), 'Finance fact upsert');
  const saved = result.createFinanceFacts;
  if (!Array.isArray(saved) || saved.length !== facts.length) throw new ChaseCheckingImportValidationError('Finance fact upsert did not acknowledge the complete chunk.');
};

const readReceipt = async (
  core: ChaseCheckingCoreClient,
  receiptKey: string,
): Promise<JsonRecord | null> => {
  const result = asRecord(await core.query({
    importReceipts: {
      __args: { first: 2, filter: { receiptKey: { eq: receiptKey } } },
      edges: {
        node: {
          id: true,
          receiptKey: true,
          status: true,
          importedRows: true,
          deduplicatedRows: true,
          rejectedRows: true,
          parserProfile: true,
          sourceRevision: true,
          contentHash: true,
          artifactId: true,
        },
      },
    },
  }), 'Import receipt readback');
  const connection = asRecord(result.importReceipts, 'Import receipt connection');
  if (!Array.isArray(connection.edges) || connection.edges.length > 1) throw new ChaseCheckingImportValidationError('Import receipt key is not unique.');
  return connection.edges.length === 0 ? null : asRecord(asRecord(connection.edges[0], 'Import receipt edge').node, 'Import receipt node');
};

const receiptProjection = (period: ChaseCheckingParsedPeriod): JsonRecord => ({
  id: stableUuid(period.receiptKey),
  receiptKey: period.receiptKey,
  status: 'IMPORTED',
  attempts: 1,
  importedRows: period.rows.length,
  deduplicatedRows: 0,
  sourceRevision: 1,
  contentHash: period.artifact.contentHash,
  checkpoint: null,
  rejectedRows: 0,
  parserProfile: `${CHASE_CHECKING_PDF_CONTROLS_PROFILE.id}@${CHASE_CHECKING_PDF_CONTROLS_PROFILE.version}`,
  artifactId: period.artifact.id,
});

const assertReceiptExact = (actual: JsonRecord | null, expected: JsonRecord): string => {
  if (!actual || actual.receiptKey !== expected.receiptKey || actual.status !== 'IMPORTED' || actual.importedRows !== expected.importedRows || actual.deduplicatedRows !== expected.deduplicatedRows || actual.rejectedRows !== expected.rejectedRows || actual.parserProfile !== expected.parserProfile || actual.sourceRevision !== expected.sourceRevision || actual.contentHash !== expected.contentHash || actual.artifactId !== expected.artifactId) {
    throw new ChaseCheckingImportValidationError('Import receipt readback does not match the reviewed period.');
  }
  return asSafeId(actual.id, 'Import receipt ID');
};

const createOrVerifyReceipt = async (
  core: ChaseCheckingCoreClient,
  period: ChaseCheckingParsedPeriod,
): Promise<string> => {
  const expected = receiptProjection(period);
  let actual = await readReceipt(core, period.receiptKey);
  if (!actual) {
    const created = asRecord(await core.mutation({
      createImportReceipt: {
        __args: { data: expected, upsert: true },
        id: true,
        receiptKey: true,
      },
    }), 'Import receipt creation');
    if (!created.createImportReceipt) throw new ChaseCheckingImportValidationError('Import receipt creation was not acknowledged.');
    actual = await readReceipt(core, period.receiptKey);
  }
  return assertReceiptExact(actual, expected);
};

const persistArtifactFinalize = async (
  core: ChaseCheckingCoreClient,
  period: ChaseCheckingParsedPeriod,
): Promise<void> => {
  const response = asRecord(await core.mutation({
    updateSourceArtifact: {
      __args: {
        id: period.artifact.id,
        data: {
          status: 'IMPORTED',
          rowCount: period.rows.length,
          statementControls: period.statementControls,
        },
      },
      id: true,
      status: true,
      rowCount: true,
      statementControls: true,
    },
  }), 'SourceArtifact finalize');
  const updated = asRecord(response.updateSourceArtifact, 'SourceArtifact finalize readback');
  if (updated.id !== period.artifact.id || updated.status !== 'IMPORTED' || updated.rowCount !== period.rows.length || updated.statementControls !== period.statementControls) {
    throw new ChaseCheckingImportValidationError('SourceArtifact finalize was not acknowledged exactly.');
  }
  const reread = toNativeArtifact(firstNode(
    await core.query(sourceArtifactQuery({ id: { eq: period.artifact.id } })),
    'sourceArtifacts',
    'SourceArtifact finalize reread',
  ));
  if (reread.id !== period.artifact.id || reread.status !== 'IMPORTED' || reread.rowCount !== period.rows.length || reread.statementControls !== period.statementControls) {
    throw new ChaseCheckingImportValidationError('SourceArtifact finalize reread differs from the committed update.');
  }
};

const validateCommandForJob = (
  state: ChaseCheckingBatchState,
  job: ChaseCheckingImportJob,
): ChaseCheckingBatchCommand | null => {
  const command = nextChaseCheckingBatchCommand(state);
  if (state.revision !== job.expectedRevision || state.currentPeriodIndex !== job.periodIndex) return command;
  if (!command || command.periodIndex !== job.periodIndex || command.expectedRevision !== job.expectedRevision) {
    throw new ChaseCheckingImportValidationError('Persisted command does not match the import job.');
  }
  return command;
};

const dispatch = async (
  state: ChaseCheckingBatchState,
  dependencies: Pick<ChaseCheckingImportDependencies, 'enqueue'>,
): Promise<boolean> => {
  const command = nextChaseCheckingBatchCommand(state);
  if (!command) return false;
  await dependencies.enqueue(command);
  return true;
};

const persistTransition = async (
  job: ChaseCheckingImportJob,
  event: ChaseCheckingBatchEvent,
  dependencies: ChaseCheckingImportDependencies,
): Promise<ChaseCheckingImportResult> => {
  const currentRaw = await dependencies.stateStore.get(CHASE_CHECKING_BATCH_KEY);
  if (!currentRaw) throw new ChaseCheckingImportValidationError('Chase checking batch state is not initialized.');
  const current = parseChaseCheckingBatchState(currentRaw);
  if (current.revision !== job.expectedRevision || current.currentPeriodIndex !== job.periodIndex) {
    const queued = await dispatch(current, dependencies);
    return {
      status: current.stage === 'COMPLETE' ? 'COMPLETE' : 'STALE',
      stage: current.stage,
      revision: current.revision,
      currentPeriodIndex: current.currentPeriodIndex,
      queued,
      nextCommand: nextChaseCheckingBatchCommand(current),
    };
  }
  const next = transitionChaseCheckingBatch(current, job.expectedRevision, event, dependencies.now());
  // updateMany with both batchKey and revision is the durable CAS boundary.
  // KV get/set is intentionally not used: it cannot exclude a concurrent worker.
  const applied = await dependencies.stateStore.compareAndSet(
    CHASE_CHECKING_BATCH_KEY,
    job.expectedRevision,
    next,
  );
  const confirmedRaw = await dependencies.stateStore.get(CHASE_CHECKING_BATCH_KEY);
  if (!confirmedRaw) throw new ChaseCheckingImportValidationError('Persisted batch state disappeared after transition.');
  const confirmed = parseChaseCheckingBatchState(confirmedRaw);
  if (!applied && confirmed.revision === job.expectedRevision) {
    throw new RetryableLogicFunctionError('Batch state compare-and-set did not commit; retry the same command.');
  }
  if (!applied) {
    const queued = await dispatch(confirmed, dependencies);
    return {
      status: confirmed.stage === 'COMPLETE' ? 'COMPLETE' : 'STALE',
      stage: confirmed.stage,
      revision: confirmed.revision,
      currentPeriodIndex: confirmed.currentPeriodIndex,
      queued,
      nextCommand: nextChaseCheckingBatchCommand(confirmed),
    };
  }
  if (confirmed.revision !== next.revision || confirmed.stage !== next.stage || confirmed.currentPeriodIndex !== next.currentPeriodIndex) {
    throw new ChaseCheckingImportValidationError('Persisted batch transition readback differs from the committed transition.');
  }
  const queued = await dispatch(confirmed, dependencies);
  return {
    status: confirmed.stage === 'COMPLETE' ? 'COMPLETE' : 'ADVANCED',
    stage: confirmed.stage,
    revision: confirmed.revision,
    currentPeriodIndex: confirmed.currentPeriodIndex,
    queued,
    nextCommand: nextChaseCheckingBatchCommand(confirmed),
  };
};

export const runChaseCheckingImportJob = async (
  rawJob: unknown,
  dependencies: ChaseCheckingImportDependencies,
): Promise<ChaseCheckingImportResult> => {
  const job = validateJob(rawJob);
  let stateRaw = await dependencies.stateStore.get(CHASE_CHECKING_BATCH_KEY);
  if (!stateRaw) {
    if (job.periodIndex !== 0 || job.expectedRevision !== 0) {
      throw new ChaseCheckingImportValidationError('Chase checking batch state must start at period 0 revision 0.');
    }
    const initial = createChaseCheckingBatchState(dependencies.now());
    try {
      await dependencies.stateStore.create(CHASE_CHECKING_BATCH_KEY, initial);
    } catch (error) {
      // A competing first worker may have won the unique batchKey insert.
      // Re-read and accept only the exact persisted reviewed state.
      stateRaw = await dependencies.stateStore.get(CHASE_CHECKING_BATCH_KEY);
      if (!stateRaw) throw error;
    }
    stateRaw ??= await dependencies.stateStore.get(CHASE_CHECKING_BATCH_KEY);
    if (!stateRaw) throw new ChaseCheckingImportValidationError('Initial Chase checking batch state readback failed.');
  }
  const state = parseChaseCheckingBatchState(stateRaw);
  const command = validateCommandForJob(state, job);
  if (state.revision !== job.expectedRevision || state.currentPeriodIndex !== job.periodIndex) {
    const queued = await dispatch(state, dependencies);
    return {
      status: state.stage === 'COMPLETE' ? 'COMPLETE' : 'STALE',
      stage: state.stage,
      revision: state.revision,
      currentPeriodIndex: state.currentPeriodIndex,
      queued,
      nextCommand: command,
    };
  }
  if (!command) throw new ChaseCheckingImportValidationError('Active Chase checking job has no command.');
  const period = dependencies.loadPeriod
    ? await dependencies.loadPeriod(job.periodIndex, state)
    : await loadParsedPeriodFromNativeFiles(job.periodIndex, state, dependencies);
  const currentPeriod = state.periods[job.periodIndex];
  if (!currentPeriod || (currentPeriod.sourceArtifactId !== null && period.artifact.id !== currentPeriod.sourceArtifactId) || period.artifact.contentHash !== currentPeriod.contentHash || period.rows.length !== currentPeriod.expectedRows) {
    throw new ChaseCheckingImportValidationError('Loaded period does not match persisted batch state.');
  }

  switch (state.stage) {
    case 'PREFLIGHT':
      return persistTransition(job, {
        kind: 'preflight',
        periodIndex: job.periodIndex,
        artifactId: period.artifact.id,
        fileId: period.artifact.originalFiles[0]!.fileId,
        financialAccountId: period.account.id,
        sourceKind: period.artifact.sourceKind === 'BANK' ? 'BANK' : 'CARD',
        mimeType: period.artifact.mimeType,
        contentHash: period.artifact.contentHash,
        periodStart: period.controls.periodStart,
        periodEnd: period.controls.periodEnd,
        rowCount: period.rows.length,
      }, dependencies);
    case 'FACTS': {
      const offset = command.factOffset ?? currentPeriod.nextFactOffset;
      const chunk = period.facts.slice(offset, offset + CHASE_CHECKING_FACT_BATCH_SIZE);
      if (chunk.length < 1) throw new ChaseCheckingImportValidationError('Fact cursor has no remaining rows.');
      const before = await readFacts(dependencies.core, period.artifact.id);
      const end = offset + chunk.length;
      if (before.length !== offset && before.length !== end) {
        throw new ChaseCheckingImportValidationError('Persisted fact prefix does not match the durable cursor.');
      }
      assertFactsExact(before, period.facts, before.length);
      if (before.length === offset) await upsertFactChunk(dependencies.core, chunk);
      const after = before.length === end ? before : await readFacts(dependencies.core, period.artifact.id);
      assertFactsExact(after, period.facts, end);
      return persistTransition(job, {
        kind: 'factsCommitted',
        periodIndex: job.periodIndex,
        offset,
        count: chunk.length,
        readbackCount: after.length,
      }, dependencies);
    }
    case 'RECEIPT': {
      const facts = await readFacts(dependencies.core, period.artifact.id);
      assertFactsExact(facts, period.facts, period.facts.length);
      const receiptId = await createOrVerifyReceipt(dependencies.core, period);
      const readbackFacts = await readFacts(dependencies.core, period.artifact.id);
      assertFactsExact(readbackFacts, period.facts, period.facts.length);
      return persistTransition(job, {
        kind: 'receiptCommitted',
        periodIndex: job.periodIndex,
        receiptId,
        importedRows: period.rows.length,
        factReadbackCount: readbackFacts.length,
      }, dependencies);
    }
    case 'FINALIZE': {
      const facts = await readFacts(dependencies.core, period.artifact.id);
      assertFactsExact(facts, period.facts, period.facts.length);
      const receipt = await readReceipt(dependencies.core, period.receiptKey);
      const receiptId = assertReceiptExact(receipt, receiptProjection(period));
      await persistArtifactFinalize(dependencies.core, period);
      return persistTransition(job, {
        kind: 'periodFinalized',
        periodIndex: job.periodIndex,
        receiptId,
        artifactStatus: 'IMPORTED',
        rowCount: period.rows.length,
        factReadbackCount: facts.length,
      }, dependencies);
    }
    default:
      throw new ChaseCheckingImportValidationError(`Unsupported Chase checking stage ${state.stage}.`);
  }
};

const nativeFileFetcher = async (file: ChaseCheckingNativeFile): Promise<Uint8Array> => {
  if (!file.url) throw new ChaseCheckingImportValidationError('Native File query did not return a signed URL.');
  let signedUrl: URL;
  try {
    signedUrl = new URL(file.url);
  } catch {
    throw new ChaseCheckingImportValidationError('Native File signed URL is invalid.');
  }
  const apiUrl = process.env.TWENTY_API_URL;
  if (!apiUrl) throw new ChaseCheckingImportValidationError('TWENTY_API_URL is required to validate a native File URL.');
  let api: URL;
  try {
    api = new URL(apiUrl);
  } catch {
    throw new ChaseCheckingImportValidationError('TWENTY_API_URL is invalid.');
  }
  if (signedUrl.origin !== api.origin || signedUrl.protocol !== api.protocol || signedUrl.pathname !== `/file/${CHASE_CHECKING_IMPORT_FILE_FOLDER}/${file.fileId}` || !signedUrl.searchParams.get('token')) {
    throw new ChaseCheckingImportValidationError('Native File signed URL is not a Twenty files-field URL for the queried File.');
  }
  let response: Response;
  try {
    response = await fetch(signedUrl, { signal: AbortSignal.timeout(15_000) });
  } catch (error) {
    if (error instanceof ChaseCheckingImportValidationError) throw error;
    throw new RetryableLogicFunctionError('Native File read was interrupted.');
  }
  if (!response.ok) {
    if (response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500) {
      throw new RetryableLogicFunctionError(`Native File read failed transiently with HTTP ${response.status}.`);
    }
    throw new ChaseCheckingImportValidationError(`Native File read failed with HTTP ${response.status}.`);
  }
  return new Uint8Array(await response.arrayBuffer());
};

export const handler = async (
  payload: ChaseCheckingImportJob,
  context: { userWorkspaceId: string | null; workspaceMemberId: string | null },
): Promise<ChaseCheckingImportResult> => {
  if (context.userWorkspaceId || context.workspaceMemberId) throw new Error('Chase checking import requires native background execution.');
  if (!process.env.TWENTY_APP_APPLICATION_ACCESS_TOKEN) throw new Error('Native App execution is required.');
  const core = new CoreApiClient({ runAs: 'application' }) as unknown as ChaseCheckingCoreClient;
  try {
    return await runChaseCheckingImportJob(payload, {
      core,
      stateStore: createNativeChaseCheckingBatchStateStore(core),
      fetchFile: nativeFileFetcher,
      now: () => new Date().toISOString(),
      enqueue: async (command) => {
        const result = await enqueueJobs({
          logicFunctionUniversalIdentifier: CHASE_CHECKING_IMPORT_FUNCTION,
          payloads: [command],
          retryLimit: RETRY_LIMIT,
          delayMs: RETRY_DELAY_MS,
        });
        if (!result.enqueued || result.enqueuedJobsCount !== 1 || result.logicFunctionUniversalIdentifier !== CHASE_CHECKING_IMPORT_FUNCTION) {
          throw new RetryableLogicFunctionError('Native next-period dispatch was not confirmed.');
        }
      },
    });
  } catch (error) {
    if (error instanceof RetryableLogicFunctionError) throw error;
    if (error instanceof ChaseCheckingImportValidationError) throw error;
    throw new RetryableLogicFunctionError('Chase checking import job could not confirm its bounded I/O.');
  }
};

export default defineLogicFunction({
  universalIdentifier: CHASE_CHECKING_IMPORT_FUNCTION,
  name: 'chase-checking-import-job',
  description: 'Run one persisted, hash-bound Hass Chase checking import stage.',
  timeoutSeconds: 90,
  handler,
});
