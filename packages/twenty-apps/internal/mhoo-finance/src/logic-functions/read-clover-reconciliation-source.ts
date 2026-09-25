import { type RestApiClient } from 'twenty-client-sdk/rest';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RecordValues = Record<string, unknown>;

export type CloverReconciliationSourceInput = {
  connectionId: string;
  receiptId: string;
};

type Dependencies = {
  client: RestApiClient;
};

const requiredUuid = (value: unknown, label: string) => {
  if (typeof value !== 'string' || !UUID.test(value))
    throw new Error(`Invalid ${label}`);
  return value;
};

const requiredRecord = (value: unknown, label: string) => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`Invalid ${label}`);
  return value as RecordValues;
};

const readOne = async (
  client: RestApiClient,
  plural: string,
  id: string,
) => {
  const response = await client.get<{ data: Record<string, RecordValues> }>(
    `/rest/${plural}/${id}`,
    { signal: AbortSignal.timeout(4000) },
  );
  return requiredRecord(response.data[plural.slice(0, -1)], plural);
};

export const readCloverReconciliationSource = async (
  input: CloverReconciliationSourceInput,
  dependencies: Dependencies,
) => {
  const connectionId = requiredUuid(input?.connectionId, 'connectionId');
  const receiptId = requiredUuid(input?.receiptId, 'receiptId');
  const connection = await readOne(dependencies.client, 'cloverConnections', connectionId);
  const receipt = await readOne(dependencies.client, 'cloverImportReceipts', receiptId);
  const rowCount = receipt.rowCount;
  const revisionKeysValue = receipt.revisionKeys;

  if (receipt.connectionId !== connectionId || receipt.dataset !== 'payments')
    throw new Error('Receipt is outside the selected Clover connection');
  if (
    typeof rowCount !== 'number' ||
    !Number.isSafeInteger(rowCount) ||
    rowCount < 0 ||
    rowCount > 100 ||
    !Array.isArray(revisionKeysValue) ||
    revisionKeysValue.length !== rowCount ||
    new Set(revisionKeysValue).size !== revisionKeysValue.length ||
    revisionKeysValue.some(
      (key) => typeof key !== 'string' || !/^[a-f0-9]{64}$/.test(key),
    )
  )
    throw new Error('Receipt page identity is invalid');

  const revisionKeys = revisionKeysValue as string[];
  const revisionsResponse = await dependencies.client.get<{
    data: { cloverPaymentRevisions: RecordValues[] };
  }>('/rest/cloverPaymentRevisions', {
    query: {
      filter: `revisionKey[in]:${JSON.stringify(revisionKeys)}`,
      limit: 100,
      depth: 0,
    },
    signal: AbortSignal.timeout(4000),
  });
  const revisions = revisionsResponse.data.cloverPaymentRevisions;
  if (
    !Array.isArray(revisions) ||
    revisions.length !== revisionKeys.length ||
    revisions.some(
      (revision) =>
        revision.connectionId !== connectionId ||
        typeof revision.revisionKey !== 'string' ||
        !revisionKeys.includes(revision.revisionKey),
    )
  )
    throw new Error('Receipt revisions are incomplete or mismatched');

  const currencyMissing = revisions.some(
    (revision) =>
      typeof revision.currencyCode !== 'string' ||
      revision.currencyCode.trim().length === 0,
  );
  return {
    status: currencyMissing ? ('blocked' as const) : ('ready' as const),
    blockers: currencyMissing ? ['CURRENCY_UNRESOLVED'] : [],
    account: {
      accountKey: `clover:${connection.merchantId}`,
      accountLabel: `Clover POS ${connection.merchantId}`,
      sourceKind: 'POS' as const,
      merchantId: connection.merchantId,
      connectionId,
    },
    receipt: {
      id: receipt.id,
      pageKey: receipt.pageKey,
      fromMs: receipt.fromMs,
      toMs: receipt.toMs,
      timeField: receipt.timeField,
      offset: receipt.offset,
      nextOffset: receipt.nextOffset,
      rowCount: receipt.rowCount,
      coverage: receipt.coverage,
    },
    revisions,
  };
};
