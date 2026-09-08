import { type ArgumentsHost, ValidationPipe } from '@nestjs/common';
import { type Request } from 'express';
import { PermissionFlagType } from 'twenty-shared/constants';

import {
  CloverTokenController,
  CloverTokenExceptionFilter,
  SubmitCloverTokenInput,
} from 'src/engine/core-modules/clover-token/clover-token.controller';
import { type CloverTokenService } from 'src/engine/core-modules/clover-token/clover-token.service';
import { type TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { type WorkspaceInvitationService } from 'src/engine/core-modules/workspace-invitation/services/workspace-invitation.service';
import { type PermissionsService } from 'src/engine/metadata-modules/permissions/permissions.service';

describe('Clover controller boundary', () => {
  const nativeStatus = jest.fn();
  const permission = jest.fn();
  const existingInvitation = jest.fn();
  const createInvitation = jest.fn();
  const controller = new CloverTokenController(
    { status: nativeStatus } as unknown as CloverTokenService,
    { get: () => 'invitee@example.test' } as unknown as TwentyConfigService,
    {
      getOneWorkspaceInvitation: existingInvitation,
      createWorkspaceInvitation: createInvitation,
    } as unknown as WorkspaceInvitationService,
    {
      userHasWorkspaceSettingPermission: permission,
    } as unknown as PermissionsService,
  );
  const request = () =>
    ({
      user: { id: 'native-user' },
      userWorkspaceId: 'native-member',
      workspace: { id: 'native-workspace' },
      headers: { authorization: 'Bearer synthetic-native-session' },
    }) as unknown as Request;

  beforeEach(() => {
    jest.clearAllMocks();
    nativeStatus.mockResolvedValue({ enabled: true, receipt: null });
    permission.mockResolvedValue(true);
    existingInvitation.mockResolvedValue(null);
    createInvitation.mockResolvedValue({
      value: 'synthetic-native-invitation-secret',
      expiresAt: new Date(),
    });
  });

  it.each([
    'user',
    'workspace',
    'userWorkspaceId',
    'bearer',
    'apiKey',
    'application',
  ])('rejects invalid interactive auth: %s', async (field) => {
    const req = request();
    if (field === 'bearer') req.headers = {};
    else if (field === 'apiKey') Object.assign(req, { apiKey: { id: 'key' } });
    else if (field === 'application')
      Object.assign(req, { application: { id: 'app' } });
    else Object.assign(req, { [field]: undefined });
    await expect(controller.status(req)).rejects.toThrow('Sign in');
    expect(nativeStatus).not.toHaveBeenCalled();
  });

  it('does not create an invitation in another Workspace', async () => {
    nativeStatus.mockResolvedValue({ enabled: false, receipt: null });
    await expect(controller.prepareInvitation(request())).rejects.toThrow();
    expect(createInvitation).not.toHaveBeenCalled();
  });

  it('requires native membership-management permission to prepare invitations', async () => {
    permission.mockResolvedValue(false);
    await expect(controller.prepareInvitation(request())).rejects.toThrow();
    expect(permission).toHaveBeenCalledWith(
      expect.objectContaining({
        setting: PermissionFlagType.WORKSPACE_MEMBERS,
      }),
    );
    expect(createInvitation).not.toHaveBeenCalled();
  });

  it('prepares an email-bound native invitation without returning its secret or sending mail', async () => {
    const req = request();
    const result = await controller.prepareInvitation(req);
    expect(createInvitation).toHaveBeenCalledWith(
      'invitee@example.test',
      req.workspace,
    );
    expect(Object.keys(result).sort()).toEqual(['email', 'expiresAt']);
    expect(JSON.stringify(result)).not.toContain(
      'synthetic-native-invitation-secret',
    );
  });

  it('reuses an existing invitation', async () => {
    existingInvitation.mockResolvedValue({ expiresAt: new Date() });
    await controller.prepareInvitation(request());
    expect(createInvitation).not.toHaveBeenCalled();
  });

  it('never exposes unexpected credential-bearing errors', () => {
    const response = {
      setHeader: jest.fn(),
      status: jest.fn(),
      json: jest.fn(),
    };
    response.status.mockReturnValue(response);
    const host = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as unknown as ArgumentsHost;
    new CloverTokenExceptionFilter().catch(
      new Error('Authorization: synthetic-merchant-token'),
      host,
    );
    expect(response.status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(response.json.mock.calls)).not.toContain(
      'synthetic-merchant-token',
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'no-store',
    );
  });

  it('rejects client-supplied Workspace selectors and oversized tokens', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      validationError: { target: false, value: false },
    });
    const metadata = {
      type: 'body' as const,
      metatype: SubmitCloverTokenInput,
    };
    const input = {
      requestId: 'ba055f96-8547-4ce7-b188-fc812080fcbc',
      accessToken: 'synthetic-token-for-tests',
      readOnlyConfirmed: true,
    };
    await expect(
      pipe.transform({ ...input, workspaceId: 'other' }, metadata),
    ).rejects.toThrow();
    await expect(
      pipe.transform({ ...input, accessToken: 'x'.repeat(2049) }, metadata),
    ).rejects.toThrow();
  });
});
