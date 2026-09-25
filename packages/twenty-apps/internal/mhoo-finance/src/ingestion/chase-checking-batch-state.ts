import { createHash } from 'node:crypto';

export const HASS_CHASE_CHECKING_ACCOUNT_ID =
  '703eba2a-132e-4599-babd-2c61260ce586';
export const HASS_CHASE_CHECKING_ACCOUNT_KEY =
  'hass-chase-business-checking';
export const CHASE_CHECKING_BATCH_KEY =
  'hass-chase-checking:2025-01..2026-08';
export const CHASE_CHECKING_BATCH_STATE_SCHEMA_VERSION =
  'finance-chase-checking-batch-state-v1';
export const CHASE_CHECKING_FACT_BATCH_SIZE = 60;

const SHA256 = /^[0-9a-f]{64}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,200}$/;
const ISO_TIMESTAMP = /^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

/**
 * The reviewed 20-PDF tranche. Drive IDs intentionally do not appear here:
 * they are source locators, not Twenty authority. A job resolves each exact
 * hash to a retained SourceArtifact and verifies its native File before it
 * emits the `preflight` transition.
 */
export const REVIEWED_CHASE_CHECKING_PERIODS = [
  { period: '2025-01', periodStart: '2025-01-01', periodEnd: '2025-01-31', contentHash: 'd04ca14537185e030f01ec6b3c19425ebdbb6ff7854ece4a9890bcdc005c43d5', expectedRows: 75 },
  { period: '2025-02', periodStart: '2025-02-01', periodEnd: '2025-02-28', contentHash: 'fa7c52673ddfc06401ca94bb4b09dbe1c0552d9a09e33de29bdb42b62e20028f', expectedRows: 74 },
  { period: '2025-03', periodStart: '2025-03-01', periodEnd: '2025-03-31', contentHash: 'd0b7e12ceaf6463179aa6303612093cf905667e04c671269bf1192754ccf094b', expectedRows: 76 },
  { period: '2025-04', periodStart: '2025-04-01', periodEnd: '2025-04-30', contentHash: '62a6b02548c5a75f91ddf52ec1a37534d340260583e746662a0ca5e94737b251', expectedRows: 74 },
  { period: '2025-05', periodStart: '2025-05-01', periodEnd: '2025-05-30', contentHash: '5f576e887db831a293665905afc3c5be1fca90ac721a4d27042d772705eacef8', expectedRows: 76 },
  { period: '2025-06', periodStart: '2025-05-31', periodEnd: '2025-06-30', contentHash: '1efcec4d7dbb095def8bbb467d2b2e17a48e6151b57a376587c210c4a98ace3d', expectedRows: 70 },
  { period: '2025-07', periodStart: '2025-07-01', periodEnd: '2025-07-31', contentHash: 'f9b7ba5c5cd28966c9e93e3c427d109ca713be85d17d57a2c411f5a5fde780d6', expectedRows: 71 },
  { period: '2025-08', periodStart: '2025-08-01', periodEnd: '2025-08-29', contentHash: '4e9e5bffa0b38156fd54d868a022bb41e454625377fa2c95367cfe2d5559c81c', expectedRows: 86 },
  { period: '2025-09', periodStart: '2025-08-30', periodEnd: '2025-09-30', contentHash: '87681deef635463c8a595c7cbdfad370cd02a348ba4401dce4a27983ca4e1b22', expectedRows: 82 },
  { period: '2025-10', periodStart: '2025-10-01', periodEnd: '2025-10-31', contentHash: '24ca47d90e431878366f57b2ea850da8888d78092459a300b973fd4681a9c1e0', expectedRows: 93 },
  { period: '2025-11', periodStart: '2025-11-01', periodEnd: '2025-11-28', contentHash: '3284a38e468935e258ba9dedd51269f47a1cbcb087d9f0a74f8b40b047b05c52', expectedRows: 92 },
  { period: '2025-12', periodStart: '2025-11-29', periodEnd: '2025-12-31', contentHash: '8a5ddba0367f17e18c33b3d7720fb9b3ec611ef3df46bf4e0ad1a3039d9892d4', expectedRows: 74 },
  { period: '2026-01', periodStart: '2026-01-01', periodEnd: '2026-01-30', contentHash: '18c2d464daf4eda3406bdb65648acc26b2ca1234f5e44115c8dd28c012617aa8', expectedRows: 84 },
  { period: '2026-02', periodStart: '2026-01-31', periodEnd: '2026-02-27', contentHash: 'c9fb028a30d20880a82bea4ee353e25aef1b31a0fd80a965feeb6ead7cb94e9d', expectedRows: 86 },
  { period: '2026-03', periodStart: '2026-02-28', periodEnd: '2026-03-31', contentHash: '51cec704c25c8b2ad01a04bd566923d29f9021ce00f92da1a429bb70da51d883', expectedRows: 105 },
  { period: '2026-04', periodStart: '2026-04-01', periodEnd: '2026-04-30', contentHash: '4a40bdba671e7f325a39455a7f4bcbb1a0c16a28a009e2a8d97c73a9b70e5be6', expectedRows: 76 },
  { period: '2026-05', periodStart: '2026-05-01', periodEnd: '2026-05-29', contentHash: '5c07e2e7272bd2944765eebe483b96ce4cb1df959df62fbdb2d4dfdb5411f356', expectedRows: 83 },
  { period: '2026-06', periodStart: '2026-05-30', periodEnd: '2026-06-30', contentHash: '6cf04ab0f852f18c9ae4ba4699b877a64a7251822fd510e4d1a041135bf416d9', expectedRows: 101 },
  { period: '2026-07', periodStart: '2026-07-01', periodEnd: '2026-07-31', contentHash: 'b9ee915b64557f76a3cfe90e80ee82da377361c442a2c4e571ac69a28fc081be', expectedRows: 88 },
  { period: '2026-08', periodStart: '2026-08-01', periodEnd: '2026-08-31', contentHash: 'abb05388ded273d5e940f663ef40a0d5acb56e11f31b43290970b57435e1cd17', expectedRows: 120 },
] as const;

