import type { Merchant, StatusReader } from '../src/operator/status-contract';
export const merchants: readonly Merchant[] = [
  { id: 'partial', name: 'Sample merchant · partial history' },
  { id: 'denied', name: 'Sample merchant · access denied' },
  { id: 'missing', name: 'Sample merchant · disconnected' },
  { id: 'uncertain', name: 'Sample merchant · status uncertain' },
  { id: 'empty', name: 'Sample merchant · no pages' },
  { id: 'slow', name: 'Sample merchant · delayed response' },
];
// Injection only: no fetch, native client, credentials, records or job dispatch.
export const readSyntheticStatus: StatusReader = async (id) => {
  if (id === 'slow') await new Promise((resolve) => setTimeout(resolve, 250));
  if (id === 'denied' || id === 'missing' || id === 'uncertain') return { kind: id };
  if (id === 'partial' || id === 'slow') return { kind: 'available', hasMore: true, pages: [
    { id: 'synthetic-page-1', records: 100, nextOffset: 100, currentGrant: true },
    { id: 'synthetic-page-2', records: 100, nextOffset: 200, currentGrant: false },
    { id: 'synthetic-page-3', records: 100, nextOffset: 10100, currentGrant: true },
    { id: 'synthetic-page-4', records: 12, nextOffset: null, currentGrant: true },
  ] };
  if (id === 'empty') return { kind: 'available', pages: [], hasMore: false };
  return { kind: 'denied' };
};
