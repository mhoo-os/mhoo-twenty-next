import {
  CLIENT_CONFIG_REFRESH_INTERVAL_MS,
  isClientConfigStale,
} from '@/client-config/components/ClientConfigProviderEffect';

describe('client config refresh policy', () => {
  it('treats an unknown or expired fetch as stale', () => {
    const now = 10_000;

    expect(isClientConfigStale(undefined, now)).toBe(true);
    expect(
      isClientConfigStale(now - CLIENT_CONFIG_REFRESH_INTERVAL_MS, now),
    ).toBe(true);
    expect(
      isClientConfigStale(now - CLIENT_CONFIG_REFRESH_INTERVAL_MS + 1, now),
    ).toBe(false);
  });
});
