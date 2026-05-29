import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod';

export type WorkerHubClientConfig = {
  baseUrl: string;
  accessToken?: string;
};

function trimBase(url: string): string {
  return url.replace(/\/+$/, '');
}

export function createWorkerHubClient(config: WorkerHubClientConfig) {
  const baseUrl = trimBase(config.baseUrl);
  const token = (config.accessToken ?? '').trim();

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(init?.headers as Record<string, string>),
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}${path}`, { ...init, headers });
    const body = (await res.json().catch(() => ({}))) as {
      data?: T;
      message?: string | string[];
    };

    if (!res.ok) {
      const msg =
        typeof body.message === 'string'
          ? body.message
          : Array.isArray(body.message)
            ? body.message.join(', ')
            : res.statusText;
      if (res.status === 401) {
        throw new Error(
          'WorkerHub API 401: set WORKERHUB_ACCESS_TOKEN in mcp/.env (JWT from login).',
        );
      }
      throw new Error(`WorkerHub API ${res.status}: ${msg}`);
    }

    if (body && typeof body === 'object' && 'data' in body) return body.data as T;
    return body as T;
  }

  return {
    listCategories: () => request<unknown[]>('/categories'),
    listServices: (query?: { categoryId?: string; providerId?: string }) => {
      const params = new URLSearchParams({ status: 'ACTIVE' });
      if (query?.categoryId) params.set('categoryId', query.categoryId);
      if (query?.providerId) params.set('providerId', query.providerId);
      return request<unknown[]>(`/services?${params.toString()}`);
    },
  };
}

type WorkerHubClient = ReturnType<typeof createWorkerHubClient>;

function summarizeCategories(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const r = row as Record<string, unknown>;
    return { id: r.id, name: r.name, slug: r.slug };
  });
}

function summarizeServices(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const r = row as Record<string, unknown>;
    const category = r.category as Record<string, unknown> | null | undefined;
    const provider = r.provider as Record<string, unknown> | null | undefined;
    return {
      id: r.id,
      name: r.name,
      pricePaise: r.pricePaise,
      category: category ? { id: category.id, name: category.name } : null,
      provider: provider ? { id: provider.id, name: provider.name } : null,
    };
  });
}

let api: WorkerHubClient | null = null;

function getApi(): WorkerHubClient {
  if (!api) {
    const baseUrl = (process.env.WORKERHUB_API_BASE_URL ?? '').trim();
    if (!baseUrl) throw new Error('WORKERHUB_API_BASE_URL is required in mcp/.env');
    api = createWorkerHubClient({
      baseUrl,
      accessToken: process.env.WORKERHUB_ACCESS_TOKEN,
    });
  }
  return api;
}

async function listCategories() {
  return { categories: summarizeCategories(await getApi().listCategories()) };
}

async function listServices(args: Record<string, unknown>) {
  return {
    services: summarizeServices(
      await getApi().listServices({
        categoryId: typeof args.categoryId === 'string' ? args.categoryId : undefined,
        providerId: typeof args.providerId === 'string' ? args.providerId : undefined,
      }),
    ),
  };
}

function toolText(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/** Register WorkerHub tools on the MCP server. */
export function registerWorkerHubTools(server: McpServer): void {
  server.registerTool(
    'workerhub_list_categories',
    {
      description:
        'Fetch WorkerHub category list. Call ONLY when the user wants categories or service types from WorkerHub.',
      inputSchema: z.object({}),
    },
    async () => ({
      content: [{ type: 'text', text: toolText(await listCategories()) }],
    }),
  );

  server.registerTool(
    'workerhub_list_services',
    {
      description:
        'Fetch WorkerHub services with provider and price. Call ONLY when the user asks what services exist, prices, or availability on WorkerHub.',
      inputSchema: z.object({
        categoryId: z.string().optional(),
        providerId: z.string().optional(),
      }),
    },
    async (args) => ({
      content: [
        {
          type: 'text',
          text: toolText(await listServices(args as Record<string, unknown>)),
        },
      ],
    }),
  );
}
