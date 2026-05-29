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

export type WorkerHubClient = ReturnType<typeof createWorkerHubClient>;

export function summarizeCategories(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const r = row as Record<string, unknown>;
    return { id: r.id, name: r.name, slug: r.slug };
  });
}

export function summarizeServices(raw: unknown): unknown[] {
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
