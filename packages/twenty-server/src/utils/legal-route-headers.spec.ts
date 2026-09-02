import {
  applyLegalRouteHeaders,
  isLegalRoutePath,
  setLegalRouteHeaders,
} from 'src/utils/legal-route-headers';

describe('legal route headers', () => {
  it.each(['/legal/terms', '/legal/privacy?print=1', '/legal/dpa#notice'])(
    'recognizes %s as a legal route',
    (path) => {
      expect(isLegalRoutePath(path)).toBe(true);
    },
  );

  it.each(['/legal', '/legalist/terms', '/settings/legal/dpa'])(
    'does not recognize %s as a legal route',
    (path) => {
      expect(isLegalRoutePath(path)).toBe(false);
    },
  );

  it('applies the bounded public security headers only to legal responses', () => {
    const headers = new Map<string, string>();
    const response = {
      req: { originalUrl: '/legal/terms?source=footer' },
      setHeader: (name: string, value: string) => headers.set(name, value),
    };

    applyLegalRouteHeaders(response);

    expect(Object.fromEntries(headers)).toEqual({
      'Cache-Control': 'public, max-age=300, must-revalidate',
      'Content-Security-Policy':
        "default-src 'self'; base-uri 'none'; connect-src 'self'; font-src 'self' data:; form-action 'none'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'",
      'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    });

    const nonLegalHeaders = new Map<string, string>();
    applyLegalRouteHeaders({
      req: { originalUrl: '/settings/legal/dpa' },
      setHeader: (name: string, value: string) =>
        nonLegalHeaders.set(name, value),
    });
    expect(nonLegalHeaders.size).toBe(0);
  });

  it('can apply the header set to a response without request inspection', () => {
    const headers = new Map<string, string>();

    setLegalRouteHeaders({
      setHeader: (name: string, value: string) => headers.set(name, value),
    });

    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
  });
});
