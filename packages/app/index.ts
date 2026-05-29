import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { config } from 'dotenv';
import type { Request, Response } from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorkerHubMcpServer } from './server.js';

const appDir = dirname(fileURLToPath(import.meta.url));
config({ path: join(appDir, '../../.env') });

const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
const mcp = createWorkerHubMcpServer();
await mcp.connect(transport);

const app = createMcpExpressApp();
const handle = (req: Request, res: Response, body?: unknown) =>
  transport.handleRequest(req, res, body);

app.post('/mcp', (req, res) => void handle(req, res, req.body));
app.get('/mcp', (req, res) => void handle(req, res));
app.delete('/mcp', (req, res) => void handle(req, res));

const port = Number(process.env.MCP_PORT ?? 8788);
app.listen(port, '127.0.0.1', () => {
  console.error(`WorkerHub MCP server  http://127.0.0.1:${port}/mcp`);
});
