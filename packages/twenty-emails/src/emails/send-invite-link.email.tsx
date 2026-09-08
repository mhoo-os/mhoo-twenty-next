import { Trans } from '@lingui/react';
import { canvasTheme } from 'src/common-style';

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

type SendInviteLinkEmailProps = {
  link: string;
  workspace: { name: string | undefined; logo: string | undefined };
  sender: {
    email: string;
    firstName: string;
    lastName: string;
  };
  serverUrl: string;
  locale: keyof typeof APP_LOCALES;
  brand: ResolvedBrand;
};

export const SendInviteLinkEmail = ({
  link,
  workspace,
  sender,
  locale,
  brand,
}: SendInviteLinkEmailProps) => {
  const i18n = createI18nInstance(locale);
  const senderName = capitalize(sender.firstName);
  const senderEmail = sender.email;
  const workspaceName = workspace.name;

  return (
    <BaseEmail width={400} locale={locale} brand={brand} compactFooter>
      <Title
        value={
          <Trans
            id="Join your team on {productName}"
            values={{ productName: brand.productName }}
          />
        }
      />
      <MainText>
        <Trans
          id="{senderName} (<0>{senderEmail}</0>) has invited you to join a workspace called <1>{workspaceName}</1>."
          values={{ senderName, senderEmail, workspaceName }}
          components={{
            0: (
              <Link
                href={`mailto:${senderEmail}`}
                value={senderEmail}
                color={canvasTheme.font.colors.blue}
              />
            ),
            1: <b />,
          }}
        />
      </MainText>
      <CallToAction href={link} value={i18n._('Accept invite')} />
    </BaseEmail>
  );
};

SendInviteLinkEmail.PreviewProps = {
  link: 'https://beta.mhoo.app/invite/123',
  workspace: {
    name: 'Acme Inc.',
    logo: 'https://fakeimg.pl/200x200/?text=ACME&font=lobster',
  },
  sender: { email: 'john.doe@example.com', firstName: 'John', lastName: 'Doe' },
  serverUrl: 'https://beta.mhoo.app',
  locale: 'en',
  brand: MHO_PREVIEW_BRAND,
} as SendInviteLinkEmailProps;

export default SendInviteLinkEmail;
