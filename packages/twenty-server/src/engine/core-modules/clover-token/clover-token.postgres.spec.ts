import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity';
import { SyncableEntity } from 'src/engine/workspace-manager/types/syncable-entity.interface';
import { ApplicationEntity } from 'src/engine/core-modules/application/application.entity';
import { ConnectionProviderEntity } from 'src/engine/core-modules/application/connection-provider/connection-provider.entity';
import {
  CLOVER_FINANCE_APPLICATION,
  CLOVER_MANUAL_PROVIDER,
} from 'src/engine/core-modules/clover-token/clover-connection.constants';
import { randomUUID } from 'crypto';

import { DataSource, EntitySchema, getMetadataArgsStorage } from 'typeorm';
import { WorkspaceActivationStatus } from 'twenty-shared/workspace';

import { AppTokenEntity } from 'src/engine/core-modules/app-token/app-token.entity';
import { CloverTokenService } from 'src/engine/core-modules/clover-token/clover-token.service';
import { SecretEncryptionService } from 'src/engine/core-modules/secret-encryption/secret-encryption.service';
import { type SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { type EnvironmentConfigDriver } from 'src/engine/core-modules/twenty-config/drivers/environment-config.driver';
import { type TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { ConnectedAccountTokenEncryptionService } from 'src/engine/metadata-modules/connected-account/services/connected-account-token-encryption.service';
import { type PermissionsService } from 'src/engine/metadata-modules/permissions/permissions.service';

// Disposable PostgreSQL transaction test, deliberately not a migration or
// Workspace-creation fixture. The credential and provider use native entity
// metadata (checks and cascades); unrelated identity/channel dependencies use
// minimal projections. Transactions, row locks and encryption are real.
const testUrl = process.env.CLOVER_TEST_DATABASE_URL;
const suite = testUrl ? describe : describe.skip;
const uuid = { type: 'uuid' as const };
const id = { ...uuid, primary: true, generated: 'uuid' as const };
const nullableDate = { type: 'timestamptz' as const, nullable: true };

// Use every native column and check (including inheritance), not a hand-written
// credential projection. Relation targets are isolated identity fixtures.
const nativeSchema = (target: any, hierarchy: any[], relations: any) => {
  const storage = getMetadataArgsStorage();
  const columns = Object.fromEntries(
    storage.filterColumns(hierarchy).map((column) => [
      column.propertyName,
      {
        ...column.options,
        ...(column.mode === 'createDate' ? { createDate: true } : {}),
        ...(column.mode === 'updateDate' ? { updateDate: true } : {}),
        ...(storage.generations.some(
          (g) => g.target === target && g.propertyName === column.propertyName,
        )
          ? { generated: 'uuid' }
          : {}),
      },
    ]),
  );
  return new EntitySchema({
    name: target.name,
    target,
    tableName: storage.tables.find((t) => t.target === target)!.name,
    schema: 'core',
    columns: columns as any,
    relations,
    checks: storage
      .filterChecks(target)
      .map((c) => ({ name: c.name, expression: c.expression })),
  });
};

suite('Clover PostgreSQL atomicity', () => {
  let db: DataSource;
  let service: CloverTokenService;
  const actor = {
    userId: randomUUID(),
    workspaceId: randomUUID(),
    userWorkspaceId: randomUUID(),
  };
  const merchantId = 'TESTMERCHANT1';
  let providerCalls: number;

  beforeAll(async () => {
    jest.useRealTimers();
    const url = new URL(testUrl!);
    if (
      url.hostname !== '127.0.0.1' ||
      url.pathname !== '/mhoo_hass_synthetic'
    ) {
      throw new Error(
        'This test only accepts the named disposable local database.',
      );
    }
    db = new DataSource({
      type: 'postgres',
      url: testUrl,
      logging: false,
      synchronize: false,
      entities: [
        new EntitySchema<ApplicationEntity>({
          name: 'ApplicationEntity',
          tableName: 'application',
          schema: 'core',
          target: ApplicationEntity,
          columns: {
            id,
            workspaceId: uuid,
            universalIdentifier: uuid,
            defaultRoleId: { ...uuid, nullable: true },
            deletedAt: { ...nullableDate, deleteDate: true },
          },
        }),
        nativeSchema(
          ConnectionProviderEntity,
          [ConnectionProviderEntity, SyncableEntity, WorkspaceRelatedEntity],
          {
            application: {
              type: 'many-to-one',
              target: 'ApplicationEntity',
              joinColumn: { name: 'applicationId' },
              onDelete: 'CASCADE',
            },
            workspace: {
              type: 'many-to-one',
              target: 'WorkspaceEntity',
              joinColumn: { name: 'workspaceId' },
              onDelete: 'CASCADE',
            },
          },
        ),
        nativeSchema(
          ConnectedAccountEntity,
          [ConnectedAccountEntity, WorkspaceRelatedEntity],
          {
            application: {
              type: 'many-to-one',
              target: 'ApplicationEntity',
              joinColumn: { name: 'applicationId' },
              onDelete: 'CASCADE',
              nullable: true,
            },
            connectionProvider: {
              type: 'many-to-one',
              target: 'ConnectionProviderEntity',
              joinColumn: { name: 'connectionProviderId' },
              onDelete: 'CASCADE',
              nullable: true,
            },
            workspace: {
              type: 'many-to-one',
              target: 'WorkspaceEntity',
              joinColumn: { name: 'workspaceId' },
              onDelete: 'CASCADE',
            },
          },
        ),
        new EntitySchema<WorkspaceEntity>({
          name: 'WorkspaceEntity',
          tableName: 'workspace',
          schema: 'core',
          target: WorkspaceEntity,
          columns: {
            id,
            activationStatus: { type: 'text' },
            deletedAt: { ...nullableDate, deleteDate: true },
          },
        }),
        new EntitySchema<UserWorkspaceEntity>({
          name: 'userWorkspace',
          target: UserWorkspaceEntity,
          columns: {
            id,
            userId: uuid,
            workspaceId: uuid,
            deletedAt: { ...nullableDate, deleteDate: true },
          },
        }),
        new EntitySchema<AppTokenEntity>({
          name: 'appToken',
          target: AppTokenEntity,
          columns: {
            id,
            userId: uuid,
            workspaceId: uuid,
            type: { type: 'text' },
            expiresAt: { type: 'timestamptz' },
            revokedAt: nullableDate,
            deletedAt: nullableDate,
            context: { type: 'jsonb', nullable: true },
          },
        }),
      ],
    });
    await db.initialize();
    await db.query('CREATE SCHEMA IF NOT EXISTS core');
    await db.synchronize();
    await db.getRepository(WorkspaceEntity).save({
      id: actor.workspaceId,
      activationStatus: WorkspaceActivationStatus.ACTIVE,
    });
    await db.getRepository(UserWorkspaceEntity).save({
      id: actor.userWorkspaceId,
      workspaceId: actor.workspaceId,
      userId: actor.userId,
    });
    const app = await db.getRepository(ApplicationEntity).save({
      workspaceId: actor.workspaceId,
      universalIdentifier: CLOVER_FINANCE_APPLICATION,
      defaultRoleId: randomUUID(),
    });
    await db.getRepository(ConnectionProviderEntity).save({
      workspaceId: actor.workspaceId,
      applicationId: app.id,
      universalIdentifier: CLOVER_MANUAL_PROVIDER,
      name: 'clover-manual',
      displayName: 'Clover',
      type: 'manualToken',
      oauthConfig: null,
    });
    service = new CloverTokenService(
      db,
      { get: () => actor.workspaceId } as unknown as TwentyConfigService,
      {
        userHasWorkspaceSettingPermission: async () => true,
      } as unknown as PermissionsService,
      new ConnectedAccountTokenEncryptionService(
        new SecretEncryptionService({
          get: (key: string) =>
            key === 'APP_SECRET'
              ? 'synthetic-local-test-encryption-key'
              : undefined,
        } as EnvironmentConfigDriver),
      ),
      {
        getHttpClient: () => ({
          get: async () => {
            providerCalls++;
            return { data: { id: merchantId, name: 'Synthetic Hass' } };
          },
        }),
      } as unknown as SecureHttpClientService,
    );
  }, 30_000);

  beforeEach(async () => {
    await db
      .getRepository(ConnectedAccountEntity)
      .createQueryBuilder()
      .delete()
      .execute();
    await db.getRepository(AppTokenEntity).clear();
    providerCalls = 0;
  });

  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
  });

  it('commits one connection for two concurrent submissions and returns the same receipt', async () => {
    const handoff = await service.begin(actor, merchantId);
    const input = {
      requestId: handoff.requestId,
      accessToken: 'synthetic-clover-token-not-real',
      readOnlyConfirmed: true,
    };
    const receipts = await Promise.all([
      service.submit(actor, input),
      service.submit(actor, input),
    ]);
    expect(receipts[0]).toEqual(receipts[1]);
    expect(providerCalls).toBe(1);
    expect(await db.getRepository(ConnectedAccountEntity).count()).toBe(1);
    const stored = await db
      .getRepository(ConnectedAccountEntity)
      .findOneByOrFail({ id: receipts[0].connectedAccountId });
    expect(stored.accessToken).toMatch(/^enc:v2:/);
    expect(stored.accessToken).not.toContain(input.accessToken);
  });

  it('rolls back the encrypted insert when consuming the request fails', async () => {
    const handoff = await service.begin(actor, merchantId);
    const table = db.driver.escape(
      db.getRepository(AppTokenEntity).metadata.tableName,
    );
    await db.query(
      `ALTER TABLE ${table} ADD CONSTRAINT synthetic_consume_failure CHECK ("revokedAt" IS NULL)`,
    );
    try {
      await expect(
        service.submit(actor, {
          requestId: handoff.requestId,
          accessToken: 'synthetic-clover-token-not-real',
          readOnlyConfirmed: true,
        }),
      ).rejects.toThrow();
      expect(await db.getRepository(ConnectedAccountEntity).count()).toBe(0);
      const request = await db
        .getRepository(AppTokenEntity)
        .findOneByOrFail({ id: handoff.requestId });
      expect(request.revokedAt).toBeNull();
    } finally {
      await db.query(
        `ALTER TABLE ${table} DROP CONSTRAINT synthetic_consume_failure`,
      );
    }
  });
  it('enforces native ciphertext constraints and cascades deletion of the bound provider', async () => {
    const handoff = await service.begin(actor, merchantId);
    const receipt = await service.submit(actor, {
      requestId: handoff.requestId,
      accessToken: 'synthetic-clover-token-not-real',
      readOnlyConfirmed: true,
    });
    const accounts = db.getRepository(ConnectedAccountEntity);
    const stored = await accounts.findOneByOrFail({
      id: receipt.connectedAccountId,
    });
    await expect(
      accounts.update(
        { id: stored.id },
        { accessToken: 'synthetic-plaintext-must-fail' as never },
      ),
    ).rejects.toThrow();
    expect(
      (await accounts.findOneByOrFail({ id: stored.id })).accessToken,
    ).toBe(stored.accessToken);
    await db
      .getRepository(ConnectionProviderEntity)
      .delete({ id: stored.connectionProviderId! });
    expect(await accounts.findOneBy({ id: stored.id })).toBeNull();
  });
});
