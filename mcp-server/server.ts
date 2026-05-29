import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools } from './tools/index.js';

export function createMcpServer(): McpServer {
  const server = new McpServer({ name: 'mcp-chat-template', version: '1.0.0' });
  registerTools(server);
  return server;
}
