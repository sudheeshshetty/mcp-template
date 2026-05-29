import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerWorkerHubTools } from './tools/index.js';

export function createWorkerHubMcpServer(): McpServer {
  const server = new McpServer({ name: 'workerhub', version: '1.0.0' });
  registerWorkerHubTools(server);
  return server;
}
