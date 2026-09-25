import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  CHASE_CHECKING_BATCH_KEY,
  HASS_CHASE_CHECKING_ACCOUNT_ID,
  REVIEWED_CHASE_CHECKING_PERIODS,
  createChaseCheckingBatchState,
  transitionChaseCheckingBatch,
} from '../ingestion/chase-checking-batch-state';
import { CHASE_CHECKING_PDF_CONTROLS_PROFILE } from '../ingestion/chase-pdf-controls';
import {
  runChaseCheckingImportJob,
  type ChaseCheckingCoreClient,
  type ChaseCheckingImportDependencies,
  type ChaseCheckingParsedPeriod,
} from './chase-checking-import-job';

const now = (second: number): string =>
  new Date(Date.UTC(2026, 8, 15, 0, 0, second)).toISOString();

const period = REVIEWED_CHASE_CHECKING_PERIODS[0];
const artifactId = 'artifact-2025-01';
const fileId = 'file-2025-01';

const LOCAL_REVIEWED_PDF_IDS = [
  '12Nyg37VXplxt9QD4jpQL_ZM8x--CCpKg',
  '1wUZeGymZXrJlwnpCzONQsD8iwXhFMN_a',
  '1qadGvYa5Xtmfz-zpgyCqUqH4rqw0O1ps',
  '1ZkOfFTgawP-rOdOZnriVK9JB13h1Bvbk',
  '1ya_FxLjjn1d3xtMUjWRxhLT2GhEIctLy',
  '1vKZBRzvo3H2luRlSkvZEOYgnwwny6-Vb',
  '1XkI6q-czVTj4iRWWNuIHJIssTri4YIhi',
  '1ff-rspjNzzV2RJbf-IoTnc29rMKbsHRn',
  '1Kj3AgItDyNHJzuQ_o3kNbE-UdwsPbBzq',
  '1LSJw148c5oqPsIvVgbOc6tc1RcRG78rl',
  '1fNkkKC2PD8TYF1YLoyY__z0gWI3b9p-3',
  '1aONI1KG2_x7s1-XRp0kq8QuociqG4wpn',
  '1jxfNDlD8gsKM4Wka8T8EyUJVRq-lZUiZ',
  '1vKMeCse71xEKz9CXcw4wXrPt7aDBYnJa',
  '12YEljYDeqnpiyRclgMTiOEKraoYIp9Ru',
  '1fYDNs3SWgOnZPUZN-_08YSdz04OXZy-l',
  '1hZVSZgQAj-0kgzC-TNcb7LvCtfJDUEIm',
  '1cpSLsO-kQYBNMsNybGG5KwNF17PN6fou',
  '17wKETNl-sAYuxUobqWlrmGc4eQYGlMO9',
  '1Lk575m044wKfi616WN2_kikcjcWHkiSS',
] as const;

const LOCAL_REVIEWED_PDF_ROOT = '/tmp/hass-checking-20260915';

