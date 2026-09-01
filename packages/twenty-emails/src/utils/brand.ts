import {
  type BrandAsset,
  type BrandDocument,
  type ResolvedBrand,
} from 'twenty-shared/branding';

export const getBrandAssetUrl = (
  brand: ResolvedBrand,
  asset: BrandAsset,
): string => new URL(asset.path, brand.urls.websiteUrl).toString();

export const isApprovedBrandDocument = (document: BrandDocument): boolean =>
  document.status === 'approved' &&
  typeof document.url === 'string' &&
  document.url.trim().length > 0;
