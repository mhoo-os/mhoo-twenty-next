import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import definition, {
  handler,
} from '../logic-functions/clover-recent-page.logic-function';
import { type RoutePayload } from 'twenty-sdk/define';
const sdk = vi.hoisted(() => ({ getConnection: vi.fn() }));
vi.mock('twenty-sdk/logic-function', () => sdk);
const id = '11111111-1111-4111-8111-111111111111';
const context = { userWorkspaceId: id, workspaceMemberId: id };
const event = (body: unknown) => ({ body }) as RoutePayload<unknown>;
beforeEach(() => {
  vi.stubEnv('TWENTY_APP_ACCESS_TOKEN', 'synthetic-delegated-token');
  sdk.getConnection.mockResolvedValue({
    id,
    providerName: 'clover-manual',
    visibility: 'user',
    handle: 'ABCDEFGHIJKLM',
    accessToken: 'synthetic-provider-marker',
    authFailedAt: null,
    manualTokenWorkspaceGrantId: null,
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it('exposes only authenticated POST with no cron/tool trigger', () => {
  expect(definition.success).toBe(true);
  expect(definition.config.httpRouteTriggerSettings).toEqual({
    path: '/clover/recent-page',
    httpMethod: 'POST',
    isAuthRequired: true,
    forwardedRequestHeaders: [],
  });
  expect(definition.config.cronTriggerSettings).toBeUndefined();
  expect(definition.config.toolTriggerSettings).toBeUndefined();
});
it('rejects missing native context and forged body identity/cursor before credential access', async () => {
  expect(
    await handler(event({ kind: 'prepare', connectionId: id }), {
      userWorkspaceId: null,
      workspaceMemberId: null,
    }),
  ).toMatchObject({ status: 403 });
  for (const extra of [
    { userWorkspaceId: id },
    { offset: 100 },
    { accessToken: 'synthetic-marker' },
    { grantId: id },
  ]) {
    expect(
      await handler(
        event({ kind: 'prepare', connectionId: id, ...extra }),
        context,
      ),
    ).toMatchObject({ status: 400 });
  }
  expect(sdk.getConnection).not.toHaveBeenCalled();
});
it('requires explicit delegated token and never falls back to application-only credential identity', async () => {
  vi.stubEnv('TWENTY_APP_ACCESS_TOKEN', '');
  vi.stubEnv('TWENTY_APP_APPLICATION_ACCESS_TOKEN', 'synthetic-app-token');
  expect(
    await handler(event({ kind: 'prepare', connectionId: id }), context),
  ).toMatchObject({ status: 403 });
  expect(sdk.getConnection).not.toHaveBeenCalled();
});
it('prepares a user-owned connection without a background grant and returns no credential', async () => {
  const fetch = vi.fn(async () =>
    Response.json({ id: 'ABCDEFGHIJKLM', name: 'Test Merchant' }),
  );
  vi.stubGlobal('fetch', fetch);
  const result = await handler(
    event({ kind: 'prepare', connectionId: id }),
    context,
  );
  expect(result).toMatchObject({
    status: 200,
    headers: { 'cache-control': 'no-store' },
    body: { kind: 'ready', merchantId: 'ABCDEFGHIJKLM', maximumRecords: 100 },
  });
  expect(sdk.getConnection).toHaveBeenCalledWith(id, { runAs: 'user' });
  expect(
    sdk.getConnection.mock.calls.every(([, option]) => option.runAs === 'user'),
  ).toBe(true);
  expect(JSON.stringify(result)).not.toContain('synthetic-provider-marker');
});
