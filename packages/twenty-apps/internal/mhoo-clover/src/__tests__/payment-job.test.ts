import { beforeEach, expect, it, vi } from 'vitest';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { type AppConnection } from 'twenty-sdk/logic-function';
import {
  importCloverPaymentJob,
  type CloverPaymentJob,
} from '../logic-functions/import-clover-payment-job';
import { persistCloverPaymentPage } from '../logic-functions/persist-clover-payment-page';

vi.mock('../logic-functions/persist-clover-payment-page', () => ({
  persistCloverPaymentPage: vi.fn(),
}));
const savedId = '33333333-3333-4333-8333-333333333333';
const input: CloverPaymentJob = {
  connectionId: '11111111-1111-4111-8111-111111111111',
  grantId: '22222222-2222-4222-8222-222222222222',
  fromMs: 1000,
  toMs: 2000,
  timeField: 'modifiedTime',
  offset: 0,
  previousReceiptId: null,
};
const connection = {
  id: input.connectionId,
  handle: 'ABCDEFGHIJKLM',
  providerName: 'clover-manual',
  visibility: 'workspace',
  authFailedAt: null,
  accessToken: 'synthetic-private',
  manualTokenWorkspaceGrantId: input.grantId,
} as AppConnection;
const saved = {
  receiptId: savedId,
  pageKey: 'a'.repeat(64),
  savedRevisions: 100,
  nextOffset: 100,
  coverage: 'unverified' as const,
};
const deps = () => ({
  client: new RestApiClient({
    baseUrl: 'https://native.invalid',
    token: 'synthetic',
    fetch: vi.fn(async () =>
      Response.json({
        data: {
          cloverImportReceipt: {
            id: savedId,
            connectionId: input.connectionId,
            grantId: input.grantId,
            dataset: 'payments',
            fromMs: 1000,
            toMs: 2000,
            timeField: 'modifiedTime',
            offset: 0,
            nextOffset: 100,
            rowCount: 100,
            revisionKeys: Array.from({ length: 100 }, (_, i) => String(i)),
          },
        },
      }),
    ),
  }),
  getConnection: vi.fn(async () => connection),
  fetch: vi.fn(async () =>
    Response.json({ elements: [] }),
  ) as unknown as typeof fetch,
  enqueue: vi.fn(async () => {}),
  now: () => new Date('2026-09-07T00:00:00Z'),
});
beforeEach(() => {
  vi.mocked(persistCloverPaymentPage).mockReset().mockResolvedValue(saved);
});
it('queues only the committed receipt and exact connection/grant/window', async () => {
  const d = deps();
  await expect(importCloverPaymentJob(input, d)).resolves.toMatchObject({
    status: 'nextPageQueued',
  });
  expect(d.enqueue).toHaveBeenCalledWith({
    ...input,
    offset: 100,
    previousReceiptId: savedId,
  });
  expect(
    vi.mocked(persistCloverPaymentPage).mock.invocationCallOrder[0],
  ).toBeLessThan(d.enqueue.mock.invocationCallOrder[0]);
  expect(JSON.stringify(d.enqueue.mock.calls)).not.toContain(
    'synthetic-private',
  );
});
it('checks the preceding native receipt before a continuation provider read', async () => {
  const d = deps();
  await importCloverPaymentJob(
    { ...input, offset: 100, previousReceiptId: savedId },
    d,
  );
  expect(d.fetch).toHaveBeenCalledTimes(1);
});
it.each([
  { ...input, offset: 100, previousReceiptId: null },
  { ...input, offset: 200, previousReceiptId: savedId },
  { ...input, offset: 0, previousReceiptId: savedId },
  { ...input, offset: 10100, previousReceiptId: savedId },
])(
  'rejects skipped or unsupported offsets before provider use %#',
  async (job) => {
    const d = deps();
    await expect(importCloverPaymentJob(job, d)).rejects.toThrow(
      'job incomplete',
    );
    expect(d.fetch).not.toHaveBeenCalled();
    expect(d.enqueue).not.toHaveBeenCalled();
  },
);
it('denies stale queued grants before provider access', async () => {
  const d = deps();
  d.getConnection.mockResolvedValue({
    ...connection,
    manualTokenWorkspaceGrantId: null,
  });
  await expect(importCloverPaymentJob(input, d)).rejects.toThrow();
  expect(d.fetch).not.toHaveBeenCalled();
  expect(d.enqueue).not.toHaveBeenCalled();
});
it('never dispatches after an unconfirmed page save', async () => {
  const d = deps();
  vi.mocked(persistCloverPaymentPage).mockRejectedValueOnce(
    new Error('write failed'),
  );
  await expect(importCloverPaymentJob(input, d)).rejects.toThrow();
  expect(d.enqueue).not.toHaveBeenCalled();
});
it('fails ambiguous enqueue so native retry can replay the confirmed page', async () => {
  const d = deps();
  d.enqueue.mockRejectedValueOnce(new Error('lost response'));
  await expect(importCloverPaymentJob(input, d)).rejects.toThrow();
  await importCloverPaymentJob(input, d);
  expect(d.enqueue).toHaveBeenCalledTimes(2);
  expect(d.enqueue.mock.calls[0]).toEqual(d.enqueue.mock.calls[1]);
});
it('rechecks revocation after saving and before dispatch', async () => {
  const d = deps();
  vi.mocked(persistCloverPaymentPage).mockImplementationOnce(async () => {
    d.getConnection.mockResolvedValue({
      ...connection,
      manualTokenWorkspaceGrantId: null,
    });
    return saved;
  });
  await expect(importCloverPaymentJob(input, d)).rejects.toThrow();
  expect(d.enqueue).not.toHaveBeenCalled();
});
it('reports offset exhaustion without claiming complete history or queuing an invalid page', async () => {
  const d = deps();
  vi.mocked(persistCloverPaymentPage).mockResolvedValueOnce({
    ...saved,
    nextOffset: 10100,
  });
  expect(await importCloverPaymentJob(input, d)).toMatchObject({
    status: 'needsRangeSubdivision',
    coverage: 'unverified',
  });
  expect(d.enqueue).not.toHaveBeenCalled();
});
it('ends an empty range without a coverage claim or further dispatch', async () => {
  const d = deps();
  vi.mocked(persistCloverPaymentPage).mockResolvedValueOnce({
    ...saved,
    nextOffset: null,
    savedRevisions: 0,
  });
  expect(await importCloverPaymentJob(input, d)).toMatchObject({
    status: 'rangeRead',
    coverage: 'unverified',
  });
  expect(d.enqueue).not.toHaveBeenCalled();
});
