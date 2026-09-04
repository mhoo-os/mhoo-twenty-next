import { resolveEmailingPublicPageBrand } from 'src/engine/core-modules/emailing-domain/types/emailing-public-page-brand.type';
import {
  buildEmailingPublicPageFooter,
  buildEmailingPublicPageHeader,
} from 'src/engine/core-modules/emailing-domain/utils/build-emailing-public-page-markup.util';
import { resolveProductBrand } from 'src/engine/core-modules/twenty-config/services/product-brand-resolver.service';

describe('emailing public page markup', () => {
  it('escapes configurable brand values in attributes and text', () => {
    const brand = resolveEmailingPublicPageBrand({
      ...resolveProductBrand({
        preset: 'mhoo',
        deploymentOrigin: 'https://mhoo.example',
      }),
      productName: 'Mhoo <script>alert(1)</script>',
      accessibility: {
        ...resolveProductBrand({
          preset: 'mhoo',
          deploymentOrigin: 'https://mhoo.example',
        }).accessibility,
        logoAltText: '" onerror="alert(1)',
      },
    });

    const header = buildEmailingPublicPageHeader(brand);
    const footer = buildEmailingPublicPageFooter(brand);

    expect(header).not.toContain('<script>');
    expect(header).not.toContain('onerror="alert(1)"');
    expect(footer).not.toContain('<script>');
    expect(footer).toContain(
      'Contact Mhoo &lt;script&gt;alert(1)&lt;/script&gt; support',
    );
  });

  it('renders only the approved legal-document links', () => {
    const brand = resolveEmailingPublicPageBrand(
      resolveProductBrand({
        preset: 'mhoo',
        deploymentOrigin: 'https://mhoo.example',
      }),
    );

    const footer = buildEmailingPublicPageFooter(brand);

    expect(footer).toContain('href="https://mhoo.example/legal/privacy"');
    expect(footer).toContain('href="https://mhoo.example/legal/terms"');
    expect(footer).toContain(
      'href="https://mhoo.example/legal/acceptable-use"',
    );
    expect(footer).toContain('href="https://mhoo.example/legal/open-source"');
    expect(footer).toContain('href="https://mhoo.example/legal/dpa"');
    expect(footer).toContain('DPA Status</a>');
    expect(footer).not.toContain('Legal documents are currently unavailable.');
    expect(footer).not.toContain('DPA</a>');
    expect(footer).not.toContain('twenty.com');
  });

  it('renders an explicit notice only when a preview supplies one', () => {
    const brand = resolveEmailingPublicPageBrand(
      resolveProductBrand({
        preset: 'mhoo',
        deploymentOrigin: 'https://mhoo.example',
      }),
    );

    expect(
      buildEmailingPublicPageFooter({
        ...brand,
        previewNotice: 'Private beta preview — DRAFT / UNAPPROVED',
      }),
    ).toContain('Private beta preview — DRAFT / UNAPPROVED');
    expect(buildEmailingPublicPageFooter(brand)).not.toContain(
      'Private beta preview',
    );
  });
});
