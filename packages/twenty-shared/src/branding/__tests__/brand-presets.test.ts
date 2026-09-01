import {
  BRAND_PRESETS,
  MHO_BRAND,
  TWENTY_BRAND,
  assertValidProductBrand,
  getProductBrandValidationErrors,
  parseBrandPresetId,
} from '../index';

describe('brand presets', () => {
  it('contains complete Mhoo and upstream fallback presets', () => {
    expect(getProductBrandValidationErrors(MHO_BRAND)).toEqual([]);
    expect(getProductBrandValidationErrors(TWENTY_BRAND)).toEqual([]);
    expect(MHO_BRAND.productName).toBe('Mhoo');
    expect(TWENTY_BRAND.productName).toBe('Twenty');
    expect(MHO_BRAND.legal.dpa).toEqual({ status: 'unavailable', url: null });
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
});
