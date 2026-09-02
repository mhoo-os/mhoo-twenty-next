import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveProductBrand } from '../../packages/twenty-server/src/engine/core-modules/twenty-config/services/product-brand-resolver.service';
import { resolveEmailingPublicPageBrand } from '../../packages/twenty-server/src/engine/core-modules/emailing-domain/types/emailing-public-page-brand.type';
import { buildUnsubscribePreferencesPage } from '../../packages/twenty-server/src/engine/core-modules/emailing-domain/utils/build-unsubscribe-preferences-page.util';
import { buildUnsubscribeResultPage } from '../../packages/twenty-server/src/engine/core-modules/emailing-domain/utils/build-unsubscribe-result-page.util';

const outputDirectory = resolve(
  process.env.MHOO_PREVIEW_OUTPUT ?? '/private/tmp/mhoo-mho181-visual-output',
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
    'Private beta preview — production release remains gated by MHO-183.',
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
  if (
    !html.includes('Mhoo') ||
    !html.includes('Private beta preview') ||
    !html.includes('production release remains gated by MHO-183') ||
    !html.includes('https://beta.mhoo.app/legal/terms') ||
    !html.includes('https://beta.mhoo.app/legal/privacy') ||
    html.includes('>DPA</a>') ||
    !html.includes('/images/mhoo/mhoo-email-600x436.png')
  ) {
    throw new Error(`Mhoo preview markers are missing from ${name}`);
  }

  writeFileSync(resolve(outputDirectory, `${name}.html`), html);
}

writeFileSync(
  resolve(outputDirectory, 'manifest.json'),
  JSON.stringify(
    {
      kind: 'mhoo-closed-beta-public-page-preview',
      status: 'PRIVATE LOCAL PREVIEW — MHO-183 RELEASE GATED',
      production: false,
      previewMutation: false,
      receipts: ['unsubscribe-preferences.html', 'unsubscribe-result.html'],
    },
    null,
    2,
  ),
);
