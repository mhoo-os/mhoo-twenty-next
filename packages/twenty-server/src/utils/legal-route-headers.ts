const LEGAL_ROUTE_PREFIX = '/legal/';

const LEGAL_ROUTE_HEADERS = {
  'Cache-Control': 'public, max-age=300, must-revalidate',
  'Content-Security-Policy':
    "default-src 'self'; base-uri 'none'; connect-src 'self'; font-src 'self' data:; form-action 'none'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'",
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
} as const;

type LegalRouteRequest = Readonly<{
  originalUrl?: string;
  url?: string;
}>;

type LegalRouteResponse = {
  req: LegalRouteRequest;
  setHeader: (name: string, value: string) => void;
};

export const isLegalRoutePath = (requestedPath: string): boolean => {
  const pathWithoutQuery = requestedPath.split(/[?#]/, 1)[0];

  return pathWithoutQuery.startsWith(LEGAL_ROUTE_PREFIX);
};

export const setLegalRouteHeaders = (
  response: Pick<LegalRouteResponse, 'setHeader'>,
): void => {
  for (const [name, value] of Object.entries(LEGAL_ROUTE_HEADERS)) {
    response.setHeader(name, value);
  }
};

export const applyLegalRouteHeaders = (response: LegalRouteResponse): void => {
  const requestedPath = response.req.originalUrl ?? response.req.url ?? '';

  if (isLegalRoutePath(requestedPath)) {
    setLegalRouteHeaders(response);
  }
};
