import {
  type BrandAsset,
  type BrandAssetFamily,
  type BrandPresetId,
  type ProductBrand,
} from './brand.types';
import { assertValidProductBrand } from './brand-validation';

const relativeUrl = (value: string) => ({ kind: 'relative' as const, value });
const absoluteUrl = (value: string) => ({ kind: 'absolute' as const, value });

const mhooAsset = (
  path: string,
  purpose: string,
  dimensions: readonly [number, number],
  mimeType: BrandAsset['mimeType'] = 'image/png',
  maskable = false,
): BrandAsset => ({
  path,
  mimeType,
  dimensions,
  purpose,
  ...(maskable ? { maskable: true } : {}),
});

const mhooAssets: BrandAssetFamily = {
  productMark: mhooAsset(
    '/images/mhoo/mhoo-snout-transparent-1024.png',
    'transparent product mark',
    [1024, 1024],
  ),
  emailMark: mhooAsset(
    '/images/mhoo/mhoo-email-600x436.png',
    'email-safe raster mark',
    [600, 436],
  ),
  favicon: mhooAsset(
    '/images/mhoo/favicon/mhoo-favicon.ico',
    'multi-resolution browser favicon',
    [48, 48],
    'image/x-icon',
  ),
  pwaIcons: [
    mhooAsset(
      '/images/mhoo/pwa/mhoo-pwa-192.png',
      'PWA install icon',
      [192, 192],
    ),
    mhooAsset(
      '/images/mhoo/pwa/mhoo-pwa-512.png',
      'PWA install icon',
      [512, 512],
    ),
    mhooAsset(
      '/images/mhoo/pwa/mhoo-pwa-maskable-512.png',
      'maskable PWA install icon',
      [512, 512],
      'image/png',
      true,
    ),
  ],
  workspaceDefault: mhooAsset(
    '/images/mhoo/mhoo-workspace-96.png',
    'default workspace/avatar mark',
    [96, 96],
  ),
};

const upstreamAssets: BrandAssetFamily = {
  productMark: mhooAsset(
    '/images/icons/windows11/Square150x150Logo.scale-100.png',
    'upstream Twenty product mark',
    [150, 150],
  ),
  emailMark: mhooAsset(
    '/images/icons/windows11/Square150x150Logo.scale-100.png',
    'upstream Twenty email mark',
    [150, 150],
  ),
  favicon: mhooAsset(
    '/images/icons/windows11/Square44x44Logo.targetsize-32.png',
    'upstream Twenty browser favicon',
    [32, 32],
  ),
  pwaIcons: [
    mhooAsset(
      '/images/icons/android/android-launchericon-192-192.png',
      'upstream Twenty PWA install icon',
      [192, 192],
    ),
    mhooAsset(
      '/images/icons/android/android-launchericon-512-512.png',
      'upstream Twenty PWA install icon',
      [512, 512],
    ),
  ],
  workspaceDefault: mhooAsset(
    '/images/icons/windows11/Square44x44Logo.targetsize-96.png',
    'upstream Twenty default workspace mark',
    [96, 96],
  ),
};

const mhooBrand: ProductBrand = {
  preset: 'mhoo',
  productName: 'Mhoo',
  productShortName: 'Mhoo',
  legal: {
    legalEntity: 'Mhoo LLC',
    legalEntityStatus: 'approved',
    senderDisplayName: 'Mhoo',
    privacy: { status: 'approved', url: '/legal/privacy' },
    terms: { status: 'approved', url: '/legal/terms' },
    acceptableUse: { status: 'approved', url: '/legal/acceptable-use' },
    openSource: { status: 'approved', url: '/legal/open-source' },
    dpa: { status: 'unavailable', url: null },
    dpaAvailabilityNotice: { status: 'approved', url: '/legal/dpa' },
  },
  urls: {
    websiteUrl: relativeUrl('/'),
    supportUrl: relativeUrl('/support'),
    statusUrl: relativeUrl('/status'),
    documentationUrl: relativeUrl('/docs'),
    contactUrl: relativeUrl('/contact'),
  },
  assets: mhooAssets,
  documentTitleTemplate: '%s · Mhoo',
  attribution: {
    label: 'Powered by Twenty',
    url: '/legal/open-source',
    status: 'approved',
  },
  accessibility: {
    logoAltText: 'Mhoo pig snout mark',
    minimumRenderedSize: 16,
    safeArea:
      'Keep the generated safe-area padding; do not crop or stretch the snout.',
    contrastGuidance:
      'Use the light mark on light surfaces and the dark mark on dark surfaces.',
  },
};

const twentyBrand: ProductBrand = {
  preset: 'twenty',
  productName: 'Twenty',
  productShortName: 'Twenty',
  legal: {
    legalEntity: 'Twenty.com, Public Benefit Corporation',
    legalEntityStatus: 'approved',
    senderDisplayName: 'Twenty',
    privacy: { status: 'unavailable', url: null },
    terms: { status: 'unavailable', url: null },
    acceptableUse: { status: 'unavailable', url: null },
    openSource: { status: 'unavailable', url: null },
    dpa: { status: 'unavailable', url: null },
    dpaAvailabilityNotice: { status: 'unavailable', url: null },
  },
  urls: {
    websiteUrl: absoluteUrl('https://twenty.com/'),
    supportUrl: absoluteUrl('https://twenty.com/'),
    statusUrl: absoluteUrl('https://status.twenty.com/'),
    documentationUrl: absoluteUrl('https://docs.twenty.com/'),
    contactUrl: absoluteUrl('https://twenty.com/'),
  },
  assets: upstreamAssets,
  documentTitleTemplate: '%s · Twenty',
  attribution: {
    label: 'Powered by Twenty',
    url: 'https://twenty.com/',
    status: 'approved',
  },
  accessibility: {
    logoAltText: 'Twenty logo',
    minimumRenderedSize: 16,
    safeArea: 'Preserve the upstream icon padding and aspect ratio.',
    contrastGuidance:
      'Use the upstream icon variant intended for the surrounding surface.',
  },
};

const deepFreeze = <T>(value: T): Readonly<T> => {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nestedValue of Object.values(value)) {
      deepFreeze(nestedValue);
    }
  }
  return value;
};

export const MHO_BRAND = deepFreeze(assertValidProductBrand(mhooBrand));
export const TWENTY_BRAND = deepFreeze(assertValidProductBrand(twentyBrand));

export const BRAND_PRESETS: Readonly<Record<BrandPresetId, ProductBrand>> =
  deepFreeze({
    mhoo: MHO_BRAND,
    twenty: TWENTY_BRAND,
  });

export const getProductBrand = (preset: BrandPresetId): ProductBrand =>
  BRAND_PRESETS[preset];
