import { resolveEmailingPublicPageBrand } from 'src/engine/core-modules/emailing-domain/types/emailing-public-page-brand.type';
import { resolveProductBrand } from 'src/engine/core-modules/twenty-config/services/product-brand-resolver.service';

describe('resolveEmailingPublicPageBrand', () => {
  it('hides unapproved Mhoo legal identity and documents', () => {
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
    expect(brand.legalLinks).toEqual([]);
    expect(brand.legalEntity).toBeNull();
    expect(brand.attribution).toBeNull();
    expect(brand.unavailableLegalDocuments).toEqual([
      'Privacy',
      'Terms',
      'DPA',
    ]);
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