export const CHASE_CHECKING_REVIEWED_TOTAL_ROWS = REVIEWED_CHASE_CHECKING_PERIODS.reduce(
  (total, period) => total + period.expectedRows,
  0,
);

const canonicalManifest = JSON.stringify(REVIEWED_CHASE_CHECKING_PERIODS);
export const CHASE_CHECKING_REVIEWED_MANIFEST_HASH = createHash('sha256')
  .update(canonicalManifest)
  .digest('hex');

export type ChaseCheckingBatchStage =
  | 'PREFLIGHT'
  | 'FACTS'
  | 'RECEIPT'
  | 'FINALIZE'
  | 'COMPLETE'
  | 'FAILED';

export type ChaseCheckingPeriodStage =
  | 'PENDING'
  | 'FACTS'
  | 'RECEIPT'
  | 'FINALIZE'
  | 'IMPORTED';

export type ChaseCheckingBatchPeriod = (typeof REVIEWED_CHASE_CHECKING_PERIODS)[number] & {
  status: ChaseCheckingPeriodStage;
  nextFactOffset: number;
  sourceArtifactId: string | null;
  sourceFileId: string | null;
  receiptId: string | null;
};

export type ChaseCheckingBatchState = Readonly<{
  schemaVersion: typeof CHASE_CHECKING_BATCH_STATE_SCHEMA_VERSION;
  batchKey: typeof CHASE_CHECKING_BATCH_KEY;
  accountId: typeof HASS_CHASE_CHECKING_ACCOUNT_ID;
  accountKey: typeof HASS_CHASE_CHECKING_ACCOUNT_KEY;
  sourceKind: 'BANK';
  manifestHash: typeof CHASE_CHECKING_REVIEWED_MANIFEST_HASH;
  totalExpectedRows: typeof CHASE_CHECKING_REVIEWED_TOTAL_ROWS;
  stage: ChaseCheckingBatchStage;
  currentPeriodIndex: number;
  revision: number;
  updatedAt: string;
  failureCode?: string;
  periods: readonly ChaseCheckingBatchPeriod[];
}>;

