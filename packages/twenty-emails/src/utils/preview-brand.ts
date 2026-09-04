import {
  MHO_BRAND,
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

export type EmailPreviewBrand = ResolvedBrand & {
  readonly previewNotice: string;
};

/**
 * Private closed-beta fixture for the local email gallery. This is deliberately
 * separate from the upstream fallback and is never used by production email
 * sends, which receive a server-resolved brand explicitly.
 */
export const MHO_PREVIEW_BRAND: EmailPreviewBrand = Object.freeze({
  ...resolvePreviewBrand(MHO_BRAND, 'https://beta.mhoo.app/'),
  previewNotice:
    'Private beta preview — legal documents are DRAFT / UNAPPROVED.',
});

export const getPreviewNotice = (brand: ResolvedBrand): string | null => {
  const notice = (brand as ResolvedBrand & { previewNotice?: unknown })
    .previewNotice;

  return typeof notice === 'string' && notice.trim().length > 0 ? notice : null;
};
