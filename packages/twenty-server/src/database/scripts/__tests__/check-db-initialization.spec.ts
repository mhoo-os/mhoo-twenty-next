import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';

const mockDataSource = {
  initialize: jest.fn(),
  query: jest.fn(),
  destroy: jest.fn(),
  isInitialized: true,
  migrations: [
    { name: 'Initial1700000000000' },
    { name: 'Later1700000000001' },
  ] as {
    name?: string;
    constructor?: { name: string };
  }[],
};

jest.mock('typeorm', () => ({
  DataSource: jest.fn().mockImplementation(() => mockDataSource),
}));
jest.mock('src/database/typeorm/core/core.datasource', () => ({
  typeORMCoreModuleOptions: {},
}));

import { checkInitialization } from '../check-db-initialization';

beforeEach(() => {
  jest.resetAllMocks();
  jest
    .mocked(DataSource)
    .mockImplementation(() => mockDataSource as unknown as DataSource);
  mockDataSource.isInitialized = true;
  mockDataSource.migrations = [
    { name: 'Initial1700000000000' },
    { name: 'Later1700000000001' },
  ];
});

it('accepts the complete ledger and releases the connection', async () => {
  mockDataSource.query.mockResolvedValue(mockDataSource.migrations);
  await expect(checkInitialization()).resolves.toBeUndefined();
  expect(mockDataSource.query).toHaveBeenCalledWith(
    'SELECT name FROM core._typeorm_migrations',
  );
  expect(mockDataSource.query).toHaveBeenCalledTimes(1);
  expect(mockDataSource.destroy).toHaveBeenCalledTimes(1);
});

it('rejects initialization interrupted after an earlier migration committed', async () => {
  mockDataSource.query.mockResolvedValue([mockDataSource.migrations[0]]);
  await expect(checkInitialization()).rejects.toThrow('1 pending migrations');
  expect(mockDataSource.destroy).toHaveBeenCalledTimes(1);
});

it('rejects a missing migration ledger without creating it', async () => {
  mockDataSource.query.mockRejectedValueOnce(
    new Error('relation does not exist'),
  );
  await expect(checkInitialization()).rejects.toThrow(
    'relation does not exist',
  );
  expect(mockDataSource.query).toHaveBeenCalledTimes(1);
  expect(mockDataSource.destroy).toHaveBeenCalledTimes(1);
});

it('rejects an image with missing migration artifacts', async () => {
  mockDataSource.migrations = [];
  mockDataSource.query.mockResolvedValue([]);
  await expect(checkInitialization()).rejects.toThrow(
    'initialization is incomplete',
  );
});

it('fails a refused connection without querying or closing an unopened connection', async () => {
  mockDataSource.isInitialized = false;
  mockDataSource.initialize.mockRejectedValueOnce(
    new Error('connection refused'),
  );
  await expect(checkInitialization()).rejects.toThrow('connection refused');
  expect(mockDataSource.query).not.toHaveBeenCalled();
  expect(mockDataSource.destroy).not.toHaveBeenCalled();
});

it('propagates connection cleanup errors instead of claiming success', async () => {
  mockDataSource.query.mockResolvedValue(mockDataSource.migrations);
  mockDataSource.destroy.mockRejectedValueOnce(new Error('cleanup failed'));
  await expect(checkInitialization()).rejects.toThrow('cleanup failed');
});

it('uses the migration class name when no explicit name is supplied', async () => {
  class Initial1700000000000 {}
  mockDataSource.migrations = [new Initial1700000000000()];
  mockDataSource.query.mockResolvedValue([{ name: 'Initial1700000000000' }]);
  await expect(checkInitialization()).resolves.toBeUndefined();
});

// Execute the actual transformed CLI module with Node's main-module identity.
// Jest's transformer instruments the original source; no coverage counters are
// modified by this harness. Process and SQL are isolated from the test runner.
async function runCli() {
  const { readConfig } = jest.requireActual('jest-config');
  const { createScriptTransformer } = jest.requireActual('@jest/transform');
  const rootDir = resolve(__dirname, '../../../..');
  const { projectConfig } = await readConfig(
    { $0: 'jest', _: [] },
    resolve(rootDir, 'jest.config.mjs'),
  );
  const transformer = await createScriptTransformer(projectConfig);
  const filename = resolve(__dirname, '../check-db-initialization.ts');
  const { code } = transformer.transformSource(
    filename,
    readFileSync(filename, 'utf8'),
    {
      instrument: true,
      supportsDynamicImport: false,
      supportsExportNamespaceFrom: false,
      supportsStaticESM: false,
      supportsTopLevelAwait: false,
    },
  );
  const cliModule = { exports: {} };
  const cliRequire = Object.assign(
    (name: string) => {
      if (name === 'typeorm') return { DataSource };
      if (name.includes('core.datasource'))
        return { typeORMCoreModuleOptions: {} };
      throw new Error(`Unexpected CLI dependency: ${name}`);
    },
    { main: cliModule },
  );
  const cliProcess = { exitCode: 0 };
  const cliConsole = { error: jest.fn() };
  const execute = new Function(
    'require',
    'module',
    'exports',
    'process',
    'console',
    code,
  );
  execute(cliRequire, cliModule, cliModule.exports, cliProcess, cliConsole);
  // All mocked operations resolve through microtasks; setImmediate observes the
  // completed CLI chain without timers or an arbitrary sleep.
  await new Promise<void>(jest.requireActual('node:timers').setImmediate);
  return { cliProcess, cliConsole };
}

it('runs successfully as a CLI without setting an error exit code or logging failure', async () => {
  mockDataSource.query.mockResolvedValue(mockDataSource.migrations);
  const { cliProcess, cliConsole } = await runCli();
  expect(mockDataSource.destroy).toHaveBeenCalledTimes(1);
  expect(cliProcess.exitCode).toBe(0);
  expect(cliConsole.error).not.toHaveBeenCalled();
});

it('reports CLI validation failure and exits nonzero after releasing the connection', async () => {
  mockDataSource.query.mockResolvedValue([]);
  const { cliProcess, cliConsole } = await runCli();
  expect(mockDataSource.destroy).toHaveBeenCalledTimes(1);
  expect(cliProcess.exitCode).toBe(1);
  expect(cliConsole.error).toHaveBeenCalledWith(
    'Database initialization validation failed:',
    expect.any(Error),
  );
});