export type ChaseCheckingBatchEvent =
  | Readonly<{
      kind: 'preflight';
      periodIndex: number;
      artifactId: string;
      fileId: string;
      financialAccountId: string;
      sourceKind: 'BANK' | 'CARD';
      mimeType: string;
      contentHash: string;
      periodStart: string;
      periodEnd: string;
      rowCount: number;
    }>
  | Readonly<{
      kind: 'factsCommitted';
      periodIndex: number;
      offset: number;
      count: number;
      readbackCount: number;
    }>
  | Readonly<{
      kind: 'receiptCommitted';
      periodIndex: number;
      receiptId: string;
      importedRows: number;
      factReadbackCount: number;
    }>
  | Readonly<{
      kind: 'periodFinalized';
      periodIndex: number;
      receiptId: string;
      artifactStatus: 'IMPORTED';
      rowCount: number;
      factReadbackCount: number;
    }>
  | Readonly<{
      kind: 'failed';
      failureCode: string;
    }>;

export type ChaseCheckingBatchCommand = Readonly<{
  stage: Exclude<ChaseCheckingBatchStage, 'COMPLETE' | 'FAILED'>;
  periodIndex: number;
  expectedRevision: number;
  factOffset?: number;
}>;

export class StaleChaseCheckingBatchRevisionError extends Error {
  constructor() {
    super('Persisted Chase checking batch revision is newer than this job.');
    this.name = 'StaleChaseCheckingBatchRevisionError';
  }
}

const assertSafeId = (value: string, label: string): void => {
  if (!SAFE_ID.test(value)) throw new Error(`${label} is invalid.`);
};

const assertTimestamp = (value: string): void => {
  if (!ISO_TIMESTAMP.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error('Batch timestamp is invalid.');
  }
};

const assertManifestPeriod = (
  actual: ChaseCheckingBatchPeriod,
  expected: (typeof REVIEWED_CHASE_CHECKING_PERIODS)[number],
): void => {
  if (
    actual.period !== expected.period ||
    actual.periodStart !== expected.periodStart ||
    actual.periodEnd !== expected.periodEnd ||
    actual.contentHash !== expected.contentHash ||
    actual.expectedRows !== expected.expectedRows
  ) {
    throw new Error('Persisted batch period differs from the reviewed manifest.');
  }
  if (!['PENDING', 'FACTS', 'RECEIPT', 'FINALIZE', 'IMPORTED'].includes(actual.status)) {
    throw new Error('Persisted batch period status is invalid.');
  }
  if (!Number.isSafeInteger(actual.nextFactOffset) || actual.nextFactOffset < 0 || actual.nextFactOffset > expected.expectedRows) {
    throw new Error('Persisted batch fact cursor is invalid.');
  }
  if (actual.status === 'PENDING' && actual.nextFactOffset !== 0) throw new Error('Pending period has progress.');
  if (actual.status === 'IMPORTED' && actual.nextFactOffset !== expected.expectedRows) throw new Error('Imported period is incomplete.');
  if (actual.sourceArtifactId !== null) assertSafeId(actual.sourceArtifactId, 'SourceArtifact ID');
  if (actual.sourceFileId !== null) assertSafeId(actual.sourceFileId, 'Twenty File ID');
  if (actual.receiptId !== null) assertSafeId(actual.receiptId, 'Import receipt ID');
};

