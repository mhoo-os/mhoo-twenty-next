import { type RestApiClient } from 'twenty-client-sdk/rest';
import {
  type AppConnection,
  RetryableLogicFunctionError,
} from 'twenty-sdk/logic-function';
import {
  authorizeCloverSync,
  type CloverSyncGrantInput,
} from './authorize-clover-sync';
import {
  readCloverPayments,
  planPaymentWindows,
  type PaymentWindow,
} from './clover-payment-read';
import { persistCloverPaymentPage } from './persist-clover-payment-page';

export type CloverPaymentJob = CloverSyncGrantInput &
  PaymentWindow & {
    previousReceiptId: string | null;
  };
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const importCloverPaymentJob = async (
  input: CloverPaymentJob,
  dependencies: {
    client: RestApiClient;
    getConnection: (id: string) => Promise<AppConnection>;
    fetch: typeof fetch;
    enqueue: (payload: CloverPaymentJob) => Promise<void>;
    now: () => Date;
  },
) => {
  try {
    if (
      !input ||
      planPaymentWindows(input.fromMs, input.toMs).length !== 1 ||
      !['createdTime', 'modifiedTime'].includes(input.timeField) ||
      !Number.isSafeInteger(input.offset) ||
      input.offset < 0 ||
      input.offset > 10000 ||
      input.offset % 100 !== 0 ||
      (input.offset === 0
        ? input.previousReceiptId !== null
        : !uuid.test(input.previousReceiptId ?? ''))
    )
      throw new Error('Invalid bounded job');
    const authorize = () =>
      authorizeCloverSync(input, dependencies.getConnection);
    const connection = await authorize();
    if (input.offset > 0) {
      const result = await dependencies.client.get<{
        data: { cloverImportReceipt: Record<string, unknown> };
      }>(`/rest/cloverImportReceipts/${input.previousReceiptId}`, {
        signal: AbortSignal.timeout(4000),
      });
      const receipt = result.data.cloverImportReceipt;
      if (
        !receipt ||
        receipt.id !== input.previousReceiptId ||
        receipt.connectionId !== connection.id ||
        receipt.grantId !== input.grantId ||
        receipt.dataset !== 'payments' ||
        receipt.fromMs !== input.fromMs ||
        receipt.toMs !== input.toMs ||
        receipt.timeField !== input.timeField ||
        receipt.offset !== input.offset - 100 ||
        receipt.nextOffset !== input.offset ||
        receipt.rowCount !== 100 ||
        !Array.isArray(receipt.revisionKeys) ||
        receipt.revisionKeys.length !== 100
      )
        throw new Error('Missing committed predecessor');
    }
    // Every custody retrieval rechecks the current grant; caller IDs are selectors only.
    const page = await readCloverPayments(input, {
      list: async () => [await authorize()],
      get: async () => authorize(),
      fetch: dependencies.fetch,
    });
    const saved = await persistCloverPaymentPage(
      page,
      {
        connectionId: connection.id,
        merchantId: connection.handle,
        grantId: input.grantId,
      },
      {
        client: dependencies.client,
        authorize: async () => {
          await authorize();
        },
        now: dependencies.now,
      },
    );
    if (saved.nextOffset !== null && saved.nextOffset <= 10000) {
      await authorize();
      // Commit and queue are separate native operations. Failed/ambiguous enqueue
      // fails this job so native retries can replay the page and retry dispatch.
      try {
        await dependencies.enqueue({
          connectionId: input.connectionId,
          grantId: input.grantId,
          fromMs: input.fromMs,
          toMs: input.toMs,
          timeField: input.timeField,
          offset: saved.nextOffset,
          previousReceiptId: saved.receiptId,
        });
      } catch {
        throw new RetryableLogicFunctionError(
          'Native next-page dispatch was not confirmed.',
        );
      }
    }
    return {
      ...saved,
      status:
        saved.nextOffset === null
          ? ('rangeRead' as const)
          : saved.nextOffset > 10000
            ? ('needsRangeSubdivision' as const)
            : ('nextPageQueued' as const),
    };
  } catch (error) {
    if (error instanceof RetryableLogicFunctionError)
      throw new RetryableLogicFunctionError(
        'Clover payment job incomplete. Replay from the last confirmed receipt.',
      );
    throw new Error(
      'Clover payment job incomplete. Replay from the last confirmed receipt.',
    );
  }
};
