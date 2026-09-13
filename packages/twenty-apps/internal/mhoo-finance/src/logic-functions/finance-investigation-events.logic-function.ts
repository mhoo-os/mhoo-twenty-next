import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { appendInvestigationEvent } from '../investigation/workspace-investigation-events';

const reply = (body: unknown, status = 200) => ({
  __twentyHttpResponse: true as const,
  status,
  headers: { 'cache-control': 'no-store' },
  body,
});

export const handler = async (
  event: RoutePayload<unknown>,
  context: { userWorkspaceId: string | null; workspaceMemberId: string | null },
) => {
  if (!context?.userWorkspaceId || !context.workspaceMemberId)
    return reply({ kind: 'denied' }, 403);
  const body = event?.body;
  if (!body || typeof body !== 'object' || Array.isArray(body))
    return reply({ kind: 'denied' }, 400);
  const input = body as Record<string, unknown>;
  if (Object.keys(input).sort().join(',') !==
      'aggregateKind,aggregateReference,eventId,eventType,expectedSequence,nativeTaskReference,payload,previousEventReference')
    return reply({ kind: 'denied' }, 400);
  try {
    if (typeof input.nativeTaskReference === 'string') {
      const userClient = new RestApiClient({ runAs: 'user' });
      const taskResponse = await userClient.get<{
        data: { task?: { id?: unknown; assigneeId?: unknown; financeCorrelationKey?: unknown } };
      }>(`/rest/tasks/${input.nativeTaskReference}`);
      const task = taskResponse.data.task;
      if (
        task?.id !== input.nativeTaskReference ||
        task.assigneeId !== context.workspaceMemberId ||
        typeof task.financeCorrelationKey !== 'string' ||
        !task.financeCorrelationKey.startsWith('mhoo-finance:')
      ) return reply({ kind: 'denied' }, 403);
    }
    const receipt = await appendInvestigationEvent(
      input as Parameters<typeof appendInvestigationEvent>[0],
      { workspaceMemberId: context.workspaceMemberId, now: () => new Date() },
    );
    return reply({ kind: 'committed', receipt });
  } catch {
    return reply({ kind: 'conflict' }, 409);
  }
};

export default defineLogicFunction({
  universalIdentifier: '53a77468-717f-439c-81ac-86fc198b5147',
  name: 'finance-investigation-events',
  description: 'Append one validated, sequenced Finance investigation event. No provider or email action.',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: '/mhoo-finance/investigation-events',
    httpMethod: 'POST',
    isAuthRequired: true,
    forwardedRequestHeaders: [],
  },
});
