import { MockedProvider } from '@apollo/client/testing/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { MemoryRouter } from 'react-router-dom';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { ThemeProvider } from 'twenty-ui/theme-constants';

import { SignInUpGlobalScopeForm } from '@/auth/sign-in-up/components/SignInUpGlobalScopeForm';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import { authProvidersState } from '@/client-config/states/authProvidersState';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

const buildWorkspaceUrlMock = jest.fn();
const signOutMock = jest.fn();
const signInWithGoogleMock = jest.fn();
const signInWithMicrosoftMock = jest.fn();
const createWorkspaceMock = jest.fn();
const handleResetPasswordMock = jest.fn();
const resetPasswordClickMock = jest.fn();

jest.mock('@/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    signOut: signOutMock,
    signInWithGoogle: signInWithGoogleMock,
    signInWithMicrosoft: signInWithMicrosoftMock,
  }),
}));

jest.mock('@/domain-manager/hooks/useBuildWorkspaceUrl', () => ({
  useBuildWorkspaceUrl: () => ({
    buildWorkspaceUrl: buildWorkspaceUrlMock,
  }),
}));

jest.mock('@/auth/sign-in-up/hooks/useSignUpInNewWorkspace', () => ({
  useSignUpInNewWorkspace: () => ({
    createWorkspace: createWorkspaceMock,
  }),
}));

jest.mock('@/auth/sign-in-up/hooks/useSignInUpForm', () => ({
  useSignInUpForm: () => ({
    form: {
      getValues: () => 'person@example.com',
    },
  }),
}));

jest.mock('@/auth/sign-in-up/hooks/useHandleResetPassword', () => ({
  useHandleResetPassword: () => ({
    handleResetPassword: handleResetPasswordMock,
  }),
}));

jest.mock(
  '@/auth/sign-in-up/components/internal/SignInUpWithCredentials',
  () => ({
    SignInUpWithCredentials: () => <div>credentials-form</div>,
  }),
);

dynamicActivate(SOURCE_LOCALE);

const renderForm = (url = '/welcome') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <MockedProvider mocks={[]}>
        <JotaiProvider store={jotaiStore}>
          <ThemeProvider colorScheme="light">
            <I18nProvider i18n={i18n}>
              <SignInUpGlobalScopeForm />
            </I18nProvider>
          </ThemeProvider>
        </JotaiProvider>
      </MockedProvider>
    </MemoryRouter>,
  );

describe('SignInUpGlobalScopeForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetJotaiStore();
    handleResetPasswordMock.mockReturnValue(resetPasswordClickMock);
  });

  it('renders forgot-password link on password step and triggers reset callback', () => {
    jotaiStore.set(signInUpStepState.atom, SignInUpStep.Password);
    jotaiStore.set(authProvidersState.atom, {
      google: false,
      magicLink: false,
      microsoft: false,
      password: true,
      sso: [],
    });

    renderForm();

    const forgotPasswordLink = screen.getByText('Forgot your password?');

    expect(forgotPasswordLink).toBeInTheDocument();
    expect(handleResetPasswordMock).toHaveBeenCalledWith('person@example.com');

    fireEvent.click(forgotPasswordLink);

    expect(resetPasswordClickMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['/welcome?action=create-new-workspace', 'create-new-workspace'],
    ['/welcome', 'list-available-workspaces'],
    ['/welcome?action=list-available-workspaces', 'list-available-workspaces'],
    ['/welcome?action=join-workspace', 'list-available-workspaces'],
    ['/welcome?action=unexpected', 'list-available-workspaces'],
  ])('passes the intended social SSO action from %s', (url, action) => {
    jotaiStore.set(signInUpStepState.atom, SignInUpStep.Init);
    jotaiStore.set(authProvidersState.atom, {
      google: true,
      magicLink: false,
      microsoft: true,
      password: true,
      sso: [],
    });

    renderForm(url);

    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Microsoft' }),
    );

    expect(signInWithGoogleMock).toHaveBeenCalledTimes(1);
    expect(signInWithGoogleMock).toHaveBeenCalledWith(
      expect.objectContaining({ action }),
    );
    expect(signInWithMicrosoftMock).toHaveBeenCalledTimes(1);
    expect(signInWithMicrosoftMock).toHaveBeenCalledWith(
      expect.objectContaining({ action }),
    );
  });
});
