import { type AppConnection } from 'twenty-sdk/logic-function';
import { type RestApiClient } from 'twenty-client-sdk/rest';
import { readCloverMerchant } from './clover-merchant-read';
import { readCloverPayments } from './clover-payment-read';
import { persistCloverPaymentPage } from './persist-clover-payment-page';

export const RECENT_WINDOW_MS = 86_400_000;
export type RecentSelection = {
  connectionId: string;
  fromMs: number;
  toMs: number;
};
type Dependencies = {
  getUserConnection: (id: string) => Promise<AppConnection>;
  userWorkspaceId: string;
  client: RestApiClient;
  fetch: typeof fetch;
  now: () => Date;
};
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const failure =
  'The recent page could not be confirmed. Check saved receipts before retrying.';

const authorize = async (connectionId: string, d: Dependencies) => {
  if (!uuid.test(connectionId) || !uuid.test(d.userWorkspaceId))
    throw new Error('Invalid connection');
  const user = await d.getUserConnection(connectionId);
  if (
    user.id !== connectionId ||
    user.providerName !== 'clover-manual' ||
    user.authFailedAt ||
    !/^[A-Z0-9]{13}$/.test(user.handle)
  )
    throw new Error('Unavailable connection');
  return user;
};

export const prepareCloverRecentPage = async (
  connectionId: string,
  d: Dependencies,
) => {
  try {
    await authorize(connectionId, d);
    const merchant = await readCloverMerchant(
      {
        list: async () => [await authorize(connectionId, d)],
        get: () => authorize(connectionId, d),
        fetch: d.fetch,
      },
      connectionId,
    );
    const toMs = d.now().getTime();
    return {
      kind: 'ready' as const,
      connectionId,
      merchantId: merchant.merchantId,
      merchantName: merchant.merchantName,
      fromMs: toMs - RECENT_WINDOW_MS,
      toMs,
      maximumRecords: 100 as const,
      scopeVerification: 'unknown' as const,
    };
  } catch {
    throw new Error(failure);
  }
};

// This interactive pilot never calls the background job or accepts a cursor.
// A full page stays partial: there is deliberately no queue dependency here.
export const importCloverRecentPage = async (
  input: RecentSelection & { readOnlyConfirmed: true },
  d: Dependencies,
) => {
  try {
    const now = d.now().getTime();
    if (
      input.readOnlyConfirmed !== true ||
      !uuid.test(input.connectionId) ||
      !Number.isSafeInteger(input.fromMs) ||
      !Number.isSafeInteger(input.toMs) ||
      input.fromMs < 0 ||
      input.toMs - input.fromMs !== RECENT_WINDOW_MS ||
      input.toMs > now ||
      now - input.toMs > 15 * 60_000
    )
      throw new Error('Expired or invalid recent selection');
    const check = () => authorize(input.connectionId, d);
    const connection = await check();
    const page = await readCloverPayments(
      {
        connectionId: input.connectionId,
        fromMs: input.fromMs,
        toMs: input.toMs,
        timeField: 'createdTime',
        offset: 0,
      },
      { list: async () => [await check()], get: check, fetch: d.fetch },
    );
    const saved = await persistCloverPaymentPage(
      page,
      {
        connectionId: input.connectionId,
        merchantId: connection.handle,
        grantId: null,
        interactiveUserWorkspaceId: d.userWorkspaceId,
      },
      {
        client: d.client,
        authorize: async () => {
          await check();
        },
        now: d.now,
      },
    );
    return {
      kind: 'saved' as const,
      receiptId: saved.receiptId,
      records: saved.savedRevisions,
      moreAvailable: saved.nextOffset !== null,
      fromMs: input.fromMs,
      toMs: input.toMs,
      coverage: 'unverified' as const,
      currencyVerification: 'unresolved' as const,
    };
  } catch {
    throw new Error(failure);
  }
};

