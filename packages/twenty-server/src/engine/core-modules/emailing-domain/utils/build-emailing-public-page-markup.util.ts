import { type EmailingPublicPageBrand } from 'src/engine/core-modules/emailing-domain/types/emailing-public-page-brand.type';
import { escapeHtml } from 'src/engine/core-modules/emailing-domain/utils/escape-html.util';

const formatDimensions = (
  dimensions: readonly [number, number],
): { width: number; height: number } => {
  const [width, height] = dimensions;
  const renderedWidth = 40;

  return {
    width: renderedWidth,
    height: Math.max(1, Math.round((renderedWidth * height) / width)),
  };
};

export const buildEmailingPublicPageHeader = (
  brand: EmailingPublicPageBrand,
): string => {
  const dimensions = formatDimensions(brand.logoDimensions);

  return `<header class="brand-header"><a href="${escapeHtml(
    brand.websiteUrl,
  )}" aria-label="Visit ${escapeHtml(
    brand.productName,
  )}"><img src="${escapeHtml(brand.emailMarkUrl)}" alt="${escapeHtml(
    brand.logoAltText,
  )}" width="${dimensions.width}" height="${dimensions.height}" /><span>${escapeHtml(
    brand.productName,
  )}</span></a></header>`;
};

export const buildEmailingPublicPageFooter = (
  brand: EmailingPublicPageBrand,
): string => {
  const legalLinks = brand.legalLinks
    .map(
      ({ label, url }) =>
        `<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`,
    )
    .join(' <span aria-hidden="true">·</span> ');
  const legalMarkup =
    legalLinks.length > 0
      ? `<p class="legal-links">${legalLinks}</p>`
      : '<p class="legal-unavailable">Legal documents are currently unavailable.</p>';
  const legalEntityMarkup = brand.legalEntity
    ? `<p>${escapeHtml(brand.legalEntity)}</p>`
    : '';
  const attributionMarkup = brand.attribution
    ? `<p><a href="${escapeHtml(brand.attribution.url)}">${escapeHtml(
        brand.attribution.label,
      )}</a></p>`
    : '';
  const previewNoticeMarkup = brand.previewNotice
    ? `<p class="preview-notice">${escapeHtml(brand.previewNotice)}</p>`
    : '';

  return `<footer class="brand-footer">${previewNoticeMarkup}<p><a href="${escapeHtml(
    brand.supportUrl,
  )}">Contact ${escapeHtml(brand.productName)} support</a></p>${legalMarkup}${legalEntityMarkup}${attributionMarkup}</footer>`;
};
