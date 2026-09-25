import { currency, formatMoney, minor, type Currency } from '../contracts/money';

export type StatementControls = Readonly<{
  opening: string | null;
  closing: string | null;
  moneyIn: string | null;
  moneyOut: string | null;
  currencyCode: Currency | null;
}>;

const readMinor = (value: unknown): string | null => {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) return null;
    return minor(String(value)).toString();
  }
  if (typeof value !== 'string') return null;
  try {
    return minor(value).toString();
  } catch {
    return null;
  }
};

const readCurrency = (value: unknown): Currency | null => {
  try {
    return currency(value);
  } catch {
    return null;
  }
};

/**
 * Decodes retained statement controls without treating a JSON number as exact
 * unless JavaScript can represent it losslessly. Currency remains unavailable
 * until the source artifact supplies an explicit supported currencyCode.
 */
export const parseStatementControls = (
  value: string | null,
): StatementControls | null => {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as Record<string, unknown>;
    const controls = {
      opening: readMinor(record.openingBalanceMinor),
      closing: readMinor(record.closingBalanceMinor),
      moneyIn: readMinor(record.moneyInMinor),
      moneyOut: readMinor(record.moneyOutMinor),
      currencyCode: readCurrency(record.currencyCode),
    };
    return Object.values(controls).some((item) => item !== null)
      ? controls
      : null;
  } catch {
    return null;
  }
};

export const formatStatementControlMoney = (
  value: string | null,
  currencyCode: Currency | null,
): string => {
  if (value === null) return 'Unavailable';
  return currencyCode
    ? formatMoney({ currency: currencyCode, minor: value })
    : `${value} minor units · currency unavailable`;
};
