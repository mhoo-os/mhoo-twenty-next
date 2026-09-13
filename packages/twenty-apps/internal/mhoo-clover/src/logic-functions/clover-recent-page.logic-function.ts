import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { getConnection } from 'twenty-sdk/logic-function';
import {
  importCloverRecentPage,
  listCloverRecentReceipts,
  prepareCloverRecentPage,
  readCloverRecentReceipt,
  type RecentSelection,
} from './import-clover-recent-page';

const reply = (body: unknown, status = 200) => ({
  __twentyHttpResponse: true as const,
  status,
  headers: { 'cache-control': 'no-store' },
  body,
});
export async function handler(
  event: RoutePayload<unknown>,
  context: { userWorkspaceId: string | null; workspaceMemberId: string | null },
) {
  if (!context?.userWorkspaceId || !context.workspaceMemberId)
    return reply({ kind: 'denied' }, 403);
  const body = event?.body;
  if (!body || typeof body !== 'object' || Array.isArray(body))
    return reply({ kind: 'denied' }, 400);
  const input = body as Record<string, unknown>;
  const prepare =
    input.kind === 'prepare' &&
    Object.keys(input).length === 2 &&
    typeof input.connectionId === 'string';
  const save =
    input.kind === 'import' &&
    Object.keys(input).sort().join(',') ===
      'connectionId,fromMs,kind,readOnlyConfirmed,toMs' &&
    input.readOnlyConfirmed === true;
  const receipt =
    input.kind === 'receipt' &&
    Object.keys(input).sort().join(',') === 'connectionId,fromMs,kind,toMs';
  const list =
    input.kind === 'receipts' &&
    Object.keys(input).sort().join(',') === 'connectionId,kind' &&
    typeof input.connectionId === 'string';
  if (!prepare && !save && !receipt && !list)
    return reply({ kind: 'denied' }, 400);
  try {
    const token = process.env.TWENTY_APP_ACCESS_TOKEN;
    if (!token) return reply({ kind: 'denied' }, 403);
    const dependencies = {
      client: new RestApiClient({ runAs: 'user', token }),
      getUserConnection: (id: string) => getConnection(id, { runAs: 'user' }),
      userWorkspaceId: context.userWorkspaceId,
      now: () => new Date(),
      fetch,
    };
    return reply(
      list
        ? await listCloverRecentReceipts(
            input.connectionId as string,
            dependencies,
          )
        : prepare
          ? await prepareCloverRecentPage(
              input.connectionId as string,
              dependencies,
            )
          : receipt
            ? await readCloverRecentReceipt(
                input as RecentSelection,
                dependencies,
              )
            : await importCloverRecentPage(
                input as RecentSelection & { readOnlyConfirmed: true },
                dependencies,
              ),
    );
  } catch {
    return reply({ kind: 'uncertain' });
  }
}
export default defineLogicFunction({
  universalIdentifier: 'cac2240c-8547-4c96-bdac-a033f29f9114',
  name: 'clover-recent-page',
  description:
    'Verify a selected merchant or import at most one recent payment page. No continuation or provider writes.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: '/clover/recent-page',
    httpMethod: 'POST',
    isAuthRequired: true,
    forwardedRequestHeaders: [],
  },
});