const fakePeriod = (): ChaseCheckingParsedPeriod => {
  const rows = Array.from({ length: period.expectedRows }, (_, index) => ({
    category: 'Deposits and Additions' as const,
    date: '2025-01-01',
    amountMinor: 100,
    amountPrecision: 'CENT' as const,
    description: `Synthetic row ${index + 1}`,
    sourceLine: index + 100,
  }));
  const facts = rows.map((row, index) => ({
    id: `fact-id-${index + 1}`,
    factKey: `fact-hass-chase-business-checking-artifact-key-2025-01-chase-pdf:${row.sourceLine}:${index + 1}-r1`,
    sourceRowKey: `pdf:text-line:${row.sourceLine}`,
    sourceLocation: `pdf:text-line:${row.sourceLine}`,
    sourceAmount: '1.00',
    sourceSignConvention: 'SIGNED_AMOUNT_POSITIVE_INFLOW',
    transactionDate: row.date,
    postedDate: row.date,
    rawValues: '{}',
    artifactId,
    financialAccountId: HASS_CHASE_CHECKING_ACCOUNT_ID,
    period: '2025-01',
    amount: { amountMicros: '10000', currencyCode: 'USD' },
    exactAmountMinor: '100',
    sourceCurrency: 'USD',
    classification: 'UNCLASSIFIED',
    status: 'POSTED',
    revision: 1,
    includedInTotals: false,
    exclusionReason: 'SOURCE_UNRECONCILED',
    description: row.description,
  }));
  return {
    artifact: {
      id: artifactId,
      artifactKey: 'artifact-key-2025-01',
      financialAccountId: HASS_CHASE_CHECKING_ACCOUNT_ID,
      financialAccount: { id: HASS_CHASE_CHECKING_ACCOUNT_ID },
      accountKey: 'hass-chase-business-checking',
      period: period.period,
      sourceKind: 'BANK',
      mimeType: 'application/pdf',
      originalFileName: '2025-01.pdf',
      byteLength: 4,
      contentHash: period.contentHash,
      acquiredAt: '2026-09-15T00:00:00.000Z',
      acquiredBy: 'fixture',
      originalFiles: [{ fileId }],
    },
    account: { id: HASS_CHASE_CHECKING_ACCOUNT_ID, sourceKind: 'BANK' },
    handoff: {
      id: 'handoff-2025-01',
      handoffKey: `chase-pdf-extraction:${period.contentHash}`,
      sourceArtifact: { id: artifactId },
      sourcePdfHash: period.contentHash,
      extractionHash: 'b'.repeat(64),
      parserProfile: CHASE_CHECKING_PDF_CONTROLS_PROFILE.id,
      parserVersion: CHASE_CHECKING_PDF_CONTROLS_PROFILE.version,
      extractionMimeType: 'text/plain',
      textByteLength: 1,
      pageCount: 6,
      extractionFiles: [{ fileId: 'text-2025-01' }],
    },
    controls: {
      profileId: CHASE_CHECKING_PDF_CONTROLS_PROFILE.id,
      profileVersion: CHASE_CHECKING_PDF_CONTROLS_PROFILE.version,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      expectedPageCount: 6,
      observedPageNumbers: [1, 2, 3, 4, 5, 6],
      openingBalanceMinor: 0,
      closingBalanceMinor: 7500,
      reportedTransactionCount: period.expectedRows,
      categories: { 'Deposits and Additions': { count: period.expectedRows, amountMinor: 7500 } },
    },
    rows,
    facts,
    receiptKey: 'receipt-hass-chase-business-checking:artifact-key-2025-01:hash',
    statementControls: JSON.stringify({ periodStart: period.periodStart, periodEnd: period.periodEnd }),
  };
};

