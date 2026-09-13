// Read-only presentation contract. Selectors never grant Workspace authority.
export type Merchant = { id: string; name: string };
export type Page = { id: string; records: number; nextOffset: number | null; currentGrant: boolean };
export type StatusResult =
  | { kind: 'denied' }
  | { kind: 'missing' }
  | { kind: 'uncertain' }
  | { kind: 'available'; pages: Page[]; hasMore: boolean };
export type StatusReader = (connectionId: string) => Promise<StatusResult>;
export type PageStatus = 'stale' | 'subdivide' | 'partial' | 'unverified';
export function pageStatus(page: Page): PageStatus {
  if (!page.currentGrant) return 'stale';
  if (page.nextOffset !== null && page.nextOffset > 10000) return 'subdivide';
  return page.nextOffset === null ? 'unverified' : 'partial';
}
export const pageLabels: Record<PageStatus, string> = {
  stale: 'Earlier grant · cannot resume',
  subdivide: 'Smaller date windows needed',
  partial: 'Partial history · more pages remain',
  unverified: 'Range ended · coverage unverified',
};
// Runtime input is untrusted even when an adapter has a TypeScript signature.
// Decode only display facts, rejecting malformed data without exposing payloads.
export function decodeStatus(input: unknown): StatusResult {
  if (!input || typeof input !== 'object') return { kind: 'uncertain' };
  const value = input as Record<string, unknown>;
  if (value.kind === 'denied' || value.kind === 'missing' || value.kind === 'uncertain')
    return { kind: value.kind };
  if (value.kind !== 'available' || !Array.isArray(value.pages) || value.pages.length > 50 || typeof value.hasMore !== 'boolean')
    return { kind: 'uncertain' };
  const pages: Page[] = [];
  const ids = new Set<string>();
  for (const raw of value.pages) {
    if (!raw || typeof raw !== 'object') return { kind: 'uncertain' };
    const p = raw as Record<string, unknown>;
    if (typeof p.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(p.id) || ids.has(p.id) ||
      typeof p.records !== 'number' || !Number.isInteger(p.records) || p.records < 0 || p.records > 100 ||
      typeof p.currentGrant !== 'boolean' ||
      (p.nextOffset !== null && (typeof p.nextOffset !== 'number' || !Number.isInteger(p.nextOffset) || p.nextOffset < 100 || p.nextOffset > 10100 || p.nextOffset % 100 !== 0)))
      return { kind: 'uncertain' };
    ids.add(p.id);
    pages.push({ id: p.id, records: p.records, nextOffset: p.nextOffset as number | null, currentGrant: p.currentGrant });
  }
  return { kind: 'available', pages, hasMore: value.hasMore };
}
