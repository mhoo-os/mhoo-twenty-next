const REDACTED = '[REDACTED]';
const TRUNCATED = '[TRUNCATED]';
const MAX_DEPTH = 8;
const MAX_ARRAY_ITEMS = 1000;
const MAX_OBJECT_KEYS = 1000;

const sensitiveKeys = new Set([
  'accesskey',
  'accesstoken',
  'apikey',
  'authorization',
  'cardholder',
  'cardnumber',
  'clientsecret',
  'cvc',
  'cvv',
  'encrypteddata',
  'magstripe',
  'password',
  'pin',
  'privatekey',
  'refreshtoken',
  'secret',
  'token',
  'trackdata',
]);

function normalizedKey(key: string): string {
  return key.split('_').join('').split('-').join('').toLowerCase();
}

function isSensitiveKey(key: string): boolean {
  const normalized = normalizedKey(key);
  return sensitiveKeys.has(normalized) || normalized.endsWith('token');
}

export function redactProviderData(
  value: unknown,
  secretValues: readonly string[] = [],
): unknown {
  return redactValue(value, 0, new Set(secretValues.filter(Boolean)));
}

function redactValue(
  value: unknown,
  depth: number,
  secretValues: ReadonlySet<string>,
): unknown {
  if (depth > MAX_DEPTH) {
    return TRUNCATED;
  }
  if (typeof value === 'string') {
    return secretValues.has(value) || value.startsWith('Bearer ')
      ? REDACTED
      : value;
  }
  if (
    value === null ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => redactValue(item, depth + 1, secretValues));
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value).slice(0, MAX_OBJECT_KEYS)) {
      if (!isSensitiveKey(key)) {
        result[key] = redactValue(child, depth + 1, secretValues);
      }
    }
    return result;
  }

  return TRUNCATED;
}