const createHarness = (
  initialState?: ReturnType<typeof createChaseCheckingBatchState>,
  options: { casFailures?: number; casConflictState?: ReturnType<typeof createChaseCheckingBatchState> } = {},
) => {
  const source = fakePeriod();
  let stored: unknown = initialState;
  const operations: string[] = [];
  let facts: Record<string, unknown>[] = [];
  let receipt: Record<string, unknown> | null = null;
  let casFailures = options.casFailures ?? 0;
  const artifact = { id: artifactId, status: 'IMPORTED', rowCount: period.expectedRows, statementControls: source.statementControls };
  const core: ChaseCheckingCoreClient = {
    query: async (request) => {
      const root = request as Record<string, unknown>;
      if ('financeFacts' in root) {
        const page = root.financeFacts as Record<string, unknown>;
        const after = (page.__args as Record<string, unknown> | undefined)?.after;
        const offset = typeof after === 'string' ? Number(after) : 0;
        return { financeFacts: { edges: facts.slice(offset, offset + 100).map((node) => ({ node })), pageInfo: { hasNextPage: false, endCursor: null } } };
      }
      if ('importReceipts' in root) return { importReceipts: { edges: receipt ? [{ node: receipt }] : [] } };
      if ('sourceArtifacts' in root) return { sourceArtifacts: { edges: [{ node: artifact }] } };
      throw new Error('Unexpected query in harness.');
    },
    mutation: async (request) => {
      const root = request as Record<string, unknown>;
      if ('createFinanceFacts' in root) {
        const data = ((root.createFinanceFacts as Record<string, unknown>).__args as Record<string, unknown>).data as Record<string, unknown>[];
        facts = [...facts, ...data];
        operations.push(`facts:${data.length}`);
        return { createFinanceFacts: data.map((fact) => ({ id: fact.id, factKey: fact.factKey })) };
      }
      if ('createImportReceipt' in root) {
        receipt = { id: 'receipt-id', ...(((root.createImportReceipt as Record<string, unknown>).__args as Record<string, unknown>).data as Record<string, unknown>) };
        operations.push('receipt');
        return { createImportReceipt: { id: receipt.id, receiptKey: receipt.receiptKey } };
      }
      if ('updateSourceArtifact' in root) {
        operations.push('artifact');
        return { updateSourceArtifact: artifact };
      }
      throw new Error('Unexpected mutation in harness.');
    },
  };
  const dependencies: ChaseCheckingImportDependencies = {
    core,
    stateStore: {
      get: async () => stored,
      create: async (_key, value) => { operations.push('state:create'); stored = value; },
      compareAndSet: async (_key, expectedRevision, value) => {
        if ((stored as { revision: number } | null)?.revision !== expectedRevision) return false;
        if (casFailures > 0) {
          casFailures -= 1;
          if (options.casConflictState) stored = options.casConflictState;
          return false;
        }
        operations.push('state:cas');
        stored = value;
        return true;
      },
    },
    fetchFile: async (requested) => requested.fileId === fileId ? new Uint8Array([1, 2, 3, 4]) : new Uint8Array([5]),
    now: () => now(10),
    enqueue: async () => { operations.push('enqueue'); },
    loadPeriod: async () => source,
  };
  return { dependencies, operations, getState: () => stored, source };
};

const preflightState = () => {
  const state = createChaseCheckingBatchState(now(0));
  return transitionChaseCheckingBatch(state, 0, {
    kind: 'preflight',
    periodIndex: 0,
    artifactId,
    fileId,
    financialAccountId: HASS_CHASE_CHECKING_ACCOUNT_ID,
    sourceKind: 'BANK',
    mimeType: 'application/pdf',
    contentHash: period.contentHash,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    rowCount: period.expectedRows,
  }, now(1));
};

