import { type DiscoveryService } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { type DataSource, type QueryRunner, Table, TableColumn } from 'typeorm';

import { type CommandShutdownService } from 'src/database/commands/command-runners/command-shutdown.service';
import { type WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { EnsureManualTokenWorkspaceGrantSlowInstanceCommand } from 'src/database/commands/upgrade-version-command/2-37/2-37-instance-command-slow-1788846876000-ensure-manual-token-workspace-grant';
import { SyncMessageCalendarTargetMetadataCommand } from 'src/database/commands/upgrade-version-command/2-37/2-37-workspace-command-1787832412051-sync-message-calendar-target-metadata.command';
import { BackfillMessageCalendarTargetsCommand } from 'src/database/commands/upgrade-version-command/2-37/2-37-workspace-command-1787832413051-backfill-message-calendar-targets.command';
import { RestoreSettingsNavigationCommandMenuItemLabelsCommand } from 'src/database/commands/upgrade-version-command/2-37/2-37-workspace-command-1787840804000-restore-settings-navigation-command-menu-item-labels.command';
import { INSTANCE_COMMANDS } from 'src/database/commands/upgrade-version-command/instance-commands.constant';
import { type TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { TWENTY_CROSS_UPGRADE_SUPPORTED_VERSIONS } from 'src/engine/core-modules/upgrade/constants/twenty-cross-upgrade-supported-version.constant';
import { InstanceCommandRunnerService } from 'src/engine/core-modules/upgrade/services/instance-command-runner.service';
import { UpgradeCommandRegistryService } from 'src/engine/core-modules/upgrade/services/upgrade-command-registry.service';
import { type UpgradeMigrationService } from 'src/engine/core-modules/upgrade/services/upgrade-migration.service';
import { UpgradeSequenceReaderService } from 'src/engine/core-modules/upgrade/services/upgrade-sequence-reader.service';
import { UpgradeSequenceRunnerService } from 'src/engine/core-modules/upgrade/services/upgrade-sequence-runner.service';
import { type UpgradeStatusService } from 'src/engine/core-modules/upgrade/services/upgrade-status.service';
import { WorkspaceCommandRunnerService } from 'src/engine/core-modules/upgrade/services/workspace-command-runner.service';
import { type UpgradeAwareEntityMetadataAdapter } from 'src/engine/twenty-orm/upgrade-aware/upgrade-aware-entity-metadata.adapter';
import { type WorkspaceVersionService } from 'src/engine/workspace-manager/workspace-version/services/workspace-version.service';

const OLD_SLOW_CURSOR =
  '2.37.0_BackfillMissingPageLayoutWidgetPositionsSlowInstanceCommand_1787838153752';
const ORIGINAL_FAST_NAME =
  '2.37.0_AddManualTokenWorkspaceGrantFastInstanceCommand_1788751203788';
const REPAIR_NAME =
  '2.37.0_EnsureManualTokenWorkspaceGrantSlowInstanceCommand_1788846876000';
const WORKSPACE_TAIL =
  '2.37.0_RestoreSettingsNavigationCommandMenuItemLabelsCommand_1787840804000';
const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';

type Receipt = {
  name: string;
  status: 'completed' | 'failed';
  workspaceId: string | null;
  isInitial: boolean;
};

const buildHarness = (
  column?: TableColumn,
  workspace?: 'initial' | 'completed' | 'failed',
) => {
  const table = new Table({ name: 'connectedAccount', schema: 'core' });

  if (column) table.addColumn(column);

  const events: string[] = [];
  const receipts: Receipt[] = [
    {
      name: '2.37.0_MakeUserEmailCaseInsensitiveFastInstanceCommand_1787836741000',
      status: 'completed',
      workspaceId: null,
      isInitial: false,
    },
    {
      name: OLD_SLOW_CURSOR,
      status: 'completed',
      workspaceId: null,
      isInitial: false,
    },
  ];
  if (workspace)
    receipts.push({
      name: WORKSPACE_TAIL,
      status: workspace === 'failed' ? 'failed' : 'completed',
      workspaceId: WORKSPACE_ID,
      isInitial: workspace === 'initial',
    });
  let pendingReceipts: Receipt[] = [];
  const queryRunner = {
    isTransactionActive: false,
    connect: jest.fn(),
    startTransaction: jest.fn(async () => {
      queryRunner.isTransactionActive = true;
    }),
    getTable: jest.fn(async () => table),
    addColumn: jest.fn(async (_table: Table, addedColumn: TableColumn) => {
      table.addColumn(addedColumn);
      events.push('ddl');
    }),
    commitTransaction: jest.fn(async () => {
      receipts.push(...pendingReceipts);
      pendingReceipts = [];
      queryRunner.isTransactionActive = false;
      events.push('commit');
    }),
    rollbackTransaction: jest.fn(async () => {
      pendingReceipts = [];
      queryRunner.isTransactionActive = false;
      events.push('rollback');
    }),
    release: jest.fn(),
  };
  const dataSource = { createQueryRunner: jest.fn(() => queryRunner) };
  const migrationService = {
    getLastAttemptedCommandNameOrThrow: jest.fn(async () =>
      receipts.findLast((receipt) => !receipt.isInitial),
    ),
    getWorkspaceLastAttemptedCommandNameOrThrow: jest.fn(async () =>
      workspace
        ? new Map([
            [
              WORKSPACE_ID,
              receipts.findLast(
                (receipt) => receipt.workspaceId === WORKSPACE_ID,
              )!,
            ],
          ])
        : new Map(),
    ),
    isLastAttemptCompleted: jest.fn(
      async ({ name }: { name: string }) =>
        receipts.findLast(
          (receipt) => receipt.name === name && receipt.workspaceId === null,
        )?.status === 'completed',
    ),
    areAllWorkspacesAtCommand: jest.fn(
      async ({
        commandName,
        workspaceIds,
      }: {
        commandName: string;
        workspaceIds: string[];
      }) =>
        workspaceIds.every(
          (workspaceId) =>
            receipts.findLast(
              (receipt) =>
                receipt.name === commandName &&
                receipt.workspaceId === workspaceId,
            )?.status === 'completed',
        ),
    ),
    recordUpgradeMigration: jest.fn(
      async (input: {
        name: string;
        status: 'completed' | 'failed';
        queryRunner?: QueryRunner;
        isInstance: boolean;
        workspaceIds: string[];
      }) => {
        const rows = [
          ...(input.isInstance ? [null] : []),
          ...input.workspaceIds,
        ].map((workspaceId) => ({
          name: input.name,
          status: input.status,
          workspaceId,
          isInitial: false,
        }));

        if (input.queryRunner) {
          expect(input.queryRunner).toBe(queryRunner);
          expect(queryRunner.isTransactionActive).toBe(true);
          pendingReceipts = rows;
        } else {
          receipts.push(...rows);
        }
        events.push(input.status);
      },
    ),
  };
  const workspaceVersionService = {
    getProvisionedWorkspaceIds: jest.fn(async () =>
      workspace ? [WORKSPACE_ID] : [],
    ),
  };
  const config = {
    get: () => '2.37.0+regression',
  } as unknown as TwentyConfigService;
  const statusService = {
    invalidateInstanceAndAllWorkspacesStatus: jest.fn(),
  } as unknown as UpgradeStatusService;
  const instanceRunner = new InstanceCommandRunnerService(
    dataSource as unknown as DataSource,
    config,
    migrationService as unknown as UpgradeMigrationService,
    workspaceVersionService as unknown as WorkspaceVersionService,
    statusService,
  );
  const workspaceProviders = [
    SyncMessageCalendarTargetMetadataCommand,
    BackfillMessageCalendarTargetsCommand,
    RestoreSettingsNavigationCommandMenuItemLabelsCommand,
  ].map((metatype) => ({
    metatype,
    instance: Object.assign(Object.create(metatype.prototype), {
      runOnWorkspace: jest.fn(),
    }),
  }));
  const providers = INSTANCE_COMMANDS.map((metatype) => ({
    metatype,
    instance: Object.create(metatype.prototype),
  }));
  const registry = new UpgradeCommandRegistryService({
    getProviders: () => [...providers, ...workspaceProviders],
  } as unknown as DiscoveryService);

  registry.onModuleInit();
  const reader = new UpgradeSequenceReaderService(registry);
  const sequence = reader.getUpgradeSequence();
  const iterator = {
    iterate: jest.fn(
      async ({
        workspaceIds,
        callback,
      }: {
        workspaceIds: string[];
        callback: (context: unknown) => Promise<void>;
      }) => {
        const success: string[] = [];
        const fail: string[] = [];
        for (const workspaceId of workspaceIds) {
          try {
            await callback({ workspaceId, index: 0, total: 1, dataSource });
            success.push(workspaceId);
          } catch {
            fail.push(workspaceId);
          }
        }
        return { success, fail };
      },
    ),
  };
  const shutdown = { isShutdownRequested: jest.fn(() => false) };
  const sequenceRunner = new UpgradeSequenceRunnerService(
    migrationService as unknown as UpgradeMigrationService,
    instanceRunner,
    new WorkspaceCommandRunnerService(
      config,
      migrationService as unknown as UpgradeMigrationService,
      statusService,
    ),
    reader,
    { refresh: jest.fn() } as unknown as UpgradeAwareEntityMetadataAdapter,
    iterator as unknown as WorkspaceIteratorService,
    workspaceVersionService as unknown as WorkspaceVersionService,
    shutdown as unknown as CommandShutdownService,
  );

  return {
    table,
    queryRunner,
    events,
    receipts,
    sequence,
    sequenceRunner,
    instanceRunner,
    migrationService,
    registry,
    workspaceProviders,
    shutdown,
  };
};

describe('manual token grant repair after completed existing 2.37 upgrade', () => {
  beforeAll(() => Logger.overrideLogger(false));
  afterAll(() =>
    Logger.overrideLogger([
      'log',
      'error',
      'warn',
      'debug',
      'verbose',
      'fatal',
    ]),
  );

  it('preserves the historical default sequence and opts only the repair into the version tail', () => {
    const h = buildHarness();
    const historicalNames = TWENTY_CROSS_UPGRADE_SUPPORTED_VERSIONS.flatMap(
      (version) => {
        const bundle = h.registry.getBundleForVersion(version);
        return [
          ...bundle.fastInstanceCommands,
          ...bundle.slowInstanceCommands,
          ...bundle.workspaceCommands,
        ]
          .filter((step) => step.name !== REPAIR_NAME)
          .map((step) => step.name);
      },
    );
    expect(
      h.sequence
        .filter((step) => step.name !== REPAIR_NAME)
        .map((step) => step.name),
    ).toEqual(historicalNames);
    expect(h.sequence.at(-1)?.name).toBe(REPAIR_NAME);
  });

  it('reaches the appended repair after the actual old SLOW cursor and records DDL atomically', async () => {
    const h = buildHarness();
    const names = h.sequence.map((step) => step.name);

    expect(names.indexOf(ORIGINAL_FAST_NAME)).toBeLessThan(
      names.indexOf(OLD_SLOW_CURSOR),
    );
    expect(names.indexOf(REPAIR_NAME)).toBe(names.indexOf(WORKSPACE_TAIL) + 1);
    await h.sequenceRunner.run({ sequence: h.sequence, options: {} });

    expect(h.table.findColumnByName('manualTokenWorkspaceGrant')).toMatchObject(
      {
        type: 'jsonb',
        isNullable: true,
      },
    );
    expect(h.events).toEqual(['ddl', 'completed', 'commit']);
    expect(h.receipts.at(-1)).toMatchObject({
      name: REPAIR_NAME,
      status: 'completed',
      workspaceId: null,
      isInitial: false,
    });
    expect(h.queryRunner.release).toHaveBeenCalledTimes(1);

    await h.sequenceRunner.run({ sequence: h.sequence, options: {} });
    expect(h.queryRunner.addColumn).toHaveBeenCalledTimes(1);
    expect(h.receipts).toHaveLength(3);
    await expect(
      h.instanceRunner.runSlowInstanceCommand({
        command: new EnsureManualTokenWorkspaceGrantSlowInstanceCommand(),
        name: REPAIR_NAME,
      }),
    ).resolves.toEqual({ status: 'already-executed' });
  });

  it('preserves an existing compatible column without DDL or credential writes', async () => {
    const column = new TableColumn({
      name: 'manualTokenWorkspaceGrant',
      type: 'jsonb',
      isNullable: true,
    });
    const h = buildHarness(column);

    await h.sequenceRunner.run({ sequence: h.sequence, options: {} });
    expect(h.table.findColumnByName(column.name)).toBe(column);
    expect(h.queryRunner.addColumn).not.toHaveBeenCalled();
    expect(h.events).toEqual(['completed', 'commit']);
    await new EnsureManualTokenWorkspaceGrantSlowInstanceCommand().down(
      h.queryRunner as unknown as QueryRunner,
    );
    expect(h.table.findColumnByName(column.name)).toBe(column);
  });

  it.each([
    { type: 'text', isNullable: true },
    { type: 'jsonb', isNullable: false },
    { type: 'jsonb', isNullable: true, default: "'{}'::jsonb" },
    { type: 'jsonb', isNullable: true, isArray: true },
    { type: 'jsonb', isNullable: true, isGenerated: true },
  ])('fails closed on incompatible existing shape %j', async (shape) => {
    const h = buildHarness(
      new TableColumn({ name: 'manualTokenWorkspaceGrant', ...shape }),
    );

    await expect(
      h.sequenceRunner.run({ sequence: h.sequence, options: {} }),
    ).rejects.toThrow('incompatible shape');
    expect(h.events).toEqual(['rollback', 'failed']);
    expect(h.queryRunner.addColumn).not.toHaveBeenCalled();
    expect(h.queryRunner.commitTransaction).not.toHaveBeenCalled();
    expect(h.receipts.at(-1)).toMatchObject({
      name: REPAIR_NAME,
      status: 'failed',
    });
  });

  it('does not record successful completion after a DDL failure and permits a normal retry', async () => {
    const h = buildHarness();
    h.queryRunner.addColumn.mockRejectedValueOnce(new Error('DDL unavailable'));

    await expect(
      h.sequenceRunner.run({ sequence: h.sequence, options: {} }),
    ).rejects.toThrow('DDL unavailable');
    expect(h.events).toEqual(['rollback', 'failed']);
    await h.sequenceRunner.run({ sequence: h.sequence, options: {} });
    expect(h.receipts.at(-1)).toMatchObject({
      name: REPAIR_NAME,
      status: 'completed',
    });
    expect(h.events).toEqual([
      'rollback',
      'failed',
      'ddl',
      'completed',
      'commit',
    ]);
  });

  it.each(['initial', 'completed'] as const)(
    'does not replay completed workspace commands with a %s workspace cursor, even after interruption',
    async (workspace) => {
      const h = buildHarness(undefined, workspace);
      h.shutdown.isShutdownRequested
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      await h.sequenceRunner.run({ sequence: h.sequence, options: {} });
      expect(h.queryRunner.addColumn).not.toHaveBeenCalled();
      expect(h.receipts.at(-1)?.name).toBe(WORKSPACE_TAIL);
      await h.sequenceRunner.run({ sequence: h.sequence, options: {} });
      for (const provider of h.workspaceProviders)
        expect(provider.instance.runOnWorkspace).not.toHaveBeenCalled();
      expect(h.events).toEqual(['ddl', 'completed', 'commit']);
      expect(h.receipts.at(-1)).toMatchObject({
        name: REPAIR_NAME,
        workspaceId: WORKSPACE_ID,
      });
      await h.sequenceRunner.run({ sequence: h.sequence, options: {} });
      expect(h.queryRunner.addColumn).toHaveBeenCalledTimes(1);
      for (const provider of h.workspaceProviders)
        expect(provider.instance.runOnWorkspace).not.toHaveBeenCalled();
    },
  );

  it('retries a failed workspace tail and enforces its barrier before repair', async () => {
    const h = buildHarness(undefined, 'failed');
    const tail = h.workspaceProviders.at(-1)!.instance.runOnWorkspace;
    tail.mockRejectedValueOnce(new Error('workspace failure'));
    const failed = await h.sequenceRunner.run({
      sequence: h.sequence,
      options: {},
    });
    expect(failed.totalFailures).toBe(1);
    expect(h.queryRunner.addColumn).not.toHaveBeenCalled();
    await h.sequenceRunner.run({ sequence: h.sequence, options: {} });
    expect(tail).toHaveBeenCalledTimes(2);
    for (const provider of h.workspaceProviders.slice(0, -1))
      expect(provider.instance.runOnWorkspace).not.toHaveBeenCalled();
    expect(h.queryRunner.addColumn).toHaveBeenCalledTimes(1);
  });

  it.each(['initial', 'completed'] as const)(
    'retries a failed instance repair with a %s prior tail without replay',
    async (workspace) => {
      const h = buildHarness(undefined, workspace);
      h.queryRunner.addColumn.mockRejectedValueOnce(
        new Error('DDL unavailable'),
      );
      await expect(
        h.sequenceRunner.run({ sequence: h.sequence, options: {} }),
      ).rejects.toThrow('DDL unavailable');
      await h.sequenceRunner.run({ sequence: h.sequence, options: {} });
      for (const provider of h.workspaceProviders)
        expect(provider.instance.runOnWorkspace).not.toHaveBeenCalled();
      expect(h.events).toEqual([
        'rollback',
        'failed',
        'ddl',
        'completed',
        'commit',
      ]);
    },
  );
  it.each(['missing', 'failed'] as const)(
    'rejects direct instance retry with %s preceding workspace completion',
    async (proof) => {
      const h = buildHarness(undefined, 'completed');
      if (proof === 'missing') h.receipts.splice(2, 1);
      else h.receipts[2].status = 'failed';
      h.receipts.push({
        name: REPAIR_NAME,
        status: 'failed',
        workspaceId: WORKSPACE_ID,
        isInitial: false,
      });
      await expect(
        h.sequenceRunner.run({ sequence: h.sequence, options: {} }),
      ).rejects.toThrow('Cannot retry instance step');
      expect(h.queryRunner.addColumn).not.toHaveBeenCalled();
      for (const provider of h.workspaceProviders)
        expect(provider.instance.runOnWorkspace).not.toHaveBeenCalled();
    },
  );

  it('rejects an unrelated workspace cursor when resuming the repair', async () => {
    const h = buildHarness(undefined, 'completed');
    h.receipts[2].name = OLD_SLOW_CURSOR;
    h.receipts.push({
      name: REPAIR_NAME,
      status: 'failed',
      workspaceId: null,
      isInitial: false,
    });
    await expect(
      h.sequenceRunner.run({ sequence: h.sequence, options: {} }),
    ).rejects.toThrow('has not completed');
    expect(h.queryRunner.addColumn).not.toHaveBeenCalled();
  });
  it.each(['completed', 'failed'] as const)(
    'accepts only the exact repair %s cursor with prior-tail proof',
    async (status) => {
      const h = buildHarness(undefined, 'initial');
      h.receipts.push({
        name: REPAIR_NAME,
        status,
        workspaceId: WORKSPACE_ID,
        isInitial: false,
      });
      h.receipts.push({
        name: REPAIR_NAME,
        status: 'failed',
        workspaceId: null,
        isInitial: false,
      });
      await h.sequenceRunner.run({ sequence: h.sequence, options: {} });
      expect(h.migrationService.areAllWorkspacesAtCommand).toHaveBeenCalledWith(
        { commandName: WORKSPACE_TAIL, workspaceIds: [WORKSPACE_ID] },
      );
      expect(h.queryRunner.addColumn).toHaveBeenCalledTimes(1);
      for (const provider of h.workspaceProviders)
        expect(provider.instance.runOnWorkspace).not.toHaveBeenCalled();
    },
  );

  it('does not relax the barrier for an instance without the opt-in phase', async () => {
    const h = buildHarness(undefined, 'completed');
    h.receipts.push({
      name: REPAIR_NAME,
      status: 'failed',
      workspaceId: WORKSPACE_ID,
      isInitial: false,
    });
    const sequence = h.sequence.map((step) =>
      step.name === REPAIR_NAME
        ? { ...step, afterWorkspaceCommands: undefined }
        : step,
    );
    await expect(
      h.sequenceRunner.run({ sequence, options: {} }),
    ).rejects.toThrow('has not completed');
    expect(h.migrationService.areAllWorkspacesAtCommand).not.toHaveBeenCalled();
    expect(h.queryRunner.addColumn).not.toHaveBeenCalled();
  });
});
