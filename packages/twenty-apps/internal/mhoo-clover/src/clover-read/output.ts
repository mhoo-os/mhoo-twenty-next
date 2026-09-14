import type { CloverToolName } from './catalog';
import { CloverNativeReadError } from './errors';

interface ObjectPolicy { readonly [key: string]: Policy }
type Policy = true | ObjectPolicy | readonly [Policy];

const ref: ObjectPolicy = { id: true };
const refs = (policy: Policy = ref): ObjectPolicy => ({ elements: [policy] });

const address: ObjectPolicy = {
  id: true, address1: true, address2: true, address3: true,
  city: true, state: true, zip: true, country: true,
};
const employee: ObjectPolicy = {
  id: true, name: true, nickname: true, role: true, roles: refs(),
};
const tender: ObjectPolicy = {
  id: true, labelKey: true, label: true, editable: true,
  opensCashDrawer: true, supportsTipping: true, enabled: true,
  visible: true, instructions: true, modifiedTime: true, deletedTime: true,
};
const lineItem: ObjectPolicy = {
  id: true, name: true, price: true, unitQty: true, unitName: true,
  createdTime: true, modifiedTime: true, exchanged: true, refunded: true,
  item: ref, taxRates: refs(), discounts: refs(), modifications: refs(),
};
const paymentShallow: ObjectPolicy = {
  id: true, amount: true, tipAmount: true, taxAmount: true,
  cashbackAmount: true, cashTendered: true, createdTime: true,
  clientCreatedTime: true, gatewayProcessingTime: true, modifiedTime: true,
  offline: true, result: true, externalPaymentId: true,
  order: ref, employee: ref, tender,
  cardTransaction: { cardType: true, entryType: true, type: true, result: true },
};
const refund: ObjectPolicy = {
  id: true, amount: true, taxAmount: true, tipAmount: true,
  createdTime: true, clientCreatedTime: true, gatewayProcessingTime: true,
  voided: true, orderRef: ref, payment: ref, employee: ref,
  lineItems: refs(lineItem), serviceCharge: ref,
  transactionInfo: { isTokenBasedTx: true, emergencyFlag: true },
};
const creditRefund: ObjectPolicy = {
  id: true, amount: true, taxAmount: true, tipAmount: true,
  createdTime: true, clientCreatedTime: true, gatewayProcessingTime: true,
  credit: ref, transactionInfo: { isTokenBasedTx: true, emergencyFlag: true },
};
const item: ObjectPolicy = {
  id: true, name: true, alternateName: true, code: true, sku: true,
  price: true, cost: true, priceType: true, available: true, hidden: true,
  deleted: true, createdTime: true, modifiedTime: true, stockCount: true,
  unitName: true, categories: refs(), modifierGroups: refs(), taxRates: refs(),
};
const order: ObjectPolicy = {
  id: true, currency: true, total: true, unpaidBalance: true,
  paymentState: true, state: true, createdTime: true, clientCreatedTime: true,
  modifiedTime: true, deletedTimestamp: true, title: true,
  manualTransaction: true, testMode: true, payType: true,
  employee: ref, customer: ref, orderType: ref,
  lineItems: refs(lineItem), payments: refs(paymentShallow), discounts: refs(),
};
const customer: ObjectPolicy = {
  id: true, firstName: true, lastName: true, customerSince: true,
  marketingAllowed: true, addresses: refs(address), marketingPreferences: refs(),
};
const taxRate: ObjectPolicy = {
  id: true, name: true, rate: true, taxAmount: true, taxType: true,
  isDefault: true, deletedTime: true, modifiedTime: true, items: refs(),
};
const orderFee: ObjectPolicy = {
  id: true, name: true, amount: true, percentage: true, type: true,
  serviceChargeUuid: true, createdTime: true, modifiedTime: true, deletedTime: true,
};
const cashEvent: ObjectPolicy = {
  id: true, amountChange: true, type: true, timestamp: true,
  employee: ref, device: ref,
};
const merchant: ObjectPolicy = {
  id: true, name: true, createdTime: true, currency: true, timezone: true,
  address,
};
const voidedChartTotal: ObjectPolicy = {
  revenueClassName: true,
  priceWithQuantity: true,
  priceWithQuantityAndModifiers: true,
  count: true,
};
const voidedTotals: ObjectPolicy = {
  printed: true,
  unprinted: true,
  price: true,
  priceWithQuantity: true,
  priceWithQuantityAndModifiers: true,
  deletedOrders: true,
  deletedItems: true,
  chartSummary: {
    hasModifiers: true,
    chartData: [voidedChartTotal],
    chartTotals: voidedChartTotal,
  },
};

