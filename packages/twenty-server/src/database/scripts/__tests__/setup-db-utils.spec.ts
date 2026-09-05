import { rawDataSource } from 'src/database/typeorm/raw/raw.datasource';

import { performQuery } from '../setup-db-utils';

jest.mock('src/database/typeorm/raw/raw.datasource', () => ({
  rawDataSource: { query: jest.fn() },
}));

it('propagates required SQL failures to the setup runner', async () => {
  const error = new Error('permission denied to create extension');

  jest.mocked(rawDataSource.query).mockRejectedValueOnce(error);
  await expect(performQuery('CREATE EXTENSION citext', 'citext', false)).rejects.toBe(error);
});

it('only tolerates already-existing optional objects when explicitly requested', async () => {
  jest.mocked(rawDataSource.query).mockRejectedValueOnce(new Error('already exists'));
  await expect(performQuery('CREATE FOREIGN DATA WRAPPER example', 'wrapper', false, true)).resolves.toBeUndefined();
});

it('does not swallow unrelated errors for optional existing objects', async () => {
  const error = new Error('permission denied');

  jest.mocked(rawDataSource.query).mockRejectedValueOnce(error);
  await expect(performQuery('CREATE FOREIGN DATA WRAPPER example', 'wrapper', false, true)).rejects.toBe(error);
});
