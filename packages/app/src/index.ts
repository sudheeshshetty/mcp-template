import cors from 'cors';
import express from 'express';
import { chat, ollamaUp } from './chat.js';

const app = express();
app.use(cors({ origin: ['http://localhost:5174', 'http://127.0.0.1:5174'] }));
app.use(express.json());

app.get('/health', async (_req, res) => {
  res.json({ ok: (await ollamaUp()) && Boolean(process.env.WORKERHUB_API_BASE_URL?.trim()) });
});

app.post('/chat', async (req, res) => {
  const message = String(req.body?.message ?? '').trim();
  if (!message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }
  try {
    res.json(await chat(message));
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.listen(Number(process.env.BRIDGE_PORT ?? 8787), () => {
  console.log('http://localhost:' + (process.env.BRIDGE_PORT ?? 8787) + '  POST /chat');
});
