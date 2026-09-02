import { styled } from '@linaria/react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import { Navigate, useLocation } from 'react-router-dom';
import remarkGfm from 'remark-gfm';
import { type ResolvedBrand } from 'twenty-shared/branding';
import { getSafeUrl } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { brandState } from '@/client-config/states/brandState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

import {
  getMhooLegalDocument,
  isMhooLegalDocumentAllowed,
  MHOO_LEGAL_DOCUMENTS,
  type MhooLegalDocument,
} from '~/legal/legal-packet';

const StyledShell = styled.div`
  background: ${themeCssVariables.background.primary};
  color: ${themeCssVariables.font.color.primary};
  min-height: 100dvh;
  padding: ${themeCssVariables.spacing[8]} ${themeCssVariables.spacing[4]};

  @media print {
    min-height: auto;
    padding: 0;
  }
`;

const StyledHeader = styled.header`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[6]};
  justify-content: space-between;
  margin: 0 auto ${themeCssVariables.spacing[8]};
  max-width: 960px;

  & > a {
    align-items: center;
    color: ${themeCssVariables.font.color.primary};
    display: inline-flex;
    font-size: ${themeCssVariables.font.size.lg};
    font-weight: ${themeCssVariables.font.weight.semiBold};
    gap: ${themeCssVariables.spacing[2]};
    text-decoration: none;
  }

  img {
    height: 40px;
    object-fit: contain;
    width: 40px;
  }

  @media print {
    margin-bottom: ${themeCssVariables.spacing[4]};
  }
`;

const StyledNavigation = styled.nav`
  min-width: 0;

  ul {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
    justify-content: flex-end;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  a,
  span {
    color: ${themeCssVariables.font.color.secondary};
    font-size: ${themeCssVariables.font.size.sm};
  }

  a {
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  span[aria-current='page'] {
    color: ${themeCssVariables.font.color.primary};
    font-weight: ${themeCssVariables.font.weight.semiBold};
  }

  @media print {
    display: none;
  }
`;

const StyledMain = styled.main`
  margin: 0 auto;
  max-width: 960px;
`;

const StyledArticle = styled.article`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  box-sizing: border-box;
  line-height: 1.6;
  overflow-wrap: anywhere;
  padding: ${themeCssVariables.spacing[8]};

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    color: ${themeCssVariables.font.color.primary};
    line-height: 1.25;
    margin: ${themeCssVariables.spacing[6]} 0 ${themeCssVariables.spacing[3]};
  }

  h1 {
    font-size: ${themeCssVariables.font.size.xl};
    margin-top: 0;
  }

  h2 {
    font-size: ${themeCssVariables.font.size.lg};
  }

  h3,
  h4,
  h5,
  h6 {
    font-size: ${themeCssVariables.font.size.md};
  }

  p,
  ul,
  ol,
  blockquote,
  table {
    margin: 0 0 ${themeCssVariables.spacing[4]};
  }

  ul,
  ol {
    padding-left: ${themeCssVariables.spacing[6]};
  }

  a {
    color: ${themeCssVariables.color.blue};
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  a:focus-visible,
  button:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 3px;
  }

  blockquote {
    border-left: 3px solid ${themeCssVariables.border.color.medium};
    color: ${themeCssVariables.font.color.secondary};
    padding-left: ${themeCssVariables.spacing[4]};
  }

  code {
    overflow-wrap: anywhere;
  }

  pre {
    max-width: 100%;
    overflow-x: auto;
  }

  table {
    border-collapse: collapse;
    display: block;
    max-width: 100%;
    overflow-x: auto;
  }

  th,
  td {
    border: 1px solid ${themeCssVariables.border.color.light};
    padding: ${themeCssVariables.spacing[2]};
    text-align: left;
    vertical-align: top;
  }

  @media (max-width: 640px) {
    padding: ${themeCssVariables.spacing[4]};
  }

  @media print {
    background: transparent;
    border: 0;
    padding: 0;

    a {
      color: inherit;
      text-decoration: none;
    }
  }
`;

