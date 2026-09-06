import { readFileSync } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';

import { createTransport } from 'nodemailer';
import {
  MHO_BRAND,
  TWENTY_BRAND,
  type ResolvedBrand,
} from 'twenty-shared/branding';
import { FileFolder } from 'twenty-shared/types';

import { EmailService } from 'src/engine/core-modules/email/email.service';

import {
  MAX_INLINE_EMAIL_IMAGE_BYTES,
  readInlineEmailImage,
} from 'src/engine/core-modules/email/utils/inline-email-image';
import { inlineProductEmailLogo } from 'src/engine/core-modules/email/utils/inline-product-email-logo';
import { prepareWorkspaceEmailLogo } from 'src/engine/core-modules/email/utils/prepare-workspace-email-logo';

jest.mock('src/engine/core-modules/email/email-sender.job', () => ({
  EmailSenderJob: class EmailSenderJob {},
}));
jest.mock(
  'src/engine/core-modules/message-queue/services/message-queue.service',
  () => ({ MessageQueueService: class MessageQueueService {} }),
);
jest.mock(
  'src/engine/core-modules/twenty-config/services/product-brand-resolver.service',
  () => ({ ProductBrandResolverService: class ProductBrandResolverService {} }),
);

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  createReadStream: jest.fn(),
}));

const png = readFileSync(
  join(
    __dirname,
    '../../../../../../twenty-front/public/images/mhoo/mhoo-workspace-96.png',
  ),
);
const brand = {
  ...MHO_BRAND,
  urls: { websiteUrl: 'https://mhoo.app/' },
} as ResolvedBrand;
const productUrl = 'https://mhoo.app/images/mhoo/mhoo-email-600x436.png';
const html = `<link rel="preload" as="image" href="${productUrl}"/><p>Reset password</p><img src="${productUrl}" width="40"/><a href="https://mhoo.app/reset?t=fixture">Continue</a>`;
const stream = () => Readable.from([png]);

const mockProductFile = () => {
  const { createReadStream } = jest.requireMock('fs');

  createReadStream.mockImplementation(stream);

  return createReadStream;
};

beforeEach(() => {
  jest.useRealTimers();
  mockProductFile();
});

describe('JSON-safe inline images', () => {
  it('preserves bytes, inline MIME and CID through the real SMTP composer after a queue roundtrip', async () => {
    const attachment = await readInlineEmailImage(stream());

    expect(attachment).toMatchObject({
      contentType: 'image/png',
      encoding: 'base64',
      contentDisposition: 'inline',
    });
    expect(Buffer.from(attachment!.content, 'base64')).toEqual(png);
    const mail = JSON.parse(
      JSON.stringify({
        from: 'qa@example.invalid',
        to: 'qa@example.invalid',
        subject: 'Fixture',
        html: `<img src="cid:${attachment!.cid}"/>`,
        attachments: [attachment],
      }),
    );
    const result = await createTransport({
      streamTransport: true,
      buffer: true,
    }).sendMail(mail);
    const mime = result.message.toString();

    expect(mime).toContain('multipart/related');
    expect(mime).toContain(`Content-ID: <${attachment!.cid}>`);
    expect(mime).toContain('Content-Type: image/png');
    expect(mime).toContain(`cid:${attachment!.cid}`);
  });

  it('destroys oversized streams before enqueueing bytes', async () => {
    const input = Readable.from([
      Buffer.alloc(MAX_INLINE_EMAIL_IMAGE_BYTES + 1),
    ]);

    expect(await readInlineEmailImage(input)).toBeUndefined();
    expect(input.destroyed).toBe(true);
  });

  it.each([
    '<svg><script>unsafe</script></svg>',
    '<html>not an image</html>',
    '',
  ])('omits non-raster content %s', async (text) => {
    expect(
      await readInlineEmailImage(Readable.from([Buffer.from(text)])),
    ).toBeUndefined();
  });

  it('closes an errored stream', async () => {
    const input = new Readable({
      read() {
        this.destroy(new Error('fixture read error'));
      },
    });

    await expect(readInlineEmailImage(input)).rejects.toThrow(
      'fixture read error',
    );
    expect(input.destroyed).toBe(true);
  });
});

