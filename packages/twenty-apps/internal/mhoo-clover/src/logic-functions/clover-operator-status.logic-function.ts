import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import { listConnections } from 'twenty-sdk/logic-function';
import { OPERATOR_STATUS_FUNCTION } from '../contracts/model-identifiers';
import { STATUS_ROUTE, isConnectionId, decodeMerchantList } from '../operator/status-route-contract';
import { cloverOperatorRuntime } from './clover-operator-runtime';
import { readCloverOperatorStatus } from './read-clover-operator-status';

const reply = (body: unknown, status = 200) => ({ __twentyHttpResponse: true as const, status, headers: { 'cache-control': 'no-store' }, body });
export async function handler(event: RoutePayload<unknown>, context: { userWorkspaceId: string | null; workspaceMemberId: string | null }) {
  // Only native executor context supplies identity. Never use event/body/header claims.
  if (!context?.userWorkspaceId || !context.workspaceMemberId) return reply({ kind: 'denied' }, 403);
  const body = event?.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return reply({ kind: 'denied' }, 400);
  const input = body as Record<string, unknown>;
  if (!(input.kind === 'list' && Object.keys(input).length === 1) &&
      !(input.kind === 'status' && Object.keys(input).length === 2 && isConnectionId(input.connectionId))) return reply({ kind: 'denied' }, 400);
  try {
    const runtime = cloverOperatorRuntime(context);
    const list = () => listConnections({ providerName: 'clover-manual' }, { runAs: 'user' });
    if (input.kind === 'list') {
      const visible = await list();
      if (!Array.isArray(visible) || visible.length > 50 || visible.some((c) => !c || !isConnectionId(c.id) || c.providerName !== 'clover-manual' || !/^[A-Z0-9]{13}$/.test(c.handle))) return reply({ kind: 'uncertain' });
      // Use the validated provider handle, not user-controlled names or token-bearing objects.
      return reply(decodeMerchantList({ kind: 'available', merchants: visible.map((c) => ({ id: c.id, name: `Merchant ${c.handle}` })) }));
    }
    return reply(await readCloverOperatorStatus(input.connectionId as string, {
      listUserConnections: list,
      getAppConnection: runtime.getAppConnection,
      getReceipts: (path, options) => runtime.client.get(path, options),
      now: () => runtime.now().getTime(),
    }));
  } catch { return reply({ kind: 'uncertain' }); }
}
export default defineLogicFunction({
  universalIdentifier: OPERATOR_STATUS_FUNCTION,
  name: 'clover-operator-status',
  description: 'Read authorized merchant selectors and bounded saved-payment status. No provider calls or writes.',
  timeoutSeconds: 20,
  handler,
  httpRouteTriggerSettings: { path: STATUS_ROUTE, httpMethod: 'POST', isAuthRequired: true, forwardedRequestHeaders: [] },
});