type ProviderTool = CloverToolName;
const outputPolicies: Readonly<Record<ProviderTool, Policy>> = {
  clover_merchant_get: merchant,
  clover_inventory_items_list: refs(item),
  clover_inventory_item_get: item,
  clover_orders_list: refs(order),
  clover_order_get: order,
  clover_payments_list: refs(paymentShallow),
  clover_payment_get: { ...paymentShallow, refunds: refs(refund) },
  clover_refunds_list: refs(refund),
  clover_refund_get: refund,
  clover_credit_refunds_list: refs(creditRefund),
  clover_credit_refund_get: creditRefund,
  clover_tenders_list: refs(tender),
  clover_tender_get: tender,
  clover_cash_events_list: refs(cashEvent),
  clover_tax_rates_list: refs(taxRate),
  clover_tax_rate_get: taxRate,
  clover_order_fees_list: refs(orderFee),
  clover_order_fee_get: orderFee,
  clover_voided_line_items_totals: voidedTotals,
  clover_customers_list: refs(customer),
  clover_customer_get: customer,
  clover_employees_list: refs(employee),
  clover_employee_get: employee,
};

const collectionTools = new Set<ProviderTool>([
  'clover_inventory_items_list', 'clover_orders_list', 'clover_payments_list',
  'clover_refunds_list', 'clover_credit_refunds_list', 'clover_tenders_list',
  'clover_cash_events_list', 'clover_tax_rates_list', 'clover_order_fees_list',
  'clover_customers_list', 'clover_employees_list',
]);

export function sanitizeCloverOutput(name: ProviderTool, value: unknown): unknown {
  const sanitized = applyPolicy(outputPolicies[name], value);
  if (!sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
    throw new CloverNativeReadError('clover_response_invalid');
  }
  const record = sanitized as Record<string, unknown>;
  if (collectionTools.has(name)) {
    if (!Array.isArray(record.elements)) throw new CloverNativeReadError('clover_response_invalid');
  } else if (name === 'clover_voided_line_items_totals') {
    if (!['printed', 'unprinted', 'price', 'priceWithQuantity', 'priceWithQuantityAndModifiers', 'deletedOrders', 'deletedItems']
      .every((field) => typeof record[field] === 'number')) {
      throw new CloverNativeReadError('clover_response_invalid');
    }
  } else if (typeof record.id !== 'string') {
    throw new CloverNativeReadError('clover_response_invalid');
  }
  return sanitized;
}

function applyPolicy(policy: Policy, value: unknown): unknown {
  if (policy === true) {
    return value === null || ['string', 'number', 'boolean'].includes(typeof value)
      ? value
      : undefined;
  }
  if (isArrayPolicy(policy)) {
    if (!Array.isArray(value)) return undefined;
    return value.map((entry) => applyPolicy(policy[0], entry)).filter((entry) => entry !== undefined);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, childPolicy] of Object.entries(policy)) {
    if (!(key in source)) continue;
    const child = applyPolicy(childPolicy, source[key]);
    if (child !== undefined) result[key] = child;
  }
  return result;
}

function isArrayPolicy(policy: Policy): policy is readonly [Policy] {
  return Array.isArray(policy);
}
