import {
  MHO_BRAND,
  TWENTY_BRAND,
  type ProductBrand,
} from 'twenty-shared/branding';

import { getApprovedLegalDocumentUrl } from '@/auth/sign-in-up/components/FooterNote';

describe('getApprovedLegalDocumentUrl', () => {
  it('exposes approved Mhoo terms and privacy while the DPA stays unavailable', () => {
    expect(getApprovedLegalDocumentUrl(MHO_BRAND, 'termsOfService')).toBe(
      '/legal/terms',
    );
    expect(getApprovedLegalDocumentUrl(MHO_BRAND, 'privacyPolicy')).toBe(
      '/legal/privacy',
    );
    expect(
      getApprovedLegalDocumentUrl(MHO_BRAND, 'dataProcessingAgreement'),
    ).toBeNull();
  });

  it('does not expose Mhoo legal routes through the upstream preset', () => {
    expect(
      getApprovedLegalDocumentUrl(TWENTY_BRAND, 'termsOfService'),
    ).toBeNull();
    expect(
      getApprovedLegalDocumentUrl(TWENTY_BRAND, 'privacyPolicy'),
    ).toBeNull();
    expect(
      getApprovedLegalDocumentUrl(TWENTY_BRAND, 'dataProcessingAgreement'),
    ).toBeNull();
  });

  it('returns only an explicitly approved non-empty URL', () => {
    const brand: ProductBrand = {
      ...MHO_BRAND,
      legal: {
        ...MHO_BRAND.legal,
        terms: {
          status: 'approved',
          url: 'https://legal.example.test/terms',
        },
        privacy: {
          status: 'approved',
          url: 'https://legal.example.test/privacy',
        },
        dpa: {
          status: 'approved',
          url: '   ',
        },
      },
    };

    expect(getApprovedLegalDocumentUrl(brand, 'termsOfService')).toBe(
      'https://legal.example.test/terms',
    );
    expect(getApprovedLegalDocumentUrl(brand, 'privacyPolicy')).toBe(
      'https://legal.example.test/privacy',
    );
    expect(
      getApprovedLegalDocumentUrl(brand, 'dataProcessingAgreement'),
    ).toBeNull();
  });
});
