import { rawDataSource } from 'src/database/typeorm/raw/raw.datasource';

import { camelToSnakeCase, performQuery } from '../setup-db-utils';

jest.mock('src/database/typeorm/raw/raw.datasource', () => ({
  rawDataSource: { query: jest.fn() },
}));

it('propagates required SQL failures to the setup runner', async () => {
  const error = new Error('permission denied to create extension');

  jest.mocked(rawDataSource.query).mockRejectedValueOnce(error);
  await expect(
    performQuery('CREATE EXTENSION citext', 'citext', false),
  ).rejects.toBe(error);
});

it('only tolerates already-existing optional objects when explicitly requested', async () => {
  jest
    .mocked(rawDataSource.query)
    .mockRejectedValueOnce(new Error('already exists'));
  await expect(
    performQuery('CREATE FOREIGN DATA WRAPPER example', 'wrapper', false, true),
  ).resolves.toBeUndefined();
});

it('does not swallow unrelated errors for optional existing objects', async () => {
  const error = new Error('permission denied');

  jest.mocked(rawDataSource.query).mockRejectedValueOnce(error);
  await expect(
    performQuery('CREATE FOREIGN DATA WRAPPER example', 'wrapper', false, true),
  ).rejects.toBe(error);
});

afterEach(() => jest.restoreAllMocks());

it('returns query results and logs success by default', async () => {
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  const rows = [{ schema_name: 'core' }];
  jest.mocked(rawDataSource.query).mockResolvedValueOnce(rows);
  await expect(
    performQuery('SELECT schema_name', 'schema lookup'),
  ).resolves.toBe(rows);
  expect(rawDataSource.query).toHaveBeenCalledWith('SELECT schema_name');
  expect(log).toHaveBeenCalledWith("Performed 'schema lookup' successfully");
});

it('returns successful results quietly when logging is disabled', async () => {
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.mocked(rawDataSource.query).mockResolvedValueOnce([]);
  await expect(performQuery('SELECT 1', 'lookup', false)).resolves.toEqual([]);
  expect(log).not.toHaveBeenCalled();
});

it('logs explicitly tolerated existing-object errors', async () => {
  const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
  jest
    .mocked(rawDataSource.query)
    .mockRejectedValueOnce(new Error('already exists'));
  await expect(
    performQuery('CREATE WRAPPER example', 'wrapper', true, true),
  ).resolves.toBeUndefined();
  expect(errorLog).toHaveBeenCalledWith("Performed 'wrapper' successfully");
});

it.each([
  ['bigQuery', 'big_query'],
  ['clickHouse', 'click_house'],
  ['simple', 'simple'],
  ['', ''],
])('converts wrapper name %s to %s', (input, expected) => {
  expect(camelToSnakeCase(input)).toBe(expected);
});
