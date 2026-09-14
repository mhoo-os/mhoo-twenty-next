import { defineLogicFunction } from 'twenty-sdk/define';
import { getConnection, listConnections } from 'twenty-sdk/logic-function';
import { readCloverMerchant } from './clover-merchant-read';

export default defineLogicFunction({
  universalIdentifier: '0b1a54c5-36b4-4fbb-b467-832d2314eec1',
  name: 'clover-merchant-read',
  description:
    'Read one connected Clover merchant identity. Performs one provider read and never returns the token or payment data.',
  timeoutSeconds: 10,
  toolTriggerSettings: {
    inputSchema: {
      type: 'object',
      properties: {
        connectionId: {
          type: 'string',
          description:
            'Optional Clover connection ID. Omit only when exactly one authorized Clover connection is available.',
        },
      },
      additionalProperties: false,
    },
  },
  handler: async (payload: { connectionId?: string }, context) => {
    if (!context.userWorkspaceId || !context.workspaceMemberId) {
      throw new Error(
        'An authorized Workspace member must initiate this read.',
      );
    }
    return readCloverMerchant(
      {
        list: () =>
          listConnections({ providerName: 'clover-manual' }, { runAs: 'user' }),
        get: (id) => getConnection(id, { runAs: 'user' }),
        fetch,
      },
      payload?.connectionId,
    );
  },
});
