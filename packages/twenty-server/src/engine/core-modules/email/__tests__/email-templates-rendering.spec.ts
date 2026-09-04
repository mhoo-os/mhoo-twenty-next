import { createElement } from 'react';
import { msg } from '@lingui/core/macro';

import {
  BillingSubscriptionRenewingEmail,
  BillingTrialConvertingEmail,
  BillingTrialEndingEmail,
  CleanSuspendedWorkspaceEmail,
  PasswordResetLinkEmail,
  PasswordUpdateNotifyEmail,
  SendApprovedAccessDomainValidation,
  SendEmailVerificationLinkEmail,
  SendInviteLinkEmail,
  ServerAdminAccessChangedEmail,
  WarnSuspendedWorkspaceEmail,
  EmailRenderError,
  renderEmail,
} from 'twenty-emails';
import { I18nService } from 'src/engine/core-modules/i18n/i18n.service';
import { resolveProductBrand } from 'src/engine/core-modules/twenty-config/services/product-brand-resolver.service';

const WORKSPACE = { name: 'Acme Inc', logo: undefined };
const TWENTY_BRAND = resolveProductBrand({
  preset: 'twenty',
  deploymentOrigin: 'https://app.twenty.com',
});
const MHOO_BRAND = resolveProductBrand({
  preset: 'mhoo',
  deploymentOrigin: 'https://mhoo.example.com',
});

const buildTemplateSet = (brand: typeof TWENTY_BRAND, host: string) => {
  const sender = {
    email: 'tim@example.com',
    firstName: 'Tim',
    lastName: 'Apple',
  };
  const billingLink = `${host}/settings/billing`;

  return [
    {
      name: `${brand.productName} BillingSubscriptionRenewingEmail`,
      element: BillingSubscriptionRenewingEmail({
        userName: 'Tim',
        workspaceDisplayName: 'Acme Inc',
        renewsAt: new Date('2026-01-01'),
        link: billingLink,
        locale: 'en',
        brand,
      }),
      expectedContent: billingLink,
    },
    {
      name: `${brand.productName} BillingTrialConvertingEmail`,
      element: BillingTrialConvertingEmail({
        userName: 'Tim',
        workspaceDisplayName: 'Acme Inc',
        trialEndsAt: new Date('2026-01-01'),
        interval: 'month',
        link: billingLink,
        locale: 'en',
        brand,
      }),
      expectedContent: billingLink,
    },
    {
      name: `${brand.productName} BillingTrialEndingEmail`,
      element: BillingTrialEndingEmail({
        userName: 'Tim',
        workspaceDisplayName: 'Acme Inc',
        trialEndsAt: new Date('2026-01-01'),
        dataRetentionDays: 30,
        link: billingLink,
        locale: 'en',
        brand,
      }),
      expectedContent: billingLink,
    },
    {
      name: `${brand.productName} CleanSuspendedWorkspaceEmail`,
      element: CleanSuspendedWorkspaceEmail({
        daysSinceInactive: 30,
        userName: 'Tim',
        workspaceDisplayName: 'Acme Inc',
        locale: 'en',
        brand,
      }),
      expectedContent: 'Acme Inc',
    },
    {
      name: `${brand.productName} PasswordResetLinkEmail`,
      element: PasswordResetLinkEmail({
        duration: '5 minutes',
        hasPassword: true,
        link: `${host}/reset-password`,
        locale: 'en',
        brand,
      }),
      expectedContent: `${host}/reset-password`,
    },
    {
      name: `${brand.productName} PasswordUpdateNotifyEmail`,
      element: PasswordUpdateNotifyEmail({
        userName: 'Tim',
        email: sender.email,
        link: host,
        locale: 'en',
        brand,
      }),
      expectedContent: sender.email,
    },
    {
      name: `${brand.productName} SendApprovedAccessDomainValidation`,
      element: SendApprovedAccessDomainValidation({
        link: `${host}/validate-approved-access-domain`,
        domain: 'acme.com',
        workspace: WORKSPACE,
        sender,
        serverUrl: host,
        locale: 'en',
        brand,
      }),
      expectedContent: `${host}/validate-approved-access-domain`,
    },
    {
      name: `${brand.productName} SendEmailVerificationLinkEmail`,
      element: SendEmailVerificationLinkEmail({
        link: `${host}/verify-email`,
        locale: 'en',
        brand,
      }),
      expectedContent: `${host}/verify-email`,
    },
    {
      name: `${brand.productName} SendInviteLinkEmail`,
      element: SendInviteLinkEmail({
        link: `${host}/invite/token`,
        workspace: WORKSPACE,
        sender,
        serverUrl: host,
        locale: 'en',
        brand,
      }),
      expectedContent: `${host}/invite/token`,
    },
    {
      name: `${brand.productName} ServerAdminAccessChangedEmail`,
      element: ServerAdminAccessChangedEmail({
        actorName: 'Tim',
        targetName: 'Jony',
        targetEmail: 'jony@example.com',
        canAccessFullAdminPanel: true,
        canImpersonate: false,
        locale: 'en',
        brand,
      }),
      expectedContent: 'jony@example.com',
    },
    {
      name: `${brand.productName} WarnSuspendedWorkspaceEmail`,
      element: WarnSuspendedWorkspaceEmail({
        daysSinceInactive: 30,
        inactiveDaysBeforeDelete: 60,
        userName: 'Tim',
        workspaceDisplayName: 'Acme Inc',
        link: billingLink,
        locale: 'en',
        brand,
      }),
      expectedContent: billingLink,
    },
  ];
};

