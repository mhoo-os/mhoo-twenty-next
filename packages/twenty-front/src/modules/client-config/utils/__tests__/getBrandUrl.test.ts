import { MHO_BRAND, TWENTY_BRAND } from 'twenty-shared/branding';

import { getBrandUrl } from '@/client-config/utils/getBrandUrl';

describe('getBrandUrl', () => {
  it('unwraps relative URLs from the Mhoo source contract', () => {
    expect(getBrandUrl(MHO_BRAND, 'documentationUrl')).toBe('/docs');
  });

  it('preserves absolute URLs from a resolved upstream brand', () => {
    expect(getBrandUrl(TWENTY_BRAND, 'documentationUrl')).toBe(
      'https://docs.twenty.com/',
    );
  });
});
