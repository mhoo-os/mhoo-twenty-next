import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';

import { CloverSetupPrompt } from '@/settings/accounts/components/CloverSetupPrompt';
import { cloverRequest } from '@/settings/accounts/components/SettingsCloverConnection';

const mockOpenModal = jest.fn();
const mockNavigateSettings = jest.fn();
const workspace = { id: 'hass-workspace', displayName: 'Hass Kitchen' };
const user = { id: 'authorized-owner' };

jest.mock('@/auth/states/currentWorkspaceState', () => ({
  currentWorkspaceState: 'workspace-state',
}));
jest.mock('@/auth/states/currentUserState', () => ({
  currentUserState: 'user-state',
}));
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue', () => ({
  useAtomStateValue: (state: string) =>
    state === 'workspace-state' ? workspace : user,
}));
jest.mock('@/settings/accounts/components/SettingsCloverConnection', () => ({
  cloverRequest: jest.fn(),
}));
jest.mock('@/ui/layout/modal/hooks/useModal', () => ({
  useModal: () => ({ openModal: mockOpenModal }),
}));
jest.mock('~/hooks/useNavigateSettings', () => ({
  useNavigateSettings: () => mockNavigateSettings,
}));
jest.mock('@/ui/layout/modal/components/ConfirmationModal', () => ({
  ConfirmationModal: ({
    title,
    subtitle,
    confirmButtonText,
    onConfirmClick,
    isClosable,
  }: {
    title: string;
    subtitle: ReactNode;
    confirmButtonText: string;
    onConfirmClick: () => void;
    isClosable?: boolean;
  }) => (
    <section data-closable={isClosable}>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <button onClick={onConfirmClick}>{confirmButtonText}</button>
    </section>
  ),
}));

const request = jest.mocked(cloverRequest);

describe('Hass Clover setup prompt', () => {
  beforeEach(() => {
    request.mockReset();
    mockOpenModal.mockReset();
    mockNavigateSettings.mockReset();
  });

  it('opens a mandatory prompt after authoritative needs-setup status', async () => {
    request.mockResolvedValue({
      enabled: true,
      connectionState: 'needsSetup',
      receipt: null,
      receipts: [],
    });
    render(<CloverSetupPrompt />);
    expect(
      await screen.findByText(
        'Connect Clover so Hass’s sales can appear in your workspace.',
      ),
    ).toBeInTheDocument();
    expect(mockOpenModal).toHaveBeenCalledWith('hass-clover-setup-modal');
    expect(screen.queryByRole('button', { name: 'Do this later' })).toBeNull();
    expect(
      screen.getByText('Finish setting up Hass').closest('section'),
    ).toHaveAttribute('data-closable', 'false');
  });

  it.each([
    [
      'connected',
      { enabled: true, connectionState: 'connected', receipts: [{}] },
    ],
    [
      'disabled',
      { enabled: false, connectionState: 'needsSetup', receipts: [] },
    ],
  ])('stays hidden when status is %s', async (_label, status) => {
    request.mockResolvedValue({ receipt: null, ...status } as never);
    render(<CloverSetupPrompt />);
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(mockOpenModal).not.toHaveBeenCalled();
    expect(
      screen.queryByText('Finish setting up Hass'),
    ).not.toBeInTheDocument();
  });

  it('keeps unauthorized and failed status reads silent', async () => {
    request.mockRejectedValue(new Error('forbidden'));
    render(<CloverSetupPrompt />);
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(mockOpenModal).not.toHaveBeenCalled();
  });

  it('routes an authorized reconnect to the existing secure Clover form', async () => {
    request.mockResolvedValue({
      enabled: true,
      connectionState: 'reconnectRequired',
      receipt: null,
      receipts: [],
    });
    render(<CloverSetupPrompt />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Reconnect Clover' }),
    );
    expect(mockNavigateSettings).toHaveBeenCalledWith(
      'accounts',
      undefined,
      undefined,
      undefined,
      'clover',
    );
  });
});
