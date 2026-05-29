import { getMcpServerUrl } from '@workerhub-mcp/app/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

type OllamaTool = {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

let client: Client | null = null;
let ollamaTools: OllamaTool[] | null = null;

export async function connectMcpClient(): Promise<Client> {
  if (client) return client;

  const url = getMcpServerUrl();
  const transport = new StreamableHTTPClientTransport(new URL(url));

  client = new Client({ name: 'workerhub-web-host', version: '1.0.0' });
  try {
    await client.connect(transport);
  } catch (e) {
    client = null;
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Cannot connect to MCP server at ${url}. Start it first: pnpm dev:mcp (${msg})`,
    );
  }
  return client;
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
