import { DataSource, type DataSourceOptions } from 'typeorm';

import { typeORMCoreModuleOptions } from 'src/database/typeorm/core/core.datasource';

export async function checkInitialization(): Promise<void> {
  // Load the image's actual migration set, including the configured billing mode,
  // without loading application entities or running any migrations/schema writes.
  const dataSource = new DataSource({
    ...typeORMCoreModuleOptions,
    entities: [],
    synchronize: false,
    migrationsRun: false,
  } as DataSourceOptions);

  try {
    await dataSource.initialize();

    const executed: { name: string }[] = await dataSource.query(
      'SELECT name FROM core._typeorm_migrations',
    );
    const executedNames = new Set(executed.map(({ name }) => name));
    const pending = dataSource.migrations.filter(
      (migration) =>
        !executedNames.has(migration.name ?? migration.constructor.name),
    );

    if (dataSource.migrations.length === 0 || pending.length > 0) {
      throw new Error(
        `Legacy initialization is incomplete (${pending.length} pending migrations). ` +
          'Complete initialization under operator review before starting the application.',
      );
    }
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

if (require.main === module) {
  void checkInitialization().catch((error: unknown) => {
    // oxlint-disable-next-line no-console
    console.error('Database initialization validation failed:', error);
    process.exitCode = 1;
  });
}
