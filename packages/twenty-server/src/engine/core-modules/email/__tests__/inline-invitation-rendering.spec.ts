import {
  SendInviteLinkEmail,
  PasswordResetLinkEmail,
  renderEmail,
} from 'twenty-emails';
import {
  MHO_BRAND,
  TWENTY_BRAND,
  type ResolvedBrand,
} from 'twenty-shared/branding';

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
const props = {
  link: 'https://mhoo.example/invite/fixture?token=unchanged',
  workspace: {
    name: 'Fixture workspace',
    logo: undefined as string | undefined,
  },
  sender: { email: 'qa@example.invalid', firstName: 'QA', lastName: 'Fixture' },
  serverUrl: 'https://mhoo.example',
  locale: 'en' as const,
  brand,
};

describe('minimal invitation rendering', () => {
  beforeEach(() => jest.useRealTimers());

  it.each([
    undefined,
    'cid:private@email-logo',
    'https://private.example/logo.png',
  ])(
    'uses only the product logo even when a workspace logo is provided: %s',
    async (logo) => {
      const template = SendInviteLinkEmail({
        ...props,
        workspace: { ...props.workspace, logo },
      });
      const html = await renderEmail(template);
      const text = await renderEmail(template, { plainText: true });

      expect(html.match(/<img\b/g)).toHaveLength(1);
      expect(html).not.toContain('Workspace logo');
      expect(html).not.toContain('private@email-logo');
      expect(html).not.toContain('private.example');
      for (const output of [html, text]) {
        expect(output).toContain(props.link);
        expect(output).toContain('Fixture workspace');
        expect(output).toContain('qa@example.invalid');
        expect(output).toContain('Accept invite');
        expect(output).not.toContain('What is');
        expect(output).not.toContain('CRM');
        expect(output).not.toContain('User guide');
        expect(output).not.toContain('DPA Status');
        expect(output).toContain('Terms');
        expect(output).toContain('Privacy');
        expect(output).toContain('Support');
        expect(output).toContain('Mhoo LLC');
        expect(output).toContain('Powered by Twenty');
      }
    },
  );

  it('keeps the invitation action available without optional workspace details', async () => {
    const html = await renderEmail(
      SendInviteLinkEmail({
        ...props,
        workspace: { name: undefined, logo: undefined },
      }),
    );
    expect(html).toContain(props.link);
    expect(html).not.toContain('Workspace logo');
  });

  it('retains translated invitation identity without the removed promotional paragraph', async () => {
    const html = await renderEmail(
      SendInviteLinkEmail({ ...props, locale: 'ja-JP' }),
    );
    expect(html).toContain('Mhooでチームに参加');
    expect(html).not.toContain('CRM');
  });

  it('does not invent a legal entity, publish unapproved documents or expose an unavailable DPA', async () => {
    const unavailable = { status: 'unavailable' as const, url: null };
    const restrictedBrand = {
      ...brand,
      legal: {
        ...brand.legal,
        legalEntity: '',
        legalEntityStatus: 'unavailable' as const,
        terms: unavailable,
        privacy: unavailable,
      },
      attribution: {
        ...brand.attribution,
        status: 'unavailable' as const,
        url: null,
      },
    } as ResolvedBrand;
    const html = await renderEmail(
      SendInviteLinkEmail({ ...props, brand: restrictedBrand }),
    );
    expect(html).not.toContain('Mhoo LLC');
    expect(html).not.toContain('Powered by Twenty');
    expect(html).not.toContain('href="/legal/');
    expect(html).toContain('Support');
  });
  it.each([brand, { ...TWENTY_BRAND, urls: brand.urls } as ResolvedBrand])(
    'keeps the full footer on other transactional templates for $preset',
    async (templateBrand) => {
      const html = await renderEmail(
        PasswordResetLinkEmail({
          link: props.link,
          duration: '5 minutes',
          hasPassword: true,
          locale: 'en',
          brand: templateBrand,
        }),
      );
      expect(html).toContain('User guide');
      expect(html).toContain('Website');
      expect(html).toContain('Powered by Twenty');
      if (templateBrand.preset === 'mhoo') {
        expect(html).toContain('/legal/acceptable-use');
        expect(html).toContain('/legal/dpa');
      } else {
        expect(html).toContain('Github');
      }
    },
  );
});
