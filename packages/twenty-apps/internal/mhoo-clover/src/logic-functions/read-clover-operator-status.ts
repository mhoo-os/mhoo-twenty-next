import { decodeStatus, type StatusResult } from '../operator/status-contract';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_WINDOW_MS = 89 * 24 * 60 * 60 * 1000;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown, max: number): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max;
const uuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);
const connectionMetadata = (value: unknown): value is Record<string, unknown> =>
  object(value) && uuid(value.id) && typeof value.providerName === 'string' &&
  typeof value.handle === 'string' && (value.visibility === 'workspace' || value.visibility === 'user') &&
  (value.authFailedAt === null || (typeof value.authFailedAt === 'string' && Number.isFinite(Date.parse(value.authFailedAt))));

// Server-only dependencies. Native connection objects may contain credentials;
// they must never cross this adapter's display-result boundary.
export type StatusDependencies = {
  listUserConnections: () => Promise<unknown>;
  getAppConnection: (id: string) => Promise<unknown>;
  getReceipts: (path: string, options: {
    query: Record<string, string | number>;
    signal: AbortSignal;
  }) => Promise<unknown>;
  now: () => number;
};

export function mapCloverReceiptStatus(
  response: unknown,
  connectionId: string,
  grantId: string,
  now: number,
): StatusResult {
  if (!uuid(connectionId) || !uuid(grantId) || !integer(now, Number.MAX_SAFE_INTEGER) ||
      !object(response) || !object(response.data) || !object(response.pageInfo) ||
      typeof response.pageInfo.hasNextPage !== 'boolean' ||
      !Array.isArray(response.data.cloverImportReceipts) || response.data.cloverImportReceipts.length > 50)
    return { kind: 'uncertain' };
  const pages = [];
  for (const row of response.data.cloverImportReceipts) {
    if (!object(row) || !uuid(row.id) || row.connectionId !== connectionId || row.dataset !== 'payments' ||
        !(row.grantId === null || uuid(row.grantId)) ||
        !integer(row.fromMs, now) || !integer(row.toMs, now) || row.fromMs >= row.toMs || row.toMs - row.fromMs > MAX_WINDOW_MS ||
        !integer(row.offset, 10000) || row.offset % 100 !== 0 || !integer(row.rowCount, 100) ||
        (row.rowCount === 100 ? row.nextOffset !== row.offset + 100 : row.nextOffset !== null) ||
        typeof row.observedAt !== 'string' || !Number.isFinite(Date.parse(row.observedAt)) ||
        Date.parse(row.observedAt) > now || new Date(row.observedAt).toISOString() !== row.observedAt)
      return { kind: 'uncertain' };
    pages.push({ id: row.id, records: row.rowCount, nextOffset: row.nextOffset, currentGrant: row.grantId === grantId });
  }
  // Reuse the shared decoder's duplicate-ID and page-cap checks. Only these
  // allowlisted display fields leave the server; no raw row or errors escape.
  return decodeStatus({ kind: 'available', pages, hasMore: response.pageInfo.hasNextPage });
}

export async function readCloverOperatorStatus(
  connectionId: string,
  dependencies: StatusDependencies,
): Promise<StatusResult> {
  if (!uuid(connectionId)) return { kind: 'denied' };
  try {
    const visible = await dependencies.listUserConnections();
    if (!Array.isArray(visible) || visible.length > 50 ||
        visible.some((value) => !object(value) || !uuid(value.id)) ||
        new Set(visible.map((value) => value.id)).size !== visible.length)
      return { kind: 'uncertain' };
    const user = visible.find((value) => value.id === connectionId);
    // Absence means unavailable in this successful authorized list, not proof
    // that the provider account or credential does not exist.
    if (!user) return { kind: 'missing' };
    if (!connectionMetadata(user)) return { kind: 'uncertain' };
    if (user.providerName !== 'clover-manual' || user.visibility !== 'workspace' || user.authFailedAt !== null)
      return { kind: 'denied' };
    if (typeof user.handle !== 'string' || !/^[A-Z0-9]{13}$/.test(user.handle))
      return { kind: 'uncertain' };
    const app = await dependencies.getAppConnection(connectionId);
    if (!connectionMetadata(app)) return { kind: 'uncertain' };
    if (app.id !== connectionId || app.handle !== user.handle || app.providerName !== 'clover-manual' ||
        app.visibility !== 'workspace' || app.authFailedAt !== null)
      return { kind: 'denied' };
    // The current SDK deliberately hides missing/denied/inactive grants behind
    // plain GraphQL Error. Null or a thrown lookup is NOT proof of "grant off".
    if (!uuid(app.manualTokenWorkspaceGrantId)) return { kind: 'uncertain' };
    const response = await dependencies.getReceipts('/rest/cloverImportReceipts', {
      query: { filter: `connectionId[eq]:${connectionId}`, limit: 50, depth: 0, order_by: 'observedAt[DescNullsLast]' },
      signal: AbortSignal.timeout(4000),
    });
    return mapCloverReceiptStatus(response, connectionId, app.manualTokenWorkspaceGrantId, dependencies.now());
  } catch {
    // Do not classify by an error string or forward its potentially private body.
    return { kind: 'uncertain' };
  }
}
