/**
 * MCP host agent loop:
 * - Loads tools from MCP server (list_tools)
 * - Sends them to Ollama (Llama)
 * - When Ollama returns tool_calls, runs call_tool on MCP server
 * - Llama writes the final plain-language reply
 */

import { callMcpTool, getOllamaToolsFromMcp } from './mcp-client.js';

const ollamaUrl = () =>
  (process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434').replace(/\/+$/, '');
const model = () => (process.env.OLLAMA_MODEL ?? 'llama3.1').trim();

const SYSTEM = `You are a friendly assistant.

Always write a direct reply to the user in the "content" field. Never say "no response needed".

Use list_employees ONLY when the user asks about employees, staff, or team members.
For greetings (hi, hello), thanks, or general chat — reply warmly WITHOUT calling any tool.

After tool results, summarize in plain English.`;

const BAD_REPLY =
  /no response is needed|no response needed|do not respond|don't respond|i will not respond|no need to respond|no tools? (are|were) (required|needed)/i;

function parseArgs(raw: unknown): Record<string, unknown> {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

async function ollamaChat(body: Record<string, unknown>) {
  let res: Response;
  try {
    res = await fetch(`${ollamaUrl()}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: model(), stream: false, ...body }),
    });
  } catch {
    throw new Error(
      `Cannot reach Ollama at ${ollamaUrl()}. Run: ollama serve && ollama pull ${model()}`,
    );
  }
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  return (await res.json()) as {
    message?: {
      content?: string;
      tool_calls?: Array<{ function: { name: string; arguments: unknown } }>;
    };
  };
}

async function chatPlain(userMessage: string): Promise<string> {
  const { message } = await ollamaChat({
    messages: [
      {
        role: 'system',
        content: 'You are a friendly assistant. Reply directly and briefly.',
      },
      { role: 'user', content: userMessage },
    ],
  });
  return (message?.content ?? '').trim();
}

export async function chat(userMessage: string): Promise<{ reply: string; toolsUsed: string[] }> {
  const ollamaTools = await getOllamaToolsFromMcp();
  const toolsUsed: string[] = [];
  const messages: Array<Record<string, unknown>> = [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: userMessage },
  ];

  for (let round = 0; round < 8; round++) {
    const { message } = await ollamaChat({ messages, tools: ollamaTools });
    if (!message) throw new Error('Empty Ollama response');

    const calls = message.tool_calls;
    if (calls?.length) {
      messages.push({ role: 'assistant', content: message.content ?? '', tool_calls: calls });
      for (const { function: fn } of calls) {
        toolsUsed.push(fn.name);
        try {
          const text = await callMcpTool(fn.name, parseArgs(fn.arguments));
          messages.push({ role: 'tool', content: text });
        } catch (e) {
          const err = e instanceof Error ? e.message : String(e);
          messages.push({ role: 'tool', content: `Error: ${err}` });
        }
      }
      continue;
    }

    let reply = (message.content ?? '').trim();
    if (!reply || BAD_REPLY.test(reply)) {
      reply = await chatPlain(userMessage);
    }
    if (!reply) throw new Error('Empty reply from Ollama');
    return { reply, toolsUsed };
  }

  throw new Error('Too many tool rounds');
}

export async function ollamaUp(): Promise<boolean> {
  try {
    return (await fetch(`${ollamaUrl()}/api/tags`, { signal: AbortSignal.timeout(3000) })).ok;
  } catch {
    return false;
  }
}
