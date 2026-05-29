#!/usr/bin/env bash
set -euo pipefail

MODEL="${OLLAMA_MODEL:-llama3.1}"

echo "==> MCP Chat Template — Ollama setup"
echo "    Model: ${MODEL}"

if ! command -v ollama >/dev/null 2>&1; then
  echo ""
  echo "Ollama is not installed."
  echo "Install from https://ollama.com/download (macOS, Linux, Windows)."
  echo "Then re-run: pnpm setup:ollama"
  exit 1
fi

echo "==> Pulling model (may take a few minutes)..."
ollama pull "${MODEL}"

echo ""
echo "Done. Ensure Ollama is running (macOS: open the Ollama app)."
echo "  curl http://127.0.0.1:11434/api/tags"
echo ""
echo "You do NOT need: ollama run ${MODEL}"
echo ""
echo "Then run the template:"
echo "  pnpm dev"
