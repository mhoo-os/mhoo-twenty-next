// Server-only implementation. Dependencies are supplied by the native function,
// never by a request payload. The synthetic proof supplies an in-memory provider.
export type CloverConnection = {
  id: string;
  providerName: string;
  handle: string;
  accessToken: string;
  authFailedAt: string | null;
};

type Dependencies = {
  list: () => Promise<CloverConnection[]>;
  get: (id: string) => Promise<CloverConnection>;
  fetch: typeof fetch;
};

export const readCloverMerchant = async (dependencies: Dependencies) => {
  try {
    const connections = await dependencies.list();
    if (connections.length !== 1) throw new Error('Ambiguous connection');
    // Re-resolve immediately before use, so a disconnect after listing denies.
    const connection = await dependencies.get(connections[0].id);
    if (
      connection.providerName !== 'clover-manual' ||
      connection.authFailedAt ||
      !/^[A-Z0-9]{13}$/.test(connection.handle)
    ) {
      throw new Error('Unavailable connection');
    }
    const response = await dependencies.fetch(
      `https://api.clover.com/v3/merchants/${connection.handle}?fields=id,name`,
      {
        method: 'GET',
        redirect: 'error',
        signal: AbortSignal.timeout(8000),
        headers: { Authorization: `Bearer ${connection.accessToken}` },
      },
    );
    if (!response.ok) throw new Error('Provider failure');
    // Bound streamed data before parsing; provider bodies are untrusted.
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Empty response');
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 16384) throw new Error('Oversized response');
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (
      data.id !== connection.handle ||
      typeof data.name !== 'string' ||
      data.name.includes(connection.accessToken)
    )
      throw new Error('Invalid merchant');
    return {
      merchantId: connection.handle,
      merchantName: data.name.slice(0, 200),
      scopeVerification: 'unknown' as const,
    };
  } catch {
    // Never serialize SDK/provider errors, which may contain credentials.
    throw new Error(
      'Clover connection unavailable. Check the connection and try again.',
    );
  }
};
