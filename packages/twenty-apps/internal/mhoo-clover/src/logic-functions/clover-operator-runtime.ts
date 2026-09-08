import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { getConnection } from 'twenty-sdk/logic-function';
import { PAYMENT_IMPORT_FUNCTION } from '../contracts/model-identifiers';
import { type CloverPaymentJob } from './import-clover-payment-job';

export const cloverOperatorRuntime = (context: {
  userWorkspaceId: string | null;
  workspaceMemberId: string | null;
}) => {
  if (
    !context.userWorkspaceId ||
    !context.workspaceMemberId ||
    !process.env.TWENTY_APP_ACCESS_TOKEN
  )
    throw new Error(
      'An authorized Workspace member must initiate this action.',
    );
  const token = process.env.TWENTY_APP_APPLICATION_ACCESS_TOKEN;
  if (!token) throw new Error('Native App execution is required.');
  // Explicit App identity makes queued work background execution. The operator
  // helper separately verifies the current user's access and the native grant.
  const metadata = new MetadataApiClient({
    runAs: 'application',
    headers: { Authorization: `Bearer ${token}` },
  });
  return {
    client: new RestApiClient({ token, runAs: 'application' }),
    getUserConnection: (id: string) => getConnection(id, { runAs: 'user' }),
    getAppConnection: (id: string) =>
      getConnection(id, { runAs: 'application' }),
    now: () => new Date(),
    enqueue: async (jobs: CloverPaymentJob[]) => {
      if (jobs.length < 1 || jobs.length > 200)
        throw new Error('Invalid bounded dispatch');
      const { enqueueJobs: result } = await metadata.mutation({
        enqueueJobs: {
          __args: {
            input: {
              logicFunctionUniversalIdentifier: PAYMENT_IMPORT_FUNCTION,
              payloads: jobs,
              retryLimit: 3,
              delayMs: 1000,
            },
          },
          enqueued: true,
          enqueuedJobsCount: true,
          logicFunctionUniversalIdentifier: true,
        },
      });
      if (
        !result.enqueued ||
        result.enqueuedJobsCount !== jobs.length ||
        result.logicFunctionUniversalIdentifier !== PAYMENT_IMPORT_FUNCTION
      )
        throw new Error('Native dispatch was not confirmed');
    },
  };
};
