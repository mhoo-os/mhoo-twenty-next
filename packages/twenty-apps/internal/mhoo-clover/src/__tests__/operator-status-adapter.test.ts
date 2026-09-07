import { describe, expect, it, vi } from 'vitest';
import { readCloverOperatorStatus, mapCloverReceiptStatus } from '../logic-functions/read-clover-operator-status';
const id = '11111111-1111-4111-8111-111111111111';
const grant = '22222222-2222-4222-8222-222222222222';
const other = '33333333-3333-4333-8333-333333333333';
const now = Date.parse('2026-09-07T00:00:00.000Z');
const secret = 'synthetic-private-marker';
const connection = { id, providerName: 'clover-manual', handle: 'ABCDEFGHIJKLM', visibility: 'workspace', authFailedAt: null, accessToken: secret, manualTokenWorkspaceGrantId: grant };
const row = { id: other, connectionId: id, dataset: 'payments', grantId: grant, fromMs: now - 86400000, toMs: now - 1000, observedAt: new Date(now).toISOString(), rowCount: 100, offset: 0, nextOffset: 100, accessToken: secret };
const response = (rows: unknown[] = [row]) => ({ data: { cloverImportReceipts: rows }, pageInfo: { hasNextPage: true }, accessToken: secret });
const setup = () => ({ listUserConnections: vi.fn(async () => [connection]), getAppConnection: vi.fn(async () => connection), getReceipts: vi.fn(async () => response()), now: () => now });
describe('Clover server status adapter', () => {
  it('uses native order_by, bounded query and allowlisted output', async () => {
    const deps = setup(); const result = await readCloverOperatorStatus(id, deps);
    expect(deps.getReceipts).toHaveBeenCalledWith('/rest/cloverImportReceipts', { query: { filter: `connectionId[eq]:${id}`, limit: 50, depth: 0, order_by: 'observedAt[DescNullsLast]' }, signal: expect.any(AbortSignal) });
    expect(result).toEqual({ kind: 'available', pages: [{ id: other, records: 100, nextOffset: 100, currentGrant: true }], hasMore: true });
    expect(JSON.stringify(result)).not.toContain(secret); expect(JSON.stringify(result)).not.toContain(grant);
  });
  it('returns missing only from a successful bounded list and skips later reads', async () => {
    const deps = setup(); deps.listUserConnections.mockResolvedValue([]);
    expect(await readCloverOperatorStatus(id, deps)).toEqual({ kind: 'missing' });
    expect(deps.getAppConnection).not.toHaveBeenCalled(); expect(deps.getReceipts).not.toHaveBeenCalled();
  });
  it('does not turn plain SDK errors or null grants into permission or off claims', async () => {
    for (const message of ['HTTP 403 Forbidden', 'Connection not found', secret]) {
      const deps = setup(); deps.getAppConnection.mockRejectedValue(new Error(message));
      expect(await readCloverOperatorStatus(id, deps)).toEqual({ kind: 'uncertain' }); expect(deps.getReceipts).not.toHaveBeenCalled();
    }
    const deps = setup();
    expect(await readCloverOperatorStatus(id, { ...deps, getAppConnection: async () => ({ ...connection, manualTokenWorkspaceGrantId: null }) })).toEqual({ kind: 'uncertain' }); expect(deps.getReceipts).not.toHaveBeenCalled();
  });
  it('does not classify receipt endpoint or list errors as missing connections', async () => {
    const deps = setup(); deps.getReceipts.mockRejectedValue(new Error('HTTP 404 ' + secret));
    expect(await readCloverOperatorStatus(id, deps)).toEqual({ kind: 'uncertain' });
    deps.listUserConnections.mockRejectedValue(new Error('HTTP 403'));
    expect(await readCloverOperatorStatus(id, deps)).toEqual({ kind: 'uncertain' });
  });
  it('denies invalid selectors and explicit user/App scope mismatch without receipt access', async () => {
    const deps = setup();
    expect(await readCloverOperatorStatus('bad[eq]:input', deps)).toEqual({ kind: 'denied' }); expect(deps.listUserConnections).not.toHaveBeenCalled();
    deps.getAppConnection.mockResolvedValue({ ...connection, handle: 'NOPQRSTUVWXYZ' });
    expect(await readCloverOperatorStatus(id, deps)).toEqual({ kind: 'denied' });
    deps.listUserConnections.mockResolvedValue([{ ...connection, visibility: 'user' }]);
    expect(await readCloverOperatorStatus(id, deps)).toEqual({ kind: 'denied' }); expect(deps.getReceipts).not.toHaveBeenCalled();
  });
  it('returns uncertain for overbound or duplicate connection lists', async () => {
    const deps = setup();
    for (const visible of [Array(51).fill(connection), [connection, connection]]) {
      deps.listUserConnections.mockResolvedValue(visible); expect(await readCloverOperatorStatus(id, deps)).toEqual({ kind: 'uncertain' });
    }
    expect(deps.getAppConnection).not.toHaveBeenCalled();
  });
  it('rejects malformed, foreign, oversized and inconsistent receipts as a whole', () => {
    for (const patch of [{ id: 'bad' }, { connectionId: other }, { dataset: 'orders' }, { rowCount: 101 }, { fromMs: now }, { toMs: now + 1 }, { fromMs: now - 90 * 86400000 }, { offset: 1 }, { offset: 10100 }, { nextOffset: 200 }, { nextOffset: null }, { observedAt: 'yesterday' }, { observedAt: '2026-09-08T00:00:00.000Z' }, { grantId: 'bad' }])
      expect(mapCloverReceiptStatus(response([{ ...row, ...patch }]), id, grant, now)).toEqual({ kind: 'uncertain' });
    for (const value of [response(Array(51).fill(row)), response([row, row]), {}, { data: { cloverImportReceipts: [] } }])
      expect(mapCloverReceiptStatus(value, id, grant, now)).toEqual({ kind: 'uncertain' });
  });
  it('preserves stale grant, terminal and subdivision display states without relabeling', () => {
    expect(mapCloverReceiptStatus(response([{ ...row, grantId: other, rowCount: 12, nextOffset: null }]), id, grant, now)).toEqual({ kind: 'available', pages: [{ id: other, records: 12, nextOffset: null, currentGrant: false }], hasMore: true });
    expect(mapCloverReceiptStatus(response([{ ...row, offset: 10000, nextOffset: 10100 }]), id, grant, now)).toMatchObject({ kind: 'available', pages: [{ nextOffset: 10100 }] });
  });
});

it('keeps malformed connection metadata uncertain instead of inventing denial', async () => {
  const deps = setup();
  expect(await readCloverOperatorStatus(id, { ...deps, getAppConnection: async () => ({ id }) })).toEqual({ kind: 'uncertain' });
  expect(await readCloverOperatorStatus(id, { ...deps, listUserConnections: async () => [{ id }] })).toEqual({ kind: 'uncertain' });
  expect(deps.getReceipts).not.toHaveBeenCalled();
});
