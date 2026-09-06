import { defineLogicFunction } from 'twenty-sdk/define';
import { getConnection, listConnections } from 'twenty-sdk/logic-function';
import { readCloverMerchant } from './clover-merchant-read';

export default defineLogicFunction({
  universalIdentifier: '0b1a54c5-36b4-4fbb-b467-832d2314eec1',
  name: 'clover-merchant-read',
  description:
    'Read the connected merchant name. Does not verify provider scopes.',
  timeoutSeconds: 10,
  // No public route, tool, cron, webhook or workflow trigger in this slice.
  handler: async (_payload, context) => {
    if (!context.userWorkspaceId || !context.workspaceMemberId) {
      throw new Error(
        'An authorized Workspace member must initiate this read.',
      );
    }
    return readCloverMerchant({
      list: () =>
        listConnections({ providerName: 'clover-manual' }, { runAs: 'user' }),
      get: (id) => getConnection(id, { runAs: 'user' }),
      fetch,
    });
  },
});
