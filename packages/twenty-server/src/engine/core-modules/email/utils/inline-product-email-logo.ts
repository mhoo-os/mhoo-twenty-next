import { Logger } from '@nestjs/common';

import { createReadStream } from 'fs';
import { join } from 'path';

import { type SendMailOptions } from 'nodemailer';
import { BRAND_PRESETS, type ResolvedBrand } from 'twenty-shared/branding';

import {
  type InlineEmailImage,
  readInlineEmailImage,
} from 'src/engine/core-modules/email/utils/inline-email-image';

const logger = new Logger('InlineProductEmailLogo');

export const inlineProductEmailLogo = async (
  mail: SendMailOptions,
  brand: ResolvedBrand,
): Promise<SendMailOptions> => {
  if (typeof mail.html !== 'string') {
    return mail;
  }

  // Only immutable bundled preset assets are read. Never fetch URLs from HTML.
  const asset = BRAND_PRESETS[brand.preset].assets.emailMark;
  const url = new URL(asset.path, brand.urls.websiteUrl).toString();
  const source = ` src="${url}"`;
  const tags = mail.html.match(/<img\b[^>]*>/g) ?? [];

  if (!tags.some((tag) => tag.includes(source))) {
    return mail;
  }

  let attachment: InlineEmailImage | undefined;

  try {
    // Matches AppModule's dist/front root in both server and worker images.
    attachment = await readInlineEmailImage(
      createReadStream(join(__dirname, '../../../../front', asset.path)),
    );
  } catch {
    logger.warn(
      'Optional product email logo could not be read; omitting image',
    );
  }

  const html = mail.html
    .replace(/<img\b[^>]*>/g, (tag) =>
      tag.includes(source)
        ? attachment
          ? tag.replace(source, ` src="cid:${attachment.cid}"`)
          : ''
        : tag,
    )
    // React's server renderer also emits a preload for the original URL.
    .replace(/<link\b[^>]*>/g, (tag) =>
      tag.includes(' rel="preload"') &&
      tag.includes(' as="image"') &&
      tag.includes(` href="${url}"`)
        ? ''
        : tag,
    );

  return {
    ...mail,
    html,
    attachments: [
      ...(mail.attachments ?? []),
      ...(attachment ? [attachment] : []),
    ],
  };
};
