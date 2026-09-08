import { type DataSource, type QueryRunner, TableColumn } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { type SlowInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/slow-instance-command.interface';

// FAST commands precede all SLOW commands within a version. Instances already
// past the original 2.37 SLOW command cannot reach the later-added FAST command.
// Keep that historical command intact and append after the workspace tail too,
// so completed workspaces never need their cursors rewound to reach this repair.
@RegisteredInstanceCommand('2.37.0', 1788846876000, {
  type: 'slow',
  afterWorkspaceCommands: true,
})
export class EnsureManualTokenWorkspaceGrantSlowInstanceCommand implements SlowInstanceCommand {
  public async runDataMigration(_dataSource: DataSource): Promise<void> {
    // Schema and completion receipt belong to the runner's transaction in up().
    return;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('core.connectedAccount');

    if (!table) {
      throw new Error(
        'Cannot ensure manual token grant: connectedAccount table is missing',
      );
    }

    const column = table.findColumnByName('manualTokenWorkspaceGrant');

    if (column) {
      if (
        column.type !== 'jsonb' ||
        !column.isNullable ||
        column.isArray ||
        column.isGenerated ||
        column.default !== undefined
      ) {
        throw new Error(
          'Cannot ensure manual token grant: existing column has incompatible shape',
        );
      }

      return;
    }

    await queryRunner.addColumn(
      table,
      new TableColumn({
        name: 'manualTokenWorkspaceGrant',
        type: 'jsonb',
        isNullable: true,
      }),
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // The original FAST command owns this column's lifecycle. A catch-up must
    // never remove a pre-existing column or the grants subsequently stored in it.
    return;
  }
}
