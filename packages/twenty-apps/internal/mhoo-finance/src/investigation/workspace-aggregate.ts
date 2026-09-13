import { currency, type Currency } from '../contracts/money';
import type { WorkspaceFinanceFact } from './workspace-finance-data';

export const workspaceAggregateCurrency = (
  facts: readonly WorkspaceFinanceFact[],
  truncated: boolean,
): Readonly<
  | { kind: 'available'; currency: Currency }
  | { kind: 'truncated' | 'mixed' | 'currency-unavailable' }
> => {
  if (truncated) return { kind: 'truncated' };
  const currencies = new Set<Currency>();
  for (const fact of facts) {
    try {
      currencies.add(currency(fact.currency));
    } catch {
      return { kind: 'currency-unavailable' };
    }
  }
  if (currencies.size > 1) return { kind: 'mixed' };
  return currencies.size === 1
    ? { kind: 'available', currency: [...currencies][0] as Currency }
    : { kind: 'currency-unavailable' };
};
