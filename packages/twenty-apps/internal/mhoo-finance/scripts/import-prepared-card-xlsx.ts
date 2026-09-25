import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

import {
  planPreparedCardXlsxImport,
  PREPARED_CARD_XLSX_EXPECTED_CONTROLS,
  PREPARED_CARD_XLSX_EXPECTED_ROWS,
  PREPARED_CARD_XLSX_MIME,
  type PreparedCardControl,
  type PreparedCardNativeRecords,
  type PreparedCardXlsxPlan,
} from '../src/ingestion/prepared-card-xlsx';

const REMOTE_ALIAS = 'finance-install-20260914';
const EXPECTED_REMOTE = 'https://hass-kitchen.mhoo.app';
const PARENT_ARTIFACT_ID = '1cafc150-6583-4aae-bc9d-35edfb8a62e3';
const DEFAULT_XLSX = '/Users/mhoooo/Library/Mobile Documents/com~apple~CloudDocs/Downloads/Master_3652_Ledger_2021-2026.xlsx';
const PROFILE = 'chase-prepared-card-xlsx-v1@1';
const FACT_BATCH_SIZE = 60;
const ARTIFACT_BATCH_SIZE = 20;
const READBACK_PAGE_SIZE = 100;
const READBACK_MAX_ATTEMPTS = 6;
const READBACK_INITIAL_DELAY_MS = 1000;

type GraphqlResponse = Readonly<{
  data?: Record<string, unknown>;
  errors?: readonly { message?: string }[];
}>;
type GraphqlTransport = (query: string, variables?: Record<string, unknown>) => Promise<Record<string, unknown>>;
type LiveArtifact = Readonly<{
  id: string;
  artifactKey: string;
  accountKey: string;
  financialAccountId: string;
  sourceKind: 'CARD';
  status: 'PARTIAL' | 'IMPORTED' | 'DUPLICATE' | 'REJECTED' | 'IMPORTED_WITH_REJECTIONS';
  mimeType: string;
  originalFileName: string;
  byteLength: number;
  contentHash: string;
  acquiredAt: string;
  acquiredBy: string;
  originalFiles: readonly { fileId: string; label: string }[];
}>;
type LiveCycleArtifact = Readonly<{
  id: string;
  artifactKey: string;
  accountKey: string;
  financialAccountId: string;
  sourceKind: string;
  period: string;
  status: string;
  rowCount: number;
  contentHash: string;
}>;
type ReadbackFact = Readonly<{
  factKey: string;
  artifactId: string;
  financialAccountId: string;
  sourceAmount: string;
  exactAmountMinor: string;
  sourceCurrency: string;
}>;

const gql: GraphqlTransport = async (query, variables) => {
  const config = JSON.parse(await readFile(resolve(homedir(), '.twenty', 'config.json'), 'utf8')) as {
    remotes?: Record<string, { apiUrl?: string; apiKey?: string }>;
  };
  const remote = config.remotes?.[REMOTE_ALIAS];
  if (remote?.apiUrl !== EXPECTED_REMOTE || !remote.apiKey) throw new Error('Expected authenticated Hass Kitchen remote is unavailable.');
  const response = await fetch(`${remote.apiUrl}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${remote.apiKey}` },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`Twenty GraphQL HTTP ${response.status}`);
  const payload = await response.json() as GraphqlResponse;
  if (payload.errors?.length || !payload.data) {
    const operation = /(?:query|mutation)\s+([A-Za-z][A-Za-z0-9_]*)/.exec(query)?.[1] ?? 'UnknownOperation';
    const first = payload.errors?.[0]?.message ?? '';
    const field = /(?:Field|argument|Argument) "([A-Za-z][A-Za-z0-9_]*)"/.exec(first)?.[1];
    const category = /Unknown argument|unknown argument/.test(first) ? 'UNKNOWN_ARGUMENT'
      : /is not defined by type/.test(first) ? 'UNKNOWN_FIELD'
      : /Cannot query field/.test(first) ? 'UNKNOWN_SELECTION'
      : /Expected type/.test(first) ? 'TYPE_MISMATCH'
      : /Duplicate|duplicate|unique/.test(first) ? 'DUPLICATE'
      : 'OTHER';
    const safeHint = first.replace(/\b[\w-]{20,}\b/g, '<redacted>').replace(/\d/g, '#').slice(0, 200);
    throw new Error(`Twenty GraphQL ${operation} rejected: ${category}${field ? `:${field}` : ''}; count=${payload.errors?.length ?? 0}; hint=${safeHint}.`);
  }
  return payload.data;
};

