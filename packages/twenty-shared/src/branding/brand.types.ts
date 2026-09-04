export const BRAND_PRESET_IDS = ['mhoo', 'twenty'] as const;

export type BrandPresetId = (typeof BRAND_PRESET_IDS)[number];

export const BRAND_DOCUMENT_STATUSES = [
  'approved',
  'unavailable',
  'unapproved',
] as const;

export type BrandDocumentStatus = (typeof BRAND_DOCUMENT_STATUSES)[number];

export type BrandDocument = Readonly<{
  status: BrandDocumentStatus;
  url: string | null;
}>;

export type BrandAsset = Readonly<{
  path: string;
  mimeType: 'image/png' | 'image/x-icon';
  dimensions:
    | readonly [number, number]
    | readonly [readonly [number, number], ...(readonly [number, number][])];
  purpose: string;
  maskable?: boolean;
}>;

export type BrandAssetFamily = Readonly<{
  productMark: BrandAsset;
  emailMark: BrandAsset;
  favicon: BrandAsset;
  pwaIcons: readonly BrandAsset[];
  workspaceDefault: BrandAsset;
  monochrome?: BrandAsset;
}>;

export type LegalBrand = Readonly<{
  legalEntity: string;
  legalEntityStatus: BrandDocumentStatus;
  senderDisplayName: string;
  privacy: BrandDocument;
  terms: BrandDocument;
  acceptableUse: BrandDocument;
  openSource: BrandDocument;
  dpa: BrandDocument;
  dpaAvailabilityNotice: BrandDocument;
}>;

export type BrandUrlReference = Readonly<{
  kind: 'relative' | 'absolute';
  value: string;
}>;

export type BrandUrlSet = Readonly<{
  websiteUrl: BrandUrlReference;
  supportUrl: BrandUrlReference;
  statusUrl: BrandUrlReference;
  documentationUrl: BrandUrlReference;
  contactUrl: BrandUrlReference;
}>;

export type ResolvedBrandUrlSet = Readonly<{
  websiteUrl: string;
  supportUrl: string;
  statusUrl: string;
  documentationUrl: string;
  contactUrl: string;
}>;

export type BrandAttribution = Readonly<{
  label: string;
  url: string | null;
  status: BrandDocumentStatus;
}>;

export type BrandAccessibility = Readonly<{
  logoAltText: string;
  minimumRenderedSize: number;
  safeArea: string;
  contrastGuidance: string;
}>;

/**
 * Preset data is origin-neutral: URL fields may be relative paths. A server
 * resolver turns this shape into ResolvedBrand by applying deployment URLs.
 */
export type ProductBrand = Readonly<{
  preset: BrandPresetId;
  productName: string;
  productShortName: string;
  legal: LegalBrand;
  urls: BrandUrlSet;
  assets: BrandAssetFamily;
  documentTitleTemplate: string;
  attribution: BrandAttribution;
  accessibility: BrandAccessibility;
}>;

export type ResolvedBrand = Readonly<
  Omit<ProductBrand, 'urls' | 'assets'> & {
    urls: ResolvedBrandUrlSet;
    assets: BrandAssetFamily;
  }
>;

export type BrandResolverInput = Readonly<{
  preset: BrandPresetId;
  deploymentOrigin: string;
}>;
