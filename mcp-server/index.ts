import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { config } from 'dotenv';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMcpServer } from './server.js';

const root = dirname(fileURLToPath(import.meta.url));
config({ path: join(root, '../.env') });

// Stateful sessions: required for reliable Streamable HTTP with the MCP SDK client
// (stateless mode breaks after initialize when the client sends notifications/initialized).
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
});
const mcp = createMcpServer();
await mcp.connect(transport);

const app = createMcpExpressApp();
const handle = (req: Request, res: Response, body?: unknown) =>
  transport.handleRequest(req, res, body);

app.post('/mcp', (req, res) => void handle(req, res, req.body));
app.get('/mcp', (req, res) => void handle(req, res));
app.delete('/mcp', (req, res) => void handle(req, res));

const port = Number(process.env.MCP_PORT ?? 8788);
app.listen(port, '127.0.0.1', () => {
  console.error(`MCP server listening at http://127.0.0.1:${port}/mcp`);
});
