import { getBrandedPageTitle } from '@/ui/utilities/page-title/components/PageTitle';

describe('getBrandedPageTitle', () => {
  it('keeps the initial shell on the Mhoo product name', () => {
    expect(getBrandedPageTitle('Twenty', null)).toBe('Mhoo');
    expect(getBrandedPageTitle('Page Not Found | Twenty', null)).toBe(
      'Page Not Found · Mhoo',
    );
  });

  it('uses the resolved product template after client-config loads', () => {
    const twentyBrand = {
      productName: 'Twenty',
      documentTitleTemplate: '%s · Twenty',
    };

    expect(getBrandedPageTitle('Settings', twentyBrand)).toBe(
      'Settings · Twenty',
    );
    expect(getBrandedPageTitle('Mhoo', twentyBrand)).toBe('Twenty');
  });
});
