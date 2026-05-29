import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerListEmployeesTool } from './sample-employees.js';

/**
 * Register all MCP tools on the server.
 * Add your tools here: import and call registerXxxTool(server).
 */
export function registerTools(server: McpServer): void {
  // Template sample — comment out if you do not run sample-server
  registerListEmployeesTool(server);
}