const TEMPLATES = [
  ...buildTemplateSet(TWENTY_BRAND, 'https://app.twenty.com'),
  ...buildTemplateSet(MHOO_BRAND, 'https://mhoo.example.com'),
];

const MHOO_TEMPLATES = TEMPLATES.filter(({ name }) => name.startsWith('Mhoo'));

const buildLocalizedSubjectCases = (productName: string) => [
  {
    name: 'invitation',
    message: msg`Join your team on ${productName}`,
  },
  {
    name: 'verification',
    message: msg`Welcome to ${productName}: Please Confirm Your Email`,
  },
  {
    name: 'trial ending',
    message: msg`Your ${productName} trial is ending soon`,
  },
  {
    name: 'trial converting',
    message: msg`A heads up before your ${productName} trial ends`,
  },
  {
    name: 'subscription renewing',
    message: msg`Your ${productName} plan renews soon`,
  },
];

// Transactional emails went out with an empty body for a month without a single
// test noticing, because every email spec mocks the renderer (#23307). These
// specs run the real render path instead.
describe('email templates rendering', () => {
  // render() resolves through a streaming scheduler that never advances under
  // the globally enabled fake timers.
  beforeAll(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    jest.useFakeTimers();
  });

  it.each(TEMPLATES)(
    'should render $name to a complete HTML body',
    async ({ element, expectedContent }) => {
      const html = await renderEmail(element);

      expect(html).not.toContain('<!--$!-->');
      expect(html).not.toContain('<template></template>');
      expect(html).toContain('</html>');
      expect(html).toContain(expectedContent);
    },
  );

  it.each(TEMPLATES)(
    'should render $name to a non-empty plain text body',
    async ({ element }) => {
      const text = await renderEmail(element, { plainText: true });

      expect(text.trim().length).toBeGreaterThan(0);
      expect(text).not.toContain('<');
    },
  );

  it('should render translated content for a non-english locale', async () => {
    const html = await renderEmail(
      PasswordResetLinkEmail({
        duration: '5 minutes',
        hasPassword: true,
        link: 'https://app.twenty.com/reset-password',
        locale: 'fr-FR',
        brand: TWENTY_BRAND,
      }),
    );

    expect(html).toContain('mot de passe');
  });

  it.each([
    {
      name: 'invitation',
      expectedJapaneseContent: 'CRMソフトウェア',
      element: SendInviteLinkEmail({
        link: 'https://mhoo.example.com/invite/token',
        workspace: WORKSPACE,
        sender: {
          email: 'tim@example.com',
          firstName: 'Tim',
          lastName: 'Apple',
        },
        serverUrl: 'https://mhoo.example.com',
        locale: 'ja-JP',
        brand: MHOO_BRAND,
      }),
    },
    {
      name: 'verification',
      expectedJapaneseContent: 'ご登録いただきありがとうございます',
      element: SendEmailVerificationLinkEmail({
        link: 'https://mhoo.example.com/verify-email',
        locale: 'ja-JP',
        brand: MHOO_BRAND,
      }),
    },
    {
      name: 'billing',
      expectedJapaneseContent: '特に操作は不要です',
      element: BillingTrialConvertingEmail({
        userName: 'Tim',
        workspaceDisplayName: 'Acme Inc',
        trialEndsAt: new Date('2026-01-01'),
        interval: 'month',
        link: 'https://mhoo.example.com/settings/billing',
        locale: 'ja-JP',
        brand: MHOO_BRAND,
      }),
    },
  ])(
    'should render a translated Japanese Mhoo $name body without upstream branding',
    async ({ element, expectedJapaneseContent }) => {
      const html = await renderEmail(element);
      const text = await renderEmail(element, { plainText: true });
      const output = `${html}\n${text}`;

      expect(output).toContain('Mhoo');
      expect(output).toContain(expectedJapaneseContent);
      expect(output).not.toContain('Twenty');
    },
  );

  it.each(MHOO_TEMPLATES)(
    'should keep $name free of upstream customer-facing residue in HTML and plain text',
    async ({ element }) => {
      const html = await renderEmail(element);
      const text = await renderEmail(element, { plainText: true });

      expect(`${html}\n${text}`).not.toContain('Twenty');
      expect(`${html}\n${text}`).not.toContain('twenty.com');
      expect(`${html}\n${text}`).not.toContain('San Francisco');
      expect(`${html}\n${text}`).not.toContain('Powered by');
      expect(`${html}\n${text}`).not.toContain('MHOO Co., Ltd.');
    },
  );
});

