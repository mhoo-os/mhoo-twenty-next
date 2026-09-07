import { resolveCloverConnection } from './resolve-clover-connection';
import { createHash } from 'node:crypto';
import { type CloverConnection } from './clover-merchant-read';

const DAY = 86_400_000;
export const PAYMENT_WINDOW_MS = 89 * DAY;
const PAGE_SIZE = 100;
export type PaymentWindow = {
  connectionId?: string;
  fromMs: number;
  toMs: number;
  timeField: 'createdTime' | 'modifiedTime';
  offset: number;
};

export const planPaymentWindows = (fromMs: number, toMs: number) => {
  if (
    !Number.isSafeInteger(fromMs) ||
    !Number.isSafeInteger(toMs) ||
    fromMs < 0 ||
    toMs <= fromMs ||
    toMs - fromMs > 200 * PAYMENT_WINDOW_MS
  )
    throw new Error('Invalid bounded payment range');
  const windows: { fromMs: number; toMs: number }[] = [];
  for (let start = fromMs; start < toMs; start += PAYMENT_WINDOW_MS)
    windows.push({
      fromMs: start,
      toMs: Math.min(start + PAYMENT_WINDOW_MS, toMs),
    });
  return windows;
};

// One bounded provider page per invocation. No checkpoint or coverage is advanced
// here: persistence must acknowledge every revision before an ingestion job can do so.
export const readCloverPayments = async (
  input: PaymentWindow,
  dependencies: {
    list: () => Promise<CloverConnection[]>;
    get: (id: string) => Promise<CloverConnection>;
    fetch: typeof fetch;
  },
) => {
  try {
    if (
      planPaymentWindows(input.fromMs, input.toMs).length !== 1 ||
      !['createdTime', 'modifiedTime'].includes(input.timeField) ||
      !Number.isSafeInteger(input.offset) ||
      input.offset < 0 ||
      input.offset > 10000 ||
      input.offset % PAGE_SIZE !== 0
    )
      throw new Error('Invalid page');
    const connection = await resolveCloverConnection(
      dependencies,
      input.connectionId,
    );
    const url = new URL(
      `https://api.clover.com/v3/merchants/${connection.handle}/payments`,
    );
    url.searchParams.append('filter', `${input.timeField}>=${input.fromMs}`);
    url.searchParams.append('filter', `${input.timeField}<${input.toMs}`);
    url.searchParams.set('limit', String(PAGE_SIZE));
    url.searchParams.set('offset', String(input.offset));
    url.searchParams.set(
      'fields',
      'id,amount,createdTime,modifiedTime,result,voided',
    );
    const response = await dependencies.fetch(url.toString(), {
      method: 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'User-Agent': 'mhoo-clover/0.1.0',
      },
    });
    if (!response.ok || !response.body) throw new Error('Provider unavailable');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > 262144) throw new Error('Oversized page');
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    const bytes = new Uint8Array(length);
    let position = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, position);
      position += chunk.length;
    }
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (!Array.isArray(data.elements) || data.elements.length > PAGE_SIZE)
      throw new Error('Invalid page');
    const revisions = (data.elements as Record<string, unknown>[]).map(
      (item) => {
        if (
          !item ||
          typeof item.id !== 'string' ||
          !/^[A-Z0-9]{13}$/.test(item.id) ||
          !Number.isSafeInteger(item.amount) ||
          !Number.isSafeInteger(item.createdTime) ||
          !Number.isSafeInteger(item.modifiedTime) ||
          Number(item.createdTime) < 0 ||
          Number(item.modifiedTime) < 0 ||
          typeof item.result !== 'string' ||
          !/^[A-Z_]{1,32}$/.test(item.result) ||
          (item.voided !== undefined && typeof item.voided !== 'boolean')
        )
          throw new Error('Invalid payment');
        const timestamp = Number(item[input.timeField]);
        if (timestamp < input.fromMs || timestamp >= input.toMs)
          throw new Error('Out of range payment');
        const facts = {
          connectionId: connection.id,
          merchantId: connection.handle,
          paymentId: item.id,
          amountMinor: Number(item.amount),
          currency: null,
          createdTimeMs: Number(item.createdTime),
          modifiedTimeMs: Number(item.modifiedTime),
          result: item.result,
          voided: item.voided ?? null,
        };
        const serialized = JSON.stringify(facts);
        if (serialized.includes(connection.accessToken))
          throw new Error('Invalid provider projection');
        return {
          ...facts,
          revisionKey: createHash('sha256').update(serialized).digest('hex'),
        };
      },
    );
    return {
      revisions,
      nextOffset:
        data.elements.length === PAGE_SIZE ? input.offset + PAGE_SIZE : null,
      range: {
        fromMs: input.fromMs,
        toMs: input.toMs,
        timeField: input.timeField,
        offset: input.offset,
      },
      coverage: 'unverified' as const,
      scopeVerification: 'unknown' as const,
      currencyVerification: 'unresolved' as const,
    };
  } catch {
    throw new Error(
      'Clover payment page unavailable. No import progress was committed.',
    );
  }
};
