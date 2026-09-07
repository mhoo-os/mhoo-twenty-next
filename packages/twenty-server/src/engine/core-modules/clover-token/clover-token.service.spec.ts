import { ApplicationEntity } from 'src/engine/core-modules/application/application.entity';
import { ConnectionProviderEntity } from 'src/engine/core-modules/application/connection-provider/connection-provider.entity';
import { randomUUID } from 'crypto';

import { WorkspaceActivationStatus } from 'twenty-shared/workspace';
import { type DataSource } from 'typeorm';

import {
  AppTokenEntity,
  AppTokenType,
} from 'src/engine/core-modules/app-token/app-token.entity';
import {
  CloverTokenService,
  type CloverActor,
} from 'src/engine/core-modules/clover-token/clover-token.service';
import { SecretEncryptionService } from 'src/engine/core-modules/secret-encryption/secret-encryption.service';
import { type SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { type EnvironmentConfigDriver } from 'src/engine/core-modules/twenty-config/drivers/environment-config.driver';
import { type TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { ConnectedAccountTokenEncryptionService } from 'src/engine/metadata-modules/connected-account/services/connected-account-token-encryption.service';
import { type PermissionsService } from 'src/engine/metadata-modules/permissions/permissions.service';

const merchantId = 'TESTMERCHANT1';
const syntheticToken = 'synthetic-clover-token-for-tests-only';
const actor: CloverActor = {
  userId: randomUUID(),
  workspaceId: randomUUID(),
  userWorkspaceId: randomUUID(),
};

describe('native Clover token handoff', () => {
  let service: CloverTokenService;
  let encryption: ConnectedAccountTokenEncryptionService;
  let handoff: AppTokenEntity;
  let account: ConnectedAccountEntity | null;
  let permission: jest.Mock;
  let config: jest.Mock;
  let fetchMerchant: jest.Mock;
  let accountSave: jest.Mock;
  let requestSave: jest.Mock;
  let membership: jest.Mock;
  let workspace: jest.Mock;
  let requestCount: jest.Mock;
  let requests: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    countBy: jest.Mock;
  };

  beforeEach(() => {
    account = null;
    handoff = {
      id: randomUUID(),
      type: AppTokenType.CloverTokenHandoff,
      userId: actor.userId,
      workspaceId: actor.workspaceId,
      expiresAt: new Date(Date.now() + 600_000),
      revokedAt: null,
      deletedAt: null,
      context: {
        cloverHandoff: { merchantId, userWorkspaceId: actor.userWorkspaceId },
      },
    } as AppTokenEntity;
    permission = jest.fn().mockResolvedValue(true);
    config = jest.fn().mockReturnValue(actor.workspaceId);
    fetchMerchant = jest
      .fn()
      .mockResolvedValue({ data: { id: merchantId, name: 'Synthetic Hass' } });
    accountSave = jest.fn(async (row) => {
      account = { ...row, id: randomUUID(), updatedAt: new Date() };
      return account;
    });
    requestSave = jest.fn(async (row) => row);
    membership = jest.fn().mockResolvedValue({ id: actor.userWorkspaceId });
    workspace = jest.fn().mockResolvedValue({
      activationStatus: WorkspaceActivationStatus.ACTIVE,
    });
    requestCount = jest.fn().mockResolvedValue(0);
    requests = {
      findOne: jest.fn(async ({ where }) =>
        where.userId === handoff.userId &&
        where.workspaceId === handoff.workspaceId &&
        where.id === handoff.id
          ? structuredClone(handoff)
          : null,
      ),
      save: requestSave,
      create: jest.fn((row) => ({ ...row, id: randomUUID() })),
      update: jest.fn(),
      countBy: requestCount,
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === ApplicationEntity)
          return {
            findOne: async () => ({
              id: 'synthetic-app',
              defaultRoleId: 'synthetic-app-role',
            }),
          };
        if (entity === ConnectionProviderEntity)
          return {
            findOne: async () => ({
              id: 'synthetic-provider',
              applicationId: 'synthetic-app',
              oauthConfig: null,
            }),
          };
        if (entity === WorkspaceEntity) return { findOne: workspace };
        if (entity === UserWorkspaceEntity) return { findOne: membership };
        if (entity === AppTokenEntity) return requests;
        if (entity === ConnectedAccountEntity)
          return {
            findOne: jest.fn(async ({ where }) =>
              account &&
              where.some(
                (condition: { handle?: string }) =>
                  !condition.handle || condition.handle === account?.handle,
              )
                ? account
                : null,
            ),
            find: jest.fn(async () => (account ? [account] : [])),
            create: (row: object) => row,
            save: accountSave,
          };
        throw new Error('Unexpected repository');
      }),
    };
    encryption = new ConnectedAccountTokenEncryptionService(
      new SecretEncryptionService({
        get: (key: string) =>
          key === 'APP_SECRET'
            ? 'synthetic-encryption-key-not-for-deployment'
            : undefined,
      } as EnvironmentConfigDriver),
    );
    service = new CloverTokenService(
      {
        manager,
        transaction: async (work: (value: unknown) => unknown) => work(manager),
      } as unknown as DataSource,
      { get: config } as unknown as TwentyConfigService,
      {
        userHasWorkspaceSettingPermission: permission,
      } as unknown as PermissionsService,
      encryption,
      {
        getHttpClient: () => ({ get: fetchMerchant }),
      } as unknown as SecureHttpClientService,
    );
  });

  const input = () => ({
    requestId: handoff.id,
    accessToken: syntheticToken,
    readOnlyConfirmed: true,
  });

  it('allows another merchant and rejects only duplicate merchant custody', async () => {
    account = {
      id: randomUUID(),
      handle: 'OTHER12345678',
      name: 'Other',
      updatedAt: new Date(),
    } as ConnectedAccountEntity;
    await expect(service.begin(actor, merchantId)).resolves.toMatchObject({
      merchantId,
    });
    await expect(service.begin(actor, 'OTHER12345678')).rejects.toThrow(
      'already has',
    );
  });

  it('encrypts with native workspace-bound encryption and returns only a receipt', async () => {
    const result = await service.submit(actor, input());
    const saved = accountSave.mock.calls[0][0];
    expect(saved.accessToken).toMatch(/^enc:v2:/);
    expect(saved.accessToken).not.toContain(syntheticToken);
    expect(
      encryption.decrypt({
        ciphertext: saved.accessToken,
        workspaceId: actor.workspaceId,
      }),
    ).toBe(syntheticToken);
    expect(() =>
      encryption.decrypt({
        ciphertext: saved.accessToken,
        workspaceId: randomUUID(),
      }),
    ).toThrow();
    expect(saved.scopes).toBeNull();
    expect(JSON.stringify(result)).not.toContain(syntheticToken);
    expect(Object.keys(result).sort()).toEqual([
      'connectedAccountId',
      'merchantId',
      'merchantName',
      'savedAt',
    ]);
    expect(requestSave.mock.calls[0][0].revokedAt).toBeInstanceOf(Date);
    expect(JSON.stringify(requestSave.mock.calls)).not.toContain(
      syntheticToken,
    );
  });

  it('returns an existing receipt on retry without verifying or replacing the token', async () => {
    const first = await service.submit(actor, input());
    handoff = requestSave.mock.calls[0][0];
    expect(await service.submit(actor, input())).toEqual(first);
    expect(fetchMerchant).toHaveBeenCalledTimes(1);
    expect(accountSave).toHaveBeenCalledTimes(1);
  });

  it.each([
    'disabled',
    'wrong-workspace',
    'wrong-user',
    'deleted-member',
    'no-permission',
    'inactive',
    'expired',
    'revoked',
    'wrong-membership',
  ])('rejects %s before contacting Clover', async (reason) => {
    let caller = actor;
    if (reason === 'disabled') config.mockReturnValue('');
    if (reason === 'wrong-workspace')
      caller = { ...actor, workspaceId: randomUUID() };
    if (reason === 'wrong-user') caller = { ...actor, userId: randomUUID() };
    if (reason === 'deleted-member') membership.mockResolvedValue(null);
    if (reason === 'no-permission') permission.mockResolvedValue(false);
    if (reason === 'inactive')
      workspace.mockResolvedValue({
        activationStatus: WorkspaceActivationStatus.SUSPENDED,
      });
    if (reason === 'expired') handoff.expiresAt = new Date(Date.now() - 1);
    if (reason === 'revoked') handoff.revokedAt = new Date();
    if (reason === 'wrong-membership')
      handoff.context!.cloverHandoff!.userWorkspaceId = randomUUID();
    await expect(service.submit(caller, input())).rejects.toThrow();
    expect(fetchMerchant).not.toHaveBeenCalled();
    expect(accountSave).not.toHaveBeenCalled();
  });

  it('rejects an unchecked permission confirmation and malformed tokens', async () => {
    await expect(
      service.submit(actor, { ...input(), readOnlyConfirmed: false }),
    ).rejects.toThrow();
    await expect(
      service.submit(actor, {
        ...input(),
        accessToken: 'bad\r\nAuthorization: another-header',
      }),
    ).rejects.toThrow();
    expect(fetchMerchant).not.toHaveBeenCalled();
  });

  it('does not store a token for a mismatched merchant', async () => {
    fetchMerchant.mockResolvedValue({
      data: { id: 'OTHER', name: 'Other merchant' },
    });
    await expect(service.submit(actor, input())).rejects.toThrow(
      'Clover could not verify',
    );
    expect(accountSave).not.toHaveBeenCalled();
    expect(requestSave).not.toHaveBeenCalled();
  });

  it('discards provider exceptions containing secret request headers', async () => {
    fetchMerchant.mockRejectedValue(
      new Error(`Authorization: Bearer ${syntheticToken}`),
    );
    await expect(service.submit(actor, input())).rejects.toThrow(
      'Clover could not verify',
    );
    expect(requestSave).not.toHaveBeenCalled();
  });

  it('does not consume the request or acknowledge success if persistence fails', async () => {
    accountSave.mockRejectedValue(new Error('database unavailable'));
    await expect(service.submit(actor, input())).rejects.toThrow(
      'database unavailable',
    );
    expect(requestSave).not.toHaveBeenCalled();
  });

  it('issues a short-lived request with server-side actor and merchant binding', async () => {
    const result = await service.begin(actor, merchantId);
    expect(new Date(result.expiresAt).getTime() - Date.now()).toBe(600_000);
    const saved = requestSave.mock.calls[0][0];
    expect(saved.context.cloverHandoff).toEqual({
      merchantId,
      userWorkspaceId: actor.userWorkspaceId,
    });
    expect(saved.workspaceId).toBe(actor.workspaceId);
    expect(saved.userId).toBe(actor.userId);
    expect(requests.update).toHaveBeenCalled();
  });

  it('limits repeated handoff creation', async () => {
    requestCount.mockResolvedValue(5);
    await expect(service.begin(actor, merchantId)).rejects.toThrow(
      'wait ten minutes',
    );
    expect(requestSave).not.toHaveBeenCalled();
  });
});
