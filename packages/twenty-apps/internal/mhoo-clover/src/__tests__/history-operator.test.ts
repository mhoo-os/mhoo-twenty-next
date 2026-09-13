import { afterEach, expect, it, vi } from 'vitest';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { type AppConnection } from 'twenty-sdk/logic-function';
import { PAYMENT_WINDOW_MS } from '../logic-functions/clover-payment-read';
import {
  startCloverPaymentHistory,
  recoverCloverPaymentReceipt,
} from '../logic-functions/plan-clover-payment-history';
import { cloverOperatorRuntime } from '../logic-functions/clover-operator-runtime';
import { PAYMENT_IMPORT_FUNCTION } from '../contracts/model-identifiers';

const input = {
  connectionId: '11111111-1111-4111-8111-111111111111',
  grantId: '22222222-2222-4222-8222-222222222222',
  fromMs: 0,
  toMs: PAYMENT_WINDOW_MS + 1000,
  timeField: 'modifiedTime' as const,
};
const receiptId = '33333333-3333-4333-8333-333333333333';
const connection = {
  id: input.connectionId,
  handle: 'ABCDEFGHIJKLM',
  providerName: 'clover-manual',
  visibility: 'workspace',
  authFailedAt: null,
  manualTokenWorkspaceGrantId: input.grantId,
  accessToken: 'synthetic-secret',
} as AppConnection;
const receipt = () => ({
  id: receiptId,
  connectionId: input.connectionId,
  grantId: input.grantId,
  dataset: 'payments',
  fromMs: 1000,
  toMs: 2000,
  timeField: 'modifiedTime',
  offset: 0,
  nextOffset: 100,
  rowCount: 100,
  revisionKeys: Array.from({ length: 100 }, (_, i) =>
    i.toString(16).padStart(64, '0'),
  ),
});
const deps = (r: Record<string, unknown> = receipt()) => {
  const transport = vi.fn(async () =>
    Response.json({ data: { cloverImportReceipt: r } }),
  );
  return {
    getUserConnection: vi.fn(async () => connection),
    getAppConnection: vi.fn(async () => connection),
    enqueue: vi.fn(async (_jobs: unknown[]) => {}),
    now: () => new Date('2026-09-07T00:00:00Z'),
    transport,
    client: new RestApiClient({
      baseUrl: 'https://native.invalid',
      token: 'synthetic',
      fetch: transport,
    }),
  };
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it('plans contiguous bounded roots and dispatches only selectors, never credentials', async () => {
  const d = deps();
  expect(await startCloverPaymentHistory(input, d)).toMatchObject({
    status: 'queued',
    queuedRanges: 2,
    coverage: 'unverified',
  });
  expect(d.enqueue).toHaveBeenCalledWith([
    { ...input, toMs: PAYMENT_WINDOW_MS, offset: 0, previousReceiptId: null },
    { ...input, fromMs: PAYMENT_WINDOW_MS, offset: 0, previousReceiptId: null },
  ]);
  expect(d.getUserConnection.mock.invocationCallOrder[0]).toBeLessThan(
    d.getAppConnection.mock.invocationCallOrder[0],
  );
  expect(JSON.stringify(d.enqueue.mock.calls)).not.toContain(
    'synthetic-secret',
  );
});
it.each([
  { ...input, toMs: Date.UTC(2100, 0, 1) },
  { ...input, fromMs: -1 },
  { ...input, toMs: PAYMENT_WINDOW_MS * 201 },
  { ...input, timeField: 'arbitrary' as never },
])(
  'rejects future, oversized or invalid ranges before native access %#',
  async (candidate) => {
    const d = deps();
    await expect(startCloverPaymentHistory(candidate, d)).rejects.toThrow();
    expect(d.getUserConnection).not.toHaveBeenCalled();
    expect(d.enqueue).not.toHaveBeenCalled();
  },
);
it('does not fall back to App authority after a user denial', async () => {
  const d = deps();
  d.getUserConnection.mockRejectedValue(new Error('denied'));
  await expect(startCloverPaymentHistory(input, d)).rejects.toThrow();
  await expect(
    recoverCloverPaymentReceipt({ ...input, receiptId }, d),
  ).rejects.toThrow();
  expect(d.getAppConnection).not.toHaveBeenCalled();
  expect(d.transport).not.toHaveBeenCalled();
  expect(d.enqueue).not.toHaveBeenCalled();
});
it('rejects stale grants and connection identity changes', async () => {
  for (const candidate of [
    { ...connection, manualTokenWorkspaceGrantId: null },
    { ...connection, handle: 'NOPQRSTUVWXYZ' },
  ]) {
    const d = deps();
    d.getAppConnection.mockResolvedValue(candidate);
    await expect(startCloverPaymentHistory(input, d)).rejects.toThrow();
    expect(d.enqueue).not.toHaveBeenCalled();
  }
});
it('recovers the exact native continuation and rechecks both authorities before enqueue', async () => {
  const d = deps();
  expect(
    await recoverCloverPaymentReceipt({ ...input, receiptId }, d),
  ).toMatchObject({ status: 'queued', nextOffset: 100 });
  expect(d.enqueue).toHaveBeenCalledWith([
    {
      connectionId: input.connectionId,
      grantId: input.grantId,
      fromMs: 1000,
      toMs: 2000,
      timeField: 'modifiedTime',
      offset: 100,
      previousReceiptId: receiptId,
    },
  ]);
  expect(d.getUserConnection).toHaveBeenCalledTimes(2);
  expect(d.getAppConnection).toHaveBeenCalledTimes(2);
});
it.each([
  { connectionId: '44444444-4444-4444-8444-444444444444' },
  { grantId: '44444444-4444-4444-8444-444444444444' },
  { nextOffset: 200 },
  { revisionKeys: [] },
  { dataset: 'orders' },
  { fromMs: -1 },
])('rejects altered/cross-merchant/stale receipt fields %#', async (change) => {
  const d = deps({ ...receipt(), ...change });
  await expect(
    recoverCloverPaymentReceipt({ ...input, receiptId }, d),
  ).rejects.toThrow();
  expect(d.enqueue).not.toHaveBeenCalled();
});
it('does not turn a short page into a complete-history claim or enqueue', async () => {
  const d = deps({
    ...receipt(),
    rowCount: 0,
    revisionKeys: [],
    nextOffset: null,
  });
  expect(
    await recoverCloverPaymentReceipt({ ...input, receiptId }, d),
  ).toMatchObject({ status: 'rangeRead', coverage: 'unverified' });
  expect(d.enqueue).not.toHaveBeenCalled();
});
it('returns explicit subdivision requirement at the offset cap', async () => {
  const d = deps({ ...receipt(), offset: 10000, nextOffset: 10100 });
  expect(
    await recoverCloverPaymentReceipt({ ...input, receiptId }, d),
  ).toMatchObject({ status: 'needsRangeSubdivision' });
  expect(d.enqueue).not.toHaveBeenCalled();
});
it('denies a revoked grant between receipt lookup and dispatch', async () => {
  const d = deps();
  d.getAppConnection
    .mockResolvedValueOnce(connection)
    .mockResolvedValueOnce({
      ...connection,
      manualTokenWorkspaceGrantId: null,
    });
  await expect(
    recoverCloverPaymentReceipt({ ...input, receiptId }, d),
  ).rejects.toThrow();
  expect(d.enqueue).not.toHaveBeenCalled();
});
it('does not report queued when enqueue response is lost', async () => {
  const d = deps();
  d.enqueue.mockRejectedValue(new Error('synthetic-secret'));
  await expect(startCloverPaymentHistory(input, d)).rejects.not.toThrow(
    'synthetic-secret',
  );
});
it('requires interactive membership and explicit native tokens', () => {
  expect(() =>
    cloverOperatorRuntime({ userWorkspaceId: null, workspaceMemberId: null }),
  ).toThrow();
  vi.stubEnv('TWENTY_APP_ACCESS_TOKEN', 'synthetic-user');
  vi.stubEnv('TWENTY_APP_APPLICATION_ACCESS_TOKEN', '');
  expect(() =>
    cloverOperatorRuntime({
      userWorkspaceId: 'user',
      workspaceMemberId: 'member',
    }),
  ).toThrow('Native App');
});
it('dispatches with explicit App identity even when a user token is present', async () => {
  vi.stubEnv('TWENTY_API_URL', 'https://native.invalid');
  vi.stubEnv('TWENTY_APP_ACCESS_TOKEN', 'synthetic-user');
  vi.stubEnv('TWENTY_APP_APPLICATION_ACCESS_TOKEN', 'synthetic-app');
  const transport = vi.fn(async () =>
    Response.json({
      data: {
        enqueueJobs: {
          enqueued: true,
          enqueuedJobsCount: 1,
          logicFunctionUniversalIdentifier: PAYMENT_IMPORT_FUNCTION,
        },
      },
    }),
  );
  vi.stubGlobal('fetch', transport);
  const runtime = cloverOperatorRuntime({
    userWorkspaceId: 'user',
    workspaceMemberId: 'member',
  });
  await runtime.enqueue([{ ...input, offset: 0, previousReceiptId: null }]);
  const options = transport.mock.calls[0] as unknown as [unknown, RequestInit];
  expect(new Headers(options[1].headers).get('Authorization')).toBe(
    'Bearer synthetic-app',
  );
});
