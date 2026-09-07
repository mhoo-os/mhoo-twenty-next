import merchantFunction from '../../../../../twenty-apps/internal/mhoo-clover/src/logic-functions/clover-merchant-read.logic-function';
import { ConnectedAccountResolver } from 'src/engine/metadata-modules/connected-account/resolvers/connected-account.resolver';
import { randomUUID } from 'crypto';
import { ApplicationEntity } from 'src/engine/core-modules/application/application.entity';
import { ConnectionProviderEntity } from 'src/engine/core-modules/application/connection-provider/connection-provider.entity';
import { ApplicationConnectionsListService } from 'src/engine/core-modules/application/connection-provider/connections/services/application-connections-list.service';
import { AppOAuthRevokeService } from 'src/engine/core-modules/application/connection-provider/refresh/services/app-oauth-revoke.service';
import {
  AppTokenEntity,
  AppTokenType,
} from 'src/engine/core-modules/app-token/app-token.entity';
import { CloverTokenService } from 'src/engine/core-modules/clover-token/clover-token.service';
import {
  CLOVER_APPLICATION,
  CLOVER_MANUAL_PROVIDER,
} from 'src/engine/core-modules/clover-token/clover-connection.constants';
import { SecretEncryptionService } from 'src/engine/core-modules/secret-encryption/secret-encryption.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { ConnectedAccountTokenEncryptionService } from 'src/engine/metadata-modules/connected-account/services/connected-account-token-encryption.service';
import { ConnectedAccountMetadataService } from 'src/engine/metadata-modules/connected-account/connected-account-metadata.service';
import { PermissionsService } from 'src/engine/metadata-modules/permissions/permissions.service';
import { WorkspaceActivationStatus } from 'twenty-shared/workspace';
import { SystemPermissionFlag } from 'twenty-shared/constants';
import { readCloverMerchant } from '../../../../../twenty-apps/internal/mhoo-clover/src/logic-functions/clover-merchant-read';

