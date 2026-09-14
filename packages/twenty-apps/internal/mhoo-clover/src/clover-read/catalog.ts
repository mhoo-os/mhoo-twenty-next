import { z } from 'zod';
import { CloverNativeReadError } from './errors';

export const CLOVER_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const SINGLE_FILTER_PATTERN = /^([A-Za-z][A-Za-z0-9_.]*)\s*(?:!=|>=|<=|=|>|<)\s*[A-Za-z0-9_.:'" ()-]{1,192}$/;

export type CloverToolName =
  | 'clover_merchant_get'
  | 'clover_inventory_items_list'
  | 'clover_inventory_item_get'
  | 'clover_orders_list'
  | 'clover_order_get'
  | 'clover_payments_list'
  | 'clover_payment_get'
  | 'clover_refunds_list'
  | 'clover_refund_get'
  | 'clover_credit_refunds_list'
  | 'clover_credit_refund_get'
  | 'clover_tenders_list'
  | 'clover_tender_get'
  | 'clover_cash_events_list'
  | 'clover_tax_rates_list'
  | 'clover_tax_rate_get'
  | 'clover_order_fees_list'
  | 'clover_order_fee_get'
  | 'clover_voided_line_items_totals'
  | 'clover_customers_list'
  | 'clover_customer_get'
  | 'clover_employees_list'
  | 'clover_employee_get';

export interface CloverRequestTarget {
  readonly method: string;
  readonly path: string;
  readonly query: Readonly<Record<string, string>>;
}

export interface CloverToolDefinition {
  readonly name: CloverToolName;
  readonly title: string;
  readonly description: string;
  readonly permission:
    | 'merchant:read'
    | 'inventory:read'
    | 'orders:read'
    | 'payments:read'
    | 'customers:read'
    | 'employees:read';
  readonly schema: z.ZodType<Record<string, unknown>>;
  readonly buildTarget: (
    input: Record<string, unknown>,
    merchantId: string,
  ) => CloverRequestTarget;
}

const noInputSchema: z.ZodType<Record<string, unknown>> = z.object({}).strict();

const idSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(CLOVER_ID_PATTERN);

function expandSchema(allowed: readonly string[]): z.ZodType<string[] | undefined> {
  return z
    .array(z.string().trim().min(1).max(64))
    .max(5)
    .refine(
      (values) => new Set(values).size === values.length,
      'expand values must be unique',
    )
    .refine(
      (values) => values.every((value) => allowed.includes(value)),
      'expand value is not allowed for this resource',
    )
    .optional();
}

function endpointFilterSchema(allowedFields: readonly string[]): z.ZodType<string> {
  return z.string().trim().min(3).max(256).regex(SINGLE_FILTER_PATTERN).refine((value) => {
    const field = SINGLE_FILTER_PATTERN.exec(value)?.[1];
    return Boolean(field && allowedFields.includes(field));
  }, 'filter field is not allowed for this endpoint');
}

function endpointListSchema(options: {
  readonly pagination?: boolean;
  readonly filterFields?: readonly string[];
  readonly expands?: readonly string[];
}): z.ZodType<Record<string, unknown>> {
  return z.object({
    ...(options.pagination ? {
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).max(10000).default(0),
    } : {}),
    ...(options.filterFields ? {
      filter: endpointFilterSchema(options.filterFields).optional(),
    } : {}),
    ...(options.expands ? { expand: expandSchema(options.expands) } : {}),
  }).strict();
}

function getSchema(
  allowedExpands: readonly string[],
  field: string,
  filterFields?: readonly string[],
): z.ZodType<Record<string, unknown>> {
  return z
    .object({
      [field]: idSchema,
      expand: expandSchema(allowedExpands),
      ...(filterFields ? { filter: endpointFilterSchema(filterFields).optional() } : {}),
    })
    .strict();
}

function encodedId(value: unknown): string {
  if (typeof value !== 'string' || !CLOVER_ID_PATTERN.test(value)) {
    throw new CloverNativeReadError('invalid_tool_input');
  }
  return encodeURIComponent(value);
}

