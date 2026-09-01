import { type EmailingPublicPageBrand } from 'src/engine/core-modules/emailing-domain/types/emailing-public-page-brand.type';
import { escapeHtml } from 'src/engine/core-modules/emailing-domain/utils/escape-html.util';

export const buildUnsubscribeHtmlFooter = (
  webUrl: string,
  brand: EmailingPublicPageBrand,
): string =>
  `<hr style="margin-top:24px;border:none;border-top:1px solid #eee" /><p style="font-size:12px;color:#888">Don't want these ${escapeHtml(
    brand.productName,
  )} emails? <a href="${escapeHtml(webUrl)}">Unsubscribe</a>.</p>`;
