import {
  MHO_BRAND,
  TWENTY_BRAND,
  type ProductBrand,
} from 'twenty-shared/branding';

import {
  getMhooLegalDocument,
  isMhooLegalDocumentAllowed,
  MHOO_LEGAL_DOCUMENTS,
  MHOO_LEGAL_PACKET,
} from '~/legal/legal-packet';

describe('Mhoo legal packet route mapping', () => {
  it('maps exactly the five approved routes to manifest-pinned sources', () => {
    expect(MHOO_LEGAL_PACKET).toEqual({
      id: 'MHOO-LEGAL-2026-v2.0',
      version: '2.0',
      status: 'APPROVED_FINAL',
      dpaState: 'UNAVAILABLE_FAIL_CLOSED',
      manifestSha256:
        '57ffc6de05f1deb3c8db7b05fd9a1b7a09f7c8bc2996e1e859fbd2238ca227f5',
    });
    expect(MHOO_LEGAL_DOCUMENTS.map(({ path }) => path)).toEqual([
      '/legal/terms',
      '/legal/privacy',
      '/legal/acceptable-use',
      '/legal/open-source',
      '/legal/dpa',
    ]);
    expect(
      MHOO_LEGAL_DOCUMENTS.map(({ sourcePath, manifestFile }) => ({
        sourcePath,
        bytes: manifestFile.bytes,
        sha256: manifestFile.sha256,
      })),
    ).toEqual([
      {
        sourcePath: '01-mhoo-master-terms-v2.0.md',
        bytes: 6059,
        sha256:
          'f8bfeb104b2b09064ef74a1f7e6bbae747ed9443fdc0d654a88d433b17daff16',
      },
      {
        sourcePath: '02-mhoo-privacy-policy-v2.0.md',
        bytes: 2155,
        sha256:
          'd997c7fe762f8fe02043124ce6e43f482c77f5ac976649df37dcfad8d104867e',
      },
      {
        sourcePath: '03-mhoo-acceptable-use-policy-v2.0.md',
        bytes: 1217,
        sha256:
          '28c063f526be1752fa997529af80d105dfbfbb68a7e5ec4bea2c5ea770557ce8',
      },
      {
        sourcePath: '04-mhoo-open-source-notice-v2.0.md',
        bytes: 807,
        sha256:
          'dd442db563d3472fe6ea57d899fa11bb2f1b4072f0de8282a63ba0971f1f70ee',
      },
      {
        sourcePath: '05-mhoo-dpa-availability-notice-v2.0.md',
        bytes: 799,
        sha256:
          '1836355ef5e2e65bb68c0943e8b7f9034d043dbf4b692151addab08d0edb81ce',
      },
    ]);
  });

  it('uses the brand contract for route authorization and keeps DPA fail-closed', () => {
    for (const document of MHOO_LEGAL_DOCUMENTS) {
      expect(
        isMhooLegalDocumentAllowed(
          MHO_BRAND,
          document,
          'https://crm.example.test',
        ),
      ).toBe(true);
      expect(
        isMhooLegalDocumentAllowed(
          TWENTY_BRAND,
          document,
          'https://crm.example.test',
        ),
      ).toBe(false);
    }

    const document = getMhooLegalDocument('/legal/terms');
    expect(document).toBeDefined();

    const externalDocumentBrand: ProductBrand = {
      ...MHO_BRAND,
      legal: {
        ...MHO_BRAND.legal,
        terms: {
          status: 'approved',
          url: 'https://other.example.test/legal/terms',
        },
      },
    };

    expect(
      isMhooLegalDocumentAllowed(
        externalDocumentBrand,
        document!,
        'https://crm.example.test',
      ),
    ).toBe(false);
  });
});
