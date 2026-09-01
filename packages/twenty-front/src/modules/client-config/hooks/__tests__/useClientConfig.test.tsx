import { act, renderHook } from '@testing-library/react';
import { Provider as JotaiProvider, createStore } from 'jotai';
import { type ReactNode } from 'react';

import { brandState } from '@/client-config/states/brandState';
import { clientConfigApiStatusState } from '@/client-config/states/clientConfigApiStatusState';
import { useClientConfig } from '@/client-config/hooks/useClientConfig';
import { getClientConfig } from '@/client-config/utils/getClientConfig';
import { mockedClientConfig } from '~/testing/mock-data/config';

jest.mock('@/client-config/utils/getClientConfig', () => ({
  getClientConfig: jest.fn(),
}));

const mockedGetClientConfig = jest.mocked(getClientConfig);

const createConfig = (productName: string) => ({
  ...mockedClientConfig,
  brand: {
    ...mockedClientConfig.brand,
    productName,
  },
});

const renderUseClientConfig = () => {
  const store = createStore();
  const rendered = renderHook(() => useClientConfig(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <JotaiProvider store={store}>{children}</JotaiProvider>
    ),
  });

  return { ...rendered, store };
};

describe('useClientConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('publishes the complete brand on initial load and successful refetch', async () => {
    const firstConfig = createConfig('Mhoo');
    const secondConfig = createConfig('Mhoo refreshed');
    mockedGetClientConfig
      .mockResolvedValueOnce(firstConfig)
      .mockResolvedValueOnce(secondConfig);

    const { result, store } = renderUseClientConfig();

    await act(async () => {
      await result.current.fetchClientConfig();
    });

    expect(store.get(brandState.atom)).toBe(firstConfig.brand);
    expect(
      store.get(clientConfigApiStatusState.atom).data?.clientConfig.brand,
    ).toBe(firstConfig.brand);

    await act(async () => {
      await result.current.refetch();
    });

    expect(store.get(brandState.atom)).toBe(secondConfig.brand);
    expect(
      store.get(clientConfigApiStatusState.atom).data?.clientConfig.brand,
    ).toBe(secondConfig.brand);
  });

  it('retains the last complete brand and config when refetch fails', async () => {
    const firstConfig = createConfig('Mhoo');
    mockedGetClientConfig
      .mockResolvedValueOnce(firstConfig)
      .mockRejectedValueOnce(new Error('network unavailable'));

    const { result, store } = renderUseClientConfig();

    await act(async () => {
      await result.current.fetchClientConfig();
    });

    await act(async () => {
      await result.current.refetch();
    });

    const status = store.get(clientConfigApiStatusState.atom);
    expect(store.get(brandState.atom)).toBe(firstConfig.brand);
    expect(status.data?.clientConfig).toBe(firstConfig);
    expect(status.isErrored).toBe(true);
    expect(status.error).toEqual(new Error('network unavailable'));
  });
});
