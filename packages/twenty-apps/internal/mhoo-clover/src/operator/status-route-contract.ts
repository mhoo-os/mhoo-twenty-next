import type { Merchant } from './status-contract';
export const STATUS_ROUTE = '/clover/operator-status';
export type MerchantListResult = { kind: 'available'; merchants: Merchant[] } | { kind: 'denied' | 'uncertain' };
export const isConnectionId = (id: unknown): id is string => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
export function decodeMerchantList(value: unknown): MerchantListResult {
  if (!value || typeof value !== 'object') return { kind: 'uncertain' };
  const raw = value as Record<string, unknown>;
  if (raw.kind === 'denied') return { kind: 'denied' };
  if (raw.kind !== 'available' || !Array.isArray(raw.merchants) || raw.merchants.length > 50) return { kind: 'uncertain' };
  const merchants: Merchant[] = [];
  for (const item of raw.merchants) {
    if (!item || !isConnectionId(item.id) || typeof item.name !== 'string' || !/^Merchant [A-Z0-9]{13}$/.test(item.name) || merchants.some((m) => m.id === item.id)) return { kind: 'uncertain' };
    merchants.push({ id: item.id, name: item.name });
  }
  return { kind: 'available', merchants };
}
