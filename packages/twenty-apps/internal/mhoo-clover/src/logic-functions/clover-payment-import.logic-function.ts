import { RestApiClient } from 'twenty-client-sdk/rest';
import { defineLogicFunction } from 'twenty-sdk/define';
import { enqueueJobs, getConnection } from 'twenty-sdk/logic-function';
import { PAYMENT_IMPORT_FUNCTION } from '../contracts/model-identifiers';
import {
  importCloverPaymentJob,
  type CloverPaymentJob,
} from './import-clover-payment-job';

export default defineLogicFunction({
  universalIdentifier: PAYMENT_IMPORT_FUNCTION,
  name: 'clover-payment-import',
  description:
    'Import one bounded payment page under a native background grant and chain only from confirmed receipts.',
  timeoutSeconds: 60,
  handler: async (payload: CloverPaymentJob, context) => {
    if (context.userWorkspaceId || context.workspaceMemberId)
      throw new Error('This function requires native background execution.');
    const token = process.env.TWENTY_APP_APPLICATION_ACCESS_TOKEN;
    if (!token) throw new Error('Native App execution is required.');
    return importCloverPaymentJob(payload, {
      client: new RestApiClient({ token, runAs: 'application' }),
      getConnection: (id) => getConnection(id, { runAs: 'application' }),
      fetch,
      now: () => new Date(),
      enqueue: async (next) => {
        const receipt = await enqueueJobs({
          logicFunctionUniversalIdentifier: PAYMENT_IMPORT_FUNCTION,
          payloads: [next],
          retryLimit: 3,
          delayMs: 1000,
        });
        if (
          !receipt.enqueued ||
          receipt.enqueuedJobsCount !== 1 ||
          receipt.logicFunctionUniversalIdentifier !== PAYMENT_IMPORT_FUNCTION
        )
          throw new Error('Native dispatch was not confirmed');
      },
    });
  },
});
