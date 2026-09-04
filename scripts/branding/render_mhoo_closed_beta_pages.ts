import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveProductBrand } from '../../packages/twenty-server/src/engine/core-modules/twenty-config/services/product-brand-resolver.service';
import { resolveEmailingPublicPageBrand } from '../../packages/twenty-server/src/engine/core-modules/emailing-domain/types/emailing-public-page-brand.type';
import { buildUnsubscribePreferencesPage } from '../../packages/twenty-server/src/engine/core-modules/emailing-domain/utils/build-unsubscribe-preferences-page.util';
import { buildUnsubscribeResultPage } from '../../packages/twenty-server/src/engine/core-modules/emailing-domain/utils/build-unsubscribe-result-page.util';
import { assertMhooClosedBetaPreview } from './mhoo_closed_beta_preview_validation';

const outputDirectory = resolve(
  process.env.MHOO_PREVIEW_OUTPUT ?? '/private/tmp/mhoo-mho233-preview-output',
  'pages',
);

mkdirSync(outputDirectory, { recursive: true });

const resolvedBrand = resolveProductBrand({
  preset: 'mhoo',
  deploymentOrigin: 'https://beta.mhoo.app/',
});
const brand = {
  ...resolveEmailingPublicPageBrand(resolvedBrand),
  previewNotice:
    'Private beta preview — legal documents are DRAFT / UNAPPROVED.',
};

const preferences = buildUnsubscribePreferencesPage({
  token: 'preview-token',
  topics: [
    {
      unsubscribeTopicId: 'product-updates',
      topicName: 'Product updates',
      optedOut: false,
    },
    {
      unsubscribeTopicId: 'newsletter',
      topicName: 'Newsletter',
      optedOut: true,
    },
  ],
  updatePath: '/emailing/unsubscribe/update?preview=true',
  unsubscribeAllPath: '/emailing/unsubscribe/all?preview=true',
  brand,
});
const result = buildUnsubscribeResultPage({
  title: 'Preferences saved',
  message: 'Your Mhoo email preferences have been updated.',
  brand,
});

for (const [name, html] of [
  ['unsubscribe-preferences', preferences],
  ['unsubscribe-result', result],
] as const) {
  assertMhooClosedBetaPreview({
    name,
    html,
    requiredMarkers: [
      'Mhoo',
      'Private beta preview',
      'DRAFT / UNAPPROVED',
      'https://beta.mhoo.app/legal/privacy',
      'https://beta.mhoo.app/legal/terms',
      'https://beta.mhoo.app/legal/acceptable-use',
      'https://beta.mhoo.app/legal/open-source',
      'https://beta.mhoo.app/legal/dpa',
      '/images/mhoo/mhoo-email-600x436.png',
    ],
  });

  writeFileSync(resolve(outputDirectory, `${name}.html`), html);
}

writeFileSync(
  resolve(outputDirectory, 'manifest.json'),
  JSON.stringify(
    {
      issue: 'MHO-233',
      kind: 'mhoo-closed-beta-public-page-preview',
      status: 'DRAFT / UNAPPROVED — PRIVATE LOCAL PREVIEW',
      production: false,
      previewMutation: false,
      receipts: ['unsubscribe-preferences.html', 'unsubscribe-result.html'],
    },
    null,
    2,
  ),
);
