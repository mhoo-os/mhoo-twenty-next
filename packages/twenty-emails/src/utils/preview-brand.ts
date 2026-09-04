import {
  TWENTY_BRAND,
  type BrandUrlReference,
  type ProductBrand,
  type ResolvedBrand,
} from 'twenty-shared/branding';

const resolveUrlReference = (
  reference: BrandUrlReference,
  origin: string,
): string =>
  reference.kind === 'relative'
    ? new URL(reference.value, origin).toString()
    : reference.value;

/**
 * Email previews are static and cannot resolve server configuration. Production
 * callers must pass the server-resolved brand explicitly; this helper only
 * provides a reviewed upstream fixture for the React Email preview props.
 */
export const resolvePreviewBrand = (
  brand: ProductBrand,
  origin: string,
): ResolvedBrand => ({
  ...brand,
  urls: {
    websiteUrl: resolveUrlReference(brand.urls.websiteUrl, origin),
    supportUrl: resolveUrlReference(brand.urls.supportUrl, origin),
    statusUrl: resolveUrlReference(brand.urls.statusUrl, origin),
    documentationUrl: resolveUrlReference(brand.urls.documentationUrl, origin),
    contactUrl: resolveUrlReference(brand.urls.contactUrl, origin),
  },
});

export const PREVIEW_BRAND = resolvePreviewBrand(
  TWENTY_BRAND,
  'https://app.twenty.com/',
);
