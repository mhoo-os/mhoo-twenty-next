const mockDataSource = {
  initialize: jest.fn(),
  query: jest.fn(),
  destroy: jest.fn(),
  isInitialized: true,
  migrations: [
    { name: 'Initial1700000000000' },
    { name: 'Later1700000000001' },
  ],
};

jest.mock('typeorm', () => ({
  DataSource: jest.fn().mockImplementation(() => mockDataSource),
}));
jest.mock('src/database/typeorm/core/core.datasource', () => ({
  typeORMCoreModuleOptions: {},
}));

import { checkInitialization } from '../check-db-initialization';

beforeEach(() => {
  jest.clearAllMocks();
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
