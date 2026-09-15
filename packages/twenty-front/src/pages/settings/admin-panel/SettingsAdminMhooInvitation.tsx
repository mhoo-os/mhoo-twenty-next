import { useState } from 'react';

import { useMutation } from '@apollo/client/react';
import { useLingui } from '@lingui/react/macro';
import { Button } from 'twenty-ui/input';
import { H2Title } from 'twenty-ui/typography';
import { Section } from 'twenty-ui/layout';

import { SEND_MHOO_PLATFORM_INVITATION } from '@/auth/graphql/mutations/sendMhooPlatformInvitation';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { TextInput } from '@/ui/input/components/TextInput';

export const SettingsAdminMhooInvitation = () => {
  const { t } = useLingui();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();
  const [email, setEmail] = useState('');
  const [sendInvitation, { loading }] = useMutation(
    SEND_MHOO_PLATFORM_INVITATION,
  );

  const handleSendInvitation = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      enqueueErrorSnackBar({ message: t`Email is required` });
      return;
    }

    try {
      const result = await sendInvitation({
        variables: { email: normalizedEmail },
      });

      if (result.error) {
        throw result.error;
      }

      setEmail('');
      enqueueSuccessSnackBar({ message: t`Mhoo invitation sent` });
    } catch (error) {
      enqueueErrorSnackBar({
        message:
          error instanceof Error ? error.message : t`Failed to send invitation`,
      });
    }
  };

  return (
    <Section>
      <H2Title
        title={t`Invite to Mhoo`}
        description={t`Send a platform invitation so someone can create their own workspace.`}
      />
      <TextInput
        value={email}
        onChange={setEmail}
        placeholder={t`friend@example.com`}
        type="email"
        fullWidth
      />
      <Button
        variant="primary"
        title={t`Send invitation`}
        onClick={handleSendInvitation}
        disabled={loading}
      />
    </Section>
  );
};
