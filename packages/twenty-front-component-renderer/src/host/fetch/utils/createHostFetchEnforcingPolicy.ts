import { isNonEmptyString } from '@sniptt/guards';
import { CustomError, getURLSafely, isDefined } from 'twenty-shared/utils';

import { resolveHostFetchRedirectMode } from '@/host/fetch/utils/resolveHostFetchRedirectMode';
import { serializeResponseToHostFetchResult } from '@/host/fetch/utils/serializeResponseToHostFetchResult';
import { type HostFetchFunction } from '@/types/HostFetchFunction';
import { type HostFetchInput } from '@/types/HostFetchInput';
import { type HostFetchPolicy } from '@/types/HostFetchPolicy';
import { type HostFetchResult } from '@/types/HostFetchResult';

export const createHostFetchEnforcingPolicy = (
  hostFetchPolicy: HostFetchPolicy,
): HostFetchFunction => {
  const allowedOriginSet = new Set(hostFetchPolicy.allowedOrigins);
  const fileStorageRedirectableUrlSet = new Set(
    hostFetchPolicy.fileStorageRedirectableUrls,
  );

  return async (input: HostFetchInput): Promise<HostFetchResult> => {
    const requestOrigin = getURLSafely(input.url)?.origin;

    if (!isDefined(requestOrigin) || !allowedOriginSet.has(requestOrigin)) {
      throw new CustomError(
        `Front component host fetch blocked for disallowed origin: ${input.url}`,
        'FRONT_COMPONENT_HOST_FETCH_BLOCKED_ORIGIN',
      );
    }

    const requestMethod = isNonEmptyString(input.method)
      ? input.method.toUpperCase()
      : 'GET';

    // Only the configured GraphQL endpoint can carry same-origin edge cookies.
    // The explicit bearer remains necessary; redirects and other App fetches
    // retain their existing credential policy.
    const hasBearer = Object.entries(input.headers ?? {}).some(
      ([name, value]) =>
        name.toLowerCase() === 'authorization' && /^Bearer \S+$/i.test(value),
    );
    const useSameOriginCredentials =
      requestMethod === 'POST' &&
      input.url === hostFetchPolicy.graphqlUrl &&
      hasBearer;

    const response = await fetch(input.url, {
      method: requestMethod,
      headers: input.headers,
      body: input.body,
      credentials: useSameOriginCredentials ? 'same-origin' : 'omit',
      redirect: resolveHostFetchRedirectMode(
        requestMethod,
        input.url,
        fileStorageRedirectableUrlSet,
      ),
    });

    return serializeResponseToHostFetchResult(response);
  };
};
