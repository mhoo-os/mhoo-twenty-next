import { Trans } from '@lingui/react';

import { BaseEmail } from 'src/components/BaseEmail';
import { CallToAction } from 'src/components/CallToAction';
import { Link } from 'src/components/Link';
import { MainText } from 'src/components/MainText';
import { Title } from 'src/components/Title';
import { capitalize } from 'src/utils/capitalize';
import { createI18nInstance } from 'src/utils/i18n.utils';
import { MHO_PREVIEW_BRAND } from 'src/utils/preview-brand';
import { type ResolvedBrand } from 'twenty-shared/branding';
import { type APP_LOCALES } from 'twenty-shared/translations';

type MhooPlatformInvitationEmailProps = {
  brand: ResolvedBrand;
  inviter: {
    email: string;
    firstName: string;
    lastName: string;
  };
  link: string;
  locale: keyof typeof APP_LOCALES;
};

export const MhooPlatformInvitationEmail = ({
  brand,
  inviter,
  link,
  locale,
}: MhooPlatformInvitationEmailProps) => {
  const i18n = createI18nInstance(locale);
  const inviterName = capitalize(inviter.firstName) || inviter.email;

  return (
    <BaseEmail width={400} locale={locale} brand={brand} compactFooter>
      <Title
        value={
          <Trans
            id="You're invited to {productName}"
            values={{ productName: brand.productName }}
          />
        }
      />
      <MainText>
        <Trans
          id="{inviterName} (<0>{inviterEmail}</0>) invited you to create your own workspace on {productName}."
          values={{
            inviterEmail: inviter.email,
            inviterName,
            productName: brand.productName,
          }}
          components={{
            0: <Link href={`mailto:${inviter.email}`} value={inviter.email} />,
          }}
        />
      </MainText>
      <CallToAction href={link} value={i18n._('Create your workspace')} />
    </BaseEmail>
  );
};

MhooPlatformInvitationEmail.PreviewProps = {
  brand: MHO_PREVIEW_BRAND,
  inviter: {
    email: 'founder@example.com',
    firstName: 'Founder',
    lastName: 'Mhoo',
  },
  link: 'https://app.mhoo.app/welcome?mhooInvitationToken=123',
  locale: 'en',
} as MhooPlatformInvitationEmailProps;

export default MhooPlatformInvitationEmail;
