import { defineLogicFunction } from 'twenty-sdk/define';
import { getConnection, listConnections } from 'twenty-sdk/logic-function';
import { type PaymentWindow, readCloverPayments } from './clover-payment-read';

export default defineLogicFunction({
  universalIdentifier: '0188eeb0-f91f-4c7c-a378-3e93aa6fc87e',
  name: 'clover-payment-read',
  description:
    'Bounded read-only payment revision page. Currency and coverage remain unverified; no progress is committed.',
  timeoutSeconds: 10,
  handler: async (payload: PaymentWindow, context) => {
    if (!context.userWorkspaceId || !context.workspaceMemberId)
      throw new Error(
        'An authorized Workspace member must initiate this read.',
      );
    return readCloverPayments(payload, {
      list: () =>
        listConnections({ providerName: 'clover-manual' }, { runAs: 'user' }),
      get: (id) => getConnection(id, { runAs: 'user' }),
      fetch,
    });
  },
});
