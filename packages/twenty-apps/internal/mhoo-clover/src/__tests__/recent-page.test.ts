import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { type AppConnection } from 'twenty-sdk/logic-function';
import { type RestApiClient } from 'twenty-client-sdk/rest';
import {
  importCloverRecentPage,
  listCloverRecentReceipts,
  prepareCloverRecentPage,
  readCloverRecentReceipt,
  RECENT_WINDOW_MS,
} from '../logic-functions/import-clover-recent-page';
import { persistCloverPaymentPage } from '../logic-functions/persist-clover-payment-page';
const persist = vi.hoisted(() => vi.fn());
vi.mock('../logic-functions/persist-clover-payment-page', () => ({
  persistCloverPaymentPage: persist,
}));
const id = '11111111-1111-4111-8111-111111111111';
const grant = '22222222-2222-4222-8222-222222222222';
const now = Date.parse('2026-09-08T01:00:00Z');
const marker = 'synthetic-server-only-secret';
const connection = {
  id,
  handle: 'ABCDEFGHIJKLM',
  providerName: 'clover-manual',
  authFailedAt: null,
  visibility: 'workspace',
  accessToken: marker,
  manualTokenWorkspaceGrantId: grant,
} as AppConnection;
const input = {
  connectionId: id,
  fromMs: now - RECENT_WINDOW_MS,
  toMs: now,
  readOnlyConfirmed: true as const,
};
const row = (n: number) => ({
  id: String(n).padStart(13, 'A'),
  amount: 100,
  createdTime: now - 1000,
  modifiedTime: now - 500,
  result: 'SUCCESS',
});
const deps = () => ({
  getUserConnection: vi.fn(async () => connection),
  userWorkspaceId: id,
  client: {} as RestApiClient,
  now: () => new Date(now),
  fetch: vi.fn(async () =>
    Response.json({ elements: Array.from({ length: 100 }, (_, i) => row(i)) }),
  ) as unknown as ReturnType<typeof vi.fn> & typeof fetch,
});
beforeEach(() => {
  persist.mockImplementation(async (page, _binding, d) => {
    await d.authorize();
    return {
      receiptId: 'receipt',
      savedRevisions: page.revisions.length,
      nextOffset: page.nextOffset,
    };
  });
});
afterEach(() => {
  vi.clearAllMocks();
});
it('verifies merchant identity before offering a fixed last24h/100-record preview, without storage', async () => {
  const d = deps();
  d.fetch.mockResolvedValue(
    Response.json({ id: connection.handle, name: 'Test Merchant' }),
  );
  const result = await prepareCloverRecentPage(id, d);
  expect(result).toEqual({
    kind: 'ready',
    connectionId: id,
    merchantId: connection.handle,
    merchantName: 'Test Merchant',
    fromMs: input.fromMs,
    toMs: now,
    maximumRecords: 100,
    scopeVerification: 'unknown',
  });
  expect(d.fetch).toHaveBeenCalledTimes(1);
  expect(persist).not.toHaveBeenCalled();
  expect(JSON.stringify(result)).not.toContain(marker);
});
it('reads exactly one 100-row GET page and persists it without dispatching its continuation', async () => {
  const d = deps();
  const result = await importCloverRecentPage(input, d);
  expect(d.fetch).toHaveBeenCalledTimes(1);
  const [rawUrl, options] = d.fetch.mock.calls[0];
  const url = new URL(String(rawUrl));
  expect(url.origin).toBe('https://api.clover.com');
  expect(url.pathname).toBe('/v3/merchants/ABCDEFGHIJKLM/payments');
  expect(url.searchParams.get('limit')).toBe('100');
  expect(url.searchParams.get('offset')).toBe('0');
  expect(url.searchParams.getAll('filter')).toEqual([
    `createdTime>=${input.fromMs}`,
    `createdTime<${input.toMs}`,
  ]);
  expect(options).toMatchObject({ method: 'GET', redirect: 'error' });
  expect(result).toMatchObject({
    kind: 'saved',
    records: 100,
    moreAvailable: true,
    coverage: 'unverified',
    currencyVerification: 'unresolved',
  });
  expect(persistCloverPaymentPage).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(result)).not.toContain(marker);
});
it.each([
  { readOnlyConfirmed: false },
  { fromMs: 0 },
  { toMs: now + 1 },
  { fromMs: input.fromMs - 901000, toMs: now - 901000 },
  { connectionId: 'forged' },
])(
  'rejects unconfirmed, broad, future, expired or malformed input before credentials/provider/storage: %j',
  async (change) => {
    const d = deps();
    await expect(
      importCloverRecentPage({ ...input, ...change } as typeof input, d),
    ).rejects.toThrow('could not be confirmed');
    expect(d.getUserConnection).not.toHaveBeenCalled();
    expect(d.fetch).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  },
);
it('denies human access before App credential lookup, and hides opaque credential errors', async () => {
  const d = deps();
  d.getUserConnection.mockRejectedValue(new Error(marker));
  await expect(importCloverRecentPage(input, d)).rejects.toThrow(
    'could not be confirmed',
  );
  expect(d.fetch).not.toHaveBeenCalled();
  expect(persist).not.toHaveBeenCalled();
});
it('does not require a background grant for the interactive page', async () => {
  const d = deps();
  d.getUserConnection.mockResolvedValue({
    ...connection,
    visibility: 'user',
    manualTokenWorkspaceGrantId: null,
  });
  await expect(importCloverRecentPage(input, d)).resolves.toMatchObject({
    kind: 'saved',
  });
  expect(persist.mock.calls[0][1]).toEqual({
    connectionId: id,
    merchantId: connection.handle,
    grantId: null,
    interactiveUserWorkspaceId: id,
  });
});
it('reauthorizes after provider read and rejects revocation before storage acknowledgement', async () => {
  const d = deps();
  d.fetch.mockImplementation(async () => {
    d.getUserConnection.mockRejectedValue(new Error(marker));
    return Response.json({ elements: [row(1)] });
  });
  await expect(importCloverRecentPage(input, d)).rejects.toThrow(
    'could not be confirmed',
  );
  expect(d.fetch).toHaveBeenCalledTimes(1);
});
it('rejects provider failure or oversized result before persistence', async () => {
  for (const response of [
    Response.json({}, { status: 403 }),
    Response.json({ elements: Array.from({ length: 101 }, (_, i) => row(i)) }),
  ]) {
    const d = deps();
    d.fetch.mockResolvedValue(response);
    await expect(importCloverRecentPage(input, d)).rejects.toThrow(
      'could not be confirmed',
    );
  }
  expect(persist).not.toHaveBeenCalled();
});