/** Rejects forged, stale, CARD-bound, or changed-manifest state before use. */
export const parseChaseCheckingBatchState = (value: unknown): ChaseCheckingBatchState => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Persisted Chase checking batch state is missing.');
  const state = value as Partial<ChaseCheckingBatchState>;
  if (state.schemaVersion !== CHASE_CHECKING_BATCH_STATE_SCHEMA_VERSION || state.batchKey !== CHASE_CHECKING_BATCH_KEY || state.accountId !== HASS_CHASE_CHECKING_ACCOUNT_ID || state.accountKey !== HASS_CHASE_CHECKING_ACCOUNT_KEY || state.sourceKind !== 'BANK' || state.manifestHash !== CHASE_CHECKING_REVIEWED_MANIFEST_HASH || state.totalExpectedRows !== CHASE_CHECKING_REVIEWED_TOTAL_ROWS) {
    throw new Error('Persisted batch identity is not the reviewed Hass Chase BANK tranche.');
  }
  if (!['PREFLIGHT', 'FACTS', 'RECEIPT', 'FINALIZE', 'COMPLETE', 'FAILED'].includes(state.stage ?? '')) throw new Error('Persisted batch stage is invalid.');
  if (!Number.isSafeInteger(state.currentPeriodIndex) || state.currentPeriodIndex! < 0 || state.currentPeriodIndex! > REVIEWED_CHASE_CHECKING_PERIODS.length) throw new Error('Persisted batch period cursor is invalid.');
  if (!Number.isSafeInteger(state.revision) || state.revision! < 0) throw new Error('Persisted batch revision is invalid.');
  if (typeof state.updatedAt !== 'string') throw new Error('Persisted batch timestamp is missing.');
  assertTimestamp(state.updatedAt);
  if (!Array.isArray(state.periods) || state.periods.length !== REVIEWED_CHASE_CHECKING_PERIODS.length) throw new Error('Persisted batch period set is incomplete.');
  const hashes = new Set<string>();
  for (let index = 0; index < REVIEWED_CHASE_CHECKING_PERIODS.length; index += 1) {
    const period = state.periods[index];
    const expected = REVIEWED_CHASE_CHECKING_PERIODS[index];
    if (!period || typeof period !== 'object' || period.period !== expected.period || !SHA256.test(period.contentHash)) throw new Error('Persisted batch period is invalid.');
    if (hashes.has(period.contentHash)) throw new Error('Reviewed batch contains a duplicate source hash.');
    hashes.add(period.contentHash);
    assertManifestPeriod(period, expected);
  }
  const current = state.currentPeriodIndex! < state.periods.length ? state.periods[state.currentPeriodIndex!] : undefined;
  if (state.stage === 'COMPLETE' && (state.currentPeriodIndex !== state.periods.length || state.periods.some((period) => period.status !== 'IMPORTED'))) throw new Error('Completed batch has unfinished periods.');
  if (state.stage !== 'COMPLETE' && state.stage !== 'FAILED' && (!current || current.status === 'IMPORTED')) throw new Error('Active batch cursor does not point at a pending period.');
  if (state.stage === 'PREFLIGHT' && current?.status !== 'PENDING') throw new Error('Preflight stage has an unexpected period status.');
  if (state.stage === 'FACTS' && current?.status !== 'FACTS') throw new Error('Facts stage has an unexpected period status.');
  if (state.stage === 'RECEIPT' && current?.status !== 'RECEIPT') throw new Error('Receipt stage has an unexpected period status.');
  if (state.stage === 'FINALIZE' && current?.status !== 'FINALIZE') throw new Error('Finalize stage has an unexpected period status.');
  return state as ChaseCheckingBatchState;
};

export const createChaseCheckingBatchState = (updatedAt: string): ChaseCheckingBatchState => {
  assertTimestamp(updatedAt);
  const state: ChaseCheckingBatchState = {
    schemaVersion: CHASE_CHECKING_BATCH_STATE_SCHEMA_VERSION,
    batchKey: CHASE_CHECKING_BATCH_KEY,
    accountId: HASS_CHASE_CHECKING_ACCOUNT_ID,
    accountKey: HASS_CHASE_CHECKING_ACCOUNT_KEY,
    sourceKind: 'BANK',
    manifestHash: CHASE_CHECKING_REVIEWED_MANIFEST_HASH,
    totalExpectedRows: CHASE_CHECKING_REVIEWED_TOTAL_ROWS,
    stage: 'PREFLIGHT',
    currentPeriodIndex: 0,
    revision: 0,
    updatedAt,
    periods: REVIEWED_CHASE_CHECKING_PERIODS.map((period) => ({
      ...period,
      status: 'PENDING' as const,
      nextFactOffset: 0,
      sourceArtifactId: null,
      sourceFileId: null,
      receiptId: null,
    })),
  };
  return parseChaseCheckingBatchState(state);
};

const copyPeriods = (state: ChaseCheckingBatchState): ChaseCheckingBatchPeriod[] => state.periods.map((period) => ({ ...period }));

/**
 * Applies one committed, read-back-verified transition. The caller must save
 * the returned state before dispatching `nextChaseCheckingBatchCommand`.
 */
