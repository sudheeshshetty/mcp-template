export type ChatWidgetOptions = {
  bridgeUrl?: string;
  title?: string;
};

type ChatMessage = {
  role: 'user' | 'assistant' | 'error';
  text: string;
  toolsUsed?: string[];
};

const DEFAULT_BRIDGE =
  import.meta.env.VITE_BRIDGE_URL ?? 'http://localhost:8787';

export function mountChatWidget(
  container: HTMLElement,
  options: ChatWidgetOptions = {},
): () => void {
  const bridgeUrl = (options.bridgeUrl ?? DEFAULT_BRIDGE).replace(/\/+$/, '');
  const title = options.title ?? 'WorkerHub Assistant (Ollama + MCP)';

  container.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'wh-chat';
  root.innerHTML = `
    <header class="wh-chat__header">
      <h1 class="wh-chat__title"></h1>
      <p class="wh-chat__subtitle">Local demo — Ollama + MCP tools → WorkerHub API</p>
    </header>
    <div class="wh-chat__messages" role="log" aria-live="polite"></div>
    <form class="wh-chat__form">
      <input
        type="text"
        class="wh-chat__input"
        placeholder="Ask about services or categories…"
        autocomplete="off"
      />
      <button type="submit" class="wh-chat__send">Send</button>
    </form>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .wh-chat {
      width: 100%;
      max-width: 520px;
      height: min(640px, 90vh);
      display: flex;
      flex-direction: column;
      background: #16181c;
      border: 1px solid #2f3336;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    }
    .wh-chat__header {
      padding: 16px 20px;
      border-bottom: 1px solid #2f3336;
      background: #1a1f26;
    }
    .wh-chat__title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
    }
    .wh-chat__subtitle {
      margin: 4px 0 0;
      font-size: 0.75rem;
      color: #8b98a5;
    }
    .wh-chat__messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .wh-chat__bubble {
      max-width: 92%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 0.9rem;
      line-height: 1.45;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .wh-chat__bubble--user {
      align-self: flex-end;
      background: #1d9bf0;
      color: #fff;
    }
    .wh-chat__bubble--assistant {
      align-self: flex-start;
      background: #2f3336;
    }
    .wh-chat__bubble--error {
      align-self: flex-start;
      background: #3d2020;
      color: #f88;
    }
    .wh-chat__tools {
      margin-top: 8px;
      font-size: 0.7rem;
      color: #8b98a5;
    }
    .wh-chat__form {
      display: flex;
      gap: 8px;
      padding: 12px;
      border-top: 1px solid #2f3336;
    }
    .wh-chat__input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #2f3336;
      border-radius: 24px;
      background: #0f1419;
      color: #e7e9ea;
      font-size: 0.9rem;
    }
    .wh-chat__input:focus {
      outline: 2px solid #1d9bf0;
      outline-offset: 0;
    }
    .wh-chat__send {
      padding: 10px 18px;
      border: none;
      border-radius: 24px;
      background: #1d9bf0;
      color: #fff;
      font-weight: 600;
      cursor: pointer;
    }
    .wh-chat__send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;

  container.appendChild(style);
  container.appendChild(root);

  const titleEl = root.querySelector('.wh-chat__title') as HTMLElement;
  titleEl.textContent = title;

  const messagesEl = root.querySelector('.wh-chat__messages') as HTMLElement;
  const form = root.querySelector('.wh-chat__form') as HTMLFormElement;
  const input = root.querySelector('.wh-chat__input') as HTMLInputElement;
  const sendBtn = root.querySelector('.wh-chat__send') as HTMLButtonElement;

  const messages: ChatMessage[] = [];

  function render() {
    messagesEl.innerHTML = '';
    for (const m of messages) {
      const bubble = document.createElement('div');
      bubble.className = `wh-chat__bubble wh-chat__bubble--${m.role}`;
      bubble.textContent = m.text;
      if (m.toolsUsed?.length) {
        const tools = document.createElement('div');
        tools.className = 'wh-chat__tools';
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
      const res = await fetch(`${bridgeUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const body = (await res.json()) as {
        reply?: string;
        toolsUsed?: string[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error ?? res.statusText);
      }
      messages.push({
        role: 'assistant',
        text: body.reply ?? '(empty)',
        toolsUsed: body.toolsUsed,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      messages.push({ role: 'error', text: msg });
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

  render();
  input.focus();

  return () => {
    container.innerHTML = '';
    style.remove();
  };
}
