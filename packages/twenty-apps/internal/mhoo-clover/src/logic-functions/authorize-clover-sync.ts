import { type AppConnection } from 'twenty-sdk/logic-function';

export type CloverSyncGrantInput = { connectionId: string; grantId: string };
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// The native server resolves the owning App, Workspace grant, current membership
// and role ceiling. A queued payload only pins a revision; it creates no grant.
export const authorizeCloverSync = async (
  input: CloverSyncGrantInput,
  get: (id: string) => Promise<AppConnection>,
) => {
  try {
    if (!input || !uuid.test(input.connectionId) || !uuid.test(input.grantId))
      throw new Error('Invalid sync selection');
    const connection = await get(input.connectionId);
    if (
      connection.id !== input.connectionId ||
      connection.providerName !== 'clover-manual' ||
      connection.visibility !== 'workspace' ||
      connection.authFailedAt ||
      connection.manualTokenWorkspaceGrantId !== input.grantId ||
      !/^[A-Z0-9]{13}$/.test(connection.handle)
    )
      throw new Error('Unavailable sync grant');
    return connection;
  } catch {
    throw new Error(
      'Clover background access is unavailable. Check the connection grant.',
    );
  }
};
