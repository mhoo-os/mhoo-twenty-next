import {
  getCloverToolDefinition,
  parseCloverToolInput,
  type CloverToolName,
} from '../clover-read/catalog';
import { invokeNativeCloverRead, type FetchLike } from '../clover-read/client';
import { resolveCloverConnection } from './resolve-clover-connection';
import { type CloverConnection } from './clover-merchant-read';

export const CLOVER_DATA_READ_OPERATIONS = [
  'clover_merchant_get',
  'clover_inventory_items_list',
  'clover_inventory_item_get',
  'clover_orders_list',
  'clover_order_get',
  'clover_payments_list',
  'clover_payment_get',
  'clover_refunds_list',
  'clover_refund_get',
  'clover_credit_refunds_list',
  'clover_credit_refund_get',
  'clover_tenders_list',
  'clover_tender_get',
  'clover_cash_events_list',
  'clover_tax_rates_list',
  'clover_tax_rate_get',
  'clover_order_fees_list',
  'clover_order_fee_get',
  'clover_voided_line_items_totals',
  'clover_customers_list',
  'clover_customer_get',
  'clover_employees_list',
  'clover_employee_get',
] as const satisfies readonly CloverToolName[];

export type CloverDataReadRequest = {
  connectionId?: unknown;
  operation?: unknown;
  input: unknown;
};

type Dependencies = {
  list: () => Promise<CloverConnection[]>;
  get: (id: string) => Promise<CloverConnection>;
  fetch: FetchLike;
};

export async function readCloverData(
  request: CloverDataReadRequest,
  dependencies: Dependencies,
) {
  try {
    if (
      typeof request.operation !== 'string' ||
      !CLOVER_DATA_READ_OPERATIONS.includes(
        request.operation as (typeof CLOVER_DATA_READ_OPERATIONS)[number],
      )
    ) {
      throw new Error('Unsupported read operation');
    }
    const definition = getCloverToolDefinition(request.operation);
    const input = parseCloverToolInput(definition, request.input);
    const connection = await resolveCloverConnection(
      dependencies,
      request.connectionId,
    );
    const data = await invokeNativeCloverRead(
      { merchantId: connection.handle, accessToken: connection.accessToken },
      request.operation,
      input,
      dependencies.fetch,
    );
    return {
      connectionId: connection.id,
      operation: request.operation,
      data,
    };
  } catch {
    throw new Error(
      'Clover data is unavailable. Check the selected connection and try again.',
    );
  }
}
