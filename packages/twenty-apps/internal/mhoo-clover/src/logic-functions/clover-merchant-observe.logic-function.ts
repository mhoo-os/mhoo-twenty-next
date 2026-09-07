import { RestApiClient } from 'twenty-client-sdk/rest';
import { defineLogicFunction } from 'twenty-sdk/define';
import { getConnection, listConnections } from 'twenty-sdk/logic-function';
import { saveCloverObservation } from './save-clover-observation';
import { observeCloverMerchant } from './observe-clover-merchant';

export default defineLogicFunction({
  universalIdentifier: '02dad93c-586e-479c-9537-c5be69863de9',
  name: 'clover-merchant-observe',
  description:
    'Read merchant identity into a Clover-owned Workspace observation. No financial ingestion.',
  timeoutSeconds: 15,
  handler: async (payload: { connectionId?: string }, context) => {
    if (!context.userWorkspaceId || !context.workspaceMemberId) {
      throw new Error(
        'An authorized Workspace member must initiate this read.',
      );
    }
    // Reject the stock REST client's application-only API-key fallback.
    const delegatedToken = process.env.TWENTY_APP_ACCESS_TOKEN;
    if (!delegatedToken)
      throw new Error('An authorized user session is required.');
    const client = new RestApiClient({ runAs: 'user', token: delegatedToken });
    return observeCloverMerchant(
      {
        list: () =>
          listConnections({ providerName: 'clover-manual' }, { runAs: 'user' }),
        get: (id) => getConnection(id, { runAs: 'user' }),
        fetch,
        now: () => new Date(),
        save: (observation) => saveCloverObservation(client, observation),
      },
      payload?.connectionId,
    );
  },
});