describe('Hass Chase checking import job', () => {
  it.skipIf(!existsSync(LOCAL_REVIEWED_PDF_ROOT))('binds all 20 reviewed periods to their exact local PDF bytes', () => {
    const hashes = LOCAL_REVIEWED_PDF_IDS.map((fileId) => createHash('sha256').update(readFileSync(join(LOCAL_REVIEWED_PDF_ROOT, `${fileId}.pdf`))).digest('hex'));
    expect(new Set(hashes).size).toBe(REVIEWED_CHASE_CHECKING_PERIODS.length);
    expect(hashes).toEqual(REVIEWED_CHASE_CHECKING_PERIODS.map(({ contentHash }) => contentHash));
  });

  it('initializes, persists preflight before enqueue, and does not accept an event payload', async () => {
    const harness = createHarness();
    const result = await runChaseCheckingImportJob({ batchKey: CHASE_CHECKING_BATCH_KEY, periodIndex: 0, expectedRevision: 0 }, harness.dependencies);
    expect(result).toMatchObject({ status: 'ADVANCED', stage: 'FACTS', revision: 1, queued: true });
    expect(harness.operations.indexOf('state:cas')).toBeLessThan(harness.operations.lastIndexOf('enqueue'));
    expect((harness.getState() as { periods: readonly { sourceArtifactId: string | null }[] }).periods[0]?.sourceArtifactId).toBe(artifactId);
    await expect(runChaseCheckingImportJob({ batchKey: CHASE_CHECKING_BATCH_KEY, periodIndex: 0, expectedRevision: 0, event: { kind: 'failed' } }, harness.dependencies)).resolves.toMatchObject({ status: 'STALE' });
  });

  it('writes deterministic <=60 fact chunks and resumes from the persisted cursor', async () => {
    const harness = createHarness(preflightState());
    const first = await runChaseCheckingImportJob({ batchKey: CHASE_CHECKING_BATCH_KEY, periodIndex: 0, expectedRevision: 1 }, harness.dependencies);
    expect(first).toMatchObject({ stage: 'FACTS', revision: 2, currentPeriodIndex: 0 });
    expect(harness.operations).toContain('facts:60');
    const second = await runChaseCheckingImportJob({ batchKey: CHASE_CHECKING_BATCH_KEY, periodIndex: 0, expectedRevision: 2 }, harness.dependencies);
    expect(second).toMatchObject({ stage: 'RECEIPT', revision: 3, currentPeriodIndex: 0 });
    expect(harness.operations).toContain('facts:15');
  });

  it('creates the receipt only after the complete fact readback', async () => {
    const harness = createHarness(preflightState());
    await runChaseCheckingImportJob({ batchKey: CHASE_CHECKING_BATCH_KEY, periodIndex: 0, expectedRevision: 1 }, harness.dependencies);
    await runChaseCheckingImportJob({ batchKey: CHASE_CHECKING_BATCH_KEY, periodIndex: 0, expectedRevision: 2 }, harness.dependencies);
    const result = await runChaseCheckingImportJob({ batchKey: CHASE_CHECKING_BATCH_KEY, periodIndex: 0, expectedRevision: 3 }, harness.dependencies);
    expect(result).toMatchObject({ stage: 'FINALIZE', revision: 4 });
    expect(harness.operations.indexOf('facts:15')).toBeLessThan(harness.operations.indexOf('receipt'));
  });

  it('requeues the current persisted command on a stale duplicate without replaying writes', async () => {
    const state = preflightState();
    const harness = createHarness(state);
    const result = await runChaseCheckingImportJob({ batchKey: CHASE_CHECKING_BATCH_KEY, periodIndex: 0, expectedRevision: 0 }, harness.dependencies);
    expect(result).toMatchObject({ status: 'STALE', revision: 1, queued: true });
    expect(harness.operations.filter((operation) => operation.startsWith('facts:'))).toHaveLength(0);
  });

  it('replays a committed fact chunk after a CAS failure without duplicating the upsert', async () => {
    const harness = createHarness(preflightState(), { casFailures: 1 });
    await expect(runChaseCheckingImportJob({ batchKey: CHASE_CHECKING_BATCH_KEY, periodIndex: 0, expectedRevision: 1 }, harness.dependencies)).rejects.toThrow('compare-and-set');
    expect(harness.operations).toContain('facts:60');
    const resumed = await runChaseCheckingImportJob({ batchKey: CHASE_CHECKING_BATCH_KEY, periodIndex: 0, expectedRevision: 1 }, harness.dependencies);
    expect(resumed).toMatchObject({ stage: 'FACTS', revision: 2 });
    expect(harness.operations.filter((operation) => operation === 'facts:60')).toHaveLength(1);
  });

  it('treats a same-revision CAS loser as stale after re-reading the winner state', async () => {
    const initial = createChaseCheckingBatchState(now(0));
    const winner = preflightState();
    const harness = createHarness(initial, { casFailures: 1, casConflictState: winner });
    const result = await runChaseCheckingImportJob({ batchKey: CHASE_CHECKING_BATCH_KEY, periodIndex: 0, expectedRevision: 0 }, harness.dependencies);
    expect(result).toMatchObject({ status: 'STALE', stage: 'FACTS', revision: 1, queued: true });
  });
});
