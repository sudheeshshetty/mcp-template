import cors from 'cors';
import { config } from 'dotenv';
import express from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeMcpClient, connectMcpClient } from './mcp-client.js';
import { chat, ollamaUp } from './ollama.js';
const webDir = dirname(fileURLToPath(import.meta.url));
config({ path: join(webDir, '../../../.env') });
await connectMcpClient();
const http = express();
http.use(cors({ origin: ['http://localhost:5174', 'http://127.0.0.1:5174'] }));
http.use(express.json());
http.get('/health', async (_req, res) => {
    res.json({ ok: (await ollamaUp()) && Boolean(process.env.WORKERHUB_API_BASE_URL?.trim()) });
});
http.post('/chat', async (req, res) => {
    const message = String(req.body?.message ?? '').trim();
    if (!message) {
        res.status(400).json({ error: 'message is required' });
        return;
    }
    try {
        res.json(await chat(message));
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    }
});
const port = Number(process.env.BRIDGE_PORT ?? 8787);
const server = http.listen(port, () => {
    console.error('Web API → @workerhub-mcp/app (stdio) + Ollama');
    console.error(`POST http://localhost:${port}/chat`);
});
const shutdown = async () => {
    await closeMcpClient();
    server.close();
    process.exit(0);
};
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
