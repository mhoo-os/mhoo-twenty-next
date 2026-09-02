import { type ProductBrand, type ResolvedBrand } from 'twenty-shared/branding';

import acceptableUseContent from './sources/03-mhoo-acceptable-use-policy-v2.0.md?raw';
import dpaContent from './sources/05-mhoo-dpa-availability-notice-v2.0.md?raw';
import openSourceContent from './sources/04-mhoo-open-source-notice-v2.0.md?raw';
import privacyContent from './sources/02-mhoo-privacy-policy-v2.0.md?raw';
import termsContent from './sources/01-mhoo-master-terms-v2.0.md?raw';
import packetManifest from './sources/mhoo-legal-packet-manifest-v2.0.json';

export type MhooLegalPacketManifestFile = Readonly<{
  bytes: number;
  media_type: string;
  path: string;
  sha256: string;
}>;

export type MhooLegalPacketManifest = Readonly<{
  packet_id: string;
  packet_version: string;
  status: string;
  dpa_state: string;
  files: readonly MhooLegalPacketManifestFile[];
}>;

export type MhooLegalDocumentKey =
  | 'terms'
  | 'privacy'
  | 'acceptableUse'
  | 'openSource'
  | 'dpa';

export type MhooLegalDocument = Readonly<{
  brandDocument: MhooLegalDocumentKey;
  content: string;
  label: string;
  manifestFile: MhooLegalPacketManifestFile;
  path: string;
  sourcePath: string;
}>;

const manifest = packetManifest as MhooLegalPacketManifest;

export const MHOO_LEGAL_PACKET = Object.freeze({
  id: manifest.packet_id,
  version: manifest.packet_version,
  status: manifest.status,
  dpaState: manifest.dpa_state,
  manifestSha256:
    '57ffc6de05f1deb3c8db7b05fd9a1b7a09f7c8bc2996e1e859fbd2238ca227f5',
});

const getManifestFile = (sourcePath: string): MhooLegalPacketManifestFile => {
  const manifestFile = manifest.files.find(({ path }) => path === sourcePath);

  if (!manifestFile) {
    throw new Error(
      `Legal packet source is absent from the manifest: ${sourcePath}`,
    );
  }

  return manifestFile;
};

const defineLegalDocument = <
  const T extends Omit<MhooLegalDocument, 'manifestFile'>,
>(
  document: T,
): MhooLegalDocument => ({
  ...document,
  manifestFile: getManifestFile(document.sourcePath),
});

export const MHOO_LEGAL_DOCUMENTS = [
  defineLegalDocument({
    brandDocument: 'terms',
    content: termsContent,
    label: 'Terms of Service',
    path: '/legal/terms',
    sourcePath: '01-mhoo-master-terms-v2.0.md',
  }),
  defineLegalDocument({
    brandDocument: 'privacy',
    content: privacyContent,
    label: 'Privacy Policy',
    path: '/legal/privacy',
    sourcePath: '02-mhoo-privacy-policy-v2.0.md',
  }),
  defineLegalDocument({
    brandDocument: 'acceptableUse',
    content: acceptableUseContent,
    label: 'Acceptable Use Policy',
    path: '/legal/acceptable-use',
    sourcePath: '03-mhoo-acceptable-use-policy-v2.0.md',
  }),
  defineLegalDocument({
    brandDocument: 'openSource',
    content: openSourceContent,
    label: 'Open Source & Upstream License Notice',
    path: '/legal/open-source',
    sourcePath: '04-mhoo-open-source-notice-v2.0.md',
  }),
  defineLegalDocument({
    brandDocument: 'dpa',
    content: dpaContent,
    label: 'DPA Availability Notice',
    path: '/legal/dpa',
    sourcePath: '05-mhoo-dpa-availability-notice-v2.0.md',
  }),
] as const;

export const getMhooLegalDocument = (
  path: string,
): MhooLegalDocument | undefined =>
  MHOO_LEGAL_DOCUMENTS.find((document) => document.path === path);

const isSameOriginLegalUrl = (
  url: string,
  expectedPath: string,
  origin: string,
): boolean => {
  try {
    const expectedOrigin = new URL(origin).origin;
    const parsedUrl = new URL(url, expectedOrigin);

    return (
      parsedUrl.origin === expectedOrigin &&
      parsedUrl.pathname === expectedPath &&
      parsedUrl.search === '' &&
      parsedUrl.hash === ''
    );
  } catch {
    return false;
  }
};

/**
 * A route is renderable only when the selected product and its legal contract
 * agree on the canonical route. The DPA route is the approved unavailable
 * notice, so it deliberately has no actionable URL in the brand contract.
 */
export const isMhooLegalDocumentAllowed = (
  brand: Pick<ProductBrand | ResolvedBrand, 'preset' | 'legal'>,
  document: MhooLegalDocument,
  origin: string,
): boolean => {
  if (brand.preset !== 'mhoo') {
    return false;
  }

  const contractDocument = brand.legal[document.brandDocument];

  if (document.brandDocument === 'dpa') {
    return (
      contractDocument.status === 'unavailable' && contractDocument.url === null
    );
  }

  return (
    contractDocument.status === 'approved' &&
    typeof contractDocument.url === 'string' &&
    isSameOriginLegalUrl(contractDocument.url, document.path, origin)
  );
};