describe('localized transactional email subjects', () => {
  const i18nService = new I18nService();

  beforeAll(async () => {
    await i18nService.loadTranslations();
  });

  it.each(buildLocalizedSubjectCases('Mhoo'))(
    'should interpolate Mhoo into the Japanese $name subject',
    ({ message }) => {
      const subject = i18nService.getI18nInstance('ja-JP')._(message);

      expect(subject).toContain('Mhoo');
      expect(subject).not.toContain('Twenty');
    },
  );

  it.each(buildLocalizedSubjectCases('Twenty'))(
    'should preserve the upstream product in the default $name subject',
    ({ message }) => {
      const subject = i18nService.getI18nInstance('en')._(message);

      expect(subject).toContain('Twenty');
      expect(subject).not.toContain('Mhoo');
    },
  );
});

describe('renderEmail guard', () => {
  beforeAll(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    jest.useFakeTimers();
  });

  // @react-email/render 1.x turned a throw into `<!--$!--><template></template>`
  // and resolved, so the send went out blank. Whatever the renderer does, a
  // failed render must never reach the recipient as an empty email.
  it('should reject rather than resolve a blank body when a component throws', async () => {
    const ThrowingComponent = () => {
      throw new Error('boom');
    };

    await expect(renderEmail(createElement(ThrowingComponent))).rejects.toThrow(
      /boom|Email template/,
    );
  });

  it('should throw EmailRenderError when a template produces no text body', async () => {
    const EmptyComponent = () => null;

    await expect(
      renderEmail(createElement(EmptyComponent), { plainText: true }),
    ).rejects.toThrow(EmailRenderError);
  });
});
