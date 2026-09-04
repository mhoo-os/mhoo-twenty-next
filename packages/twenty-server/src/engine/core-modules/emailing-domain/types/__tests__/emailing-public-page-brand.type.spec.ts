import { resolveEmailingPublicPageBrand } from 'src/engine/core-modules/emailing-domain/types/emailing-public-page-brand.type';
import { resolveProductBrand } from 'src/engine/core-modules/twenty-config/services/product-brand-resolver.service';

describe('resolveEmailingPublicPageBrand', () => {
  it('projects only approved Mhoo legal identity and availability links', () => {
    const brand = resolveEmailingPublicPageBrand(
      resolveProductBrand({
        preset: 'mhoo',
        deploymentOrigin: 'https://mhoo.example',
      }),
    );

    expect(brand.productName).toBe('Mhoo');
    expect(brand.emailMarkUrl).toBe(
      'https://mhoo.example/images/mhoo/mhoo-email-600x436.png',
    );
    expect(brand.legalLinks).toEqual([
      { label: 'Privacy', url: 'https://mhoo.example/legal/privacy' },
      { label: 'Terms', url: 'https://mhoo.example/legal/terms' },
      {
        label: 'Acceptable Use',
        url: 'https://mhoo.example/legal/acceptable-use',
      },
      {
        label: 'Open Source',
        url: 'https://mhoo.example/legal/open-source',
      },
      { label: 'DPA Status', url: 'https://mhoo.example/legal/dpa' },
    ]);
    expect(brand.legalEntity).toBe('Mhoo LLC');
    expect(brand.attribution).toEqual({
      label: 'Powered by Twenty',
      url: 'https://mhoo.example/legal/open-source',
    });
    expect(brand.unavailableLegalDocuments).toEqual([]);
  });

  it('preserves only approved upstream identity and attribution', () => {
    const brand = resolveEmailingPublicPageBrand(
      resolveProductBrand({
        preset: 'twenty',
        deploymentOrigin: 'https://mhoo.example',
      }),
    );

    expect(brand.productName).toBe('Twenty');
    expect(brand.legalEntity).toBe('Twenty.com, Public Benefit Corporation');
    expect(brand.legalLinks).toEqual([]);
    expect(brand.attribution).toEqual({
      label: 'Powered by Twenty',
      url: 'https://twenty.com/',
    });
  });
});
