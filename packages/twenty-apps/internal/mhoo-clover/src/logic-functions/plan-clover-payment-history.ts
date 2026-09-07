import { type RestApiClient } from 'twenty-client-sdk/rest';
import { type AppConnection } from 'twenty-sdk/logic-function';
import {
  authorizeCloverSync,
  type CloverSyncGrantInput,
} from './authorize-clover-sync';
import { planPaymentWindows } from './clover-payment-read';
import { type CloverPaymentJob } from './import-clover-payment-job';

export type HistoryInput = CloverSyncGrantInput & {
  fromMs: number;
  toMs: number;
  timeField: 'createdTime' | 'modifiedTime';
};
export type RecoveryInput = CloverSyncGrantInput & { receiptId: string };
type Dependencies = {
  getUserConnection: (id: string) => Promise<AppConnection>;
  getAppConnection: (id: string) => Promise<AppConnection>;
  enqueue: (jobs: CloverPaymentJob[]) => Promise<void>;
  now: () => Date;
};
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const authorizeOperator = async (
  input: CloverSyncGrantInput,
  d: Dependencies,
) => {
  if (!input || !uuid.test(input.connectionId) || !uuid.test(input.grantId))
    throw new Error('Invalid selection');
  // User access must succeed before an App-only credential or receipt lookup.
  const user = await d.getUserConnection(input.connectionId);
  if (
    user.id !== input.connectionId ||
    user.providerName !== 'clover-manual' ||
    user.authFailedAt
  )
    throw new Error('Unavailable operator connection');
  const app = await authorizeCloverSync(input, d.getAppConnection);
  if (user.handle !== app.handle) throw new Error('Connection changed');
  return app;
};
const errorMessage =
  'Clover dispatch was not confirmed. Check the connection and saved receipts before retrying.';

export const startCloverPaymentHistory = async (
  input: HistoryInput,
  d: Dependencies,
) => {
  try {
    if (
      !input ||
      !['createdTime', 'modifiedTime'].includes(input.timeField) ||
      input.toMs > d.now().getTime()
    )
      throw new Error('Invalid history range');
    const windows = planPaymentWindows(input.fromMs, input.toMs);
    await authorizeOperator(input, d);
    const jobs = windows.map((range) => ({
      ...range,
      connectionId: input.connectionId,
      grantId: input.grantId,
      timeField: input.timeField,
      offset: 0,
      previousReceiptId: null,
    }));
    await d.enqueue(jobs);
    return {
      status: 'queued' as const,
      connectionId: input.connectionId,
      fromMs: input.fromMs,
      toMs: input.toMs,
      timeField: input.timeField,
      queuedRanges: jobs.length,
      coverage: 'unverified' as const,
    };
  } catch {
    throw new Error(errorMessage);
  }
};

export const recoverCloverPaymentReceipt = async (
  input: RecoveryInput,
  d: Dependencies & { client: RestApiClient },
) => {
  try {
    if (!input || !uuid.test(input.receiptId))
      throw new Error('Invalid receipt');
    const connection = await authorizeOperator(input, d);
    const result = await d.client.get<{
      data: { cloverImportReceipt: Record<string, unknown> };
    }>(`/rest/cloverImportReceipts/${input.receiptId}`, {
      signal: AbortSignal.timeout(4000),
    });
    const r = result.data.cloverImportReceipt;
    if (
      !r ||
      r.id !== input.receiptId ||
      r.connectionId !== connection.id ||
      r.grantId !== input.grantId ||
      r.dataset !== 'payments' ||
      typeof r.fromMs !== 'number' ||
      typeof r.toMs !== 'number' ||
      r.toMs > d.now().getTime() ||
      planPaymentWindows(r.fromMs, r.toMs).length !== 1 ||
      !['createdTime', 'modifiedTime'].includes(String(r.timeField)) ||
      !Number.isSafeInteger(r.offset) ||
      Number(r.offset) < 0 ||
      Number(r.offset) > 10000 ||
      Number(r.offset) % 100 !== 0 ||
      !Number.isSafeInteger(r.rowCount) ||
      Number(r.rowCount) < 0 ||
      Number(r.rowCount) > 100 ||
      !Array.isArray(r.revisionKeys) ||
      r.revisionKeys.length !== r.rowCount ||
      new Set(r.revisionKeys).size !== r.revisionKeys.length ||
      r.revisionKeys.some(
        (key) => typeof key !== 'string' || !/^[a-f0-9]{64}$/.test(key),
      ) ||
      (r.rowCount === 100
        ? r.nextOffset !== Number(r.offset) + 100
        : r.nextOffset !== null)
    )
      throw new Error('Invalid native continuation');
    if (r.nextOffset === null)
      return {
        status: 'rangeRead' as const,
        receiptId: r.id,
        coverage: 'unverified' as const,
      };
    if (Number(r.nextOffset) > 10000)
      return {
        status: 'needsRangeSubdivision' as const,
        receiptId: r.id,
        coverage: 'unverified' as const,
      };
    // Recheck membership and grant after reading the receipt, before dispatch.
    await authorizeOperator(input, d);
    await d.enqueue([
      {
        connectionId: input.connectionId,
        grantId: input.grantId,
        fromMs: r.fromMs,
        toMs: r.toMs,
        timeField: r.timeField as HistoryInput['timeField'],
        offset: Number(r.nextOffset),
        previousReceiptId: input.receiptId,
      },
    ]);
    return {
      status: 'queued' as const,
      receiptId: r.id,
      nextOffset: r.nextOffset,
      coverage: 'unverified' as const,
    };
  } catch {
    throw new Error(errorMessage);
  }
};
