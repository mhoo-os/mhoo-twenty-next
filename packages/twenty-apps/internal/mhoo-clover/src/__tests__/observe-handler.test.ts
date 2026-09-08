import { afterEach, expect, it, vi } from 'vitest';
import { getConnection, listConnections } from 'twenty-sdk/logic-function';
import observe from '../logic-functions/clover-merchant-observe.logic-function';

vi.mock('twenty-sdk/logic-function', () => ({
  getConnection: vi.fn(),
  listConnections: vi.fn(),
}));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});
const run = () =>
  observe.config!.handler({}, {
    userWorkspaceId: 'member',
    workspaceMemberId: 'workspace-member',
  } as never);

it('uses actual native REST client with delegated identity and secret-free observations', async () => {
  vi.stubEnv('TWENTY_API_URL', 'https://native.invalid');
  vi.stubEnv('TWENTY_APP_ACCESS_TOKEN', 'synthetic-delegated');
  vi.stubEnv('TWENTY_API_KEY', 'synthetic-app-only');
  const connection = {
    id: 'connection',
    providerName: 'clover-manual',
    handle: 'ABCDEFGHIJKLM',
    accessToken: 'synthetic-clover-token',
    authFailedAt: null,
  };
  vi.mocked(listConnections).mockResolvedValue([connection] as never);
  vi.mocked(getConnection).mockResolvedValue(connection as never);
  let stored: unknown;
  const transport = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.startsWith('https://api.clover.com/'))
      return new Response(
        JSON.stringify({ id: connection.handle, name: 'Synthetic merchant' }),
      );
    if (url.endsWith('/cloverConnections/connection'))
      return stored
        ? new Response(JSON.stringify({ data: { cloverConnection: stored } }))
        : new Response('{}', { status: 404 });
    if (url.endsWith('/cloverConnections')) {
      stored = JSON.parse(String(init?.body));
      return new Response('{}', { status: 201 });
    }
    expect(url).toBe('https://native.invalid/rest/cloverMerchantObservations');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('Authorization')).toBe(
      'Bearer synthetic-delegated',
    );
    expect(String(init?.body)).not.toContain(connection.accessToken);
    return new Response(
      JSON.stringify({
        data: { createCloverMerchantObservation: { id: 'synthetic-record' } },
      }),
    );
  });
  vi.stubGlobal('fetch', transport);
  expect(await run()).toMatchObject({
    merchantId: connection.handle,
    sourceRevision: 'merchant-v1',
  });
  expect(transport).toHaveBeenCalledTimes(5);
});

it('rejects missing delegated token even with application-only fallback available', async () => {
  vi.stubEnv('TWENTY_APP_ACCESS_TOKEN', '');
  vi.stubEnv('TWENTY_API_KEY', 'synthetic-app-only');
  await expect(run()).rejects.toThrow('authorized user session');
  expect(listConnections).not.toHaveBeenCalled();
});
