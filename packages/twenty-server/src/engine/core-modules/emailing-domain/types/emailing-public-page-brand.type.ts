import { type ResolvedBrand } from 'twenty-shared/branding';

export type EmailingPublicPageLegalLink = Readonly<{
  label: string;
  url: string;
}>;

export type EmailingPublicPageBrand = Readonly<{
  productName: string;
  websiteUrl: string;
  supportUrl: string;
  emailMarkUrl: string;
  logoAltText: string;
  logoDimensions: readonly [number, number];
  legalLinks: readonly EmailingPublicPageLegalLink[];
  legalEntity: string | null;
  attribution: EmailingPublicPageLegalLink | null;
  unavailableLegalDocuments: readonly string[];
  previewNotice?: string;
}>;

const isApprovedDocument = (
  document: ResolvedBrand['legal']['privacy'],
): boolean =>
  document.status === 'approved' &&
  typeof document.url === 'string' &&
  document.url.trim().length > 0;

type BrandDimensions = ResolvedBrand['assets']['emailMark']['dimensions'];
type DimensionPair = readonly [number, number];

const isSimpleDimensions = (
  dimensions: BrandDimensions,
): dimensions is DimensionPair => typeof dimensions[0] === 'number';

const getAssetDimensions = (dimensions: BrandDimensions): DimensionPair => {
  return isSimpleDimensions(dimensions) ? dimensions : dimensions[0];
};

/**
 * Reduce the full resolved brand contract to the values safe for public
 * server-rendered pages. Legal links and identity claims are only exposed
 * when their contract says they are approved.
 */
export const resolveEmailingPublicPageBrand = (
  brand: ResolvedBrand,
): EmailingPublicPageBrand => {
  const legalDocuments = [
    ['Privacy', brand.legal.privacy],
    ['Terms', brand.legal.terms],
    ['Acceptable Use', brand.legal.acceptableUse],
    ['Open Source', brand.legal.openSource],
    ['DPA Status', brand.legal.dpaAvailabilityNotice],
  ] as const;

  return {
    productName: brand.productName,
    websiteUrl: brand.urls.websiteUrl,
    supportUrl: brand.urls.supportUrl,
    emailMarkUrl: new URL(
      brand.assets.emailMark.path,
      brand.urls.websiteUrl,
    ).toString(),
    logoAltText: brand.accessibility.logoAltText,
    logoDimensions: getAssetDimensions(brand.assets.emailMark.dimensions),
    legalLinks: legalDocuments
      .filter(([, document]) => isApprovedDocument(document))
      .map(([label, document]) => ({
        label,
        url: document.url as string,
      })),
    legalEntity:
      brand.legal.legalEntityStatus === 'approved' &&
      brand.legal.legalEntity.trim().length > 0
        ? brand.legal.legalEntity
        : null,
    attribution:
      brand.attribution.status === 'approved' &&
      brand.attribution.label.trim().length > 0 &&
      typeof brand.attribution.url === 'string' &&
      brand.attribution.url.trim().length > 0
        ? {
            label: brand.attribution.label,
            url: brand.attribution.url,
          }
        : null,
    unavailableLegalDocuments: legalDocuments
      .filter(([, document]) => !isApprovedDocument(document))
      .map(([label]) => label),
  };
};
