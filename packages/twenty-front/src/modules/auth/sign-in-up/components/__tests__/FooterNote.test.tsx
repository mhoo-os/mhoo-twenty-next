import { MHO_BRAND, TWENTY_BRAND } from 'twenty-shared/branding';

import { getApprovedLegalDocumentUrl } from '@/auth/sign-in-up/components/FooterNote';

describe('getApprovedLegalDocumentUrl', () => {
  it.each([
    ['Mhoo', MHO_BRAND],
    ['Twenty', TWENTY_BRAND],
  ])('fails closed for the %s preset', (_name, brand) => {
    expect(getApprovedLegalDocumentUrl(brand, 'termsOfService')).toBeNull();
    expect(getApprovedLegalDocumentUrl(brand, 'privacyPolicy')).toBeNull();
    expect(
      getApprovedLegalDocumentUrl(brand, 'dataProcessingAgreement'),
    ).toBeNull();
  });

  it('returns only an explicitly approved non-empty URL', () => {
    const brand = {
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
