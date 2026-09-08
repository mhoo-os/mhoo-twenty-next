import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { readCloverPayments } from '../logic-functions/clover-payment-read';
import { persistCloverPaymentPage } from '../logic-functions/persist-clover-payment-page';

const binding = {
  connectionId: '11111111-1111-4111-8111-111111111111',
  merchantId: 'ABCDEFGHIJKLM',
  grantId: '33333333-3333-4333-8333-333333333333',
};
const makePage = async (connectionId = binding.connectionId, amount = 100) => {
  const connection = {
    id: connectionId,
    handle: binding.merchantId,
    providerName: 'clover-manual',
    accessToken: 'synthetic-provider-secret',
    authFailedAt: null,
  };
  return readCloverPayments(
    {
      connectionId,
      fromMs: 1000,
      toMs: 2000,
      timeField: 'modifiedTime',
      offset: 0,
    },
    {
      list: async () => [connection],
      get: async () => connection,
      fetch: async () =>
        new Response(
          JSON.stringify({
            elements: [
              {
                id: 'NOPQRSTUVWXYZ',
                amount,
                createdTime: 1100,
                modifiedTime: 1500,
                result: 'SUCCESS',
                voided: false,
              },
              {
                id: 'ZYXWVUTSRQPON',
                amount: 200,
                createdTime: 1100,
                modifiedTime: 1500,
                result: 'SUCCESS',
              },
            ],
          }),
        ),
    },
  );
};
const native = () => {
  const records = new Map<string, Record<string, unknown>[]>();
  let failPayment = false;
  let loseReceiptResponse = false;
  const transport = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const parts = url.pathname.split('/');
      const isBatch = parts[2] === 'batch';
      const kind = parts[isBatch ? 3 : 2];
      const id = isBatch ? undefined : parts[3];
      const rows = records.get(kind) ?? [];
      if (init?.method === 'POST') {
        const body = JSON.parse(String(init.body));
        const inputs = isBatch ? body : [body];
        for (const values of inputs) {
          if (
            kind === 'cloverPaymentRevisions' &&
            failPayment &&
            rows.length === 1
          )
            return new Response('{}', { status: 503 });
          rows.push({ ...values, id: values.id ?? randomUUID() });
          records.set(kind, rows);
        }
        if (kind === 'cloverImportReceipts' && loseReceiptResponse)
          throw new Error('Lost response after commit');
        return Response.json({ data: rows });
      }
      if (id) {
        const record = rows.find((row) => row.id === id);
        return record
          ? Response.json({ data: { cloverConnection: record } })
          : new Response('{}', { status: 404 });
      }
      const [field, encoded] = (url.searchParams.get('filter') ?? '').split(
        '[in]:',
      );
      const values = JSON.parse(encoded);
      return Response.json({
        data: { [kind]: rows.filter((row) => values.includes(row[field])) },
      });
    },
  );
  return {
    records,
    transport,
    client: new RestApiClient({
      baseUrl: 'https://native.invalid',
      token: 'synthetic-native-token',
      fetch: transport,
    }),
    authorize: vi.fn(async () => {}),
    now: () => new Date('2026-09-07T00:00:00Z'),
    failPayment: (value: boolean) => {
      failPayment = value;
    },
    loseReceiptResponse: () => {
      loseReceiptResponse = true;
    },
  };
};