it('reads only the current interactive caller receipt and rechecks native access', async () => {
  const d = deps();
  const receipt = {
    id: grant,
    connectionId: id,
    initiatingUserWorkspaceId: id,
    authorizationMode: 'interactive-user-v1',
    grantId: null,
    dataset: 'payments',
    fromMs: input.fromMs,
    toMs: input.toMs,
    timeField: 'createdTime',
    offset: 0,
    rowCount: 0,
    nextOffset: null,
  };
  const get = vi.fn(async () => ({
    data: { cloverImportReceipts: [receipt] },
    pageInfo: { hasNextPage: false },
  }));
  d.client = { get } as unknown as RestApiClient;
  await expect(readCloverRecentReceipt(input, d)).resolves.toMatchObject({
    kind: 'saved',
    records: 0,
  });
  expect(d.getUserConnection).toHaveBeenCalledTimes(2);
  expect(d.fetch).not.toHaveBeenCalled();
  expect(get.mock.calls[0]).toEqual([
    '/rest/cloverImportReceipts',
    expect.objectContaining({
      query: expect.objectContaining({
        filter: expect.stringContaining(`initiatingUserWorkspaceId[eq]:${id}`),
      }),
    }),
  ]);
  receipt.initiatingUserWorkspaceId = grant;
  await expect(readCloverRecentReceipt(input, d)).rejects.toThrow(
    'could not be confirmed',
  );
});

it('reloads only the current caller receipts without a preview or background grant', async () => {
  const d = deps();
  d.getUserConnection.mockResolvedValue({
    ...connection,
    visibility: 'user',
    manualTokenWorkspaceGrantId: null,
  });
  const row = {
    id: grant,
    connectionId: id,
    initiatingUserWorkspaceId: id,
    authorizationMode: 'interactive-user-v1',
    grantId: null,
    dataset: 'payments',
    fromMs: input.fromMs,
    toMs: input.toMs,
    timeField: 'createdTime',
    offset: 0,
    rowCount: 100,
    nextOffset: 100,
  };
  const get = vi.fn(async () => ({
    data: { cloverImportReceipts: [row] },
    pageInfo: { hasNextPage: false },
  }));
  d.client = { get } as unknown as RestApiClient;
  expect(await listCloverRecentReceipts(id, d)).toEqual({
    kind: 'receipts',
    pages: [
      {
        receiptId: grant,
        records: 100,
        moreAvailable: true,
        fromMs: input.fromMs,
        toMs: input.toMs,
      },
    ],
    hasMore: false,
  });
  expect(d.getUserConnection).toHaveBeenCalledTimes(2);
  expect(d.fetch).not.toHaveBeenCalled();
  for (const change of [
    { initiatingUserWorkspaceId: grant },
    { grantId: grant },
    { authorizationMode: 'background' },
    { connectionId: grant },
    { rowCount: 101 },
  ]) {
    get.mockResolvedValueOnce({
      data: { cloverImportReceipts: [{ ...row, ...change }] },
      pageInfo: { hasNextPage: false },
    });
    await expect(listCloverRecentReceipts(id, d)).rejects.toThrow(
      'could not be confirmed',
    );
  }
  d.getUserConnection
    .mockResolvedValueOnce(connection)
    .mockRejectedValueOnce(new Error('revoked'));
  await expect(listCloverRecentReceipts(id, d)).rejects.toThrow(
    'could not be confirmed',
  );
});