// Composed native services + actual Clover read, with synthetic repositories,
// cached role metadata and provider transport. This is not a deployed JWT/E2E proof.
describe('manual intake to native Clover consumption', () => {
  const actor = {
    userId: randomUUID(),
    workspaceId: randomUUID(),
    userWorkspaceId: randomUUID(),
  };
  const token = 'synthetic-only-clover-secret-12345';
  const merchantId = 'TESTMERCHANT1';
  let rows: any[];
  let request: any;
  let application: any;
  let provider: any;
  let member: any;
  let userAllowed: boolean;
  let appAllowed: boolean;
  let reader: ApplicationConnectionsListService;
  let intake: CloverTokenService;
  let metadata: ConnectedAccountMetadataService;
  let disconnect: ConnectedAccountResolver;
  let encryption: ConnectedAccountTokenEncryptionService;
  let refresh: jest.Mock;
  let providerFetch: jest.Mock;
  let caller: any;
  let roleFlags: any;

  beforeEach(() => {
    rows = [];
    userAllowed = true;
    appAllowed = true;
    member = {
      id: actor.userWorkspaceId,
      userId: actor.userId,
      workspaceId: actor.workspaceId,
    };
    application = {
      id: randomUUID(),
      workspaceId: actor.workspaceId,
      universalIdentifier: CLOVER_APPLICATION,
      defaultRoleId: 'app-role',
    };
    provider = {
      id: randomUUID(),
      applicationId: application.id,
      workspaceId: actor.workspaceId,
      universalIdentifier: CLOVER_MANUAL_PROVIDER,
      type: 'manualToken',
      name: 'clover-manual',
      oauthConfig: null,
    };
    caller = {
      applicationId: application.id,
      workspaceId: actor.workspaceId,
      requestUserWorkspaceId: actor.userWorkspaceId,
    };
    request = {
      id: randomUUID(),
      type: AppTokenType.CloverTokenHandoff,
      ...actor,
      expiresAt: new Date(Date.now() + 600000),
      context: {
        cloverHandoff: { merchantId, userWorkspaceId: actor.userWorkspaceId },
      },
    };
    const matches = (row: any, where: any): boolean =>
      !!row &&
      (Array.isArray(where)
        ? where.some((w) => matches(row, w))
        : Object.entries(where).every(([k, v]) =>
            typeof v === 'object' ? true : row[k] === v,
          ));
    const accounts: any = {
      find: async ({ where }: any) => rows.filter((row) => matches(row, where)),
      findOne: async ({ where, relations }: any) => {
        const row = rows.find((row) => matches(row, where));
        return row
          ? relations
            ? { ...row, connectionProvider: provider }
            : row
          : null;
      },
      findOneOrFail: async ({ where }: any) => {
        const row = rows.find((row) => matches(row, where));
        if (!row) throw new Error('Missing account');
        return row;
      },
      create: (row: any) => row,
      save: async (row: any) => {
        const saved = { ...row, id: randomUUID(), updatedAt: new Date() };
        rows.push(saved);
        return saved;
      },
      delete: async (where: any) => {
        rows = rows.filter((row) => !matches(row, where));
      },
    };
    const applications: any = {
      findOne: async ({ where }: any) =>
        matches(application, where) ? application : null,
    };
    const providers: any = {
      findOne: async ({ where }: any) =>
        matches(provider, where) ? provider : null,
      find: async ({ where }: any) =>
        matches(provider, where) ? [provider] : [],
      findOneByOrFail: async (where: any) => {
        if (!matches(provider, where)) throw new Error('Missing provider');
        return provider;
      },
    };
    const members: any = {
      findOne: async ({ where }: any) =>
        matches(member, where) ? member : null,
    };
    const cache: any = {
      getOrRecompute: async () => ({
        flatWorkspaceMemberMaps: {
          idByUserId: { [actor.userId]: 'member-id' },
        },
        flatRoleMaps: {
          universalIdentifierById: {
            'user-role': 'user-role',
            'app-role': 'app-role',
          },
          byUniversalIdentifier: {
            'user-role': {
              canUpdateAllSettings: false,
              rolePermissionFlagIds: userAllowed ? ['connection-flag'] : [],
            },
            'app-role': {
              canUpdateAllSettings: false,
              rolePermissionFlagIds: appAllowed ? ['connection-flag'] : [],
            },
          },
        },
        flatRolePermissionFlagMaps: roleFlags,
      }),
    };
    roleFlags = {
      universalIdentifierById: { 'connection-flag': 'connection-flag' },
      byUniversalIdentifier: {
        'connection-flag': {
          permissionFlagUniversalIdentifier:
            SystemPermissionFlag.CONNECTED_ACCOUNTS,
        },
      },
    };
    // Keep native role intersection logic; only repositories/cache are synthetic.
    const permissions = Object.assign(
      Object.create(PermissionsService.prototype),
      {
        applicationRepository: applications,
        workspaceCacheService: cache,
        userRoleService: {
          getRolesByUserWorkspaces: async () =>
            new Map([
              [
                actor.userWorkspaceId,
                [
                  {
                    id: 'user-role',
                    rolePermissionFlags: userAllowed
                      ? [
                          {
                            permissionFlag: {
                              universalIdentifier:
                                SystemPermissionFlag.CONNECTED_ACCOUNTS,
                            },
                          },
                        ]
                      : [],
                  },
                ],
              ],
            ]),
        },
      },
    ) as PermissionsService;
    encryption = new ConnectedAccountTokenEncryptionService(
      new SecretEncryptionService({
        get: () => 'synthetic-encryption-key-only',
      } as any),
    );
    const manager: any = {
      getRepository: (entity: any) => {
        if (entity === ApplicationEntity) return applications;
        if (entity === ConnectionProviderEntity) return providers;
        if (entity === ConnectedAccountEntity) return accounts;
        if (entity === UserWorkspaceEntity) return members;
        if (entity === WorkspaceEntity)
          return {
            findOne: async () => ({
              activationStatus: WorkspaceActivationStatus.ACTIVE,
            }),
          };
        if (entity === AppTokenEntity)
          return {
            findOne: async () => request,
            save: async (row: any) => {
              request = row;
              return row;
            },
          };
        throw new Error('Unexpected repository');
      },
    };
    intake = new CloverTokenService(
      { manager, transaction: async (work: any) => work(manager) } as any,
      { get: () => actor.workspaceId } as any,
      permissions,
      encryption,
      {
        getHttpClient: () => ({
          get: async () => ({
            data: { id: merchantId, name: 'Synthetic merchant' },
          }),
        }),
      } as any,
    );
    refresh = jest.fn(() => {
      throw new Error('Manual tokens must never refresh');
    });
    reader = new ApplicationConnectionsListService(
      { resolveTokens: refresh } as any,
      encryption,
      cache,
      accounts,
      providers,
      members,
      permissions,
      applications,
    );
    const revoke = new AppOAuthRevokeService(
      { findOneByIdOrThrow: async () => provider } as any,
      {
        getHttpClient: () => {
          throw new Error('Manual token must not revoke through OAuth');
        },
      } as any,
      encryption,
    );
    metadata = new ConnectedAccountMetadataService(
      accounts,
      { find: async () => [] } as any,
      { find: async () => [] } as any,
      revoke,
      { dispatchOnDisconnect: async () => {} } as any,
      { emitCustomBatchEvent: () => {} } as any,
    );
    disconnect = new ConnectedAccountResolver(metadata, permissions);
    providerFetch = jest.fn(async (_url, options) => {
      if (options.headers.Authorization !== `Bearer ${token}`)
        throw new Error('Wrong token');
      return new Response(
        JSON.stringify({
          id: merchantId,
          name: 'Synthetic merchant',
          extra: token,
        }),
      );
    });
  });
  const submit = () =>
    intake.submit(actor, {
      requestId: request.id,
      accessToken: token,
      readOnlyConfirmed: true,
    });
  const read = () =>
    readCloverMerchant({
      list: () =>
        reader.list({ ...caller, filter: { providerName: 'clover-manual' } }),
      get: (id) => reader.getOne({ ...caller, id }),
      fetch: providerFetch,
    });

  it('encrypts, reads through native App scope and policy, then native disconnect denies reuse', async () => {
    const receipt = await submit();
    expect(rows[0]).toMatchObject({
      provider: 'app',
      applicationId: application.id,
      connectionProviderId: provider.id,
      scopes: null,
    });
    expect(JSON.stringify(rows)).not.toContain(token);
    expect(() =>
      encryption.decrypt({
        ciphertext: rows[0].accessToken,
        workspaceId: randomUUID(),
      }),
    ).toThrow();
    const result = await read();
    expect(result).toEqual({
      connectedAccountId: receipt.connectedAccountId,
      merchantId,
      merchantName: 'Synthetic merchant',
      scopeVerification: 'unknown',
    });
    expect(JSON.stringify({ receipt, result })).not.toContain(token);
    expect(providerFetch).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
    await disconnect.deleteConnectedAccount(
      receipt.connectedAccountId,
      { id: actor.workspaceId } as WorkspaceEntity,
      actor.userWorkspaceId,
    );
    await expect(read()).rejects.toThrow('Clover connection unavailable');
    expect(providerFetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    'workspace',
    'app',
    'member',
    'user-role',
    'app-role',
    'no-app-role',
    'background',
    'owner-visibility',
    'provider',
    'archived',
    'auth-failed',
    'ciphertext',
  ])('denies %s before a provider read', async (reason) => {
    await submit();
    if (reason === 'workspace') caller.workspaceId = randomUUID();
    if (reason === 'app') caller.applicationId = randomUUID();
    if (reason === 'member') member = null;
    if (reason === 'user-role') userAllowed = false;
    if (reason === 'app-role') appAllowed = false;
    if (reason === 'no-app-role') application.defaultRoleId = null;
    if (reason === 'background') caller.requestUserWorkspaceId = null;
    if (reason === 'owner-visibility') {
      rows[0].visibility = 'user';
      rows[0].userWorkspaceId = randomUUID();
    }
    if (reason === 'provider') provider = null;
    if (reason === 'archived') rows[0].archivedAt = new Date();
    if (reason === 'auth-failed') rows[0].authFailedAt = new Date();
    if (reason === 'ciphertext') rows[0].accessToken = 'enc:v2:tampered';
    await expect(read()).rejects.toThrow('Clover connection unavailable');
    expect(providerFetch).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('requires an installed matching manual provider before intake', async () => {
    provider = null;
    await expect(submit()).rejects.toThrow('Install the Clover App');
    expect(rows).toHaveLength(0);
  });

  it('rejects ambiguity and discards credential-bearing provider errors', async () => {
    await submit();
    rows.push({ ...rows[0], id: randomUUID() });
    await expect(read()).rejects.toThrow('Clover connection unavailable');
    expect(providerFetch).not.toHaveBeenCalled();
    rows.pop();
    providerFetch.mockRejectedValue(new Error(token));
    await expect(read()).rejects.toThrow('Clover connection unavailable');
  });
  it('requires current connection permission to disconnect', async () => {
    const receipt = await submit();
    userAllowed = false;
    await expect(
      disconnect.deleteConnectedAccount(
        receipt.connectedAccountId,
        { id: actor.workspaceId } as WorkspaceEntity,
        actor.userWorkspaceId,
      ),
    ).rejects.toThrow('permission');
    expect(rows).toHaveLength(1);
  });
  it('runs the Clover handler and SDK as the user and denies reuse after disconnect', async () => {
    const receipt = await submit();
    const keys = [
      'TWENTY_API_URL',
      'TWENTY_APP_ACCESS_TOKEN',
      'TWENTY_APP_APPLICATION_ACCESS_TOKEN',
    ] as const;
    const previous = keys.map((key) => process.env[key]);
    process.env.TWENTY_API_URL = 'https://synthetic-native.invalid';
    process.env.TWENTY_APP_ACCESS_TOKEN = 'synthetic-delegated-user';
    process.env.TWENTY_APP_APPLICATION_ACCESS_TOKEN = 'synthetic-app-only';
    const transport = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (url, init) => {
        if (String(url) === 'https://synthetic-native.invalid/metadata') {
          expect(init?.headers).toMatchObject({
            Authorization: 'Bearer synthetic-delegated-user',
          });
          const body = JSON.parse(String(init?.body));
          const data = body.query.includes('ListAppConnections')
            ? {
                appConnections: await reader.list({
                  ...caller,
                  filter: body.variables.filter,
                }),
              }
            : {
                appConnection: await reader.getOne({
                  ...caller,
                  id: body.variables.id,
                }),
              };
          return new Response(JSON.stringify({ data }));
        }
        if (String(url).startsWith('https://api.clover.com/v3/merchants/'))
          return providerFetch(url, init);
        throw new Error('Unexpected network request');
      });
    const context = {
      workspaceId: actor.workspaceId,
      userWorkspaceId: actor.userWorkspaceId,
      workspaceMemberId: 'member-id',
      retryCount: 0,
      maxRetries: 0,
    };
    try {
      expect(merchantFunction.success).toBe(true);
      expect(await merchantFunction.config!.handler({}, context)).toEqual({
        connectedAccountId: receipt.connectedAccountId,
        merchantId,
        merchantName: 'Synthetic merchant',
        scopeVerification: 'unknown',
      });
      await disconnect.deleteConnectedAccount(
        receipt.connectedAccountId,
        { id: actor.workspaceId } as WorkspaceEntity,
        actor.userWorkspaceId,
      );
      await expect(
        merchantFunction.config!.handler({}, context),
      ).rejects.toThrow('Clover connection unavailable');
      expect(providerFetch).toHaveBeenCalledTimes(1);
    } finally {
      transport.mockRestore();
      keys.forEach((key, index) => {
        if (previous[index] === undefined) delete process.env[key];
        else process.env[key] = previous[index];
      });
    }
  });
});
