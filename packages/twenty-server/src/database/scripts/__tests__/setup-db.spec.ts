import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { transformSync } from '@swc/core';

const mockDataSource = {
  initialize: jest.fn(),
  query: jest.fn(),
  destroy: jest.fn(),
  isInitialized: false,
};

jest.mock('src/database/typeorm/raw/raw.datasource', () => ({
  rawDataSource: mockDataSource,
}));

const originalExitCode = process.exitCode;
const originalFdwEnabled = process.env.IS_FDW_ENABLED;

beforeEach(() => {
  jest.useRealTimers();
  jest.resetModules();
  jest.resetAllMocks();
  process.exitCode = undefined;
  delete process.env.IS_FDW_ENABLED;
  mockDataSource.isInitialized = false;
  mockDataSource.initialize.mockImplementation(async () => {
    mockDataSource.isInitialized = true;
  });
  mockDataSource.query.mockResolvedValue([]);
  mockDataSource.destroy.mockResolvedValue(undefined);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  process.exitCode = originalExitCode;
  if (originalFdwEnabled === undefined) {
    delete process.env.IS_FDW_ENABLED;
  } else {
    process.env.IS_FDW_ENABLED = originalFdwEnabled;
  }
  jest.restoreAllMocks();
});

async function runSetup() {
  await import('../setup-db');
  // The entrypoint intentionally exports no promise. A real event-loop turn
  // allows its finite chain of mocked database promises to settle.
  await new Promise<void>((resolve) => setImmediate(resolve));
}

it('creates the required schemas and extensions before closing successfully', async () => {
  await runSetup();

  expect(mockDataSource.initialize).toHaveBeenCalledTimes(1);
  expect(mockDataSource.query.mock.calls.map(([sql]) => sql)).toEqual([
    'CREATE SCHEMA IF NOT EXISTS "public"',
    'CREATE SCHEMA IF NOT EXISTS "core"',
    'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"',
    'CREATE EXTENSION IF NOT EXISTS "unaccent"',
    'CREATE EXTENSION IF NOT EXISTS "citext"',
    expect.stringContaining(
      'CREATE OR REPLACE FUNCTION public.unaccent_immutable',
    ),
  ]);
  expect(mockDataSource.destroy).toHaveBeenCalledTimes(1);
  expect(mockDataSource.destroy.mock.invocationCallOrder[0]).toBeGreaterThan(
    mockDataSource.query.mock.invocationCallOrder[5],
  );
  expect(console.error).not.toHaveBeenCalled();
  expect(process.exitCode).toBeUndefined();
});

it('sets a failing exit code without querying or closing an unopened connection', async () => {
  const error = new Error('connection refused');
  mockDataSource.initialize.mockRejectedValueOnce(error);

  await runSetup();

  expect(process.exitCode).toBe(1);
  expect(console.error).toHaveBeenCalledWith(
    'Error during Data Source initialization:',
    error,
  );
  expect(mockDataSource.query).not.toHaveBeenCalled();
  expect(mockDataSource.destroy).not.toHaveBeenCalled();
});

it('stops on a required SQL failure and closes the initialized connection', async () => {
  const error = new Error('permission denied');
  mockDataSource.query.mockResolvedValueOnce([]).mockRejectedValueOnce(error);

  await runSetup();

  expect(process.exitCode).toBe(1);
  expect(mockDataSource.query).toHaveBeenCalledTimes(2);
  expect(console.error).toHaveBeenCalledWith(
    'Error during Data Source initialization:',
    error,
  );
  expect(mockDataSource.destroy).toHaveBeenCalledTimes(1);
});

it('skips existing foreign wrappers and creates missing wrappers with their handlers', async () => {
  process.env.IS_FDW_ENABLED = 'true';
  mockDataSource.query.mockImplementation(async (sql, parameters) => {
    if (sql.startsWith('SELECT 1 FROM pg_foreign_data_wrapper')) {
      return parameters[0] === 'airtable_fdw' ? [{ exists: 1 }] : [];
    }
    return [];
  });

  await runSetup();

  const queries = mockDataSource.query.mock.calls.map(([sql]) => sql);
  expect(queries).toContain('CREATE EXTENSION IF NOT EXISTS "postgres_fdw"');
  expect(queries).toContain('CREATE EXTENSION IF NOT EXISTS "wrappers"');
  expect(queries).toContain('CREATE EXTENSION IF NOT EXISTS "mysql_fdw"');
  const creates = queries.filter((sql) =>
    sql.includes('CREATE FOREIGN DATA WRAPPER'),
  );
  expect(creates).toHaveLength(6);
  expect(creates.join('\n')).not.toContain('"airtable_fdw"');
  expect(creates.join('\n')).toContain('HANDLER "big_query_fdw_handler"');
  expect(creates.join('\n')).toContain('VALIDATOR "click_house_fdw_validator"');
  expect(mockDataSource.query).toHaveBeenCalledWith(
    'SELECT 1 FROM pg_foreign_data_wrapper WHERE fdwname = $1',
    ['stripe_fdw'],
  );
  expect(mockDataSource.destroy).toHaveBeenCalledTimes(1);
  expect(process.exitCode).toBeUndefined();
});

it('exits unsuccessfully when closing the connection fails', () => {
  const filename = require.resolve('../setup-db');
  const { code } = transformSync(readFileSync(filename, 'utf8'), {
    filename,
    swcrc: false,
    jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
    module: { type: 'commonjs' },
  });
  // A separate Node process preserves the actual unhandled-rejection exit
  // behavior of this command-line script without terminating the Jest runner.
  const child = spawnSync(process.execPath, ['--unhandled-rejections=strict'], {
    input: `
      const dataSource = {
        initialize: async () => {},
        isInitialized: true,
        destroy: async () => { throw new Error('cleanup connection failed'); },
      };
      const load = (name) => {
        if (name === 'src/database/typeorm/raw/raw.datasource') {
          return { rawDataSource: dataSource };
        }
        if (name === './setup-db-utils') {
          return { performQuery: async () => {} };
        }
        throw new Error('Unexpected import: ' + name);
      };
      new Function('require', 'exports', ${JSON.stringify(code)})(load, {});
    `,
    env: { ...process.env, IS_FDW_ENABLED: 'false' },
    encoding: 'utf8',
    timeout: 10000,
  });

  expect(child.error).toBeUndefined();
  expect(child.signal).toBeNull();
  expect(child.status).toBe(1);
  expect(child.stderr).toContain('cleanup connection failed');
});