const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const stableUuid = (key: string): string => {
  const hex = createHash('sha256').update(`mhoo-finance-card-xlsx:${key}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(12, 15)}-a${hex.slice(16, 19)}-${hex.slice(20, 32)}`;
};
const record = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} is missing.`);
  return value as Record<string, unknown>;
};
const requiredString = (value: Record<string, unknown>, key: string, label = key): string => {
  const result = value[key];
  if (typeof result !== 'string' || result.length === 0) throw new Error(`${label} is missing.`);
  return result;
};
const requiredNumber = (value: Record<string, unknown>, key: string, label = key): number => {
  const result = value[key];
  if (typeof result !== 'number' || !Number.isSafeInteger(result)) throw new Error(`${label} is invalid.`);
  return result;
};

const sleep = (milliseconds: number): Promise<void> => new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));

const isRateLimitError = (error: unknown): boolean => error instanceof Error && /rate limit|limit reached|too many requests|status 429|\b429\b/i.test(error.message);

const readbackRequest = async (transport: GraphqlTransport, query: string, variables: Record<string, unknown>): Promise<Record<string, unknown>> => {
  let delay = READBACK_INITIAL_DELAY_MS;
  for (let attempt = 1; attempt <= READBACK_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await transport(query, variables);
    } catch (error: unknown) {
      if (!isRateLimitError(error) || attempt === READBACK_MAX_ATTEMPTS) {
        if (isRateLimitError(error)) throw new Error(`CARD fact readback rate limit persisted after ${READBACK_MAX_ATTEMPTS} attempts.`);
        throw error;
      }
      await sleep(delay);
      delay = Math.min(delay * 2, 8000);
    }
  }
  throw new Error('CARD fact readback retry loop ended unexpectedly.');
};

const readParentArtifact = async (transport: GraphqlTransport): Promise<LiveArtifact> => {
  const data = await transport(
    'query CardParentArtifact($filter: SourceArtifactFilterInput!) { sourceArtifact(filter: $filter) { id artifactKey accountKey sourceKind status mimeType originalFileName byteLength contentHash acquiredAt acquiredBy originalFiles financialAccountId } }',
    { filter: { id: { eq: PARENT_ARTIFACT_ID } } },
  );
  const source = record(data.sourceArtifact, 'Parent SourceArtifact');
  const files = source.originalFiles;
  if (!Array.isArray(files) || files.length !== 1) throw new Error('Parent CARD SourceArtifact must retain exactly one immutable file.');
  const file = record(files[0], 'Parent SourceArtifact file');
  const sourceKind = requiredString(source, 'sourceKind');
  const status = requiredString(source, 'status');
  const financialAccountId = requiredString(source, 'financialAccountId');
  if (sourceKind !== 'CARD' || status !== 'PARTIAL') throw new Error('Parent SourceArtifact must remain a PARTIAL CARD artifact.');
  return {
    id: requiredString(source, 'id'),
    artifactKey: requiredString(source, 'artifactKey'),
    accountKey: requiredString(source, 'accountKey'),
    financialAccountId,
    sourceKind: 'CARD',
    status: status as LiveArtifact['status'],
    mimeType: requiredString(source, 'mimeType'),
    originalFileName: requiredString(source, 'originalFileName'),
    byteLength: requiredNumber(source, 'byteLength'),
    contentHash: requiredString(source, 'contentHash'),
    acquiredAt: requiredString(source, 'acquiredAt'),
    acquiredBy: requiredString(source, 'acquiredBy'),
    originalFiles: [{ fileId: requiredString(file, 'fileId'), label: requiredString(file, 'label') }],
  };
};

const readCardAccount = async (transport: GraphqlTransport, accountId: string): Promise<void> => {
  const data = await transport(
    'query CardAccount($filter: FinancialAccountFilterInput!) { financialAccount(filter: $filter) { id sourceKind } }',
    { filter: { id: { eq: accountId } } },
  );
  const account = record(data.financialAccount, 'CARD FinancialAccount');
  if (requiredString(account, 'id') !== accountId || requiredString(account, 'sourceKind') !== 'CARD') throw new Error('Parent SourceArtifact does not bind a CARD FinancialAccount.');
};

const readCycleArtifacts = async (transport: GraphqlTransport, parent: LiveArtifact): Promise<readonly LiveCycleArtifact[]> => {
  const data = await transport(
    'query CardCycleArtifacts($filter: SourceArtifactFilterInput!, $first: Int!) { sourceArtifacts(filter: $filter, first: $first) { edges { node { id artifactKey accountKey financialAccountId sourceKind period status rowCount contentHash } } pageInfo { hasNextPage } } }',
    { filter: { accountKey: { eq: parent.accountKey }, contentHash: { eq: parent.contentHash } }, first: 100 },
  );
  const connection = record(data.sourceArtifacts, 'CARD cycle artifacts');
  const edges = connection.edges;
  const pageInfo = record(connection.pageInfo, 'CARD cycle artifact pagination');
  if (!Array.isArray(edges) || pageInfo.hasNextPage !== false) throw new Error('CARD cycle artifact readback is incomplete.');
  return edges.map((edge) => {
    const node = record(record(edge, 'CARD cycle artifact edge').node, 'CARD cycle artifact');
    return {
      id: requiredString(node, 'id'),
      artifactKey: requiredString(node, 'artifactKey'),
      accountKey: requiredString(node, 'accountKey'),
      financialAccountId: requiredString(node, 'financialAccountId'),
      sourceKind: requiredString(node, 'sourceKind'),
      period: requiredString(node, 'period'),
      status: requiredString(node, 'status'),
      rowCount: requiredNumber(node, 'rowCount'),
      contentHash: requiredString(node, 'contentHash'),
    };
  });
};

const sourceCycleKey = (parent: LiveArtifact, control: PreparedCardControl): string => `card-xlsx:${parent.accountKey}:${control.statementEnd}`;
const cycleArtifactId = (parent: LiveArtifact, control: PreparedCardControl): string => stableUuid(`artifact:${sourceCycleKey(parent, control)}`);
const cycleReceiptKey = (parent: LiveArtifact, control: PreparedCardControl): string => `receipt-${sourceCycleKey(parent, control)}:${parent.contentHash}:${PROFILE}`;
const factKeyFor = (parent: LiveArtifact, cycleId: string, fact: PreparedCardNativeRecords['financeFacts'][number]): string => `fact-${parent.accountKey}-${cycleId}-${fact.sourceRowKey}-r${fact.revision}`;

const cycleControlsFor = (parent: LiveArtifact, control: PreparedCardControl, mismatch: boolean): string => JSON.stringify({
  schemaVersion: 'prepared-card-xlsx-cycle-controls-v1',
  sourceWorkbookArtifactId: parent.id,
  sourceWorkbookHash: parent.contentHash,
  control,
  transactionReconciliation: mismatch ? 'MISMATCH' : 'MATCH',
  openingBalanceMinor: control.previousBalanceMinor,
  closingBalanceMinor: control.newBalanceMinor,
  moneyInMinor: control.paymentsCreditsMinor,
  moneyOutMinor: (
    BigInt(control.purchasesMinor) + BigInt(control.cashAdvancesMinor) + BigInt(control.feesMinor) + BigInt(control.interestMinor)
  ).toString(),
  currencyCode: 'USD',
  balanceBasis: 'CARD_LIABILITY',
});

const cycleArtifactsFor = (parent: LiveArtifact, plan: PreparedCardXlsxPlan): readonly Record<string, unknown>[] => plan.statement.controls.controls.map((control) => {
  const id = cycleArtifactId(parent, control);
  const mismatch = plan.statement.controls.transactionReconciliation.mismatches.some((entry) => entry.statementEnd === control.statementEnd);
  const statementControls = cycleControlsFor(parent, control, mismatch);
  const rowCount = plan.statement.rows.filter((row) => row.rawValues['Statement end'] === `${control.statementEnd.slice(5, 7)}/${control.statementEnd.slice(8, 10)}/${control.statementEnd.slice(2, 4)}`).length;
  return {
    id,
    position: 'first',
    artifactKey: sourceCycleKey(parent, control),
    accountKey: parent.accountKey,
    financialAccountId: parent.financialAccountId,
    sourceKind: 'CARD',
    period: control.statementEnd.slice(0, 7),
    status: 'PARTIAL',
    freshness: 'FRESH',
    contentHash: parent.contentHash,
    originalFileName: parent.originalFileName,
    mimeType: PREPARED_CARD_XLSX_MIME,
    byteLength: parent.byteLength,
    acquiredAt: parent.acquiredAt,
    acquiredBy: parent.acquiredBy,
    statementControls,
    rowCount,
  };
});

const factPayloadsFor = (parent: LiveArtifact, plan: PreparedCardXlsxPlan): readonly Record<string, unknown>[] => {
  const controlByEnd = new Map(plan.statement.controls.controls.map((control) => [control.statementEnd, control]));
  return plan.nativeRecords.financeFacts.map((fact) => {
    const raw = JSON.parse(fact.rawValues ?? '{}') as Record<string, string>;
    const statementEnd = raw['Statement end'];
    const [month, day, year] = statementEnd.split('/');
    if (!month || !day || !year || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day) || !/^(\d{2}|\d{4})$/.test(year)) throw new Error('Statement end has an unsupported date format.');
    const isoEnd = `${year.length === 2 ? `20${year}` : year}-${month}-${day}`;
    const control = controlByEnd.get(isoEnd);
    if (!control) throw new Error('Every fact must bind to one retained statement cycle.');
    const cycleId = cycleArtifactId(parent, control);
    const factKey = factKeyFor(parent, cycleId, fact);
    const exactAmountMinor = fact.exactAmountMinor;
    if (!/^(0|-?[1-9]\d*)$/.test(exactAmountMinor)) throw new Error('Planner emitted a non-canonical exact minor amount.');
    return {
      id: stableUuid(`fact:${factKey}`),
      factKey,
      sourceRowKey: fact.sourceRowKey,
      sourceLocation: fact.sourceLocation,
      sourceAmount: fact.sourceAmount,
      sourceSignConvention: 'OUTFLOW_POSITIVE',
      transactionDate: fact.transactionDate,
      rawValues: fact.rawValues,
      period: control.statementEnd.slice(0, 7),
      amount: { amountMicros: (BigInt(exactAmountMinor) * 10000n).toString(), currencyCode: 'USD' },
      exactAmountMinor,
      sourceCurrency: 'USD',
      classification: fact.classification,
      status: 'POSTED',
      revision: fact.revision,
      includedInTotals: false,
      exclusionReason: fact.exclusionReason,
      description: fact.description,
      financialAccountId: parent.financialAccountId,
      artifactId: cycleId,
    };
  });
};

const createCycleArtifacts = async (transport: GraphqlTransport, artifacts: readonly Record<string, unknown>[]): Promise<void> => {
  for (let offset = 0; offset < artifacts.length; offset += ARTIFACT_BATCH_SIZE) {
    await transport(
      'mutation CreateCardCycleArtifacts($data: [SourceArtifactCreateInput!]!, $upsert: Boolean!) { createSourceArtifacts(data: $data, upsert: $upsert) { id artifactKey status rowCount } }',
      { data: artifacts.slice(offset, offset + ARTIFACT_BATCH_SIZE), upsert: true },
    );
  }
};

const createFacts = async (transport: GraphqlTransport, facts: readonly Record<string, unknown>[]): Promise<void> => {
  for (let offset = 0; offset < facts.length; offset += FACT_BATCH_SIZE) {
    await transport(
      'mutation CreateCardFacts($data: [FinanceFactCreateInput!]!, $upsert: Boolean!) { createFinanceFacts(data: $data, upsert: $upsert) { id factKey } }',
      { data: facts.slice(offset, offset + FACT_BATCH_SIZE), upsert: true },
    );
  }
};

const readFacts = async (transport: GraphqlTransport, accountId: string): Promise<readonly ReadbackFact[]> => {
  const actual: ReadbackFact[] = [];
  const seenCursors = new Set<string>();
  let after: string | undefined;
  for (;;) {
    const data = await readbackRequest(transport,
      'query CardFactReadback($filter: FinanceFactFilterInput!, $first: Int!, $after: String) { financeFacts(filter: $filter, first: $first, after: $after) { edges { node { factKey artifactId financialAccountId sourceAmount exactAmountMinor sourceCurrency } } pageInfo { hasNextPage endCursor } } }',
      { filter: { financialAccountId: { eq: accountId } }, first: READBACK_PAGE_SIZE, after },
    );
    const connection = record(data.financeFacts, 'CARD fact readback');
    const edges = connection.edges;
    const pageInfo = record(connection.pageInfo, 'CARD fact pagination');
    if (!Array.isArray(edges) || typeof pageInfo.hasNextPage !== 'boolean') throw new Error('CARD fact readback pagination is incomplete.');
    for (const edge of edges) {
      const node = record(record(edge, 'CARD fact edge').node, 'CARD fact');
      actual.push({
        factKey: requiredString(node, 'factKey'),
        artifactId: requiredString(node, 'artifactId'),
        financialAccountId: requiredString(node, 'financialAccountId'),
        sourceAmount: requiredString(node, 'sourceAmount'),
        exactAmountMinor: requiredString(node, 'exactAmountMinor'),
        sourceCurrency: requiredString(node, 'sourceCurrency'),
      });
    }
    if (actual.length > PREPARED_CARD_XLSX_EXPECTED_ROWS) throw new Error('CARD fact readback exceeded the profiled row count.');
    if (!pageInfo.hasNextPage) return actual;
    const cursor = pageInfo.endCursor;
    if (typeof cursor !== 'string' || cursor.length === 0 || seenCursors.has(cursor)) throw new Error('CARD fact readback cursor is missing or repeated.');
    seenCursors.add(cursor);
    after = cursor;
  }
};

const assertFacts = (expected: readonly Record<string, unknown>[], actual: readonly ReadbackFact[], parent: LiveArtifact): void => {
  const expectedByKey = new Map(expected.map((fact) => [String(fact.factKey), fact]));
  if (expectedByKey.size !== expected.length || actual.length !== expected.length || new Set(actual.map((fact) => fact.factKey)).size !== actual.length) throw new Error('CARD fact readback count or key uniqueness failed.');
  for (const fact of actual) {
    const expectedFact = expectedByKey.get(fact.factKey);
    if (!expectedFact || fact.financialAccountId !== parent.financialAccountId || fact.sourceCurrency !== 'USD' || fact.artifactId !== expectedFact.artifactId || fact.exactAmountMinor !== expectedFact.exactAmountMinor || fact.sourceAmount !== expectedFact.sourceAmount) throw new Error('CARD fact readback differs from the deterministic plan.');
  }
};

const updateCycleStatuses = async (transport: GraphqlTransport, parent: LiveArtifact, plan: PreparedCardXlsxPlan): Promise<void> => {
  const mismatches = new Set(plan.statement.controls.transactionReconciliation.mismatches.map((entry) => entry.statementEnd));
  for (const control of plan.statement.controls.controls) {
    const id = cycleArtifactId(parent, control);
    const rowCount = plan.statement.rows.filter((row) => row.rawValues['Statement end'] === `${control.statementEnd.slice(5, 7)}/${control.statementEnd.slice(8, 10)}/${control.statementEnd.slice(2, 4)}`).length;
    const status = mismatches.has(control.statementEnd) ? 'PARTIAL' : 'IMPORTED';
    await readbackRequest(transport,
      'mutation UpdateCardCycleArtifact($id: UUID!, $data: SourceArtifactUpdateInput!) { updateSourceArtifact(id: $id, data: $data) { id status rowCount } }',
      { id, data: { status, rowCount, statementControls: cycleControlsFor(parent, control, mismatches.has(control.statementEnd)) } },
    );
  }
};

const assertCycleReadback = async (transport: GraphqlTransport, parent: LiveArtifact, plan: PreparedCardXlsxPlan): Promise<void> => {
  const cycles = await readCycleArtifacts(transport, parent);
  const expected = new Map(cycleArtifactsFor(parent, plan).map((artifact) => [String(artifact.artifactKey), artifact]));
  if (cycles.length < expected.size) throw new Error('CARD cycle artifact readback is incomplete.');
  const mismatches = new Set(plan.statement.controls.transactionReconciliation.mismatches.map((entry) => entry.statementEnd));
  for (const cycle of cycles) {
    const planned = expected.get(cycle.artifactKey);
    if (!planned) continue;
    const statementEnd = String(planned.period) + '-11';
    const shouldBePartial = [...mismatches].some((end) => end.startsWith(planned.period));
    if (cycle.id !== planned.id || cycle.accountKey !== parent.accountKey || cycle.financialAccountId !== parent.financialAccountId || cycle.sourceKind !== 'CARD' || cycle.contentHash !== parent.contentHash || cycle.rowCount !== planned.rowCount || (shouldBePartial ? cycle.status !== 'PARTIAL' : cycle.status !== 'IMPORTED')) {
      throw new Error(`CARD cycle artifact readback failed for ${statementEnd}.`);
    }
  }
};

const createReceipts = async (transport: GraphqlTransport, parent: LiveArtifact, plan: PreparedCardXlsxPlan): Promise<void> => {
  const mismatchEnds = new Set(plan.statement.controls.transactionReconciliation.mismatches.map((entry) => entry.statementEnd));
  for (const control of plan.statement.controls.controls) {
    const mismatch = mismatchEnds.has(control.statementEnd);
    const rowCount = plan.statement.rows.filter((row) => row.rawValues['Statement end'] === `${control.statementEnd.slice(5, 7)}/${control.statementEnd.slice(8, 10)}/${control.statementEnd.slice(2, 4)}`).length;
    await readbackRequest(transport,
      'mutation CreateCardReceipt($data: ImportReceiptCreateInput!, $upsert: Boolean!) { createImportReceipt(data: $data, upsert: $upsert) { id receiptKey status } }',
      { data: { id: stableUuid(`receipt:${cycleReceiptKey(parent, control)}`), receiptKey: cycleReceiptKey(parent, control), artifactId: cycleArtifactId(parent, control), status: mismatch ? 'PARTIAL' : 'IMPORTED', attempts: 1, importedRows: rowCount, deduplicatedRows: 0, sourceRevision: 1, contentHash: parent.contentHash, rejectedRows: 0, parserProfile: PROFILE }, upsert: true },
    );
  }
};

const verifyParentStillPartial = async (transport: GraphqlTransport, parent: LiveArtifact): Promise<void> => {
  const current = await readParentArtifact((query, variables) => readbackRequest(transport, query, variables ?? {}));
  if (current.id !== parent.id || current.contentHash !== parent.contentHash || current.status !== 'PARTIAL' || current.byteLength !== parent.byteLength) throw new Error('Parent CARD SourceArtifact changed or was promoted; refusing completion.');
};

const assertReceipts = async (transport: GraphqlTransport, parent: LiveArtifact, plan: PreparedCardXlsxPlan): Promise<void> => {
  const data = await readbackRequest(transport,
    'query CardReceiptReadback($filter: ImportReceiptFilterInput!, $first: Int!) { importReceipts(filter: $filter, first: $first) { edges { node { receiptKey artifactId status importedRows contentHash } } pageInfo { hasNextPage } } }',
    { filter: { contentHash: { eq: parent.contentHash } }, first: 100 },
  );
  const connection = record(data.importReceipts, 'CARD receipts');
  if (record(connection.pageInfo, 'CARD receipt pagination').hasNextPage !== false || !Array.isArray(connection.edges)) throw new Error('CARD receipt readback is incomplete.');
  const expected = new Map(plan.statement.controls.controls.map((control) => [cycleReceiptKey(parent, control), control]));
  const seen = new Set<string>();
  for (const edge of connection.edges) {
    const receipt = record(record(edge, 'CARD receipt edge').node, 'CARD receipt');
    const key = requiredString(receipt, 'receiptKey');
    const control = expected.get(key);
    if (!control || seen.has(key)) throw new Error('CARD receipt readback has an unexpected or duplicate receipt.');
    seen.add(key);
    const mismatch = plan.statement.controls.transactionReconciliation.mismatches.some((item) => item.statementEnd === control.statementEnd);
    const rowCount = plan.statement.rows.filter((row) => row.rawValues['Statement end'] === `${control.statementEnd.slice(5, 7)}/${control.statementEnd.slice(8, 10)}/${control.statementEnd.slice(2, 4)}`).length;
    if (receipt.artifactId !== cycleArtifactId(parent, control) || receipt.contentHash !== parent.contentHash || receipt.status !== (mismatch ? 'PARTIAL' : 'IMPORTED') || receipt.importedRows !== rowCount) throw new Error('CARD receipt readback differs from the deterministic plan.');
  }
  if (seen.size !== expected.size) throw new Error('CARD receipt readback count is incomplete.');
};

const modeAndPath = (): { mode: '--dry-run' | '--apply' | '--verify-finalize' | '--verify-only' | '--refresh-controls'; path: string } => {
  const args = process.argv.slice(2);
  const mode = args.find((arg): arg is '--dry-run' | '--apply' | '--verify-finalize' | '--verify-only' | '--refresh-controls' => arg === '--dry-run' || arg === '--apply' || arg === '--verify-finalize' || arg === '--verify-only' || arg === '--refresh-controls');
  if (!mode || args.filter((arg) => arg !== mode).length > 1) throw new Error('Usage: import-prepared-card-xlsx.ts --dry-run|--apply|--verify-finalize|--verify-only|--refresh-controls [xlsx-path]');
  return { mode, path: args.find((arg) => arg !== mode) ?? DEFAULT_XLSX };
};

const main = async (): Promise<void> => {
  const { mode, path } = modeAndPath();
  const bytes = await readFile(path);
  const transport = gql;
  const parent = await readParentArtifact(transport);
  if (parent.mimeType !== PREPARED_CARD_XLSX_MIME || parent.originalFileName.toLowerCase().endsWith('.xlsx') === false) throw new Error('Parent SourceArtifact does not describe the prepared XLSX.');
  if (sha256(bytes) !== parent.contentHash || bytes.byteLength !== parent.byteLength) throw new Error('Local workbook bytes do not match the retained parent SourceArtifact.');
  await readCardAccount(transport, parent.financialAccountId);
  const plan = planPreparedCardXlsxImport({
    bytes,
    expectedTransactionRows: PREPARED_CARD_XLSX_EXPECTED_ROWS,
    artifact: {
      artifactId: parent.id,
      accountKey: parent.accountKey,
      financialAccountId: parent.financialAccountId,
      sourceKind: 'CARD',
      originalFileName: parent.originalFileName,
      mimeType: parent.mimeType,
      acquiredAt: parent.acquiredAt,
      acquiredBy: parent.acquiredBy,
      originalFileId: parent.originalFiles[0].fileId,
    },
  });
  if (plan.statement.controls.statementCount !== PREPARED_CARD_XLSX_EXPECTED_CONTROLS || plan.statement.rows.length !== PREPARED_CARD_XLSX_EXPECTED_ROWS || plan.result.status !== 'COMPLETE') throw new Error('Prepared card XLSX plan is not complete.');
  const artifacts = cycleArtifactsFor(parent, plan);
  const facts = factPayloadsFor(parent, plan);
  if (artifacts.reduce((sum, artifact) => sum + Number(artifact.rowCount), 0) !== facts.length || artifacts.some((artifact) => Number(artifact.rowCount) <= 0)) throw new Error('CARD cycle row counts do not cover every planned fact.');
  const mismatchPeriods = plan.statement.controls.transactionReconciliation.mismatches.length;
  const existingCycles = await readCycleArtifacts(transport, parent);
  if (existingCycles.length > 58) throw new Error('Unexpected CARD artifacts share the parent workbook hash.');
  if (mode === '--dry-run') {
    // Safe summary only; no workbook rows, descriptions, or credentials are logged.
    // eslint-disable-next-line no-console -- bounded control summary only
    console.log(JSON.stringify({ mode, parentArtifactId: parent.id, parentStatus: parent.status, sha256: parent.contentHash, controls: plan.statement.controls.statementCount, rows: plan.statement.rows.length, facts: facts.length, mismatchPeriods, exactPeriods: plan.statement.controls.statementCount - mismatchPeriods, existingCycleArtifacts: existingCycles.length, plannedCycleArtifacts: artifacts.length, plannedReceipts: plan.statement.controls.statementCount, periodArtifactsCreated: 0, write: false }));
    return;
  }
  const cycleKeys = new Set(artifacts.map((artifact) => String(artifact.artifactKey)));
  for (const existing of existingCycles) {
    if (!cycleKeys.has(existing.artifactKey)) continue;
    const planned = artifacts.find((artifact) => artifact.artifactKey === existing.artifactKey);
    if (!planned || existing.id !== planned.id || existing.contentHash !== parent.contentHash || existing.financialAccountId !== parent.financialAccountId) throw new Error('Existing CARD cycle artifact conflicts with the deterministic plan.');
  }
  const existingKeys = new Set(existingCycles.map((cycle) => cycle.artifactKey));
  if (mode === '--refresh-controls') {
    if ([...cycleKeys].some((key) => !existingKeys.has(key))) throw new Error('CARD controls refresh requires all cycle artifacts.');
    await updateCycleStatuses(transport, parent, plan);
    await assertCycleReadback(transport, parent, plan);
    await assertReceipts(transport, parent, plan);
    await verifyParentStillPartial(transport, parent);
    // eslint-disable-next-line no-console -- bounded control summary only
    console.log(JSON.stringify({ mode, status: 'CARD_CONTROLS_REFRESHED', cycles: artifacts.length, write: true }));
    return;
  }
  if (mode === '--verify-only') {
    const actualFacts = await readFacts(transport, parent.financialAccountId);
    assertFacts(facts, actualFacts, parent);
    await assertCycleReadback(transport, parent, plan);
    await assertReceipts(transport, parent, plan);
    await verifyParentStillPartial(transport, parent);
    // eslint-disable-next-line no-console -- bounded readback summary only
    console.log(JSON.stringify({ mode, status: 'CARD_READBACK_VERIFIED', facts: actualFacts.length, cycles: artifacts.length, exactPeriods: artifacts.length - mismatchPeriods, partialPeriods: mismatchPeriods, receipts: plan.statement.controls.statementCount, write: false }));
    return;
  }
  if (mode === '--verify-finalize') {
    if ([...cycleKeys].some((key) => !existingKeys.has(key))) throw new Error('CARD verify-finalize requires all 57 cycle artifacts to exist; no writes were attempted.');
    const actualFacts = await readFacts(transport, parent.financialAccountId);
    assertFacts(facts, actualFacts, parent);
    await updateCycleStatuses(transport, parent, plan);
    await createReceipts(transport, parent, plan);
    await assertCycleReadback(transport, parent, plan);
    await verifyParentStillPartial(transport, parent);
    // eslint-disable-next-line no-console -- bounded readback summary only
    console.log(JSON.stringify({ mode, status: 'CARD_FACTS_READBACK_VERIFIED', parentArtifactId: parent.id, parentStatus: 'PARTIAL', sha256: parent.contentHash, controls: plan.statement.controls.statementCount, rows: plan.statement.rows.length, facts: actualFacts.length, exactPeriods: plan.statement.controls.statementCount - mismatchPeriods, partialPeriods: mismatchPeriods, cycleArtifacts: artifacts.length, receipts: plan.statement.controls.statementCount, periodArtifactsPresent: artifacts.length, periodArtifactsCreated: 0 }));
    return;
  }
  await createCycleArtifacts(transport, artifacts.filter((artifact) => !existingKeys.has(String(artifact.artifactKey))));
  await createFacts(transport, facts);
  const actualFacts = await readFacts(transport, parent.financialAccountId);
  assertFacts(facts, actualFacts, parent);
  await updateCycleStatuses(transport, parent, plan);
  await createReceipts(transport, parent, plan);
  await assertCycleReadback(transport, parent, plan);
  await verifyParentStillPartial(transport, parent);
  // eslint-disable-next-line no-console -- bounded readback summary only
  console.log(JSON.stringify({ mode, status: 'CARD_FACTS_READBACK_VERIFIED', parentArtifactId: parent.id, parentStatus: 'PARTIAL', sha256: parent.contentHash, controls: plan.statement.controls.statementCount, rows: plan.statement.rows.length, facts: actualFacts.length, exactPeriods: plan.statement.controls.statementCount - mismatchPeriods, partialPeriods: mismatchPeriods, cycleArtifacts: artifacts.length, receipts: plan.statement.controls.statementCount, periodArtifactsPresent: artifacts.length, periodArtifactsCreated: artifacts.length - existingCycles.filter((cycle) => cycleKeys.has(cycle.artifactKey)).length }));
};

void main().catch((error: unknown) => {
  // Never include transport payloads, credentials, workbook contents, or raw rows in logs.
  // eslint-disable-next-line no-console -- bounded failure code only
  console.error('CARD_XLSX_IMPORT_FAILED', error instanceof Error ? error.message : 'unknown error');
  process.exitCode = 1;
});
