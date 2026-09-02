import { Trans } from '@lingui/react';
import { BaseEmail } from 'src/components/BaseEmail';
import { CallToAction } from 'src/components/CallToAction';
import { MainText } from 'src/components/MainText';
import { Title } from 'src/components/Title';
import { createI18nInstance } from 'src/utils/i18n.utils';
import { MHO_PREVIEW_BRAND } from 'src/utils/preview-brand';
import { type ResolvedBrand } from 'twenty-shared/branding';
import { type APP_LOCALES } from 'twenty-shared/translations';

type CleanSuspendedWorkspaceEmailProps = {
  daysSinceInactive: number;
  userName: string;
  workspaceDisplayName: string | undefined;
  locale: keyof typeof APP_LOCALES;
  brand: ResolvedBrand;
};

export const CleanSuspendedWorkspaceEmail = ({
  daysSinceInactive,
  userName,
  workspaceDisplayName,
  locale,
  brand,
}: CleanSuspendedWorkspaceEmailProps) => {
  const i18n = createI18nInstance(locale);

  return (
    <BaseEmail width={333} locale={locale} brand={brand}>
      <Title value={i18n._('Your workspace has been deleted')} />
      <MainText>
        {userName?.length > 1 ? (
          <Trans id="Hi {userName}," values={{ userName }} />
        ) : (
          <Trans id="Hello," />
        )}
        <br />
        <br />
        <Trans
          id="Your workspace <0>{workspaceDisplayName}</0> has now been permanently deleted — it was paused {daysSinceInactive} days ago and wasn't reactivated in time."
          values={{ workspaceDisplayName, daysSinceInactive }}
          components={{ 0: <b /> }}
        />
        <br />
        <br />
        <Trans id="Its data has been removed and can no longer be recovered." />
        <br />
        <br />
        <Trans
          id="If you'd ever like to give {productName} another try, you can start a fresh workspace in minutes — we'd love to have you back."
          values={{ productName: brand.productName }}
        />
      </MainText>
      <br />
      <CallToAction
        href={brand.urls.websiteUrl}
        value={i18n._('Start a new workspace')}
      />
      <br />
      <br />
    </BaseEmail>
  );
};

CleanSuspendedWorkspaceEmail.PreviewProps = {
  daysSinceInactive: 1,
  userName: 'John Doe',
  workspaceDisplayName: 'My Workspace',
  locale: 'en',
  brand: MHO_PREVIEW_BRAND,
};

export default CleanSuspendedWorkspaceEmail;
