import { readFileSync } from 'node:fs';
import { extractDefineEntity } from '../../../../../twenty-sdk/src/cli/utilities/build/manifest/manifest-extract-config';
import { describe, expect, it } from 'vitest';
import { decodeStatus, pageStatus } from './status-contract';
describe('read-only payment status boundary', () => {
  it('does not reinterpret missing or denied access as empty records', () => {
    expect(decodeStatus({ kind: 'denied', pages: [] })).toEqual({ kind: 'denied' });
    expect(decodeStatus({ kind: 'missing' })).toEqual({ kind: 'missing' });
  });
  it('rejects malformed, over-limit and duplicate receipts', () => {
    const p = { id: 'page-1', records: 100, nextOffset: 100, currentGrant: true };
    for (const pages of [[{ ...p, records: -1 }], [{ ...p, nextOffset: 10101 }], [p, p], Array(51).fill(p)])
      expect(decodeStatus({ kind: 'available', pages, hasMore: false })).toEqual({ kind: 'uncertain' });
  });
  it('removes non-contract fields instead of forwarding private adapter payloads', () => {
    expect(decodeStatus({ kind: 'available', pages: [], hasMore: false, privateField: 'discard' })).toEqual({ kind: 'available', pages: [], hasMore: false });
  });
  it('retains partial, stale and ended coverage distinctions', () => {
    const p = { id: 'p', records: 100, nextOffset: 100, currentGrant: true };
    expect(pageStatus(p)).toBe('partial');
    expect(pageStatus({ ...p, currentGrant: false })).toBe('stale');
    expect(pageStatus({ ...p, nextOffset: 10100 })).toBe('subdivide');
    expect(pageStatus({ ...p, nextOffset: null })).toBe('unverified');
  });
});

it('keeps the synthetic Twenty definition out of App manifest discovery', () => {
  const source = readFileSync(new URL('../../harness/twenty-adapter.tsx', import.meta.url), 'utf8');
  expect(extractDefineEntity(source)).toBeUndefined();
});
