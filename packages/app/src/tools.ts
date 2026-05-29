import type { WorkerHubClient } from './workerhub-client.js';
import { summarizeCategories, summarizeServices } from './workerhub-client.js';

export type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  run: (args: Record<string, unknown>) => Promise<unknown>;
};

export function createTools(api: WorkerHubClient): Tool[] {
  return [
    {
      name: 'workerhub_list_categories',
      description:
        'Fetch WorkerHub category list. Call ONLY when the user wants categories or service types from WorkerHub.',
      inputSchema: { type: 'object', properties: {} },
      async run() {
        return { categories: summarizeCategories(await api.listCategories()) };
      },
    },
    {
      name: 'workerhub_list_services',
      description:
        'Fetch WorkerHub services with provider and price. Call ONLY when the user asks what services exist, prices, or availability on WorkerHub.',
      inputSchema: {
        type: 'object',
        properties: {
          categoryId: { type: 'string' },
          providerId: { type: 'string' },
        },
      },
      async run(args) {
        return {
          services: summarizeServices(
            await api.listServices({
              categoryId: typeof args.categoryId === 'string' ? args.categoryId : undefined,
              providerId: typeof args.providerId === 'string' ? args.providerId : undefined,
            }),
          ),
        };
      },
    },
  ];
}

export function toolsForOllama(tools: Tool[]) {
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    },
  }));
}
