import { defineLogicFunction } from 'twenty-sdk/define';
import { getConnection, listConnections } from 'twenty-sdk/logic-function';
import {
  CLOVER_DATA_READ_OPERATIONS,
  readCloverData,
} from './clover-data-read';

const idProperties = Object.fromEntries(
  [
    'item_id',
    'order_id',
    'payment_id',
    'refund_id',
    'credit_refund_id',
    'tender_id',
    'tax_rate_id',
    'order_fee_id',
    'customer_id',
    'employee_id',
  ].map((name) => [name, { type: 'string' }]),
);

export default defineLogicFunction({
  universalIdentifier: '89414de2-6379-4cc7-9a92-aa1c7c54712e',
  name: 'clover-data-read',
  description:
    'Read one bounded Clover resource through the invoking Workspace connection. The operation is a fixed read-only catalog; no token, card data, provider writes, or arbitrary URL is available.',
  timeoutSeconds: 10,
  toolTriggerSettings: {
    inputSchema: {
      type: 'object',
      required: ['operation'],
      properties: {
        connectionId: {
          type: 'string',
          description:
            'Optional Clover connection ID. Omit only when exactly one authorized Clover connection is available.',
        },
        operation: {
          type: 'string',
          enum: [...CLOVER_DATA_READ_OPERATIONS],
          description: 'The fixed Clover read operation to perform.',
        },
        limit: { type: 'number', minimum: 1, maximum: 100 },
        offset: { type: 'number', minimum: 0, maximum: 10000 },
        filter: { type: 'string' },
        expand: {
          type: 'array',
          items: { type: 'string' },
        },
        ...idProperties,
      },
      additionalProperties: false,
    },
  },
  handler: async (payload: Record<string, unknown>, context) => {
    if (!context.userWorkspaceId || !context.workspaceMemberId) {
      throw new Error(
        'An authorized Workspace member must initiate this read.',
      );
    }
    const { connectionId, operation, ...input } = payload ?? {};
    return readCloverData(
      { connectionId, operation, input },
      {
        list: () =>
          listConnections({ providerName: 'clover-manual' }, { runAs: 'user' }),
        get: (id) => getConnection(id, { runAs: 'user' }),
        fetch,
      },
    );
  },
});
