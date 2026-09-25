import { defineLogicFunction } from 'twenty-sdk/define';
import {
  cloverEnvironment,
  listVisibleCloverConnections,
} from './clover-environment';
import { OPERATOR_STATUS_FUNCTION } from '../contracts/model-identifiers';
import { cloverOperatorRuntime } from './clover-operator-runtime';

export default defineLogicFunction({
  universalIdentifier: OPERATOR_STATUS_FUNCTION,
  name: 'clover-operator-status',
  description:
    'Return filtered merchant and receipt status for the current operator. Never return provider credentials.',
  timeoutSeconds: 20,
  handler: async (input: { connectionId?: string }, context) => {
    const runtime = cloverOperatorRuntime(context);
    try {
      const visible = await listVisibleCloverConnections();
      const connections = await Promise.all(
        visible.slice(0, 50).map(async (user) => {
          let grantId: string | null = null;
          try {
            const app = await runtime.getAppConnection(user.id);
            if (
              app.id === user.id &&
              app.handle === user.handle &&
              app.providerName === user.providerName &&
              app.visibility === 'workspace' &&
              !app.authFailedAt &&
              !user.authFailedAt
            )
              grantId = app.manualTokenWorkspaceGrantId ?? null;
          } catch {
            /* No active background grant is an actionable state, not authority. */
          }
          const name =
            typeof user.name === 'string' &&
            !user.name.includes(user.accessToken)
              ? user.name.slice(0, 80)
              : user.handle;
          return {
            id: user.id,
            name,
            merchantId: user.handle,
            environment: cloverEnvironment(user.providerName),
            grantId,
          };
        }),
      );
      if (!input?.connectionId)
        return {
          connections,
          receipts: [],
          hasMoreConnections: visible.length > 50,
          hasMoreReceipts: false,
        };
      const selected = connections.find(
        (connection) => connection.id === input.connectionId,
      );
      if (!selected) throw new Error('Unavailable connection');
      const response = await runtime.client.get<{
        data: { cloverImportReceipts: Record<string, unknown>[] };
        pageInfo: { hasNextPage: boolean };
      }>('/rest/cloverImportReceipts', {
        query: {
          filter: `connectionId[eq]:${selected.id}`,
          limit: 50,
          depth: 0,
          orderBy: 'observedAt[DescNullsLast]',
        },
        signal: AbortSignal.timeout(4000),
      });
      return {
        connections,
        hasMoreConnections: visible.length > 50,
        hasMoreReceipts: response.pageInfo.hasNextPage,
        receipts: response.data.cloverImportReceipts.map((r) => ({
          id: r.id,
          fromMs: r.fromMs,
          toMs: r.toMs,
          offset: r.offset,
          nextOffset: r.nextOffset,
          rowCount: r.rowCount,
          observedAt: r.observedAt,
          currentGrant:
            selected.grantId !== null && r.grantId === selected.grantId,
        })),
      };
    } catch {
      throw new Error(
        'Clover operator status is unavailable. Check your Workspace access.',
      );
    }
  },
});