export const readCloverRecentReceipt = async (
  input: RecentSelection,
  d: Dependencies,
) => {
  try {
    await authorize(input.connectionId, d);
    if (
      !Number.isSafeInteger(input.fromMs) ||
      !Number.isSafeInteger(input.toMs) ||
      input.toMs - input.fromMs !== RECENT_WINDOW_MS ||
      input.fromMs < 0 ||
      input.toMs > d.now().getTime()
    )
      throw new Error('Invalid receipt selector');
    const response = await d.client.get<{
      data: { cloverImportReceipts: Record<string, unknown>[] };
      pageInfo: { hasNextPage: boolean };
    }>('/rest/cloverImportReceipts', {
      query: {
        filter: `and(connectionId[eq]:${input.connectionId},initiatingUserWorkspaceId[eq]:${d.userWorkspaceId},fromMs[eq]:${input.fromMs},toMs[eq]:${input.toMs})`,
        limit: 2,
        depth: 0,
      },
      signal: AbortSignal.timeout(4000),
    });
    // Recheck current user/connection access after reading stored observations.
    await authorize(input.connectionId, d);
    const rows = response.data.cloverImportReceipts;
    if (
      !Array.isArray(rows) ||
      rows.length > 1 ||
      response.pageInfo?.hasNextPage !== false
    )
      throw new Error('Ambiguous receipt');
    if (!rows.length) return { kind: 'notConfirmed' as const };
    const row = rows[0];
    if (
      !uuid.test(String(row.id)) ||
      row.connectionId !== input.connectionId ||
      row.initiatingUserWorkspaceId !== d.userWorkspaceId ||
      row.authorizationMode !== 'interactive-user-v1' ||
      row.grantId !== null ||
      row.dataset !== 'payments' ||
      row.fromMs !== input.fromMs ||
      row.toMs !== input.toMs ||
      row.timeField !== 'createdTime' ||
      row.offset !== 0 ||
      !Number.isSafeInteger(row.rowCount) ||
      Number(row.rowCount) < 0 ||
      Number(row.rowCount) > 100 ||
      (row.rowCount === 100 ? row.nextOffset !== 100 : row.nextOffset !== null)
    )
      throw new Error('Invalid receipt');
    return {
      kind: 'saved' as const,
      receiptId: row.id as string,
      records: row.rowCount as number,
      moreAvailable: row.nextOffset !== null,
      fromMs: input.fromMs,
      toMs: input.toMs,
      coverage: 'unverified' as const,
      currencyVerification: 'unresolved' as const,
    };
  } catch {
    throw new Error(failure);
  }
};

export const listCloverRecentReceipts = async (
  connectionId: string,
  d: Dependencies,
) => {
  try {
    await authorize(connectionId, d);
    const response = await d.client.get<{
      data: { cloverImportReceipts: Record<string, unknown>[] };
      pageInfo: { hasNextPage: boolean };
    }>('/rest/cloverImportReceipts', {
      query: {
        filter: `and(connectionId[eq]:${connectionId},initiatingUserWorkspaceId[eq]:${d.userWorkspaceId},authorizationMode[eq]:interactive-user-v1)`,
        limit: 5,
        depth: 0,
        order_by: 'observedAt[DescNullsLast]',
      },
      signal: AbortSignal.timeout(4000),
    });
    await authorize(connectionId, d);
    const rows = response.data.cloverImportReceipts;
    if (
      !Array.isArray(rows) ||
      rows.length > 5 ||
      typeof response.pageInfo?.hasNextPage !== 'boolean'
    )
      throw new Error('Invalid receipt list');
    const pages = rows.map((row) => {
      if (
        !uuid.test(String(row.id)) ||
        row.connectionId !== connectionId ||
        row.initiatingUserWorkspaceId !== d.userWorkspaceId ||
        row.authorizationMode !== 'interactive-user-v1' ||
        row.grantId !== null ||
        row.dataset !== 'payments' ||
        row.offset !== 0 ||
        row.timeField !== 'createdTime' ||
        !Number.isSafeInteger(row.fromMs) ||
        !Number.isSafeInteger(row.toMs) ||
        Number(row.fromMs) < 0 ||
        Number(row.toMs) > d.now().getTime() ||
        Number(row.toMs) - Number(row.fromMs) !== RECENT_WINDOW_MS ||
        !Number.isSafeInteger(row.rowCount) ||
        Number(row.rowCount) < 0 ||
        Number(row.rowCount) > 100 ||
        (row.rowCount === 100
          ? row.nextOffset !== 100
          : row.nextOffset !== null)
      )
        throw new Error('Invalid interactive receipt');
      return {
        receiptId: row.id as string,
        records: row.rowCount as number,
        moreAvailable: row.nextOffset !== null,
        fromMs: row.fromMs as number,
        toMs: row.toMs as number,
      };
    });
    if (new Set(pages.map((p) => p.receiptId)).size !== pages.length)
      throw new Error('Duplicate receipts');
    return {
      kind: 'receipts' as const,
      pages,
      hasMore: response.pageInfo.hasNextPage,
    };
  } catch {
    throw new Error(failure);
  }
};
