import './styles.css';

export type ChatWidgetOptions = {
  /** Chat API base URL (POST /chat). Example: http://localhost:8787 */
  apiUrl?: string;
  title?: string;
};

type ChatMessage = {
  role: 'user' | 'assistant' | 'error';
  text: string;
  toolsUsed?: string[];
};

const DEFAULT_API = 'http://localhost:8787';

export function mountChatWidget(
  container: HTMLElement,
  options: ChatWidgetOptions = {},
): () => void {
  const apiUrl = (options.apiUrl ?? DEFAULT_API).replace(/\/+$/, '');
  const title = options.title ?? 'MCP Chat';

  container.innerHTML = '';

  const cssHref = `${apiUrl}/chat-widget.css`;
  if (!document.querySelector(`link[href="${cssHref}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssHref;
    document.head.appendChild(link);
  }

  const root = document.createElement('div');
  root.className = 'mcp-chat';
  root.innerHTML = `
    <header class="mcp-chat__header">
      <h1 class="mcp-chat__title"></h1>
      <p class="mcp-chat__subtitle">Ollama + MCP tools</p>
    </header>
    <div class="mcp-chat__messages" role="log" aria-live="polite"></div>
    <form class="mcp-chat__form">
      <input type="text" class="mcp-chat__input" placeholder="Say hi or ask about employees…" autocomplete="off" />
      <button type="submit" class="mcp-chat__send">Send</button>
    </form>
  `;

  const titleEl = root.querySelector('.mcp-chat__title') as HTMLElement;
  titleEl.textContent = title;

  const messagesEl = root.querySelector('.mcp-chat__messages') as HTMLElement;
  const form = root.querySelector('.mcp-chat__form') as HTMLFormElement;
  const input = root.querySelector('.mcp-chat__input') as HTMLInputElement;
  const sendBtn = root.querySelector('.mcp-chat__send') as HTMLButtonElement;

  const messages: ChatMessage[] = [];

  function render() {
    messagesEl.innerHTML = '';
    for (const m of messages) {
      const bubble = document.createElement('div');
      bubble.className = `mcp-chat__bubble mcp-chat__bubble--${m.role}`;
      bubble.textContent = m.text;
      if (m.toolsUsed?.length) {
        const tools = document.createElement('div');
        tools.className = 'mcp-chat__tools';
        tools.textContent = `Tools: ${m.toolsUsed.join(', ')}`;
        bubble.appendChild(tools);
      }
      messagesEl.appendChild(bubble);
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function send(text: string) {
    messages.push({ role: 'user', text });
    render();
    input.value = '';
    sendBtn.disabled = true;
    input.disabled = true;

    try {
      const res = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const body = (await res.json()) as {
        reply?: string;
        toolsUsed?: string[];
        error?: string;
      };
      if (!res.ok) throw new Error(body.error ?? res.statusText);
      messages.push({
        role: 'assistant',
        text: body.reply ?? '(empty)',
        toolsUsed: body.toolsUsed,
      });
    } catch (e) {
      messages.push({
        role: 'error',
        text: e instanceof Error ? e.message : String(e),
      });
    } finally {
      sendBtn.disabled = false;
      input.disabled = false;
      input.focus();
      render();
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (text) void send(text);
  });

  container.appendChild(root);
  render();
  input.focus();

  return () => {
    container.innerHTML = '';
  };
}

function findWidgetScript(): HTMLScriptElement | null {
  const byData = document.querySelector('script[data-api-url]');
  if (byData) return byData as HTMLScriptElement;
  const scripts = document.querySelectorAll('script[src*="chat-widget"]');
  return scripts.length ? (scripts[scripts.length - 1] as HTMLScriptElement) : null;
}

function autoInit(): void {
  const script = (document.currentScript as HTMLScriptElement | null) ?? findWidgetScript();
  const apiUrl = script?.dataset.apiUrl ?? DEFAULT_API;
  const title = script?.dataset.title;
  const containerId = script?.dataset.container ?? 'mcp-chat';
  const el = document.getElementById(containerId);
  if (!el) {
    console.warn(`[McpChatWidget] No element #${containerId}`);
    return;
  }
  mountChatWidget(el, { apiUrl, title });
}

if (typeof window !== 'undefined') {
  (window as Window & { McpChatWidget?: { mountChatWidget: typeof mountChatWidget } }).McpChatWidget =
    { mountChatWidget };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
}
