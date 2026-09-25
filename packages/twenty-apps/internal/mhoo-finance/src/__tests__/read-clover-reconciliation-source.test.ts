import { describe, expect, it, vi } from 'vitest';

import { readCloverReconciliationSource } from '../logic-functions/read-clover-reconciliation-source';

const connectionId = '11111111-1111-4111-8111-111111111111';
const receiptId = '22222222-2222-4222-8222-222222222222';
const revisionKey = 'a'.repeat(64);

const client = (currencyCode = 'USD') => ({
  get: vi.fn(async (path: string) => {
    if (path === `/rest/cloverConnections/${connectionId}`)
      return { data: { cloverConnection: { id: connectionId, merchantId: 'VNSJRRWTAQPJ1' } } };
    if (path === `/rest/cloverImportReceipts/${receiptId}`)
      return {
        data: {
          cloverImportReceipt: {
            id: receiptId,
            connectionId,
            dataset: 'payments',
            pageKey: 'b'.repeat(64),
            fromMs: 1,
            toMs: 2,
            timeField: 'createdTime',
            offset: 0,
            nextOffset: null,
            rowCount: 1,
            revisionKeys: [revisionKey],
            coverage: 'unverified',
          },
        },
      };
    return {
      data: {
        cloverPaymentRevisions: [
          {
            id: 'revision-record',
            connectionId,
            revisionKey,
            paymentId: 'PAYMENT1',
            merchantId: 'VNSJRRWTAQPJ1',
            amountMinor: 1000,
            currencyCode,
            createdTimeMs: 1,
            modifiedTimeMs: 1,
            result: 'SUCCESS',
            voided: false,
          },
        ],
      },
    };
  }),
});

describe('Clover reconciliation source reader', () => {
  it('returns a ready POS account preview for a complete receipt page', async () => {
    const result = await readCloverReconciliationSource(
      { connectionId, receiptId },
      { client: client() as never },
    );
    expect(result).toMatchObject({
      status: 'ready',
      account: { sourceKind: 'POS', merchantId: 'VNSJRRWTAQPJ1' },
      receipt: { rowCount: 1, nextOffset: null },
    });
  });

  it('blocks Finance publication when the source currency is unresolved', async () => {
    const result = await readCloverReconciliationSource(
      { connectionId, receiptId },
      { client: client('') as never },
    );
    expect(result.status).toBe('blocked');
    expect(result.blockers).toContain('CURRENCY_UNRESOLVED');
  });
});
