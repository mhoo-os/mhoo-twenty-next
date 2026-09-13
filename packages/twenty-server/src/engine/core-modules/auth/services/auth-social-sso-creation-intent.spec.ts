import { AuthService } from 'src/engine/core-modules/auth/services/auth.service';
import { type GoogleRequest } from 'src/engine/core-modules/auth/strategies/google.auth.strategy';
import { DomainServerConfigService } from 'src/engine/core-modules/domain/domain-server-config/services/domain-server-config.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';

const config = {
  SERVER_URL: 'https://mhoo.example',
  FRONTEND_URL: undefined,
  IS_MULTIWORKSPACE_ENABLED: true,
  DEFAULT_SUBDOMAIN: 'app',
};

const profile: GoogleRequest['user'] = {
  email: 'owner@example.com',
  picture: null,
  action: 'create-new-workspace',
  returnToPath: '/settings/profile',
};

const setup = () => {
  const domainServerConfigService = new DomainServerConfigService({
    get: jest.fn((key: keyof typeof config) => config[key]),
  } as unknown as TwentyConfigService);
  const generateSSOExchangeToken = jest.fn().mockResolvedValue({
    token: 'synthetic-exchange-token',
  });
  const signUpWithoutWorkspace = jest.fn();
  const findWorkspaceForSignInUp = jest.fn();
  const service = Object.assign(Object.create(AuthService.prototype), {
    userService: {
      findUserByEmailWithWorkspaces: jest
        .fn()
        .mockResolvedValue({ id: 'existing-owner' }),
    },
    signInUpService: { signUpWithoutWorkspace },
    ssoExchangeTokenService: { generateSSOExchangeToken },
    domainServerConfigService,
    findWorkspaceForSignInUp,
  }) as AuthService;

  return {
    service,
    generateSSOExchangeToken,
    signUpWithoutWorkspace,
    findWorkspaceForSignInUp,
  };
};

describe('social SSO workspace creation intent', () => {
  it.each([AuthProviderEnum.Google, AuthProviderEnum.Microsoft] as const)(
    'preserves explicit creation intent in the native %s return URL',
    async (provider) => {
      const { service, generateSSOExchangeToken, signUpWithoutWorkspace } =
        setup();
      const url = new URL(
        await service.signInUpWithSocialSSO(profile, provider),
      );

      expect(url.origin).toBe('https://app.mhoo.example');
      expect(url.pathname).toBe('/welcome');
      expect(url.searchParams.get('action')).toBe('create-new-workspace');
      expect(url.searchParams.get('returnToPath')).toBe('/settings/profile');
      expect(url.searchParams.has('ssoExchangeToken')).toBe(false);
      expect(url.hash).toBe('#ssoExchangeToken=synthetic-exchange-token');
      expect(generateSSOExchangeToken).toHaveBeenCalledWith({
        userId: 'existing-owner',
        authProvider: provider,
      });
      expect(signUpWithoutWorkspace).not.toHaveBeenCalled();
    },
  );

  it.each(['list-available-workspaces', 'join-workspace'] as const)(
    'preserves the existing global return URL for %s',
    async (action) => {
      const { service } = setup();
      const url = new URL(
        await service.signInUpWithSocialSSO(
          { ...profile, action },
          AuthProviderEnum.Google,
        ),
      );

      expect(url.searchParams.has('action')).toBe(false);
      expect(url.searchParams.get('returnToPath')).toBe('/settings/profile');
      expect(url.hash).toBe('#ssoExchangeToken=synthetic-exchange-token');
    },
  );

  it('keeps workspace-scoped SSO on the existing authorization branch', async () => {
    const { service, findWorkspaceForSignInUp, generateSSOExchangeToken } =
      setup();
    const authorizationBoundary = new Error('workspace authorization boundary');

    findWorkspaceForSignInUp.mockRejectedValue(authorizationBoundary);

    await expect(
      service.signInUpWithSocialSSO(
        { ...profile, workspaceId: 'existing-workspace' },
        AuthProviderEnum.Google,
      ),
    ).rejects.toBe(authorizationBoundary);
    expect(findWorkspaceForSignInUp).toHaveBeenCalledWith({
      workspaceId: 'existing-workspace',
      workspaceInviteHash: undefined,
      email: profile.email,
      authProvider: AuthProviderEnum.Google,
    });
    expect(generateSSOExchangeToken).not.toHaveBeenCalled();
  });
});
