import {
  BRAND_PRESETS,
  MHO_BRAND,
  TWENTY_BRAND,
  assertValidProductBrand,
  getProductBrandValidationErrors,
  parseBrandPresetId,
  resolveWorkspacePresentation,
} from '../index';

describe('brand presets', () => {
  it('contains complete Mhoo and upstream fallback presets', () => {
    expect(getProductBrandValidationErrors(MHO_BRAND)).toEqual([]);
    expect(getProductBrandValidationErrors(TWENTY_BRAND)).toEqual([]);
    expect(MHO_BRAND.productName).toBe('Mhoo');
    expect(TWENTY_BRAND.productName).toBe('Twenty');
    expect(MHO_BRAND.legal.legalEntity).toBe('Mhoo LLC');
    expect(MHO_BRAND.legal.legalEntityStatus).toBe('approved');
    expect(MHO_BRAND.legal.terms).toEqual({
      status: 'approved',
      url: '/legal/terms',
    });
    expect(MHO_BRAND.legal.privacy).toEqual({
      status: 'approved',
      url: '/legal/privacy',
    });
    expect(MHO_BRAND.legal.acceptableUse).toEqual({
      status: 'approved',
      url: '/legal/acceptable-use',
    });
    expect(MHO_BRAND.legal.openSource).toEqual({
      status: 'approved',
      url: '/legal/open-source',
    });
    expect(MHO_BRAND.legal.dpa).toEqual({ status: 'unavailable', url: null });
    expect(MHO_BRAND.legal.dpaAvailabilityNotice).toEqual({
      status: 'approved',
      url: '/legal/dpa',
    });
    expect(MHO_BRAND.attribution).toEqual({
      label: 'Powered by Twenty',
      status: 'approved',
      url: '/legal/open-source',
    });
    expect(TWENTY_BRAND.legal.acceptableUse).toEqual({
      status: 'unavailable',
      url: null,
    });
  });

  it('rejects a public legal URL while the document is unavailable', () => {
    const invalidBrand = {
      ...MHO_BRAND,
      legal: {
        ...MHO_BRAND.legal,
        dpa: { status: 'unavailable' as const, url: '/dpa' },
      },
    };

    expect(getProductBrandValidationErrors(invalidBrand)).toContain(
      'legal.dpa.url must be null until the document is approved',
    );
    expect(() => assertValidProductBrand(invalidBrand)).toThrow(
      'Invalid product brand',
    );
  });

  it('returns explicit fallback parsing without treating unknown input as Mhoo', () => {
    expect(parseBrandPresetId(undefined)).toBeUndefined();
    expect(parseBrandPresetId('twenty')).toBe('twenty');
    expect(parseBrandPresetId('mhoo')).toBe('mhoo');
    expect(parseBrandPresetId('mhoo-foundation')).toBeUndefined();
  });

  it('does not allow preset mutation at runtime', () => {
    expect(Object.isFrozen(BRAND_PRESETS)).toBe(true);
    expect(Object.isFrozen(MHO_BRAND)).toBe(true);
    expect(Object.isFrozen(MHO_BRAND.assets)).toBe(true);
    expect(Object.isFrozen(MHO_BRAND.assets.pwaIcons)).toBe(true);
  });
  it.each([
    {
      name: 'global signup',
      context: { kind: 'global' as const },
      expectedName: 'Mhoo',
      expectedLogo: '/images/mhoo/mhoo-workspace-96.png',
      expectedResolved: false,
    },
    {
      name: 'resolved workspace with custom presentation',
      context: {
        kind: 'resolved-workspace' as const,
        workspace: {
          displayName: 'Acme CRM',
          logo: 'https://cdn.example.test/acme.png',
        },
      },
      expectedName: 'Acme CRM',
      expectedLogo: 'https://cdn.example.test/acme.png',
      expectedResolved: true,
    },
    {
      name: 'resolved workspace with absent presentation',
      context: {
        kind: 'resolved-workspace' as const,
        workspace: { displayName: null, logo: null },
      },
      expectedName: 'Mhoo',
      expectedLogo: '/images/mhoo/mhoo-workspace-96.png',
      expectedResolved: true,
    },
  ])(
    'applies the product/workspace precedence for $name',
    ({ context, expectedName, expectedLogo, expectedResolved }) => {
      const presentation = resolveWorkspacePresentation(MHO_BRAND, context);

      expect(presentation.product).toBe(MHO_BRAND);
      expect(presentation.workspace).toMatchObject({
        name: expectedName,
        logoUrl: expectedLogo,
        isResolved: expectedResolved,
      });
    },
  );

  it('keeps global product identity separate from workspace metadata', () => {
    const presentation = resolveWorkspacePresentation(MHO_BRAND, {
      kind: 'resolved-workspace',
      workspace: {
        displayName: 'Twenty',
        logo: 'https://cdn.example.test/twenty.png',
      },
    });

    expect(presentation.product.productName).toBe('Mhoo');
    expect(presentation.product.assets.productMark.path).toBe(
      '/images/mhoo/mhoo-snout-transparent-1024.png',
    );
    expect(presentation.workspace.name).toBe('Twenty');
    expect(presentation.workspace.logoUrl).toBe(
      'https://cdn.example.test/twenty.png',
    );
  });
});
