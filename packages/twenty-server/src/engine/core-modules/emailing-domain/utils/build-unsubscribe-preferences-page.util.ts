import { type TopicOptOutState } from 'src/engine/core-modules/emailing-domain/types/topic-opt-out-state.type';
import { type EmailingPublicPageBrand } from 'src/engine/core-modules/emailing-domain/types/emailing-public-page-brand.type';
import {
  buildEmailingPublicPageFooter,
  buildEmailingPublicPageHeader,
} from 'src/engine/core-modules/emailing-domain/utils/build-emailing-public-page-markup.util';
import { escapeHtml } from 'src/engine/core-modules/emailing-domain/utils/escape-html.util';

type BuildUnsubscribePreferencesPageArgs = {
  token: string;
  topics: TopicOptOutState[];
  updatePath: string;
  unsubscribeAllPath: string;
  brand: EmailingPublicPageBrand;
};

const PAGE_STYLE = `body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fafafa;margin:0;padding:48px 16px;color:#1a1a1a}.card{max-width:420px;margin:0 auto;background:#fff;border:1px solid #ededed;border-radius:16px;padding:40px 32px;text-align:center}.brand-header{margin:0 0 28px}.brand-header a{color:inherit;text-decoration:none;display:inline-flex;align-items:center;gap:10px;font-weight:700}.brand-header img{object-fit:contain}.brand-footer{max-width:420px;margin:24px auto 0;text-align:center;color:#888;font-size:12px}.brand-footer p{margin:6px 0}.brand-footer a{color:inherit}.legal-unavailable{font-style:italic}.preview-notice{color:#b45309;font-weight:600}.card h1{font-size:28px;font-weight:700;margin:0 0 8px}.subtitle{color:#888;margin:0 0 28px}.topics{text-align:left;margin:0 0 28px}.topic{display:flex;align-items:center;gap:12px;padding:10px 0;font-size:16px}.topic input{width:18px;height:18px;accent-color:#1a1a1a}button{width:100%;border-radius:10px;padding:14px;font-size:16px;font-weight:600;cursor:pointer;border:1px solid transparent}.primary{background:#1a1a1a;color:#fff}.divider{color:#aaa;margin:16px 0}.secondary{background:#fff;color:#1a1a1a;border:1px solid #ddd}`;

const buildTopicCheckbox = (topic: TopicOptOutState): string => {
  const label = escapeHtml(topic.topicName ?? 'Untitled topic');
  const value = escapeHtml(topic.unsubscribeTopicId);
  const checkedAttribute = topic.optedOut ? '' : ' checked';

  return `<label class="topic"><input type="checkbox" name="unsubscribeTopicId" value="${value}"${checkedAttribute} />${label}</label>`;
};

export const buildUnsubscribePreferencesPage = ({
  token,
  topics,
  updatePath,
  unsubscribeAllPath,
  brand,
}: BuildUnsubscribePreferencesPageArgs): string => {
  const safeToken = escapeHtml(token);
  const safeUpdatePath = escapeHtml(updatePath);
  const safeUnsubscribeAllPath = escapeHtml(unsubscribeAllPath);
  const tokenField = `<input type="hidden" name="t" value="${safeToken}" />`;

  // Without topics there is nothing to pick from, so the page collapses to a
  // single confirmation instead of offering an empty preferences form.
  const body =
    topics.length > 0
      ? `<p class="subtitle">Confirm your ${escapeHtml(
          brand.productName,
        )} email preferences:</p><form method="post" action="${safeUpdatePath}">${tokenField}<div class="topics">${topics
          .map(buildTopicCheckbox)
          .join(
            '',
          )}</div><button type="submit" class="primary">Update</button></form><p class="divider">Or</p><form method="post" action="${safeUnsubscribeAllPath}">${tokenField}<button type="submit" class="secondary">Unsubscribe all</button></form>`
      : `<p class="subtitle">You will stop receiving these ${escapeHtml(
          brand.productName,
        )} emails.</p><form method="post" action="${safeUnsubscribeAllPath}">${tokenField}<button type="submit" class="primary">Unsubscribe</button></form>`;

  const title = `${brand.productName} email preferences`;

  return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(
    title,
  )}</title><style>${PAGE_STYLE}</style></head><body><div class="card">${buildEmailingPublicPageHeader(
    brand,
  )}<h1>Do you want to unsubscribe?</h1>${body}</div>${buildEmailingPublicPageFooter(
    brand,
  )}</body></html>`;
};
