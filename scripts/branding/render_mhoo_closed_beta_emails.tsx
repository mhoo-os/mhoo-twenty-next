import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as React from 'react';
import { renderEmail } from '../../packages/twenty-emails/src/utils/render-email';
import { PasswordResetLinkEmail } from '../../packages/twenty-emails/src/emails/password-reset-link.email';
import { SendEmailVerificationLinkEmail } from '../../packages/twenty-emails/src/emails/send-email-verification-link.email';
import { SendInviteLinkEmail } from '../../packages/twenty-emails/src/emails/send-invite-link.email';
import { assertMhooClosedBetaPreview } from './mhoo_closed_beta_preview_validation';

const outputDirectory = resolve(
  process.env.MHOO_PREVIEW_OUTPUT ?? '/private/tmp/mhoo-mho233-preview-output',
  'emails',
);

mkdirSync(outputDirectory, { recursive: true });

const previews = [
  {
    name: 'invite',
    component: SendInviteLinkEmail,
    props: SendInviteLinkEmail.PreviewProps,
  },
  {
    name: 'email-verification',
    component: SendEmailVerificationLinkEmail,
    props: SendEmailVerificationLinkEmail.PreviewProps,
  },
  {
    name: 'password-reset',
    component: PasswordResetLinkEmail,
    props: PasswordResetLinkEmail.PreviewProps,
  },
] as const;

const renderPreview = async (preview: (typeof previews)[number]) => {
  const Component = preview.component;
  const html = await renderEmail(<Component {...preview.props} />);

  assertMhooClosedBetaPreview({
    name: preview.name,
    html,
    requiredMarkers: [
      'Mhoo',
      'Private beta preview',
      'DRAFT / UNAPPROVED',
      '/images/mhoo/mhoo-email-600x436.png',
    ],
  });

  writeFileSync(resolve(outputDirectory, `${preview.name}.html`), html);
  return {
    name: preview.name,
    file: `${preview.name}.html`,
    markers: ['Mhoo', 'DRAFT / UNAPPROVED', 'mhoo-email-600x436.png'],
  };
};

const main = async () => {
  const receipts = [];
  for (const preview of previews) {
    receipts.push(await renderPreview(preview));
  }

  writeFileSync(
    resolve(outputDirectory, 'manifest.json'),
    JSON.stringify(
      {
        issue: 'MHO-233',
        kind: 'mhoo-closed-beta-email-preview',
        status: 'DRAFT / UNAPPROVED — PRIVATE LOCAL PREVIEW',
        production: false,
        receipts,
      },
      null,
      2,
    ),
  );
};

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
