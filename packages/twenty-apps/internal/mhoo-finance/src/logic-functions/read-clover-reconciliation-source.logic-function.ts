import { RestApiClient } from 'twenty-client-sdk/rest';
import { defineLogicFunction } from 'twenty-sdk/define';

import {
  readCloverReconciliationSource,
  type CloverReconciliationSourceInput,
} from './read-clover-reconciliation-source';

export default defineLogicFunction({
  universalIdentifier: '278ce3f6-0bb4-4404-a346-f436358e3827',
  name: 'read-clover-reconciliation-source',
  description:
    'Read one authorized Clover receipt page through Twenty REST for Finance reconciliation preview. Does not write Finance facts.',
  timeoutSeconds: 20,
  handler: async (input: CloverReconciliationSourceInput) => {
    const token = process.env.TWENTY_APP_APPLICATION_ACCESS_TOKEN;
    if (!token) throw new Error('Native App execution is required');
    return readCloverReconciliationSource(input, {
      client: new RestApiClient({ token, runAs: 'application' }),
    });
  },
});
