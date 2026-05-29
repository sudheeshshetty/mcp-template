# chat-api

**Required.** MCP host: Ollama (Llama) + MCP client. The widget only talks to this service.

- URL: `http://127.0.0.1:8787` — `POST /chat`, `GET /health`
- Serves `chat-widget.js` after `pnpm build` (from `widget/`)
- Run: `pnpm dev:api` (start `pnpm dev:mcp` first)

Full guide: [docs/GUIDE.md § Chat API](../docs/GUIDE.md#7-the-chat-api-chat-api)
