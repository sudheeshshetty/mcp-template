import { getMcpServerUrl } from '@mcp-chat-template/mcp-server/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

type OllamaTool = {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

let client: Client | null = null;
let ollamaTools: OllamaTool[] | null = null;

export type ConnectMcpOptions = {
  /** Retries when MCP is still starting (e.g. `pnpm dev`). Default 0. */
  retries?: number;
  /** Delay between retries in ms. Default 500. */
  retryDelayMs?: number;
};

async function connectMcpClientOnce(): Promise<Client> {
  const url = getMcpServerUrl();
  const transport = new StreamableHTTPClientTransport(new URL(url));

  const c = new Client({ name: 'mcp-chat-template-host', version: '1.0.0' });
  try {
    await c.connect(transport);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Cannot connect to MCP server at ${url}. Start it first: pnpm dev:mcp (${msg})`,
    );
  }
  client = c;
  return c;
}

export async function connectMcpClient(opts?: ConnectMcpOptions): Promise<Client> {
  if (client) return client;

  const retries = opts?.retries ?? 0;
  const retryDelayMs = opts?.retryDelayMs ?? 500;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await connectMcpClientOnce();
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < retries) {
        console.error(
          `MCP not ready (${attempt + 1}/${retries + 1}), retrying in ${retryDelayMs}ms…`,
        );
        await new Promise((r) => setTimeout(r, retryDelayMs));
      }
    }
  }

  throw lastError!;
}

export async function getOllamaToolsFromMcp(): Promise<OllamaTool[]> {
  if (ollamaTools) return ollamaTools;

  const { tools } = await (await connectMcpClient()).listTools();
  ollamaTools = tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description ?? '',
      parameters: (t.inputSchema ?? { type: 'object', properties: {} }) as Record<
        string,
        unknown
      >,
    },
  }));
  return ollamaTools;
}

export async function callMcpTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const result = await (await connectMcpClient()).callTool({ name, arguments: args });

  if ('content' in result && Array.isArray(result.content)) {
    const text = result.content
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('\n');
    if (result.isError) throw new Error(text || `Tool ${name} failed`);
    if (text) return text;
  }

  return JSON.stringify(result, null, 2);
}

export async function closeMcpClient(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    ollamaTools = null;
  }
}
