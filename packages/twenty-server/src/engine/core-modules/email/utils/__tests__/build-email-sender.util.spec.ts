import { resolveProductBrand } from 'src/engine/core-modules/twenty-config/services/product-brand-resolver.service';

import { buildEmailSender } from '../build-email-sender';

describe('buildEmailSender', () => {
  const mhooBrand = resolveProductBrand({
    preset: 'mhoo',
    deploymentOrigin: 'https://mhoo.example.com',
  });

  it('uses the resolved product as the sender identity', () => {
    expect(
      buildEmailSender({
        brand: mhooBrand,
        address: 'no-reply@example.com',
      }),
    ).toBe('Mhoo <no-reply@example.com>');
  });

  it('scopes a human sender through the resolved product', () => {
    expect(
      buildEmailSender({
        brand: mhooBrand,
        address: 'no-reply@example.com',
        senderName: 'Jane Doe',
      }),
    ).toBe('Jane Doe (via Mhoo) <no-reply@example.com>');
  });

  it('removes header line breaks before formatting the envelope', () => {
    expect(
      buildEmailSender({
        brand: mhooBrand,
        address: 'no-reply@example.com\r\nBcc: attacker@example.com',
        senderName: 'Jane\nDoe',
      }),
    ).toBe(
      'Jane Doe (via Mhoo) <no-reply@example.com Bcc: attacker@example.com>',
    );
  });
});
