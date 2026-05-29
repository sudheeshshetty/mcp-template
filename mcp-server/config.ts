/** MCP HTTP endpoint (Streamable HTTP). Used by chat-api MCP client. */
export function getMcpServerUrl(): string {
  const raw = (process.env.MCP_SERVER_URL ?? 'http://127.0.0.1:8788/mcp').trim().replace(/\/+$/, '');
  return raw.endsWith('/mcp') ? raw : `${raw}/mcp`;
}
