import { type EmailingPublicPageBrand } from 'src/engine/core-modules/emailing-domain/types/emailing-public-page-brand.type';
import {
  buildEmailingPublicPageFooter,
  buildEmailingPublicPageHeader,
} from 'src/engine/core-modules/emailing-domain/utils/build-emailing-public-page-markup.util';
import { escapeHtml } from 'src/engine/core-modules/emailing-domain/utils/escape-html.util';

const PAGE_STYLE = `body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fafafa;margin:0;padding:48px 16px;color:#1a1a1a;text-align:center}.card{max-width:420px;margin:0 auto;background:#fff;border:1px solid #ededed;border-radius:16px;padding:48px 32px}.brand-header{margin:0 0 28px}.brand-header a{color:inherit;text-decoration:none;display:inline-flex;align-items:center;gap:10px;font-weight:700}.brand-header img{object-fit:contain}.brand-footer{max-width:420px;margin:24px auto 0;color:#888;font-size:12px}.brand-footer p{margin:6px 0}.brand-footer a{color:inherit}.legal-unavailable{font-style:italic}.preview-notice{color:#b45309;font-weight:600}.card h1{font-size:24px;font-weight:700;margin:0 0 8px}.card p{color:#888;margin:0}`;

type BuildUnsubscribeResultPageArgs = Readonly<{
  title: string;
  message: string;
  brand: EmailingPublicPageBrand;
}>;

export const buildUnsubscribeResultPage = ({
  title,
  message,
  brand,
}: BuildUnsubscribeResultPageArgs): string =>
  `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(
    title,
  )}</title><style>${PAGE_STYLE}</style></head><body><div class="card">${buildEmailingPublicPageHeader(
    brand,
  )}<h1>${escapeHtml(title)}</h1><p>${escapeHtml(
    message,
  )}</p></div>${buildEmailingPublicPageFooter(brand)}</body></html>`;
