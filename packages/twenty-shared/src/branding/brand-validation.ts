import {
  BRAND_DOCUMENT_STATUSES,
  BRAND_PRESET_IDS,
  type BrandDocument,
  type BrandPresetId,
  type BrandUrlReference,
  type ProductBrand,
} from './brand.types';

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isValidPreset = (value: unknown): value is BrandPresetId =>
  typeof value === 'string' &&
  (BRAND_PRESET_IDS as readonly string[]).includes(value);

const isValidStatus = (value: unknown) =>
  typeof value === 'string' &&
  (BRAND_DOCUMENT_STATUSES as readonly string[]).includes(value);

const isValidUrlReference = (value: unknown): value is BrandUrlReference =>
  typeof value === 'object' &&
  value !== null &&
  'kind' in value &&
  (value.kind === 'relative' || value.kind === 'absolute') &&
  'value' in value &&
  isNonEmptyString(value.value);

const validateDocument = (document: BrandDocument, path: string): string[] => {
  const errors: string[] = [];

  if (!isValidStatus(document.status)) {
    errors.push(`${path}.status must be an approved brand document status`);
  }

  if (document.status === 'approved' && !isNonEmptyString(document.url)) {
    errors.push(`${path}.url is required for an approved document`);
  }

  if (document.status !== 'approved' && document.url !== null) {
    errors.push(`${path}.url must be null until the document is approved`);
  }

  return errors;
};

/** Return invariant failures without importing a runtime or environment. */
export const getProductBrandValidationErrors = (
  brand: ProductBrand,
): readonly string[] => {
  const errors: string[] = [];

  if (!isValidPreset(brand.preset)) {
    errors.push('preset must be a reviewed brand preset');
  }

  for (const [path, value] of [
    ['productName', brand.productName],
    ['productShortName', brand.productShortName],
    ['legal.legalEntity', brand.legal.legalEntity],
    ['legal.senderDisplayName', brand.legal.senderDisplayName],
    ['documentTitleTemplate', brand.documentTitleTemplate],
    ['attribution.label', brand.attribution.label],
    ['accessibility.logoAltText', brand.accessibility.logoAltText],
    ['accessibility.safeArea', brand.accessibility.safeArea],
    ['accessibility.contrastGuidance', brand.accessibility.contrastGuidance],
  ] as const) {
    if (!isNonEmptyString(value)) {
      errors.push(`${path} must be a non-empty string`);
    }
  }

  for (const [path, value] of [
    ['urls.websiteUrl', brand.urls.websiteUrl],
    ['urls.supportUrl', brand.urls.supportUrl],
    ['urls.statusUrl', brand.urls.statusUrl],
    ['urls.documentationUrl', brand.urls.documentationUrl],
    ['urls.contactUrl', brand.urls.contactUrl],
  ] as const) {
    if (!isValidUrlReference(value)) {
      errors.push(
        `${path} must be a non-empty relative or absolute URL reference`,
      );
    }
  }

  if (!isValidStatus(brand.legal.legalEntityStatus)) {
    errors.push(
      'legal.legalEntityStatus must be a reviewed brand document status',
    );
  }

  errors.push(...validateDocument(brand.legal.privacy, 'legal.privacy'));
  errors.push(...validateDocument(brand.legal.terms, 'legal.terms'));
  errors.push(
    ...validateDocument(brand.legal.acceptableUse, 'legal.acceptableUse'),
  );
  errors.push(...validateDocument(brand.legal.openSource, 'legal.openSource'));
  errors.push(...validateDocument(brand.legal.dpa, 'legal.dpa'));
  errors.push(
    ...validateDocument(
      brand.legal.dpaAvailabilityNotice,
      'legal.dpaAvailabilityNotice',
    ),
  );

  if (!isValidStatus(brand.attribution.status)) {
    errors.push('attribution.status must be a reviewed brand document status');
  }

  if (
    brand.attribution.status === 'approved' &&
    !isNonEmptyString(brand.attribution.url)
  ) {
    errors.push('attribution.url is required for approved attribution');
  }

  if (
    brand.attribution.status !== 'approved' &&
    brand.attribution.url !== null
  ) {
    errors.push('attribution.url must be null until attribution is approved');
  }

  const assets = [
    ['assets.productMark', brand.assets.productMark],
    ['assets.emailMark', brand.assets.emailMark],
    ['assets.favicon', brand.assets.favicon],
    ['assets.workspaceDefault', brand.assets.workspaceDefault],
  ] as const;

  for (const [path, asset] of assets) {
    if (!isNonEmptyString(asset.path)) {
      errors.push(`${path}.path must be a non-empty path`);
    }
    if (!isNonEmptyString(asset.purpose)) {
      errors.push(`${path}.purpose must be a non-empty string`);
    }
    if (!isNonEmptyString(asset.mimeType)) {
      errors.push(`${path}.mimeType must be present`);
    }
  }

  if (brand.assets.pwaIcons.length === 0) {
    errors.push('assets.pwaIcons must contain at least one icon');
  }

  if (brand.accessibility.minimumRenderedSize < 16) {
    errors.push('accessibility.minimumRenderedSize must be at least 16');
  }

  return errors;
};

export const assertValidProductBrand = <T extends ProductBrand>(
  brand: T,
): T => {
  const errors = getProductBrandValidationErrors(brand);
  if (errors.length > 0) {
    throw new Error(`Invalid product brand:\n- ${errors.join('\n- ')}`);
  }
  return brand;
};

export const isBrandPresetId = (value: unknown): value is BrandPresetId =>
  isValidPreset(value);

export const parseBrandPresetId = (
  value: string | undefined,
): BrandPresetId | undefined => (isValidPreset(value) ? value : undefined);
