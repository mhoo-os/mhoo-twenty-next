import { randomUUID } from 'crypto';
import { type Readable } from 'stream';

import { fileTypeFromBuffer } from 'file-type';

export const MAX_INLINE_EMAIL_IMAGE_BYTES = 1024 * 1024;

export type InlineEmailImage = {
  filename: string;
  cid: string;
  content: string;
  encoding: 'base64';
  contentType: string;
  contentDisposition: 'inline';
};

// Queue payloads are JSON. Do not enqueue a stream, Buffer or filesystem path.
export const readInlineEmailImage = async (
  stream: Readable,
): Promise<InlineEmailImage | undefined> => {
  try {
    const chunks: Buffer[] = [];
    let size = 0;

    for await (const chunk of stream) {
      const buffer = Buffer.from(chunk);

      size += buffer.length;
      if (size > MAX_INLINE_EMAIL_IMAGE_BYTES) {
        return undefined;
      }
      chunks.push(buffer);
    }

    const content = Buffer.concat(chunks);
    const type = await fileTypeFromBuffer(content);

    // SVG/HTML and arbitrary uploads must never become inline email content.
    if (
      !type ||
      !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(
        type.mime,
      )
    ) {
      return undefined;
    }

    return {
      filename: `logo.${type.ext}`,
      cid: `${randomUUID()}@email-logo`,
      content: content.toString('base64'),
      encoding: 'base64',
      contentType: type.mime,
      contentDisposition: 'inline',
    };
  } finally {
    stream.destroy();
  }
};
