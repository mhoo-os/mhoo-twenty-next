import { MHO_BRAND } from 'twenty-shared/branding';

import { getProductFaviconUrl } from '@/ui/utilities/page-favicon/components/PageFavicon';

describe('getProductFaviconUrl', () => {
  it('uses the Mhoo static favicon before bootstrap state exists', () => {
    expect(getProductFaviconUrl(null, 'https://crm.example.test')).toBe(
      'https://crm.example.test/images/mhoo/favicon/mhoo-favicon.ico',
    );
  });

  it('uses the resolved product favicon and not workspace metadata', () => {
    expect(
      getProductFaviconUrl(
        {
          assets: MHO_BRAND.assets,
        },
        'https://crm.example.test',
      ),
    ).toBe('https://crm.example.test/images/mhoo/favicon/mhoo-favicon.ico');
  });
});
