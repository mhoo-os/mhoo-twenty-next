import { defineLogicFunction } from 'twenty-sdk/define';
import { getConnection } from 'twenty-sdk/logic-function';
import {
  authorizeCloverSync,
  type CloverSyncGrantInput,
} from './authorize-clover-sync';

export default defineLogicFunction({
  universalIdentifier: '8105a614-4235-4131-a363-b82a27f72be1',
  name: 'clover-sync-authorize',
  description:
    'Verify a native background connection grant revision without returning credentials or reading provider data.',
  timeoutSeconds: 10,
  handler: async (payload: CloverSyncGrantInput, context) => {
    if (context.userWorkspaceId || context.workspaceMemberId)
      throw new Error('This function requires native background execution.');
    const connection = await authorizeCloverSync(payload, (id) =>
      getConnection(id, { runAs: 'application' }),
    );
    return {
      connectionId: connection.id,
      merchantId: connection.handle,
      grantId: payload.grantId,
      status: 'authorized' as const,
    };
  },
});
