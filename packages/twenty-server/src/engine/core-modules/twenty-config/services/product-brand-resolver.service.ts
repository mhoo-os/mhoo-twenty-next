import { Injectable } from '@nestjs/common';

import {
  getProductBrand,
  isBrandPresetId,
  type BrandDocument,
  type BrandPresetId,
  type BrandResolverInput,
  type BrandUrlSet,
  type BrandUrlReference,
  type ResolvedBrand,
} from 'twenty-shared/branding';

import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

const HTTP_PROTOCOLS = new Set(['http:', 'https:']);

const deepFreeze = <T>(value: T): T => {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);

    for (const nestedValue of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nestedValue);
    }
  }

  return value;
};

const invalidBrandConfiguration = (message: string): Error =>
  new Error(`Invalid product brand configuration: ${message}`);

export const normalizeBrandDeploymentOrigin = (value: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw invalidBrandConfiguration(
      'PRODUCT_BRAND_DEPLOYMENT_ORIGIN must be a non-empty URL',
    );
  }

  let parsedOrigin: URL;

  try {
    parsedOrigin = new URL(value);
  } catch {
    throw invalidBrandConfiguration(
      'PRODUCT_BRAND_DEPLOYMENT_ORIGIN must be a valid URL',
    );
  }

  if (
    !HTTP_PROTOCOLS.has(parsedOrigin.protocol) ||
    parsedOrigin.username ||
    parsedOrigin.password ||
    parsedOrigin.pathname !== '/' ||
    parsedOrigin.search ||
    parsedOrigin.hash
  ) {
    throw invalidBrandConfiguration(
      'PRODUCT_BRAND_DEPLOYMENT_ORIGIN must be an http(s) origin without credentials, path, query, or fragment',
    );
  }

  return parsedOrigin.origin;
};

const resolveBrandUrl = (
  reference: BrandUrlReference,
  deploymentOrigin: string,
): string => {
  let parsedUrl: URL;

  try {
    parsedUrl =
      reference.kind === 'relative'
        ? new URL(reference.value, deploymentOrigin)
        : new URL(reference.value);
  } catch {
    throw invalidBrandConfiguration(
      `brand URL reference is not valid: ${reference.value}`,
    );
  }

  if (
    !HTTP_PROTOCOLS.has(parsedUrl.protocol) ||
    parsedUrl.username ||
    parsedUrl.password
  ) {
    throw invalidBrandConfiguration(
      `brand URL reference must use http(s) without credentials: ${reference.value}`,
    );
  }

  if (
    reference.kind === 'relative' &&
    (!reference.value.startsWith('/') || reference.value.startsWith('//'))
  ) {
    throw invalidBrandConfiguration(
      `relative brand URL reference must be an absolute path: ${reference.value}`,
    );
  }

  if (reference.kind === 'relative' && parsedUrl.origin !== deploymentOrigin) {
    throw invalidBrandConfiguration(
      `relative brand URL reference escaped the deployment origin: ${reference.value}`,
    );
  }

  return parsedUrl.toString();
};

const resolveBrandUrls = (urls: BrandUrlSet, deploymentOrigin: string) => ({
  websiteUrl: resolveBrandUrl(urls.websiteUrl, deploymentOrigin),
  supportUrl: resolveBrandUrl(urls.supportUrl, deploymentOrigin),
  statusUrl: resolveBrandUrl(urls.statusUrl, deploymentOrigin),
  documentationUrl: resolveBrandUrl(urls.documentationUrl, deploymentOrigin),
  contactUrl: resolveBrandUrl(urls.contactUrl, deploymentOrigin),
});

const resolveBrandDocument = (
  document: BrandDocument,
  deploymentOrigin: string,
): BrandDocument => {
  if (document.status !== 'approved' || document.url === null) {
    return document;
  }

  return {
    ...document,
    url: resolveBrandUrl(
      {
        kind: document.url.startsWith('/') ? 'relative' : 'absolute',
        value: document.url,
      },
      deploymentOrigin,
    ),
  };
};

export const resolveProductBrand = ({
  preset,
  deploymentOrigin,
}: BrandResolverInput): ResolvedBrand => {
  if (!isBrandPresetId(preset)) {
    throw invalidBrandConfiguration(
      `PRODUCT_BRAND_PRESET must be one of the reviewed presets: ${preset}`,
    );
  }

  const normalizedOrigin = normalizeBrandDeploymentOrigin(deploymentOrigin);
  const productBrand = getProductBrand(preset);

  return deepFreeze({
    ...productBrand,
    legal: {
      ...productBrand.legal,
      privacy: resolveBrandDocument(
        productBrand.legal.privacy,
        normalizedOrigin,
      ),
      terms: resolveBrandDocument(productBrand.legal.terms, normalizedOrigin),
      acceptableUse: resolveBrandDocument(
        productBrand.legal.acceptableUse,
        normalizedOrigin,
      ),
      openSource: resolveBrandDocument(
        productBrand.legal.openSource,
        normalizedOrigin,
      ),
      dpa: resolveBrandDocument(productBrand.legal.dpa, normalizedOrigin),
      dpaAvailabilityNotice: resolveBrandDocument(
        productBrand.legal.dpaAvailabilityNotice,
        normalizedOrigin,
      ),
    },
    attribution:
      productBrand.attribution.status === 'approved' &&
      productBrand.attribution.url !== null
        ? {
            ...productBrand.attribution,
            url: resolveBrandUrl(
              {
                kind: productBrand.attribution.url.startsWith('/')
                  ? 'relative'
                  : 'absolute',
                value: productBrand.attribution.url,
              },
              normalizedOrigin,
            ),
          }
        : productBrand.attribution,
    urls: resolveBrandUrls(productBrand.urls, normalizedOrigin),
  });
};

@Injectable()
export class ProductBrandResolverService {
  constructor(private readonly twentyConfigService: TwentyConfigService) {}

  resolve(): ResolvedBrand {
    const preset: BrandPresetId = this.twentyConfigService.get(
      'PRODUCT_BRAND_PRESET',
    );
    const deploymentOrigin = this.twentyConfigService.get(
      'PRODUCT_BRAND_DEPLOYMENT_ORIGIN',
    );

    return resolveProductBrand({ preset, deploymentOrigin });
  }
}