export const transitionChaseCheckingBatch = (
  stateInput: ChaseCheckingBatchState,
  expectedRevision: number,
  event: ChaseCheckingBatchEvent,
  updatedAt: string,
): ChaseCheckingBatchState => {
  const state = parseChaseCheckingBatchState(stateInput);
  if (expectedRevision !== state.revision) throw new StaleChaseCheckingBatchRevisionError();
  assertTimestamp(updatedAt);
  if (state.stage === 'COMPLETE' || state.stage === 'FAILED') throw new Error('Terminal Chase checking batch state cannot advance.');
  const periods = copyPeriods(state);
  let stage: ChaseCheckingBatchStage = state.stage;
  let currentPeriodIndex = state.currentPeriodIndex;
  let failureCode: string | undefined;

  if (event.kind === 'failed') {
    if (!/^[A-Z][A-Z0-9_:-]{1,80}$/.test(event.failureCode)) throw new Error('Failure code is invalid.');
    stage = 'FAILED';
    failureCode = event.failureCode;
  } else if (event.kind === 'preflight') {
    const period = periods[event.periodIndex];
    if (stage !== 'PREFLIGHT' || event.periodIndex !== currentPeriodIndex || !period || period.status !== 'PENDING') throw new Error('Preflight transition is out of order.');
    const expected = REVIEWED_CHASE_CHECKING_PERIODS[event.periodIndex];
    if (event.financialAccountId !== HASS_CHASE_CHECKING_ACCOUNT_ID || event.sourceKind !== 'BANK' || event.mimeType !== 'application/pdf' || event.contentHash !== expected.contentHash || event.periodStart !== expected.periodStart || event.periodEnd !== expected.periodEnd || event.rowCount !== expected.expectedRows) throw new Error('Preflight evidence does not match the reviewed BANK artifact.');
    assertSafeId(event.artifactId, 'SourceArtifact ID');
    assertSafeId(event.fileId, 'Twenty File ID');
    period.status = 'FACTS';
    period.sourceArtifactId = event.artifactId;
    period.sourceFileId = event.fileId;
    stage = 'FACTS';
  } else if (event.kind === 'factsCommitted') {
    const period = periods[event.periodIndex];
    if (stage !== 'FACTS' || event.periodIndex !== currentPeriodIndex || !period || period.status !== 'FACTS' || event.offset !== period.nextFactOffset || !Number.isSafeInteger(event.count) || event.count < 1 || event.count > CHASE_CHECKING_FACT_BATCH_SIZE || event.offset + event.count > period.expectedRows || event.readbackCount !== event.offset + event.count) throw new Error('Fact chunk transition is out of order or unverified.');
    period.nextFactOffset += event.count;
    if (period.nextFactOffset === period.expectedRows) {
      period.status = 'RECEIPT';
      stage = 'RECEIPT';
    }
  } else if (event.kind === 'receiptCommitted') {
    const period = periods[event.periodIndex];
    if (stage !== 'RECEIPT' || event.periodIndex !== currentPeriodIndex || !period || period.status !== 'RECEIPT' || period.nextFactOffset !== period.expectedRows || event.importedRows !== period.expectedRows || event.factReadbackCount !== period.expectedRows) throw new Error('Receipt transition is out of order or incomplete.');
    assertSafeId(event.receiptId, 'Import receipt ID');
    period.receiptId = event.receiptId;
    period.status = 'FINALIZE';
    stage = 'FINALIZE';
  } else {
    const period = periods[event.periodIndex];
    if (stage !== 'FINALIZE' || event.periodIndex !== currentPeriodIndex || !period || period.status !== 'FINALIZE' || period.receiptId !== event.receiptId || event.artifactStatus !== 'IMPORTED' || event.rowCount !== period.expectedRows || event.factReadbackCount !== period.expectedRows) throw new Error('Finalize transition is out of order or incomplete.');
    period.status = 'IMPORTED';
    currentPeriodIndex += 1;
    stage = currentPeriodIndex === periods.length ? 'COMPLETE' : 'PREFLIGHT';
  }

  return parseChaseCheckingBatchState({
    ...state,
    stage,
    currentPeriodIndex,
    revision: state.revision + 1,
    updatedAt,
    ...(failureCode ? { failureCode } : {}),
    periods,
  });
};

export const nextChaseCheckingBatchCommand = (
  stateInput: ChaseCheckingBatchState,
): ChaseCheckingBatchCommand | null => {
  const state = parseChaseCheckingBatchState(stateInput);
  if (state.stage === 'COMPLETE' || state.stage === 'FAILED') return null;
  const period = state.periods[state.currentPeriodIndex];
  if (!period) throw new Error('Active batch has no current period.');
  return {
    stage: state.stage,
    periodIndex: state.currentPeriodIndex,
    expectedRevision: state.revision,
    ...(state.stage === 'FACTS' ? { factOffset: period.nextFactOffset } : {}),
  };
};
