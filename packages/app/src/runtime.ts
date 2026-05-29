import { config } from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorkerHubClient } from './workerhub-client.js';
import { createTools, type Tool } from './tools.js';

config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

let tools: Tool[] | null = null;

export function getTools(): Tool[] {
  if (!tools) {
    const baseUrl = (process.env.WORKERHUB_API_BASE_URL ?? '').trim();
    if (!baseUrl) throw new Error('WORKERHUB_API_BASE_URL is required in mcp/.env');
    const api = createWorkerHubClient({
      baseUrl,
      accessToken: process.env.WORKERHUB_ACCESS_TOKEN,
    });
    tools = createTools(api);
  }
  return tools;
}

export async function runTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const tool = getTools().find((t) => t.name === name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  try {
    return JSON.stringify(await tool.run(args), null, 2);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(msg);
  }
}
