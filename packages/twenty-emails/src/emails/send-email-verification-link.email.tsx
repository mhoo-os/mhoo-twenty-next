import { Trans } from '@lingui/react';
import { BaseEmail } from 'src/components/BaseEmail';
import { CallToAction } from 'src/components/CallToAction';
import { MainText } from 'src/components/MainText';
import { Title } from 'src/components/Title';
import { createI18nInstance } from 'src/utils/i18n.utils';
import { MHO_PREVIEW_BRAND } from 'src/utils/preview-brand';
import { type ResolvedBrand } from 'twenty-shared/branding';
import { type APP_LOCALES } from 'twenty-shared/translations';

type SendEmailVerificationLinkEmailProps = {
  link: string;
  locale: keyof typeof APP_LOCALES;
  isEmailUpdate?: boolean;
  brand: ResolvedBrand;
};

export const SendEmailVerificationLinkEmail = ({
  link,
  locale,
  isEmailUpdate = false,
  brand,
}: SendEmailVerificationLinkEmailProps) => {
  const i18n = createI18nInstance(locale);
  const title = isEmailUpdate
    ? i18n._('Confirm your new email address')
    : i18n._('Confirm your email address');
  const ctaLabel = isEmailUpdate
    ? i18n._('Confirm new email')
    : i18n._('Verify Email');

  return (
    <BaseEmail width={333} locale={locale} brand={brand}>
      <Title value={title} />
      <MainText>
        {isEmailUpdate ? (
          <Trans
            id="We received a request to change the email address associated with your {productName} account. Click below to confirm this change."
            values={{ productName: brand.productName }}
          />
        ) : (
          <Trans
            id="Thanks for registering for an account on {productName}! Before we get started, we just need to confirm that this is you. Click below to verify your email address."
            values={{ productName: brand.productName }}
          />
        )}
      </MainText>
      <br />
      <CallToAction href={link} value={ctaLabel} />
      <br />
      <br />
    </BaseEmail>
  );
};

SendEmailVerificationLinkEmail.PreviewProps = {
  link: 'https://beta.mhoo.app/verify-email/123',
  locale: 'en',
  isEmailUpdate: false,
  brand: MHO_PREVIEW_BRAND,
};

export default SendEmailVerificationLinkEmail;