function listTarget(
  resource: string,
  input: Record<string, unknown>,
  merchantId: string,
): CloverRequestTarget {
  const query: Record<string, string> = {};
  if (typeof input.limit === 'number') query.limit = String(input.limit);
  if (typeof input.offset === 'number') query.offset = String(input.offset);
  if (typeof input.filter === 'string') {
    query.filter = input.filter;
  }
  if (Array.isArray(input.expand) && input.expand.every((value) => typeof value === 'string')) {
    query.expand = input.expand.join(',');
  }
  return {
    method: 'GET',
    path: `/v3/merchants/${merchantId}/${resource}`,
    query,
  };
}

function getTarget(
  resource: string,
  field: string,
  input: Record<string, unknown>,
  merchantId: string,
): CloverRequestTarget {
  const query: Record<string, string> = {};
  if (Array.isArray(input.expand) && input.expand.every((value) => typeof value === 'string')) {
    query.expand = input.expand.join(',');
  }
  if (typeof input.filter === 'string') query.filter = input.filter;
  return {
    method: 'GET',
    path: `/v3/merchants/${merchantId}/${resource}/${encodedId(input[field])}`,
    query,
  };
}

function definition(
  name: CloverToolName,
  title: string,
  description: string,
  permission: CloverToolDefinition['permission'],
  schema: z.ZodType<Record<string, unknown>>,
  buildTarget: CloverToolDefinition['buildTarget'],
): CloverToolDefinition {
  return { name, title, description, permission, schema, buildTarget };
}