describe('durable Clover page acknowledgement', () => {
  it('deduplicates a restarted page, retains corrected revisions and merchant lineage', async () => {
    const store = native();
    const page = await makePage();
    const first = await persistCloverPaymentPage(page, binding, store);
    expect(
      await persistCloverPaymentPage(await makePage(), binding, store),
    ).toEqual(first);
    expect(store.records.get('cloverPaymentRevisions')).toHaveLength(2);
    expect(store.records.get('cloverImportReceipts')).toHaveLength(1);
    await persistCloverPaymentPage(
      await makePage(binding.connectionId, 101),
      binding,
      store,
    );
    expect(store.records.get('cloverPaymentRevisions')).toHaveLength(3);
    const second = {
      ...binding,
      connectionId: '22222222-2222-4222-8222-222222222222',
    };
    await persistCloverPaymentPage(
      await makePage(second.connectionId),
      second,
      store,
    );
    expect(store.records.get('cloverPaymentRevisions')).toHaveLength(5);
    expect(store.records.get('cloverImportReceipts')).toHaveLength(3);
    expect(JSON.stringify([...store.records])).not.toContain(
      'synthetic-provider-secret',
    );
  });
  it('leaves no page acknowledgement on partial writes and resumes without duplication', async () => {
    const store = native();
    const page = await makePage();
    store.failPayment(true);
    await expect(
      persistCloverPaymentPage(page, binding, store),
    ).rejects.toThrow('not confirmed saved');
    expect(store.records.get('cloverPaymentRevisions')).toHaveLength(1);
    expect(store.records.has('cloverImportReceipts')).toBe(false);
    store.failPayment(false);
    await persistCloverPaymentPage(page, binding, store);
    expect(store.records.get('cloverPaymentRevisions')).toHaveLength(2);
    expect(store.records.get('cloverImportReceipts')).toHaveLength(1);
  });
  it('recovers a receipt committed before its response was lost', async () => {
    const store = native();
    store.loseReceiptResponse();
    await expect(
      persistCloverPaymentPage(await makePage(), binding, store),
    ).resolves.toMatchObject({ savedRevisions: 2 });
    expect(store.records.get('cloverImportReceipts')).toHaveLength(1);
  });
  it('checks authorization before data and again before acknowledging progress', async () => {
    const store = native();
    const page = await makePage();
    store.authorize.mockRejectedValueOnce(new Error('revoked'));
    await expect(
      persistCloverPaymentPage(page, binding, store),
    ).rejects.toThrow();
    expect(store.transport).not.toHaveBeenCalled();
    store.authorize
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('revoked during write'));
    await expect(
      persistCloverPaymentPage(page, binding, store),
    ).rejects.toThrow();
    expect(store.records.get('cloverPaymentRevisions')).toHaveLength(2);
    expect(store.records.has('cloverImportReceipts')).toBe(false);
  });
  it('rejects a wrong merchant selector before any native write', async () => {
    const store = native();
    await expect(
      persistCloverPaymentPage(
        await makePage(),
        { ...binding, merchantId: 'ZYXWVUTSRQPON' },
        store,
      ),
    ).rejects.toThrow();
    expect(store.transport).not.toHaveBeenCalled();
  });
  it('does not trust a preexisting key with different stored facts', async () => {
    const store = native();
    const page = await makePage();
    await persistCloverPaymentPage(page, binding, store);
    store.records.get('cloverPaymentRevisions')![0].amountMinor = 999;
    await expect(
      persistCloverPaymentPage(page, binding, store),
    ).rejects.toThrow();
    expect(store.records.get('cloverImportReceipts')).toHaveLength(1);
  });
});

it('keeps interactive caller receipts distinct from background grants and deduplicates replay', async () => {
  const store = native(); const page = await makePage();
  const before = await persistCloverPaymentPage(page, binding, store);
  const caller = '44444444-4444-4444-8444-444444444444';
  const interactive = { ...binding, grantId: null, interactiveUserWorkspaceId: caller };
  const saved = await persistCloverPaymentPage(page, interactive, store);
  expect(await persistCloverPaymentPage(page, interactive, store)).toEqual(saved);
  expect(saved.pageKey).not.toBe(before.pageKey);
  expect(store.records.get('cloverPaymentRevisions')).toHaveLength(2);
  const receipts = store.records.get('cloverImportReceipts')!;
  expect(receipts).toHaveLength(2);
  expect(receipts[0].grantId).toBe(binding.grantId);
  expect(receipts[0].authorizationMode).toBeUndefined();
  expect(receipts[1]).toMatchObject({ grantId: null, authorizationMode: 'interactive-user-v1', initiatingUserWorkspaceId: caller });
});
it('rejects an interactive identity paired with a background grant before storage', async () => {
  const store = native();
  await expect(persistCloverPaymentPage(await makePage(), { ...binding, interactiveUserWorkspaceId: binding.connectionId }, store)).rejects.toThrow();
  expect(store.transport).not.toHaveBeenCalled();
});
