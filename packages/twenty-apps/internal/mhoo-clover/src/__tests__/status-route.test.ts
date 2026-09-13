import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { buildLogicFunctionEvent } from '../../../../../twenty-server/src/engine/core-modules/logic-function/logic-function-trigger/triggers/route/utils/build-logic-function-event.util';
import { buildRouteTriggerResponse } from '../../../../../twenty-server/src/engine/core-modules/logic-function/logic-function-trigger/triggers/route/utils/route-trigger-response.util';
import definition, { handler } from '../logic-functions/clover-operator-status.logic-function';
import { listStatusMerchants, readNativeStatus } from '../operator/native-status-client';
const sdk = vi.hoisted(() => ({ listConnections: vi.fn(), getConnection: vi.fn() }));
vi.mock('twenty-sdk/logic-function', () => sdk);
const id = '11111111-1111-4111-8111-111111111111';
const grant = '22222222-2222-4222-8222-222222222222';
const page = '33333333-3333-4333-8333-333333333333';
const context = { userWorkspaceId: id, workspaceMemberId: page };
const secret = 'synthetic-server-only-marker';
const connection = { id, providerName: 'clover-manual', handle: 'ABCDEFGHIJKLM', name: secret, visibility: 'workspace', authFailedAt: null, accessToken: secret, manualTokenWorkspaceGrantId: grant };
const event = (body: unknown) => buildLogicFunctionEvent({ request: { body, headers: { authorization: secret }, rawBody: Buffer.from(secret), query: {}, method: 'POST', path: '/s/clover/operator-status' } as never, pathParameters: {}, forwardedRequestHeaders: [], forwardAllHeaders: true, userWorkspaceId: 'forged-event-user' });
beforeEach(() => {
  vi.stubEnv('TWENTY_API_URL', 'http://synthetic.invalid');
  vi.stubEnv('TWENTY_APP_ACCESS_TOKEN', 'synthetic-user-token');
  vi.stubEnv('TWENTY_APP_APPLICATION_ACCESS_TOKEN', 'synthetic-app-token');
  vi.stubEnv('TWENTY_FUNCTIONS_URL', 'http://synthetic.invalid/s');
  sdk.listConnections.mockResolvedValue([connection]); sdk.getConnection.mockResolvedValue(connection);
});
afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('declares only an authenticated POST status route with no schedule/tool exposure', () => {
  expect(definition.success).toBe(true);
  expect(definition.config.httpRouteTriggerSettings).toEqual({ path: '/clover/operator-status', httpMethod: 'POST', isAuthRequired: true, forwardedRequestHeaders: [] });
  expect(definition.config.cronTriggerSettings).toBeUndefined(); expect(definition.config.toolTriggerSettings).toBeUndefined();
});
it('ignores native event/body/header identity claims and stops before SDK reads without context', async () => {
  for (const body of [{ kind: 'list' }, { kind: 'list', userWorkspaceId: id, workspaceMemberId: page }]) {
    expect(await handler(event(body), { userWorkspaceId: null, workspaceMemberId: null })).toMatchObject({ status: 403, body: { kind: 'denied' } });
  }
  expect(sdk.listConnections).not.toHaveBeenCalled(); expect(sdk.getConnection).not.toHaveBeenCalled();
  expect(await handler(event({ kind: 'list', userWorkspaceId: id }), context)).toMatchObject({ status: 400 });
  expect(sdk.listConnections).not.toHaveBeenCalled();
});
it('uses native event.body and returns sanitized merchant list despite forwarded raw headers', async () => {
  const result = buildRouteTriggerResponse(await handler(event({ kind: 'list' }), context));
  expect(result).toEqual({ statusCode: 200, headers: { 'cache-control': 'no-store' }, body: { kind: 'available', merchants: [{ id, name: 'Merchant ABCDEFGHIJKLM' }] } });
  expect(JSON.stringify(result)).not.toContain(secret);
  expect(sdk.listConnections).toHaveBeenCalledWith({ providerName: 'clover-manual' }, { runAs: 'user' });
});
it('connects native body to the adapter with explicit App receipt token and current grant', async () => {
  const fetch = vi.fn(async () => Response.json({ data: { cloverImportReceipts: [{ id: page, connectionId: id, grantId: grant, dataset: 'payments', fromMs: 1000, toMs: 2000, observedAt: '2026-01-01T00:00:00.000Z', rowCount: 0, offset: 0, nextOffset: null }] }, pageInfo: { hasNextPage: false } }));
  vi.stubGlobal('fetch', fetch);
  const result = await handler(event({ kind: 'status', connectionId: id }), context);
  expect(result.body).toEqual({ kind: 'available', pages: [{ id: page, records: 0, nextOffset: null, currentGrant: true }], hasMore: false });
  expect(sdk.getConnection).toHaveBeenCalledWith(id, { runAs: 'application' });
  const [url, options] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  expect(String(url)).toContain('order_by=observedAt');
  expect(new Headers(options.headers).get('Authorization')).toBe('Bearer synthetic-app-token');
});
it('keeps opaque SDK errors uncertain and never reads receipts after failed grant lookup', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  sdk.getConnection.mockRejectedValue(new Error(secret));
  expect(await handler(event({ kind: 'status', connectionId: id }), context)).toMatchObject({ body: { kind: 'uncertain' } });
  expect(fetch).not.toHaveBeenCalled();
  sdk.listConnections.mockRejectedValue(new Error(secret));
  expect(await handler(event({ kind: 'list' }), context)).toMatchObject({ body: { kind: 'uncertain' } });
});
it('uses delegated client route with allowlisted responses and no generic executor', async () => {
  const fetch = vi.fn(async () => Response.json({ kind: 'available', merchants: [{ id, name: 'Merchant ABCDEFGHIJKLM', accessToken: secret }] }));
  vi.stubGlobal('fetch', fetch);
  expect(await listStatusMerchants()).toEqual({ kind: 'available', merchants: [{ id, name: 'Merchant ABCDEFGHIJKLM' }] });
  const [url, options] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  expect(String(url)).toBe('http://synthetic.invalid/s/clover/operator-status');
  expect(new Headers(options.headers).get('Authorization')).toBe('Bearer synthetic-user-token');
  expect(JSON.parse(String(options.body))).toEqual({ kind: 'list' });
  fetch.mockResolvedValue(Response.json({ kind: 'denied' }, { status: 403 }));
  expect(await readNativeStatus(id)).toEqual({ kind: 'denied' });
  fetch.mockRejectedValue(new Error(secret));
  expect(await readNativeStatus(id)).toEqual({ kind: 'uncertain' });
});
