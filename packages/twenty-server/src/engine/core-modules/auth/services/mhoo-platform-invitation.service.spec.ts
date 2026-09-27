import crypto from 'crypto';

import { AppTokenType } from 'src/engine/core-modules/app-token/app-token.entity';
import { AuthException } from 'src/engine/core-modules/auth/auth.exception';
import { MhooPlatformInvitationService } from 'src/engine/core-modules/auth/services/mhoo-platform-invitation.service';

jest.mock('twenty-emails', () => ({
  MhooPlatformInvitationEmail: jest.fn((props) => props),
  renderEmail: jest.fn(async (template) => JSON.stringify(template)),
}));

describe('MhooPlatformInvitationService', () => {
  const appTokenRepository = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };
  const domainServerConfigService = {
    getFrontUrl: jest.fn(() => new URL('https://app.mhoo.app')),
  };
  const emailService = { send: jest.fn() };
  const i18nService = {
    getI18nInstance: jest.fn(() => ({ _: jest.fn((value) => value) })),
  };
  const productBrandResolverService = {
    resolve: jest.fn(() => ({
      legal: { senderDisplayName: 'Mhoo' },
      productName: 'Mhoo',
    })),
  };
  const throttlerService = {
    tokenBucketThrottleOrThrow: jest.fn(),
  };
  const twentyConfigService = {
    get: jest.fn(() => 'noreply@mhoo.app'),
  };

  const inviter = {
    id: 'inviter-id',
    email: 'founder@mhoo.app',
    firstName: 'Founder',
    lastName: 'Mhoo',
    locale: 'en',
    canAccessFullAdminPanel: true,
  } as any;

  let service: MhooPlatformInvitationService;

  beforeEach(() => {
    jest.clearAllMocks();
    appTokenRepository.find.mockResolvedValue([]);
    appTokenRepository.save.mockImplementation(async (token) => token);
    appTokenRepository.create.mockImplementation((token) => token);
    emailService.send.mockResolvedValue(undefined);
    service = new MhooPlatformInvitationService(
      appTokenRepository as any,
      domainServerConfigService as any,
      emailService as any,
      i18nService as any,
      productBrandResolverService as any,
      throttlerService as any,
      twentyConfigService as any,
    );
  });

  it('rejects senders without the authorized platform role', async () => {
    await expect(
      service.sendInvitation({
        email: 'friend@example.com',
        inviter: { ...inviter, canAccessFullAdminPanel: false },
      }),
    ).rejects.toBeInstanceOf(AuthException);

    expect(emailService.send).not.toHaveBeenCalled();
  });

  it('creates a hashed, email-bound invitation and sends a global signup link', async () => {
    const result = await service.sendInvitation({
      email: ' Friend@Example.com ',
      inviter,
    });

    const createdToken = appTokenRepository.create.mock.calls[0][0];

    expect(result.email).toBe('friend@example.com');
    expect(createdToken.type).toBe(AppTokenType.MhooPlatformInvitationToken);
    expect(createdToken.context).toEqual({ email: 'friend@example.com' });
    expect(createdToken.userId).toBe(inviter.id);
    expect(createdToken.workspaceId).toBeNull();
    expect(createdToken.value).not.toBe('friend@example.com');
    expect(createdToken.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'friend@example.com' }),
    );
  });

  it('invalidates an earlier active invitation for the same email', async () => {
    const existingInvitation = {
      context: { email: 'friend@example.com' },
      deletedAt: null,
    };
    appTokenRepository.find.mockResolvedValue([existingInvitation]);

    await service.sendInvitation({
      email: 'friend@example.com',
      inviter,
    });

    expect(existingInvitation.deletedAt).toBeInstanceOf(Date);
    expect(appTokenRepository.save).toHaveBeenCalledWith(existingInvitation);
  });

  it('consumes a valid invitation only for the invited email', async () => {
    const plainToken = 'plain-token';
    const invitation = {
      id: 'token-id',
      value: crypto.createHash('sha256').update(plainToken).digest('hex'),
      type: AppTokenType.MhooPlatformInvitationToken,
      context: { email: 'friend@example.com' },
      deletedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    };
    appTokenRepository.findOne.mockResolvedValue(invitation);
    appTokenRepository.update.mockResolvedValue({ affected: 1 });

    await expect(
      service.consumeInvitationForEmail({
        token: plainToken,
        email: 'FRIEND@example.com',
      }),
    ).resolves.toBeUndefined();

    expect(appTokenRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'token-id' }),
      expect.objectContaining({ deletedAt: expect.any(Date) }),
    );

    await expect(
      service.validateInvitationForEmail({
        token: plainToken,
        email: 'other@example.com',
      }),
    ).rejects.toBeInstanceOf(AuthException);
  });
});