export const CLOVER_TOOL_DEFINITIONS: readonly CloverToolDefinition[] = [
  definition(
    'clover_merchant_get',
    'Get Clover merchant',
    'Read the server-bound Clover merchant record.',
    'merchant:read',
    noInputSchema,
    (_input, merchantId) => ({
      method: 'GET',
      path: `/v3/merchants/${merchantId}`,
      query: {},
    }),
  ),
  definition(
    'clover_inventory_items_list',
    'List Clover inventory items',
    'List Clover inventory items using the frozen provider filter, pagination, and expansion contract.',
    'inventory:read',
    endpointListSchema({
      pagination: true,
      filterFields: ['lowStock', 'modifiedTime', 'hidden', 'itemCode', 'available', 'option.id', 'modifierGroup.id', 'autoManage', 'price', 'id', 'sku', 'defaultTaxRates', 'tags.id', 'alternateName', 'isRevenue', 'tags.name', 'deleted', 'item.id', 'name', 'itemStock.quantity', 'itemGroup.id', 'isAgeRestricted', 'ageRestrictedType', 'minimumAge'],
      expands: ['tags', 'categories', 'taxRates', 'modifierGroups', 'itemStock', 'options', 'ageRestricted'],
    }),
    (input, merchantId) => listTarget('items', input, merchantId),
  ),
  definition(
    'clover_inventory_item_get',
    'Get Clover inventory item',
    'Read one Clover inventory item by its bounded identifier.',
    'inventory:read',
    getSchema(['tags', 'categories', 'taxRates', 'modifierGroups', 'itemStock', 'options'], 'item_id'),
    (input, merchantId) => getTarget('items', 'item_id', input, merchantId),
  ),
  definition(
    'clover_orders_list',
    'List Clover orders',
    'List Clover orders using the frozen provider filter and expansion contract.',
    'orders:read',
    endpointListSchema({
      filterFields: ['employee.id', 'note', 'modifiedTime', 'orderType', 'touched', 'cardTransaction.last4', 'manualTransaction', 'employee.name', 'title', 'device.id', 'externalReferenceId', 'clientCreatedTime', 'total', 'payType', 'testMode', 'createdTime', 'id', 'state', 'deletedTime'],
      expands: ['employee', 'payments', 'refunds', 'credits', 'voids', 'payment.tender', 'payment.cardTransaction', 'lineItems', 'customers', 'serviceCharge', 'discounts', 'orderType', 'lineItems.discounts', 'lineItems.modifications'],
    }),
    (input, merchantId) => listTarget('orders', input, merchantId),
  ),
  definition(
    'clover_order_get',
    'Get Clover order',
    'Read one Clover order by its bounded identifier.',
    'orders:read',
    getSchema(['lineItems', 'serviceCharge', 'discounts', 'credits', 'payments', 'customers', 'orderFulfillmentEvent', 'refunds'], 'order_id'),
    (input, merchantId) => getTarget('orders', 'order_id', input, merchantId),
  ),
  definition(
    'clover_payments_list',
    'List Clover payments',
    'List Clover payments using the frozen provider filter and expansion contract.',
    'payments:read',
    endpointListSchema({
      filterFields: ['modifiedTime', 'device.id', 'externalReferenceId', 'result', 'offline', 'createdTime', 'externalPaymentId', 'voided', 'id', 'tender.id', 'employee.id', 'order.modifiedTime', 'amount', 'cardType', 'clientCreatedTime'],
      expands: ['tender', 'germanInfo', 'lineItemPayments', 'cardTransaction', 'dccInfo', 'refunds', 'transactionInfo', 'externalReferenceId', 'oceanGatewayInfo', 'taxRates', 'additionalCharges', 'appTracking', 'paymentAttributes', 'order'],
    }),
    (input, merchantId) => listTarget('payments', input, merchantId),
  ),
  definition(
    'clover_payment_get',
    'Get Clover payment',
    'Read one Clover payment by its bounded identifier.',
    'payments:read',
    getSchema(['tender', 'germanInfo', 'lineItemPayments', 'cardTransaction', 'dccInfo', 'refunds', 'transactionInfo', 'externalReferenceId', 'oceanGatewayInfo', 'taxRates', 'additionalCharges', 'appTracking', 'paymentAttributes', 'order', 'employee'], 'payment_id'),
    (input, merchantId) => getTarget('payments', 'payment_id', input, merchantId),
  ),
  definition('clover_refunds_list', 'List Clover refunds', 'List Clover refunds for the provider-defined 90-day reconciliation window.', 'payments:read', endpointListSchema({ filterFields: ['id', 'voided', 'createdTime', 'clientCreatedTime', 'payment.id', 'orderRef.id', 'employee.id', 'device.id'], expands: ['payment', 'germanInfo', 'appTracking', 'employee', 'overrideMerchantTender', 'serviceCharge', 'lineItems', 'transactionInfo', 'oceanGatewayInfo'] }), (input, merchantId) => listTarget('refunds', input, merchantId)),
  definition('clover_refund_get', 'Get Clover refund', 'Read one merchant refund by identifier.', 'payments:read', getSchema(['payment', 'germanInfo', 'appTracking', 'employee', 'overrideMerchantTender', 'serviceCharge', 'lineItems', 'transactionInfo', 'oceanGatewayInfo'], 'refund_id'), (input, merchantId) => getTarget('refunds', 'refund_id', input, merchantId)),
  definition('clover_credit_refunds_list', 'List Clover credit refunds', 'List merchant credit refunds for reconciliation.', 'payments:read', endpointListSchema({ expands: ['credit', 'germanInfo', 'appTracking', 'transactionInfo'] }), (input, merchantId) => listTarget('credit_refunds', input, merchantId)),
  definition('clover_credit_refund_get', 'Get Clover credit refund', 'Read one merchant credit refund by identifier.', 'payments:read', getSchema(['credit', 'germanInfo', 'appTracking', 'transactionInfo'], 'credit_refund_id'), (input, merchantId) => getTarget('credit_refunds', 'credit_refund_id', input, merchantId)),
  definition('clover_tenders_list', 'List Clover tenders', 'List bounded merchant tenders.', 'payments:read', endpointListSchema({ pagination: true, filterFields: ['id', 'label', 'labelKey', 'systemTenderId', 'visible', 'enabled', 'opensCashDrawer', 'modifiedTime', 'deletedTime', 'merchantId', 'instruction'] }), (input, merchantId) => listTarget('tenders', input, merchantId)),
  definition('clover_tender_get', 'Get Clover tender', 'Read one merchant tender by identifier.', 'payments:read', getSchema([], 'tender_id'), (input, merchantId) => getTarget('tenders', 'tender_id', input, merchantId)),
  definition('clover_cash_events_list', 'List Clover cash events', 'List merchant cash events with optional employee and device expansions.', 'payments:read', endpointListSchema({ filterFields: ['employee.id', 'employee.name', 'amountChange', 'type', 'device.id', 'timestamp', 'note'], expands: ['employee', 'device'] }), (input, merchantId) => listTarget('cash_events', input, merchantId)),
  definition('clover_tax_rates_list', 'List Clover tax rates', 'List bounded merchant tax rates.', 'inventory:read', endpointListSchema({ pagination: true, filterFields: ['id', 'name', 'rate', 'isDefault', 'taxAmount', 'taxType', 'items.id'], expands: ['items'] }), (input, merchantId) => listTarget('tax_rates', input, merchantId)),
  definition('clover_tax_rate_get', 'Get Clover tax rate', 'Read one merchant tax rate by identifier.', 'inventory:read', getSchema(['items'], 'tax_rate_id'), (input, merchantId) => getTarget('tax_rates', 'tax_rate_id', input, merchantId)),
  definition('clover_order_fees_list', 'List Clover order fees', 'List configured merchant service charges.', 'inventory:read', endpointListSchema({ filterFields: ['id', 'name', 'amount', 'percentage', 'type', 'createdTime', 'modifiedTime', 'deletedTime', 'serviceChargeUuid'] }), (input, merchantId) => listTarget('order_fees', input, merchantId)),
  definition('clover_order_fee_get', 'Get Clover order fee', 'Read one configured merchant service charge by identifier.', 'inventory:read', getSchema([], 'order_fee_id'), (input, merchantId) => getTarget('order_fees', 'order_fee_id', input, merchantId)),
  definition('clover_voided_line_items_totals', 'Get Clover voided line-item totals', 'Read the merchant summary of deleted line items for reconciliation.', 'orders:read', endpointListSchema({ filterFields: ['reason', 'quantity', 'orderId', 'revenueClassName', 'deleteType', 'isRevenue', 'approvedByUuid', 'sortByName', 'printed', 'orderType.id', 'price', 'name', 'showInReporting', 'lineItemUuid', 'id', 'deletedTime'] }), (input, merchantId) => listTarget('voided_line_items/totals', input, merchantId)),
  definition(
    'clover_customers_list',
    'List Clover customers',
    'List Clover customers using the frozen provider filter and expansion contract.',
    'customers:read',
    endpointListSchema({
      filterFields: ['customerSince', 'firstName', 'lastName', 'emailAddress', 'phoneNumber', 'marketingAllowed', 'fullName', 'id', 'deletedTime'],
      expands: ['addresses', 'emailAddresses', 'phoneNumbers', 'cards', 'metadata'],
    }),
    (input, merchantId) => listTarget('customers', input, merchantId),
  ),
  definition(
    'clover_customer_get',
    'Get Clover customer',
    'Read one Clover customer by its bounded identifier.',
    'customers:read',
    getSchema(
      ['addresses', 'emailAddresses', 'phoneNumbers', 'cards', 'metadata'],
      'customer_id',
      ['customerSince', 'firstName', 'lastName', 'emailAddress', 'phoneNumber', 'marketingAllowed', 'fullName', 'id', 'deletedTime'],
    ),
    (input, merchantId) => getTarget('customers', 'customer_id', input, merchantId),
  ),
  definition(
    'clover_employees_list',
    'List Clover employees',
    'List Clover employees using the frozen provider filter and expansion contract.',
    'employees:read',
    endpointListSchema({
      filterFields: ['modifiedTime', 'role', 'role.id', 'customId', 'name', 'nickname', 'id', 'deletedTime', 'deleted_time', 'email'],
      expands: ['roles', 'shifts'],
    }),
    (input, merchantId) => listTarget('employees', input, merchantId),
  ),
  definition(
    'clover_employee_get',
    'Get Clover employee',
    'Read one Clover employee by its bounded identifier.',
    'employees:read',
    getSchema(['roles', 'shifts'], 'employee_id'),
    (input, merchantId) => getTarget('employees', 'employee_id', input, merchantId),
  ),
];

const definitionByName = new Map<string, CloverToolDefinition>(
  CLOVER_TOOL_DEFINITIONS.map((tool) => [tool.name, tool]),
);

export function getCloverToolDefinition(name: string): CloverToolDefinition {
  const tool = definitionByName.get(name);
  if (!tool) {
    throw new CloverNativeReadError('unknown_tool');
  }
  return tool;
}

export function parseCloverToolInput(
  tool: CloverToolDefinition,
  input: unknown,
): Record<string, unknown> {
  const parsed = tool.schema.safeParse(input);
  if (!parsed.success) {
    throw new CloverNativeReadError('invalid_tool_input');
  }
  return parsed.data;
}
