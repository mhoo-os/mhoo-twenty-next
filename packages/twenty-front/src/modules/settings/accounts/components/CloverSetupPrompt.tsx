import { currentUserState } from '@/auth/states/currentUserState';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { cloverRequest } from '@/settings/accounts/components/SettingsCloverConnection';
import { ConfirmationModal } from '@/ui/layout/modal/components/ConfirmationModal';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useEffect, useState } from 'react';
import { SettingsPath } from 'twenty-shared/types';
import { useNavigateSettings } from '~/hooks/useNavigateSettings';

export const CLOVER_SETUP_MODAL_ID = 'hass-clover-setup-modal';

type CloverConnectionState = 'connected' | 'needsSetup' | 'reconnectRequired';

type CloverStatus = {
  enabled: boolean;
  connectionState?: CloverConnectionState;
  receipt: unknown | null;
  receipts?: unknown[];
};

const getConnectionState = (status: CloverStatus): CloverConnectionState =>
  status.connectionState ??
  ((status.receipts ?? (status.receipt ? [status.receipt] : [])).length > 0
    ? 'connected'
    : 'needsSetup');

export const CloverSetupPromptModal = ({
  connectionState,
  onConnect,
}: {
  connectionState: Exclude<CloverConnectionState, 'connected'>;
  onConnect: () => void;
}) => (
  <ConfirmationModal
    modalInstanceId={CLOVER_SETUP_MODAL_ID}
    title="Finish setting up Hass"
    subtitle={
      connectionState === 'reconnectRequired'
        ? 'Reconnect Clover so Hass’s sales can appear in your workspace.'
        : 'Connect Clover so Hass’s sales can appear in your workspace.'
    }
    confirmButtonText={
      connectionState === 'reconnectRequired'
        ? 'Reconnect Clover'
        : 'Connect Clover'
    }
    confirmButtonAccent="green"
    hideCancelButton
    isClosable={false}
    onConfirmClick={onConnect}
  />
);

export const CloverSetupPrompt = () => {
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const currentUser = useAtomStateValue(currentUserState);
  const navigateSettings = useNavigateSettings();
  const { openModal } = useModal();
  const [connectionState, setConnectionState] =
    useState<CloverConnectionState | null>(null);

  useEffect(() => {
    if (!currentWorkspace || !currentUser) return;
    const controller = new AbortController();
    setConnectionState(null);
    void cloverRequest<CloverStatus>('status', undefined, controller.signal)
      .then((status) => {
        if (!controller.signal.aborted)
          setConnectionState(
            status.enabled ? getConnectionState(status) : null,
          );
      })
      .catch(() => {
        // Unauthorized and unknown states stay silent. A failed read must never
        // be treated as proof that Clover is disconnected.
        if (!controller.signal.aborted) setConnectionState(null);
      });
    return () => controller.abort();
  }, [currentUser, currentWorkspace]);

  useEffect(() => {
    if (
      connectionState === 'needsSetup' ||
      connectionState === 'reconnectRequired'
    )
      openModal(CLOVER_SETUP_MODAL_ID);
  }, [connectionState, openModal]);

  if (
    connectionState !== 'needsSetup' &&
    connectionState !== 'reconnectRequired'
  )
    return null;

  return (
    <CloverSetupPromptModal
      connectionState={connectionState}
      onConnect={() =>
        navigateSettings(
          SettingsPath.Accounts,
          undefined,
          undefined,
          undefined,
          'clover',
        )
      }
    />
  );
};
