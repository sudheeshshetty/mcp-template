# WorkerHub MCP + Ollama chat demo

**Isolated experiment** — lives only under `mcp/`. Not wired into CI, infra, or the main app. Delete this folder to remove all traces.

## What it does

- **App** (`packages/app`) — HTTP API + Ollama tool loop + WorkerHub tools **in-process** (no MCP subprocess for the web demo)
- **Chat widget** (`packages/web`) — Vite UI → `POST /chat`

```text
Browser → app (8787) → Ollama (11434)
                    → WorkerHub API (direct fetch)
```

## Why Ollama sometimes misbehaves

`llama3.1` with tools always enabled is weak at choosing **chat vs tool**. You may see:

- Meta replies like “no response needed” on “hi”
- Tools called when you only wanted small talk

Mitigations in this demo:

- Stronger system prompt (always reply; tools only for WorkerHub data questions)
- If the model returns a bad/meta reply, a **second call without tools** retries plain chat

For better tool routing, try `OLLAMA_MODEL=qwen2.5` (after `ollama pull qwen2.5`).

## Prerequisites

1. **Node.js 20+** and **pnpm**
2. **Ollama**: `ollama serve` and `ollama pull llama3.1`
3. **WorkerHub API** + **JWT** for `GET /services` (`WORKERHUB_ACCESS_TOKEN` in `mcp/.env`)

## Setup

```bash
cd mcp
cp .env.example .env
pnpm install
pnpm build
```

## Run

```bash
cd mcp
pnpm dev
```

- Chat UI: **http://localhost:5174**
- API: **http://localhost:8787**

```bash
pnpm dev:app   # API only
pnpm dev:web   # UI only
```

## Smoke tests

```bash
curl -s http://localhost:8787/health | jq
curl -s -X POST http://localhost:8787/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"hi"}' | jq
curl -s -X POST http://localhost:8787/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"What categories are on WorkerHub?"}' | jq
```

## Environment

| Variable | Description |
|----------|-------------|
| `WORKERHUB_API_BASE_URL` | API base |
| `WORKERHUB_ACCESS_TOKEN` | JWT for services |
| `OLLAMA_BASE_URL` | Default `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | Default `llama3.1` |
| `BRIDGE_PORT` | HTTP port, default `8787` |
| `VITE_BRIDGE_URL` | Web → API URL |

## Delete

`rm -rf mcp` from repo root (stop `pnpm dev` first).
