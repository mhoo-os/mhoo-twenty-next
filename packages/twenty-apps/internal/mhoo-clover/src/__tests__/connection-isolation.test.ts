import { describe, expect, it, vi } from 'vitest';
import { readCloverMerchant } from '../logic-functions/clover-merchant-read';
import { resolveCloverConnection } from '../logic-functions/resolve-clover-connection';
import { cloverSourceKey } from '../contracts/source-identity';
import connectionObject from '../objects/clover-connection.object';
import syncObject from '../objects/clover-sync-state.object';
import connectionIndex from '../indexes/connection-key.index';
import syncIndex from '../indexes/sync-state-key.index';
const a = {
  id: 'connection-a',
  providerName: 'clover-manual',
  handle: 'ABCDEFGHIJKLM',
  accessToken: 'synthetic-a-token',
  authFailedAt: null,
};
const b = {
  ...a,
  id: 'connection-b',
  handle: 'NOPQRSTUVWXYZ',
  accessToken: 'synthetic-b-token',
};
const make = () => ({
  list: vi.fn(async () => [a, b]),
  get: vi.fn(async (id: string) => {
    if (id === a.id) return a;
    if (id === b.id) return b;
    throw new Error('Denied');
  }),
});
describe('multiple authorized Clover connections', () => {
  it('requires explicit selection when several are visible', async () => {
    const d = make();
    await expect(resolveCloverConnection(d)).rejects.toThrow('Select one');
    expect(d.get).not.toHaveBeenCalled();
  });
  it('denies selectors outside native visibility', async () => {
    const d = make();
    await expect(
      resolveCloverConnection(d, 'other-workspace'),
    ).rejects.toThrow();
    expect(d.get).not.toHaveBeenCalled();
  });
  it('denies a changed binding after listing', async () => {
    const d = make();
    d.get.mockResolvedValue(b);
    await expect(resolveCloverConnection(d, a.id)).rejects.toThrow(
      'Unavailable',
    );
  });
  it('disconnecting A preserves B and routes its exact credential', async () => {
    const d = make();
    d.get.mockImplementation(async (id) => {
      if (id === a.id) throw new Error('Disconnected');
      return b;
    });
    const transport = vi.fn(
      async (_url: string | URL | Request, _init?: RequestInit) =>
        new Response(JSON.stringify({ id: b.handle, name: 'Merchant B' })),
    );
    await expect(
      readCloverMerchant({ ...d, fetch: transport }, a.id),
    ).rejects.toThrow('unavailable');
    expect(transport).not.toHaveBeenCalled();
    expect(
      await readCloverMerchant({ ...d, fetch: transport }, b.id),
    ).toMatchObject({ merchantId: b.handle });
    expect(transport.mock.calls[0][0]).toContain(b.handle);
    expect(
      new Headers(transport.mock.calls[0][1]?.headers).get('Authorization'),
    ).toBe(`Bearer ${b.accessToken}`);
  });
  it('separates connection, kind and parent identities', () => {
    const keys = [
      cloverSourceKey(a.id, 'payment', 'same'),
      cloverSourceKey(b.id, 'payment', 'same'),
      cloverSourceKey(a.id, 'refund', 'same'),
      cloverSourceKey(a.id, 'payment', 'same', 'parent'),
    ];
    expect(new Set(keys).size).toBe(4);
    expect(cloverSourceKey('a:b', 'c', 'd')).not.toBe(
      cloverSourceKey('a', 'b:c', 'd'),
    );
    expect(cloverSourceKey(a.id, 'payment', 'same')).toBe(keys[0]);
  });
  it('validates native objects and unique keys', () => {
    for (const d of [connectionObject, syncObject, connectionIndex, syncIndex])
      expect(d.success).toBe(true);
    expect(connectionIndex.config?.isUnique).toBe(true);
    expect(syncIndex.config?.isUnique).toBe(true);
  });
});
