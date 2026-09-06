import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { type ReactNode, type ComponentProps } from 'react';

import { SettingsCloverConnection } from '@/settings/accounts/components/SettingsCloverConnection';

let mockWorkspace = { id: 'hass', displayName: 'Hass Kitchen' };
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue', () => ({
  useAtomStateValue: () => mockWorkspace,
}));
jest.mock('@/apollo/utils/getTokenPair', () => ({
  getTokenPair: () => ({
    accessOrWorkspaceAgnosticToken: { token: 'synthetic-native-session' },
  }),
}));
jest.mock('@linaria/react', () => ({ styled: { div: () => 'div' } }));
jest.mock('twenty-ui/layout', () => ({
  Section: ({ children }: { children: ReactNode }) => (
    <section>{children}</section>
  ),
}));
jest.mock('twenty-ui/typography', () => ({
  H2Title: ({ title, description }: { title: string; description: string }) => (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  ),
}));
jest.mock('twenty-ui/input', () => ({
  Button: ({
    title,
    type,
    disabled,
    onClick,
  }: ComponentProps<'button'> & { title: string }) => (
    <button type={type} disabled={disabled} onClick={onClick}>
      {title}
    </button>
  ),
}));

const reply = (data: object) => ({ ok: true, json: async () => data });
const receipt = {
  connectedAccountId: 'connection',
  merchantId: 'TESTMERCHANT1',
  merchantName: 'Synthetic Hass',
  savedAt: new Date().toISOString(),
};
const mockFetch = jest.fn();

describe('Clover native form', () => {
  beforeEach(() => {
    mockWorkspace = { id: 'hass', displayName: 'Hass Kitchen' };
    mockFetch.mockReset().mockImplementation(async (url: string) =>
      reply(
        url.endsWith('/begin')
          ? {
              requestId: 'one-time-request',
              merchantId: 'TESTMERCHANT1',
              expiresAt: new Date(Date.now() + 600_000).toISOString(),
            }
          : { enabled: true, receipt: null },
      ),
    );
    global.fetch = mockFetch;
  });

  const openTokenStep = async () => {
    const merchant = await screen.findByLabelText('Clover merchant ID', {
      exact: false,
    });
    fireEvent.change(merchant, { target: { value: 'TESTMERCHANT1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    return screen.findByLabelText('Paste your Clover API token');
  };

  it('keeps intake hidden when the native Workspace is not enabled', async () => {
    mockFetch.mockResolvedValue(reply({ enabled: false, receipt: null }));
    render(<SettingsCloverConnection />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(screen.queryByText('Connect Clover')).not.toBeInTheDocument();
  });

  it('clears the password field before the request finishes and only then shows a receipt', async () => {
    let complete!: (value: object) => void;
    render(<SettingsCloverConnection />);
    const token = await openTokenStep();
    expect(token).toHaveAttribute('type', 'password');
    expect(token.closest('.sentry-block')).not.toBeNull();
    fireEvent.change(token, {
      target: { value: 'synthetic-merchant-token-for-test' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Save encrypted token' }),
    );
    expect(token).toHaveValue('');
    expect(
      screen.queryByText('Clover token saved securely.'),
    ).not.toBeInTheDocument();
    const [, request] = mockFetch.mock.calls.at(-1)!;
    expect(request.cache).toBe('no-store');
    expect(request.credentials).toBe('same-origin');
    expect(request.headers.Authorization).toBe(
      'Bearer synthetic-native-session',
    );
    expect(request.redirect).toBe('error');
    await act(async () => complete(reply(receipt)));
    expect(
      await screen.findByText('Clover token saved securely.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Paste your Clover API token'),
    ).not.toBeInTheDocument();
  });

  it('recovers a committed receipt after losing the submission response without resending the token', async () => {
    render(<SettingsCloverConnection />);
    const token = await openTokenStep();
    fireEvent.change(token, {
      target: { value: 'synthetic-merchant-token-for-test' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    mockFetch
      .mockRejectedValueOnce(new TypeError('Network error'))
      .mockResolvedValueOnce(reply({ enabled: true, receipt }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Save encrypted token' }),
    );
    expect(
      await screen.findByText('Clover token saved securely.'),
    ).toBeInTheDocument();
    expect(
      mockFetch.mock.calls.filter(([url]) => url.endsWith('/submit')),
    ).toHaveLength(1);
    expect(mockFetch.mock.calls.at(-1)![1].body).toBeUndefined();
  });

  it('requires a fresh form when the user switches Workspaces', async () => {
    const view = render(<SettingsCloverConnection />);
    const token = await openTokenStep();
    fireEvent.change(token, {
      target: { value: 'synthetic-merchant-token-for-test' },
    });
    mockWorkspace = { id: 'other', displayName: 'Other business' };
    mockFetch.mockResolvedValueOnce(reply({ enabled: false, receipt: null }));
    view.rerender(<SettingsCloverConnection />);
    await waitFor(() =>
      expect(
        screen.queryByLabelText('Paste your Clover API token'),
      ).not.toBeInTheDocument(),
    );
    expect(
      mockFetch.mock.calls.filter(([url]) => url.endsWith('/submit')),
    ).toHaveLength(0);
  });
});