const StyledFooter = styled.footer`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: ${themeCssVariables.spacing[4]} auto 0;
  max-width: 960px;

  @media print {
    margin-top: ${themeCssVariables.spacing[3]};
  }
`;

const StyledUnavailable = styled.main`
  align-items: center;
  background: ${themeCssVariables.background.primary};
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  justify-content: center;
  min-height: 100dvh;
  padding: ${themeCssVariables.spacing[4]};
  text-align: center;
`;

type MarkdownLinkProps = {
  children?: ReactNode;
  href?: string;
  title?: string;
};

const MarkdownLink = ({ children, href, title }: MarkdownLinkProps) => {
  const safeHref = getSafeUrl(href);

  if (!safeHref) {
    return <span>{children}</span>;
  }

  const isExternal =
    safeHref.startsWith('http:') || safeHref.startsWith('https:');

  return (
    <a
      href={safeHref}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      target={isExternal ? '_blank' : undefined}
      title={title}
    >
      {children}
    </a>
  );
};

const MARKDOWN_COMPONENTS = {
  a: MarkdownLink,
  h1: ({ children }: { children?: ReactNode }) => (
    <h1 id="legal-document-title">{children}</h1>
  ),
};

const LegalUnavailable = () => (
  <StyledUnavailable role="status">
    <p>Legal documents are currently unavailable.</p>
  </StyledUnavailable>
);

const LegalNavigation = ({
  brand,
  currentDocument,
  origin,
}: {
  brand: Pick<ResolvedBrand, 'preset' | 'legal'>;
  currentDocument: MhooLegalDocument;
  origin: string;
}) => (
  <StyledNavigation aria-label="Legal documents">
    <ul>
      {MHOO_LEGAL_DOCUMENTS.map((document) => {
        if (!isMhooLegalDocumentAllowed(brand, document, origin)) {
          return null;
        }

        if (document.path === currentDocument.path) {
          return (
            <li key={document.path}>
              <span aria-current="page">{document.label}</span>
            </li>
          );
        }

        const href = brand.legal[document.brandDocument].url;

        if (!href) {
          return null;
        }

        return (
          <li key={document.path}>
            <a href={href}>{document.label}</a>
          </li>
        );
      })}
    </ul>
  </StyledNavigation>
);

export const LegalPage = () => {
  const brand = useAtomStateValue(brandState);
  const { hash, pathname, search } = useLocation();

  if (!brand || brand.preset !== 'mhoo') {
    return <LegalUnavailable />;
  }

  const canonicalPath = pathname.replace(/\/$/, '') || '/';
  const document = getMhooLegalDocument(canonicalPath);

  if (!document) {
    return <LegalUnavailable />;
  }

  if (pathname !== document.path || search !== '' || hash !== '') {
    return <Navigate to={document.path} replace />;
  }

  const origin = window.location.origin;

  if (!isMhooLegalDocumentAllowed(brand, document, origin)) {
    return <LegalUnavailable />;
  }

  return (
    <StyledShell>
      <Helmet>
        <link
          rel="canonical"
          href={new URL(document.path, origin).toString()}
        />
      </Helmet>
      <StyledHeader>
        <a
          href={brand.urls.websiteUrl}
          aria-label={`Visit ${brand.productName} home`}
        >
          <img
            src={brand.assets.productMark.path}
            alt={brand.accessibility.logoAltText}
            width="40"
            height="40"
          />
          <span>{brand.productName}</span>
        </a>
        <LegalNavigation
          brand={brand}
          currentDocument={document}
          origin={origin}
        />
      </StyledHeader>
      <StyledMain>
        <StyledArticle aria-labelledby="legal-document-title">
          <ReactMarkdown
            components={MARKDOWN_COMPONENTS}
            remarkPlugins={[remarkGfm]}
            skipHtml
          >
            {document.content}
          </ReactMarkdown>
        </StyledArticle>
      </StyledMain>
      <StyledFooter>{brand.legal.legalEntity}</StyledFooter>
    </StyledShell>
  );
};
