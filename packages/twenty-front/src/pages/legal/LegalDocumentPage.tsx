import { styled } from '@linaria/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { type ResolvedBrand } from 'twenty-shared/branding';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { brandState } from '@/client-config/states/brandState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { PageTitle } from '@/ui/utilities/page-title/components/PageTitle';
import {
  getApprovedLegalDocuments,
  getLegalDocumentDefinition,
  type LegalDocumentKey,
} from '~/pages/legal/legal-document-config';

const StyledPage = styled.div`
  background: ${themeCssVariables.background.primary};
  color: ${themeCssVariables.font.color.primary};
  min-height: 100%;
  overflow-y: auto;
  width: 100%;

  @media print {
    overflow: visible;
  }
`;

const StyledHeader = styled.header`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[4]} ${themeCssVariables.spacing[6]};

  img {
    height: 40px;
    object-fit: contain;
    width: 40px;
  }

  @media (max-width: 600px) {
    align-items: flex-start;
    flex-direction: column;
    gap: ${themeCssVariables.spacing[3]};
    padding: ${themeCssVariables.spacing[4]};
  }

  @media print {
    border: 0;
    padding: 0 0 16px;
  }
`;

const StyledNav = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[3]};

  a {
    color: ${themeCssVariables.font.color.secondary};
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
  }

  a:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 3px;
  }

  @media print {
    display: none;
  }
`;

const StyledSkipLink = styled.a`
  background: ${themeCssVariables.background.primary};
  color: ${themeCssVariables.font.color.primary};
  left: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[2]};
  position: absolute;
  top: -100px;
  z-index: 1;

  &:focus {
    top: ${themeCssVariables.spacing[3]};
  }
`;

const StyledMain = styled.main`
  margin: 0 auto;
  max-width: 840px;
  padding: ${themeCssVariables.spacing[8]} ${themeCssVariables.spacing[6]};

  @media (max-width: 600px) {
    padding: ${themeCssVariables.spacing[5]} ${themeCssVariables.spacing[4]};
  }

  @media print {
    margin: 0;
    max-width: none;
    padding: 0;
  }
`;

const StyledArticle = styled.article`
  font-size: 16px;
  line-height: 1.65;

  h1,
  h2,
  h3 {
    line-height: 1.25;
    scroll-margin-top: ${themeCssVariables.spacing[4]};
  }

  h1 {
    font-size: 32px;
  }

  h3 {
    font-size: 20px;
    margin-top: ${themeCssVariables.spacing[8]};
  }

  a {
    color: ${themeCssVariables.color.blue};
    overflow-wrap: anywhere;
  }

  a:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 3px;
  }

  blockquote {
    border-left: 4px solid ${themeCssVariables.border.color.medium};
    margin-left: 0;
    padding-left: ${themeCssVariables.spacing[4]};
  }

  table {
    border-collapse: collapse;
    display: block;
    overflow-x: auto;
    width: 100%;
  }

  th,
  td {
    border: 1px solid ${themeCssVariables.border.color.medium};
    padding: ${themeCssVariables.spacing[2]};
    text-align: left;
  }

  @media print {
    font-size: 11pt;

    h1 {
      font-size: 22pt;
    }

    h3 {
      break-after: avoid;
      font-size: 14pt;
    }
  }
`;

const LegalUnavailable = () => (
  <StyledMain>
    <h1>Legal document unavailable</h1>
    <p>This legal document is not approved for this product configuration.</p>
  </StyledMain>
);

type LegalDocumentViewProps = {
  documentKey: LegalDocumentKey;
  brand: ResolvedBrand | null;
};

export const LegalDocumentView = ({
  documentKey,
  brand,
}: LegalDocumentViewProps) => {
  const definition = getLegalDocumentDefinition(documentKey);

  if (brand === null) {
    return (
      <StyledMain aria-busy="true" aria-live="polite">
        Loading legal document…
      </StyledMain>
    );
  }

  const document = brand.legal[documentKey];
  const approvedDocuments = getApprovedLegalDocuments(brand);
  if (
    brand.preset !== 'mhoo' ||
    document.status !== 'approved' ||
    !approvedDocuments.some(({ key }) => key === documentKey)
  ) {
    return <LegalUnavailable />;
  }

  return (
    <StyledPage>
      <PageTitle title={definition.title} />
      <StyledSkipLink href="#legal-document-content">
        Skip to legal document
      </StyledSkipLink>
      <StyledHeader>
        <a
          href={brand.urls.websiteUrl}
          aria-label={`Visit ${brand.productName}`}
        >
          <img
            alt={brand.accessibility.logoAltText}
            height={40}
            src={brand.assets.productMark.path}
            width={40}
          />
        </a>
        <StyledNav aria-label="Legal documents">
          {approvedDocuments.map(({ key, label }) => (
            <a
              aria-current={key === documentKey ? 'page' : undefined}
              href={brand.legal[key].url as string}
              key={key}
            >
              {label}
            </a>
          ))}
        </StyledNav>
      </StyledHeader>
      <StyledMain id="legal-document-content" tabIndex={-1}>
        <StyledArticle aria-labelledby="legal-document-title">
          <ReactMarkdown
            components={{
              a: ({ children, href }) => {
                const isExternal = href?.startsWith('https://') ?? false;

                return (
                  <a
                    href={href}
                    rel={isExternal ? 'noopener noreferrer' : undefined}
                    target={isExternal ? '_blank' : undefined}
                  >
                    {children}
                  </a>
                );
              },
              h1: ({ children }) => (
                <h1 id="legal-document-title">{children}</h1>
              ),
            }}
            remarkPlugins={[remarkGfm]}
          >
            {definition.source}
          </ReactMarkdown>
        </StyledArticle>
      </StyledMain>
    </StyledPage>
  );
};

type LegalDocumentPageProps = {
  documentKey: LegalDocumentKey;
};

export const LegalDocumentPage = ({ documentKey }: LegalDocumentPageProps) => {
  const brand = useAtomStateValue(brandState);

  return <LegalDocumentView brand={brand} documentKey={documentKey} />;
};
