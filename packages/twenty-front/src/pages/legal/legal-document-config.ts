import { type ResolvedBrand } from 'twenty-shared/branding';
import { AppPath } from 'twenty-shared/types';

import { MHO_LEGAL_DOCUMENT_SOURCES } from '~/pages/legal/legal-document-sources.generated';

export type LegalDocumentKey =
  | 'terms'
  | 'privacy'
  | 'acceptableUse'
  | 'openSource'
  | 'dpaAvailabilityNotice';

export type LegalDocumentDefinition = Readonly<{
  key: LegalDocumentKey;
  label: string;
  title: string;
  route: AppPath;
  source: string;
}>;

export const LEGAL_DOCUMENTS: readonly LegalDocumentDefinition[] = [
  {
    key: 'terms',
    label: 'Terms',
    title: 'Master Terms of Service',
    route: AppPath.LegalTerms,
    source: MHO_LEGAL_DOCUMENT_SOURCES.terms.source,
  },
  {
    key: 'privacy',
    label: 'Privacy',
    title: 'Privacy Policy',
    route: AppPath.LegalPrivacy,
    source: MHO_LEGAL_DOCUMENT_SOURCES.privacy.source,
  },
  {
    key: 'acceptableUse',
    label: 'Acceptable Use',
    title: 'Acceptable Use Policy',
    route: AppPath.LegalAcceptableUse,
    source: MHO_LEGAL_DOCUMENT_SOURCES.acceptableUse.source,
  },
  {
    key: 'openSource',
    label: 'Open Source',
    title: 'Open Source & Upstream License Notice',
    route: AppPath.LegalOpenSource,
    source: MHO_LEGAL_DOCUMENT_SOURCES.openSource.source,
  },
  {
    key: 'dpaAvailabilityNotice',
    label: 'DPA Status',
    title: 'Data Processing Addendum Status',
    route: AppPath.LegalDpa,
    source: MHO_LEGAL_DOCUMENT_SOURCES.dpaAvailabilityNotice.source,
  },
] as const;

export const getApprovedLegalDocuments = (
  brand: Pick<ResolvedBrand, 'legal' | 'urls'>,
): readonly LegalDocumentDefinition[] =>
  LEGAL_DOCUMENTS.filter(({ key, route }) => {
    const document = brand.legal[key];

    if (document.status !== 'approved' || document.url === null) {
      return false;
    }

    try {
      const documentUrl = new URL(document.url);
      const websiteUrl = new URL(brand.urls.websiteUrl);

      return (
        documentUrl.origin === websiteUrl.origin &&
        documentUrl.pathname === route &&
        documentUrl.search === '' &&
        documentUrl.hash === ''
      );
    } catch {
      return false;
    }
  });

export const getLegalDocumentDefinition = (
  key: LegalDocumentKey,
): LegalDocumentDefinition => {
  const definition = LEGAL_DOCUMENTS.find((document) => document.key === key);

  if (!definition) {
    throw new Error(`Unknown legal document: ${key}`);
  }

  return definition;
};

export const isLegalDocumentPath = (path: string): boolean =>
  path === AppPath.LegalIndex ||
  LEGAL_DOCUMENTS.some(({ route }) => route === path);
