import { createHash } from 'node:crypto';
import { type RestApiClient } from 'twenty-client-sdk/rest';
import { cloverSourceKey } from '../contracts/source-identity';
import { type readCloverPayments } from './clover-payment-read';
import { ensureCloverConnection } from './save-clover-observation';

type Page = Awaited<ReturnType<typeof readCloverPayments>>;
type RecordValues = Record<string, string | number | boolean | null | string[]>;
const hash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Private fixed native routes. Neither provider bodies nor job payloads select a URL.
const ensureRecord = async (
  client: RestApiClient,
  kind: 'payment' | 'receipt',
  identity: RecordValues,
  observedAt: string,
) => {
  const plural =
    kind === 'payment' ? 'cloverPaymentRevisions' : 'cloverImportReceipts';
  const keyField = kind === 'payment' ? 'revisionKey' : 'pageKey';
  const key = identity[keyField];
  if (typeof key !== 'string' || !/^[a-f0-9]{64}$/.test(key))
    throw new Error('Invalid native record key');
  const read = async () => {
    const response = await client.get<{
      data: Record<string, (RecordValues & { id: string })[]>;
    }>(`/rest/${plural}`, {
      query: { filter: `${keyField}[eq]:${key}`, limit: 2, depth: 0 },
      signal: AbortSignal.timeout(4000),
    });
    const rows = response.data[plural];
    if (!Array.isArray(rows) || rows.length > 1)
      throw new Error('Ambiguous native revision');
    return rows[0];
  };
  let record = await read();
  if (!record) {
    try {
      await client.post(
        `/rest/${plural}`,
        { ...identity, observedAt },
        { signal: AbortSignal.timeout(4000) },
      );
    } catch {
      /* A competing identical save may have committed. Re-read and verify. */
    }
    record = await read();
  }
  if (
    !record ||
    typeof record.id !== 'string' ||
    !record.id ||
    Object.entries(identity).some(
      ([field, value]) =>
        JSON.stringify(record[field]) !== JSON.stringify(value),
    )
  )
    throw new Error('Native revision was not confirmed');
  return record.id;
};

// No mutable watermark is advanced. The receipt is the durable acknowledgement.
// Partial revision writes are safe to replay; failure never produces a page receipt.
export const persistCloverPaymentPage = async (
  page: Page,
  binding: { connectionId: string; merchantId: string; grantId: string | null },
  dependencies: {
    client: RestApiClient;
    authorize: () => Promise<void>;
    now: () => Date;
  },
) => {
  try {
    if (
      page.revisions.length > 100 ||
      new Set(page.revisions.map((r) => r.revisionKey)).size !==
        page.revisions.length ||
      page.revisions.some(
        (r) =>
          r.connectionId !== binding.connectionId ||
          r.merchantId !== binding.merchantId,
      )
    )
      throw new Error('Invalid page binding');
    await dependencies.authorize();
    const observedAt = dependencies.now().toISOString();
    await ensureCloverConnection(dependencies.client, {
      connectedAccountId: binding.connectionId,
      merchantId: binding.merchantId,
    });
    for (const revision of page.revisions) {
      const { revisionKey, ...facts } = revision;
      if (hash(facts) !== revisionKey) throw new Error('Invalid revision');
      await ensureRecord(
        dependencies.client,
        'payment',
        {
          revisionKey,
          sourceKey: cloverSourceKey(
            binding.connectionId,
            'payment',
            revision.paymentId,
          ),
          connectionId: binding.connectionId,
          paymentId: revision.paymentId,
          merchantId: revision.merchantId,
          amountMinor: revision.amountMinor,
          // Twenty normalizes an absent TEXT value to an empty string.
          currencyCode: revision.currency ?? '',
          createdTimeMs: revision.createdTimeMs,
          modifiedTimeMs: revision.modifiedTimeMs,
          result: revision.result,
          voided: revision.voided,
        },
        observedAt,
      );
    }
    // Revocation during data writes leaves partial data but no new progress receipt.
    await dependencies.authorize();
    const revisionKeys = page.revisions
      .map((revision) => revision.revisionKey)
      .sort();
    const requestKey = hash([
      'clover-payments-request-v1',
      binding.connectionId,
      page.range,
    ]);
    const pageKey = hash([
      'clover-payments-page-v1',
      requestKey,
      binding.grantId,
      revisionKeys,
    ]);
    const receiptId = await ensureRecord(
      dependencies.client,
      'receipt',
      {
        pageKey,
        requestKey,
        connectionId: binding.connectionId,
        dataset: 'payments',
        grantId: binding.grantId,
        ...page.range,
        nextOffset: page.nextOffset,
        rowCount: revisionKeys.length,
        revisionKeys,
        coverage: 'unverified',
      },
      observedAt,
    );
    return {
      receiptId,
      pageKey,
      savedRevisions: revisionKeys.length,
      nextOffset: page.nextOffset,
      coverage: 'unverified' as const,
    };
  } catch {
    throw new Error(
      'Clover page was not confirmed saved. Import progress has not advanced.',
    );
  }
};
