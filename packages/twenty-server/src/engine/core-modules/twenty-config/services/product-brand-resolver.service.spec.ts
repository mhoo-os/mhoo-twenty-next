import {
  ConfigVariables,
  validate,
} from 'src/engine/core-modules/twenty-config/config-variables';
import { type ConfigVariablesMetadataOptions } from 'src/engine/core-modules/twenty-config/decorators/config-variables-metadata.decorator';
import { ConfigVariableType } from 'src/engine/core-modules/twenty-config/enums/config-variable-type.enum';
import {
  normalizeBrandDeploymentOrigin,
  ProductBrandResolverService,
  resolveProductBrand,
} from 'src/engine/core-modules/twenty-config/services/product-brand-resolver.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { TypedReflect } from 'src/utils/typed-reflect';

describe('ProductBrandResolverService', () => {
  it('resolves the default upstream preset without request context', () => {
    const brand = resolveProductBrand({
      preset: 'twenty',
      deploymentOrigin: 'http://localhost:3000',
    });

    expect(brand.productName).toBe('Twenty');
    expect(brand.urls.websiteUrl).toBe('https://twenty.com/');
    expect(brand.urls.documentationUrl).toBe('https://docs.twenty.com/');
  });

  it('resolves the Mhoo preset against the configured deployment origin', () => {
    const config = {
      get: jest.fn((key: keyof ConfigVariables) => {
        if (key === 'PRODUCT_BRAND_PRESET') return 'mhoo';
        if (key === 'PRODUCT_BRAND_DEPLOYMENT_ORIGIN') {
          return 'https://crm.example.test';
        }

        throw new Error(`Unexpected config variable: ${String(key)}`);
      }),
    } as unknown as TwentyConfigService;

    const brand = new ProductBrandResolverService(config).resolve();

    expect(brand.productName).toBe('Mhoo');
    expect(brand.urls.websiteUrl).toBe('https://crm.example.test/');
    expect(brand.urls.supportUrl).toBe('https://crm.example.test/support');
    expect(brand.legal.terms.url).toBe('https://crm.example.test/legal/terms');
    expect(brand.legal.dpa).toEqual({ status: 'unavailable', url: null });
    expect(brand.legal.dpaAvailabilityNotice.url).toBe(
      'https://crm.example.test/legal/dpa',
    );
    expect(brand.attribution.url).toBe(
      'https://crm.example.test/legal/open-source',
    );
    expect(brand.assets.productMark.path).toBe(
      '/images/mhoo/mhoo-snout-transparent-1024.png',
    );
    expect(config.get).toHaveBeenNthCalledWith(1, 'PRODUCT_BRAND_PRESET');
    expect(config.get).toHaveBeenNthCalledWith(
      2,
      'PRODUCT_BRAND_DEPLOYMENT_ORIGIN',
    );
  });

  it('fails closed for an unknown preset or unsafe deployment origin', () => {
    expect(() =>
      resolveProductBrand({
        preset: 'unknown' as never,
        deploymentOrigin: 'https://crm.example.test',
      }),
    ).toThrow('PRODUCT_BRAND_PRESET');

    expect(() => normalizeBrandDeploymentOrigin('javascript:alert(1)')).toThrow(
      'PRODUCT_BRAND_DEPLOYMENT_ORIGIN',
    );
    expect(() =>
      normalizeBrandDeploymentOrigin('https://crm.example.test/app'),
    ).toThrow('PRODUCT_BRAND_DEPLOYMENT_ORIGIN');
  });

  it('returns an immutable complete result', () => {
    const brand = resolveProductBrand({
      preset: 'mhoo',
      deploymentOrigin: 'https://crm.example.test',
    });

    expect(Object.isFrozen(brand)).toBe(true);
    expect(Object.isFrozen(brand.urls)).toBe(true);
    expect(Object.isFrozen(brand.legal)).toBe(true);
    expect(Object.isFrozen(brand.assets)).toBe(true);
    expect(Object.isFrozen(brand.assets.pwaIcons)).toBe(true);
    expect(Reflect.set(brand as object, 'productName', 'Changed')).toBe(false);
    expect(brand.productName).toBe('Mhoo');
  });

  it('keeps brand selection independent from database and foundation settings', () => {
    const config = {
      get: jest.fn((key: keyof ConfigVariables) => {
        if (key === 'PRODUCT_BRAND_PRESET') return 'twenty';
        if (key === 'PRODUCT_BRAND_DEPLOYMENT_ORIGIN') {
          return 'https://crm.example.test';
        }

        throw new Error(`Unexpected config variable: ${String(key)}`);
      }),
    } as unknown as TwentyConfigService;

    new ProductBrandResolverService(config).resolve();

    expect(config.get).toHaveBeenCalledTimes(2);
    expect(config.get).not.toHaveBeenCalledWith(
      'IS_CONFIG_VARIABLES_IN_DB_ENABLED',
    );
  });

  it('declares both inputs as validated environment-only config', () => {
    const metadata = TypedReflect.getMetadata(
      'config-variables',
      ConfigVariables,
    ) as Record<string, ConfigVariablesMetadataOptions>;

    expect(metadata.PRODUCT_BRAND_PRESET).toMatchObject({
      isEnvOnly: true,
      options: ['mhoo', 'twenty'],
      type: ConfigVariableType.ENUM,
    });
    expect(metadata.PRODUCT_BRAND_DEPLOYMENT_ORIGIN).toMatchObject({
      isEnvOnly: true,
      type: ConfigVariableType.STRING,
    });
    expect(() => validate({ PRODUCT_BRAND_PRESET: 'not-reviewed' })).toThrow(
      'Config variables validation failed',
    );
  });
});
