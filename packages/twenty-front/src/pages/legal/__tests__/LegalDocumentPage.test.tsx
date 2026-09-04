import { render, screen, within } from '@testing-library/react';
import {
  MHO_BRAND,
  TWENTY_BRAND,
  type BrandDocument,
  type ResolvedBrand,
} from 'twenty-shared/branding';

import { LegalDocumentView } from '~/pages/legal/LegalDocumentPage';
import { LEGAL_DOCUMENTS } from '~/pages/legal/legal-document-config';

// The production bundle consumes react-markdown's ESM build. Jest 29 does not
// transform that dependency, so this focused test adapter exercises the page's
// heading/link component contract while the front build verifies the real ESM
// integration.
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({
    children,
    components,
  }: {
    children: string;
    components: Record<string, React.ElementType>;
  }) => {
    const Heading = components.h1;
    const Link = components.a;
    const heading = children.match(/^# (.+)$/m)?.[1] ?? '';
    const hasTwentyLink = children.includes('https://twenty.com');

    return (
      <>
        <Heading>{heading}</Heading>
        <span>{children}</span>
        {hasTwentyLink ? (
          <Link href="https://twenty.com">https://twenty.com</Link>
        ) : null}
      </>
    );
  },
}));

jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => undefined,
}));

jest.mock('@/ui/utilities/page-title/components/PageTitle', () => ({
  PageTitle: () => null,
}));

const resolveDocumentForTest = (
  document: BrandDocument,
  origin: string,
): BrandDocument =>
  document.status === 'approved' && document.url !== null
    ? { ...document, url: new URL(document.url, origin).toString() }
    : document;

const resolveForTest = (
  brand: typeof MHO_BRAND | typeof TWENTY_BRAND,
  origin: string,
): ResolvedBrand => ({
  ...brand,
  legal: {
    ...brand.legal,
    privacy: resolveDocumentForTest(brand.legal.privacy, origin),
    terms: resolveDocumentForTest(brand.legal.terms, origin),
    acceptableUse: resolveDocumentForTest(brand.legal.acceptableUse, origin),
    openSource: resolveDocumentForTest(brand.legal.openSource, origin),
    dpa: resolveDocumentForTest(brand.legal.dpa, origin),
    dpaAvailabilityNotice: resolveDocumentForTest(
      brand.legal.dpaAvailabilityNotice,
      origin,
    ),
  },
  attribution:
    brand.attribution.status === 'approved' && brand.attribution.url !== null
      ? {
          ...brand.attribution,
          url: new URL(brand.attribution.url, origin).toString(),
        }
      : brand.attribution,
  urls: {
    websiteUrl: origin,
    supportUrl: `${origin}support`,
    statusUrl: `${origin}status`,
    documentationUrl: `${origin}docs`,
    contactUrl: `${origin}contact`,
  },
});

const mhooBrand = resolveForTest(MHO_BRAND, 'https://beta.mhoo.test/');
const twentyBrand = resolveForTest(TWENTY_BRAND, 'https://upstream.test/');

describe('LegalDocumentView', () => {
  it.each(LEGAL_DOCUMENTS)(
    'renders the exact approved $label source with shared navigation',
    ({ key, label, title, route, source }) => {
      render(<LegalDocumentView brand={mhooBrand} documentKey={key} />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        `Mhoo ${title}`,
      );
      expect(source).toContain('**Version:** 2.0');
      expect(source).toContain('**Effective Date:** September 2, 2026');
      expect(source).toContain('Mhoo LLC');
      expect(source).toContain(`**Canonical Route:** \`${route}\``);
      expect(screen.getByRole('article')).toHaveAttribute(
        'aria-labelledby',
        'legal-document-title',
      );
      expect(source).not.toContain('DRAFT / UNAPPROVED');

      const navigation = screen.getByRole('navigation', {
        name: 'Legal documents',
      });
      expect(within(navigation).getAllByRole('link')).toHaveLength(5);
      expect(
        within(navigation).getByRole('link', { name: label }),
      ).toHaveAttribute('href', `https://beta.mhoo.test${route}`);
    },
  );

  it('renders the approved fail-closed DPA notice without relabeling an upstream DPA', () => {
    render(
      <LegalDocumentView
        brand={mhooBrand}
        documentKey="dpaAvailabilityNotice"
      />,
    );

    expect(
      screen.getByText(/does NOT currently offer an executed, self-service/i),
    ).toBeVisible();
    expect(screen.getByText(/UNAVAILABLE \(FAIL-CLOSED\)/i)).toBeVisible();
    expect(screen.queryByText(/TwentyHQ DPAs/i)).toBeInTheDocument();
  });

  it('fails closed while client config is loading and for the upstream preset', () => {
    const { rerender } = render(
      <LegalDocumentView brand={null} documentKey="terms" />,
    );

    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');
    expect(
      screen.queryByText('Mhoo Master Terms of Service'),
    ).not.toBeInTheDocument();

    rerender(<LegalDocumentView brand={twentyBrand} documentKey="terms" />);

    expect(
      screen.getByRole('heading', { name: 'Legal document unavailable' }),
    ).toBeVisible();
    expect(
      screen.queryByText('Mhoo Master Terms of Service'),
    ).not.toBeInTheDocument();
  });

  it('fails closed when the approved route does not match the governed configuration', () => {
    const alteredBrand: ResolvedBrand = {
      ...mhooBrand,
      legal: {
        ...mhooBrand.legal,
        terms: { status: 'approved', url: 'https://hostile.test/legal/terms' },
      },
    };

    render(<LegalDocumentView brand={alteredBrand} documentKey="terms" />);

    expect(
      screen.getByRole('heading', { name: 'Legal document unavailable' }),
    ).toBeVisible();
  });

  it.each([
    'https://beta.mhoo.test/legal/terms?draft=true',
    'https://beta.mhoo.test/legal/terms#altered',
  ])('fails closed for a non-canonical approved URL: %s', (url) => {
    const alteredBrand: ResolvedBrand = {
      ...mhooBrand,
      legal: {
        ...mhooBrand.legal,
        terms: { status: 'approved', url },
      },
    };

    render(<LegalDocumentView brand={alteredBrand} documentKey="terms" />);

    expect(
      screen.getByRole('heading', { name: 'Legal document unavailable' }),
    ).toBeVisible();
  });

  it('provides keyboard navigation landmarks and protects external links', () => {
    render(<LegalDocumentView brand={mhooBrand} documentKey="openSource" />);

    expect(
      screen.getByRole('link', { name: 'Skip to legal document' }),
    ).toHaveAttribute('href', '#legal-document-content');
    expect(screen.getByRole('main')).toHaveAttribute(
      'id',
      'legal-document-content',
    );
    expect(screen.getByRole('img')).toHaveAttribute(
      'alt',
      'Mhoo pig snout mark',
    );

    const upstreamLink = screen.getByRole('link', {
      name: 'https://twenty.com',
    });
    expect(upstreamLink).toHaveAttribute('target', '_blank');
    expect(upstreamLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it.each(LEGAL_DOCUMENTS)(
    'keeps every rendered $label link within the approved link policy',
    ({ key }) => {
      render(<LegalDocumentView brand={mhooBrand} documentKey={key} />);

      for (const link of within(screen.getByRole('article')).queryAllByRole(
        'link',
      )) {
        const href = link.getAttribute('href');

        expect(href).toMatch(
          /^(?:mailto:[^\s@]+@mhoo\.com|\/legal\/open-source|https:\/\/twenty\.com)\/?$/,
        );
      }
    },
  );
});