describe('bundled product mark', () => {
  it('embeds only the exact preset image and preserves actions, text and existing attachments', async () => {
    const existing = { filename: 'receipt.txt', content: 'fixture' };
    const original = {
      html,
      text: 'Continue https://mhoo.app/reset?t=fixture',
      attachments: [existing],
    };
    const result = await inlineProductEmailLogo(original, brand);

    expect(result.html).toContain('src="cid:');
    expect(result.html).not.toContain(productUrl);
    expect(result.html).toContain('https://mhoo.app/reset?t=fixture');
    expect(result.text).toEqual(original.text);
    expect(result.attachments![0]).toBe(existing);
    expect(result.attachments).toHaveLength(2);
    expect(original.html).toEqual(html);
    expect(mockProductFile().mock.calls[0][0]).toMatch(
      /front\/images\/mhoo\/mhoo-email-600x436.png$/,
    );
  });

  it('preserves unrelated link elements and preloads', async () => {
    const links =
      '<link rel="stylesheet" href="style.css"/>' +
      '<link rel="preload" as="font" href="font.woff"/>' +
      '<link rel="preload" as="image" href="https://other.example/logo.png"/>';
    const result = await inlineProductEmailLogo({ html: html + links }, brand);

    expect(result.html).toContain(links);
    expect(result.html).not.toContain(productUrl);
  });

  it('handles absent attachments and multiple uses with one attachment', async () => {
    const result = await inlineProductEmailLogo({ html: html + html }, brand);

    expect(result.attachments).toHaveLength(1);
    expect((result.html as string).match(/src="cid:/g)).toHaveLength(2);
  });

  it.each([undefined, Buffer.from('body')])(
    'preserves non-string HTML',
    async (body) => {
      const mail = { html: body };

      expect(await inlineProductEmailLogo(mail, brand)).toBe(mail);
    },
  );

  it('does not treat data-src as the rendered image source', async () => {
    const mail = { html: `<img data-src="${productUrl}" src="cid:existing"/>` };

    expect(await inlineProductEmailLogo(mail, brand)).toBe(mail);
    expect(mockProductFile()).not.toHaveBeenCalled();
  });

  it('leaves text-only HTML unchanged without opening an asset', async () => {
    const mail = { html: '<p>Notification</p>' };

    expect(await inlineProductEmailLogo(mail, brand)).toBe(mail);
    expect(mockProductFile()).not.toHaveBeenCalled();
  });

  it('does not fetch external, signed upload or lookalike image sources', async () => {
    const mail = {
      html: '<img src="https://internal.invalid/secret"/><img src="https://mhoo.app/file/core-picture/private?token=fixture"/>',
    };

    expect(await inlineProductEmailLogo(mail, brand)).toBe(mail);
    expect(mockProductFile()).not.toHaveBeenCalled();
  });

  it('leaves unrelated images alone and omits a missing optional product mark', async () => {
    mockProductFile().mockImplementation(() => {
      throw new Error('missing');
    });
    const result = await inlineProductEmailLogo(
      { html: html + '<img src="cid:existing"/>' },
      brand,
    );

    expect(result.html).not.toContain(productUrl);
    expect(result.html).toContain('src="cid:existing"');
    expect(result.html).toContain('Continue');
    expect(result.attachments).toEqual([]);
  });

  it('omits invalid optional product bytes', async () => {
    mockProductFile().mockImplementation(() =>
      Readable.from([Buffer.from('<svg/>')]),
    );
    const result = await inlineProductEmailLogo({ html }, brand);

    expect(result.html).not.toContain('<img');
    expect(result.attachments).toEqual([]);
  });

  it('supports the explicit upstream preset without using its website as a network source', async () => {
    const upstream = {
      ...TWENTY_BRAND,
      urls: { websiteUrl: 'https://twenty.example/' },
    } as ResolvedBrand;
    const url = new URL(
      upstream.assets.emailMark.path,
      upstream.urls.websiteUrl,
    ).toString();
    const result = await inlineProductEmailLogo(
      { html: `<img src="${url}"/>` },
      upstream,
    );

    expect(result.html).toContain('src="cid:');
    expect(mockProductFile().mock.calls[0][0]).toContain(
      '/front/images/icons/',
    );
  });
});

describe('workspace logo custody', () => {
  it('loads only the invited workspace uploaded core picture through FileService', async () => {
    const getFileStreamById = jest
      .fn()
      .mockResolvedValue({ stream: stream(), mimeType: 'image/png' });
    const result = await prepareWorkspaceEmailLogo(
      { getFileStreamById },
      { id: 'invited-workspace', logoFileId: 'logo-id' },
    );

    expect(getFileStreamById).toHaveBeenCalledWith({
      workspaceId: 'invited-workspace',
      fileId: 'logo-id',
      allowedFileFolders: [FileFolder.CorePicture],
    });
    expect(result!.contentType).toBe('image/png');
    expect(JSON.stringify(result)).not.toContain('logo-id');
    expect(JSON.stringify(result)).not.toContain('token=');
  });

  it('does not read an absent logo', async () => {
    const getFileStreamById = jest.fn();

    expect(
      await prepareWorkspaceEmailLogo(
        { getFileStreamById },
        { id: 'workspace', logoFileId: null },
      ),
    ).toBeUndefined();
    expect(getFileStreamById).not.toHaveBeenCalled();
  });

  it('omits a missing or wrong-workspace file denied by the existing scoped service', async () => {
    const getFileStreamById = jest.fn().mockResolvedValue(null);

    expect(
      await prepareWorkspaceEmailLogo(
        { getFileStreamById },
        { id: 'workspace', logoFileId: 'other-file' },
      ),
    ).toBeUndefined();
  });

  it('does not trust the declared MIME of uploaded bytes', async () => {
    const getFileStreamById = jest.fn().mockResolvedValue({
      stream: Readable.from([Buffer.from('<svg/>')]),
      mimeType: 'image/png',
    });

    expect(
      await prepareWorkspaceEmailLogo(
        { getFileStreamById },
        { id: 'workspace', logoFileId: 'logo' },
      ),
    ).toBeUndefined();
  });

  it('allows invitation delivery to continue when storage is unavailable', async () => {
    const getFileStreamById = jest
      .fn()
      .mockRejectedValue(new Error('private storage detail'));

    expect(
      await prepareWorkspaceEmailLogo(
        { getFileStreamById },
        { id: 'workspace', logoFileId: 'logo' },
      ),
    ).toBeUndefined();
  });
});

describe('email queue integration', () => {
  it('enqueues inline bytes and preserves the original retry policy', async () => {
    const add = jest.fn().mockResolvedValue(undefined);
    const resolve = jest.fn().mockReturnValue(brand);
    const service = new EmailService({ add } as never, { resolve } as never);

    await service.send({
      html,
      text: 'Reset link',
      subject: 'Mhoo',
      to: 'qa@example.invalid',
    });

    expect(add).toHaveBeenCalledTimes(1);
    const [jobName, message, options] = add.mock.calls[0];

    expect(jobName).toBe('EmailSenderJob');
    expect(options).toEqual({ retryLimit: 3 });
    expect(message.html).toContain('src="cid:');
    expect(message.attachments[0].encoding).toBe('base64');
    expect(JSON.parse(JSON.stringify(message))).toEqual(message);
    expect(message.to).toBe('qa@example.invalid');
  });

  it('propagates a queue failure without attempting another send', async () => {
    const add = jest.fn().mockRejectedValue(new Error('queue unavailable'));
    const service = new EmailService(
      { add } as never,
      { resolve: () => brand } as never,
    );

    await expect(service.send({ text: 'Notification' })).rejects.toThrow(
      'queue unavailable',
    );
    expect(add).toHaveBeenCalledTimes(1);
  });
});
