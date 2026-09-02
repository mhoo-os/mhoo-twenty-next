import { MCP_SETUP } from '@/settings/mcp-and-apis/constants/McpSetup';

export const buildMcpServerUrl = (serverBaseUrl: string) =>
  `${serverBaseUrl.replace(/\/+$/, '')}/mcp`;

export const isHttpsUrl = (url: string) => {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
};

export const buildMcpAuthorizationHeaders = () => ({
  [MCP_SETUP.authorizationHeader.key]: MCP_SETUP.authorizationHeader.value,
});

export const buildRemoteMcpServerConfig = (mcpServerUrl: string) => ({
  url: mcpServerUrl,
  headers: buildMcpAuthorizationHeaders(),
});

export const buildMcpConfig = (mcpServerUrl: string) =>
  JSON.stringify(
    {
      mcpServers: {
        [MCP_SETUP.server.name]: buildRemoteMcpServerConfig(mcpServerUrl),
      },
    },
    null,
    2,
  );

export const buildClaudeInstallLink = (
  mcpServerUrl: string,
  serverDisplayName: string = MCP_SETUP.server.displayName,
) => {
  const params = new URLSearchParams({
    modal: 'add-custom-connector',
    connectorName: serverDisplayName,
    connectorUrl: mcpServerUrl,
  });

  return `https://claude.ai/customize/connectors?${params.toString()}`;
};

export const buildCursorInstallLink = (mcpServerUrl: string) => {
  const config = btoa(JSON.stringify(buildRemoteMcpServerConfig(mcpServerUrl)));

  const params = new URLSearchParams({
    name: MCP_SETUP.server.name,
    config,
  });

  return `https://cursor.com/en/install-mcp?${params.toString()}`;
};

export const buildVsCodeInstallLink = (mcpServerUrl: string) =>
  `vscode:mcp/install?${encodeURIComponent(
    JSON.stringify({
      name: MCP_SETUP.server.name,
      type: 'http',
      url: mcpServerUrl,
      headers: buildMcpAuthorizationHeaders(),
    }),
  )}`;

export const buildGooseInstallLink = (
  mcpServerUrl: string,
  serverDisplayName: string = MCP_SETUP.server.displayName,
) => {
  const params = new URLSearchParams({
    url: mcpServerUrl,
    type: 'streamable_http',
    timeout: '300',
    id: MCP_SETUP.server.name,
    name: serverDisplayName,
    description: `Access your ${serverDisplayName} workspace through MCP`,
  });

  params.append(
    'header',
    `${MCP_SETUP.authorizationHeader.key}=${MCP_SETUP.authorizationHeader.value}`,
  );

  return `goose://extension?${params.toString()}`;
};

export const buildReplitInstallLink = (
  mcpServerUrl: string,
  serverDisplayName: string = MCP_SETUP.server.displayName,
) => {
  const payload = btoa(
    JSON.stringify({
      displayName: serverDisplayName,
      baseUrl: mcpServerUrl,
      headers: [
        {
          key: MCP_SETUP.authorizationHeader.key,
          value: MCP_SETUP.authorizationHeader.value,
        },
      ],
    }),
  );

  const params = new URLSearchParams({
    mcp: payload,
  });

  return `https://replit.com/integrations?${params.toString()}`;
};

export const buildLmStudioInstallLink = (mcpServerUrl: string) => {
  const config = btoa(JSON.stringify(buildRemoteMcpServerConfig(mcpServerUrl)));

  const params = new URLSearchParams({
    name: MCP_SETUP.server.name,
    config,
  });

  return `lmstudio://add_mcp?${params.toString()}`;
};
