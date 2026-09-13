import { expect, it, vi } from 'vitest';
import { type AppConnection } from 'twenty-sdk/logic-function';
import { authorizeCloverSync } from '../logic-functions/authorize-clover-sync';
const input = {
  connectionId: '11111111-1111-4111-8111-111111111111',
  grantId: '22222222-2222-4222-8222-222222222222',
};
const connection = {
  id: input.connectionId,
  providerName: 'clover-manual',
  handle: 'ABCDEFGHIJKLM',
  visibility: 'workspace',
  authFailedAt: null,
  accessToken: 'synthetic-token',
  manualTokenWorkspaceGrantId: input.grantId,
} as AppConnection;
it('accepts the exact native Workspace grant revision', async () => {
  expect(await authorizeCloverSync(input, async () => connection)).toBe(
    connection,
  );
});
it.each([
  { ...connection, manualTokenWorkspaceGrantId: null },
  {
    ...connection,
    manualTokenWorkspaceGrantId: '33333333-3333-4333-8333-333333333333',
  },
  { ...connection, visibility: 'user' as const },
  { ...connection, id: 'other' },
  { ...connection, authFailedAt: '2026-09-07T00:00:00Z' },
])(
  'denies stale, revoked or wrong connection revision %#',
  async (candidate) => {
    await expect(
      authorizeCloverSync(input, async () => candidate),
    ).rejects.toThrow('background access is unavailable');
  },
);
it('does not call native retrieval for malformed selectors', async () => {
  const get = vi.fn();
  await expect(
    authorizeCloverSync({ ...input, grantId: '' }, get),
  ).rejects.toThrow();
  expect(get).not.toHaveBeenCalled();
});
it('never returns credential-bearing retrieval errors', async () => {
  await expect(
    authorizeCloverSync(input, async () => {
      throw new Error(connection.accessToken);
    }),
  ).rejects.not.toThrow(connection.accessToken);
});
