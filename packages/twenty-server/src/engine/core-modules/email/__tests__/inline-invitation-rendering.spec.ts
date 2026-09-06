import { SendInviteLinkEmail, renderEmail } from 'twenty-emails';
import { MHO_BRAND, type ResolvedBrand } from 'twenty-shared/branding';

const brand = {
  ...MHO_BRAND,
  urls: {
    websiteUrl: 'https://mhoo.example/',
    supportUrl: 'https://mhoo.example/support',
    documentationUrl: 'https://mhoo.example/docs',
    contactUrl: 'https://mhoo.example/contact',
    statusUrl: 'https://mhoo.example/status',
  },
} as ResolvedBrand;

describe('invitation inline logo rendering', () => {
  beforeEach(() => jest.useRealTimers());

  it.each([
    ['cid:fixture@email-logo', 'cid:fixture@email-logo'],
    ['https://public.example/logo.png', 'https://public.example/logo.png'],
    [undefined, undefined],
  ])(
    'renders supported logo source %s without changing the acceptance link',
    async (logo, expected) => {
      const template = SendInviteLinkEmail({
        link: 'https://mhoo.example/invite/fixture',
        workspace: { name: 'Fixture workspace', logo },
        sender: {
          email: 'qa@example.invalid',
          firstName: 'QA',
          lastName: 'Fixture',
        },
        serverUrl: 'https://mhoo.example',
        locale: 'en',
        brand,
      });
      const html = await renderEmail(template);
      const text = await renderEmail(template, { plainText: true });

      expect(html).toContain('https://mhoo.example/invite/fixture');
      expect(text).toContain('https://mhoo.example/invite/fixture');
      expect(html).not.toContain('/files/cid:');
      if (expected) {
        expect(html).toContain(`src="${expected}"`);
        expect(html).toContain('alt="Workspace logo"');
      } else {
        expect(html).not.toContain('alt="Workspace logo"');
      }
    },
  );

  it('renders an invitation without an optional workspace name or logo', async () => {
    const html = await renderEmail(
      SendInviteLinkEmail({
        link: 'https://mhoo.example/invite/fixture',
        workspace: { name: undefined, logo: undefined },
        sender: {
          email: 'qa@example.invalid',
          firstName: 'QA',
          lastName: 'Fixture',
        },
        serverUrl: 'https://mhoo.example',
        locale: 'en',
        brand,
      }),
    );

    expect(html).toContain('Accept invite');
    expect(html).not.toContain('alt="Workspace logo"');
  });
});
