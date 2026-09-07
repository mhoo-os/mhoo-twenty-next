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
const ensureRecords = async (
  client: RestApiClient,
  kind: 'payment' | 'receipt',
  identities: RecordValues[],
  observedAt: string,
) => {
  if (!identities.length) return [];
  const plural =
    kind === 'payment' ? 'cloverPaymentRevisions' : 'cloverImportReceipts';
  const keyField = kind === 'payment' ? 'revisionKey' : 'pageKey';
  const keys = identities.map((identity) => identity[keyField]);
  if (
    keys.length > 100 ||
    new Set(keys).size !== keys.length ||
    keys.some((key) => typeof key !== 'string' || !/^[a-f0-9]{64}$/.test(key))
  )
    throw new Error('Invalid native record keys');
  const read = async () => {
    const response = await client.get<{
      data: Record<string, (RecordValues & { id: string })[]>;
    }>(`/rest/${plural}`, {
      query: {
        filter: `${keyField}[in]:${JSON.stringify(keys)}`,
        limit: 100,
        depth: 0,
      },
      signal: AbortSignal.timeout(4000),
    });
    const rows = response.data[plural];
    if (
      !Array.isArray(rows) ||
      rows.length > keys.length ||
      new Set(rows.map((row) => row[keyField])).size !== rows.length ||
      rows.some((row) => !keys.includes(row[keyField]))
    )
      throw new Error('Ambiguous native revisions');
    for (const row of rows) {
      const identity = identities.find(
        (item) => item[keyField] === row[keyField],
      )!;
      if (
        typeof row.id !== 'string' ||
        !row.id ||
        Object.entries(identity).some(
          ([field, value]) =>
            JSON.stringify(row[field]) !== JSON.stringify(value),
        )
      )
        throw new Error('Native revision identity mismatch');
    }
    return rows;
  };
  let records = await read();
  const missing = identities.filter(
    (identity) => !records.some((row) => row[keyField] === identity[keyField]),
  );
  if (missing.length) {
    try {
      await client.post(
        `/rest/batch/${plural}`,
        missing.map((identity) => ({ ...identity, observedAt })),
        { signal: AbortSignal.timeout(4000) },
      );
    } catch {
      // A concurrent batch or lost response may have committed. Verify the stored result.
    }
    records = await read();
  }
  if (records.length !== identities.length)
    throw new Error('Native revisions were not confirmed');
  return identities.map(
    (identity) =>
      records.find((row) => row[keyField] === identity[keyField])!.id,
  );
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
    const records = page.revisions.map((revision) => {
      const { revisionKey, ...facts } = revision;
      if (hash(facts) !== revisionKey) throw new Error('Invalid revision');
      return {
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
      };
    });
    await ensureRecords(dependencies.client, 'payment', records, observedAt);
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
    const [receiptId] = await ensureRecords(
      dependencies.client,
      'receipt',
      [
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
      ],
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
