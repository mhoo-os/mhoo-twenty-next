import { getCloverToolDefinition, parseCloverToolInput } from './catalog';
import { CloverNativeReadError } from './errors';
import { redactProviderData } from './redact';
import { sanitizeCloverOutput } from './output';

export const CLOVER_REQUEST_TIMEOUT_MS = 8_000;
export const CLOVER_MAX_RESPONSE_BYTES = 262_144;
const CLOVER_REST_ORIGIN = 'https://api.clover.com';
const ALLOWED_QUERY_KEYS = new Set(['limit', 'offset', 'filter', 'expand']);

export type NativeCloverReadConfig = {
  merchantId: string;
  accessToken: string;
};

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export async function invokeNativeCloverRead(
  config: NativeCloverReadConfig,
  name: string,
  input: unknown,
  fetchFn: FetchLike = fetch,
): Promise<unknown> {
  const tool = getCloverToolDefinition(name);
  const parsedInput = parseCloverToolInput(tool, input);
  const target = tool.buildTarget(parsedInput, config.merchantId);
  if (target.method !== 'GET') {
    throw new CloverNativeReadError('clover_origin_rejected');
  }
  const url = buildUrl(config.merchantId, target.path, target.query);
  const response = await fetchJson(url, config.accessToken, fetchFn);
  return sanitizeCloverOutput(tool.name, redactProviderData(response, [config.accessToken]));
}

function buildUrl(
  merchantId: string,
  path: string,
  query: Readonly<Record<string, string | readonly string[]>>,
): URL {
  const url = new URL(path, CLOVER_REST_ORIGIN);
  if (
    url.protocol !== 'https:' ||
    url.origin !== CLOVER_REST_ORIGIN ||
    !(
      url.pathname === `/v3/merchants/${merchantId}` ||
      url.pathname.startsWith(`/v3/merchants/${merchantId}/`)
    )
  ) {
    throw new CloverNativeReadError('clover_origin_rejected');
  }
  for (const [key, value] of Object.entries(query)) {
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (!ALLOWED_QUERY_KEYS.has(key) || item.length > 512) {
        throw new CloverNativeReadError('invalid_tool_input');
      }
      url.searchParams.append(key, item);
    }
  }
  return url;
}

async function fetchJson(
  url: URL,
  accessToken: string,
  fetchFn: FetchLike,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLOVER_REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetchFn(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': '@mhoo/clover/0.1',
      },
      redirect: 'error',
      signal: controller.signal,
    });
  } catch {
    throw new CloverNativeReadError('clover_provider_unavailable');
  } finally {
    clearTimeout(timeout);
  }
  if (response.redirected) {
    throw new CloverNativeReadError('clover_redirect_rejected');
  }
  if (response.url && new URL(response.url).origin !== CLOVER_REST_ORIGIN) {
    throw new CloverNativeReadError('clover_origin_rejected');
  }
  if (!response.ok) {
    throw new CloverNativeReadError('clover_provider_http_error', response.status);
  }
  const contentType = response.headers.get('Content-Type');
  if (contentType && !/^application\/json(?:\s*;|$)/i.test(contentType)) {
    throw new CloverNativeReadError('clover_response_invalid');
  }
  const body = await readBoundedBody(response);
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new CloverNativeReadError('clover_response_invalid');
  }
}

export async function readBoundedBody(response: Response): Promise<string> {
  const contentLength = response.headers.get('Content-Length');
  if (contentLength) {
    const size = Number(contentLength);
    if (!Number.isSafeInteger(size) || size < 0 || size > CLOVER_MAX_RESPONSE_BYTES) {
      throw new CloverNativeReadError('clover_response_too_large');
    }
  }
  const reader = response.body?.getReader();
  if (!reader) {
    throw new CloverNativeReadError('clover_response_invalid');
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > CLOVER_MAX_RESPONSE_BYTES) {
        throw new CloverNativeReadError('clover_response_too_large');
      }
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}
