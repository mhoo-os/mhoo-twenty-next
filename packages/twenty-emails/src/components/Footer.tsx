import { type I18n } from '@lingui/core';
import { Column, Container, Row } from 'react-email';
import { Link } from 'src/components/Link';
import { ShadowText } from 'src/components/ShadowText';
import { isApprovedBrandDocument } from 'src/utils/brand';
import { getPreviewNotice } from 'src/utils/preview-brand';
import { type ResolvedBrand } from 'twenty-shared/branding';

const footerContainerStyle = {
  marginTop: '12px',
};

type FooterProps = {
  i18n: I18n;
  brand: ResolvedBrand;
};

export const Footer = ({ i18n, brand }: FooterProps) => {
  const links =
    brand.preset === 'twenty'
      ? [
          {
            href: brand.urls.websiteUrl,
            value: i18n._('Website'),
            ariaLabel: i18n._('Visit the product website'),
          },
          {
            href: 'https://github.com/twentyhq/twenty',
            value: i18n._('Github'),
            ariaLabel: i18n._('Visit the product GitHub repository'),
          },
          {
            href: brand.urls.documentationUrl,
            value: i18n._('User guide'),
            ariaLabel: i18n._('Read the user guide'),
          },
          {
            href: brand.urls.documentationUrl,
            value: i18n._('Developers'),
            ariaLabel: i18n._('Visit developer documentation'),
          },
        ]
      : [
          {
            href: brand.urls.websiteUrl,
            value: i18n._('Website'),
            ariaLabel: i18n._('Visit the product website'),
          },
          {
            href: brand.urls.supportUrl,
            value: i18n._('Support'),
            ariaLabel: i18n._('Contact product support'),
          },
          {
            href: brand.urls.documentationUrl,
            value: i18n._('User guide'),
            ariaLabel: i18n._('Read the user guide'),
          },
          {
            href: brand.urls.contactUrl,
            value: i18n._('Contact'),
            ariaLabel: i18n._('Contact the product team'),
          },
        ];
  const hasLegalEntity =
    brand.legal.legalEntityStatus === 'approved' &&
    brand.legal.legalEntity.trim().length > 0;
  const hasAttribution =
    brand.attribution.status === 'approved' &&
    brand.attribution.label.trim().length > 0 &&
    isApprovedBrandDocument({
      status: brand.attribution.status,
      url: brand.attribution.url,
    });
  const previewNotice = getPreviewNotice(brand);

  return (
    <Container style={footerContainerStyle}>
      <Row>
        {links.map((link) => (
          <Column key={link.value}>
            <ShadowText>
              <Link
                href={link.href}
                value={link.value}
                ariaLabel={link.ariaLabel}
              />
            </ShadowText>
          </Column>
        ))}
      </Row>
      {hasLegalEntity ? (
        <ShadowText>{brand.legal.legalEntity}</ShadowText>
      ) : null}
      {hasAttribution ? (
        <ShadowText>
          <Link
            href={brand.attribution.url as string}
            value={brand.attribution.label}
          />
        </ShadowText>
      ) : null}
      {previewNotice ? <ShadowText>{previewNotice}</ShadowText> : null}
    </Container>
  );
};
