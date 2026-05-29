import { callMcpTool, getOllamaToolsFromMcp } from './mcp-client.js';
const ollamaUrl = () => (process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434').replace(/\/+$/, '');
const model = () => (process.env.OLLAMA_MODEL ?? 'llama3.1').trim();
const SYSTEM = `You are a friendly WorkerHub assistant.

Always write a direct reply to the user in the "content" field. Never say "no response needed" or explain what you will not do.

Use workerhub_* tools ONLY when the user asks about WorkerHub categories, services, providers, or prices.
For greetings (hi, hello), thanks, or general chat — reply warmly WITHOUT calling any tool.

After tool results, summarize in plain English (prices in ₹ = pricePaise / 100).`;
const BAD_REPLY = /no response is needed|no response needed|do not respond|don't respond|i will not respond|no need to respond|no tools? (are|were) (required|needed)/i;
function parseArgs(raw) {
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw);
        }
        catch {
            return {};
        }
    }
    return raw && typeof raw === 'object' ? raw : {};
}
async function ollamaChat(body) {
    let res;
    try {
        res = await fetch(`${ollamaUrl()}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: model(), stream: false, ...body }),
        });
    }
    catch {
        throw new Error(`Cannot reach Ollama at ${ollamaUrl()}. Run: ollama serve && ollama pull ${model()}`);
    }
    if (!res.ok)
        throw new Error(`Ollama ${res.status}: ${await res.text()}`);
    return (await res.json());
}
async function chatPlain(userMessage) {
    const { message } = await ollamaChat({
        messages: [
            {
                role: 'system',
                content: 'You are a friendly assistant for WorkerHub. Reply directly and briefly to the user.',
            },
            { role: 'user', content: userMessage },
        ],
    });
    return (message?.content ?? '').trim();
}
export async function chat(userMessage) {
    const ollamaTools = await getOllamaToolsFromMcp();
    const toolsUsed = [];
    const messages = [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: userMessage },
    ];
    for (let round = 0; round < 8; round++) {
        const { message } = await ollamaChat({ messages, tools: ollamaTools });
        if (!message)
            throw new Error('Empty Ollama response');
        const calls = message.tool_calls;
        if (calls?.length) {
            messages.push({ role: 'assistant', content: message.content ?? '', tool_calls: calls });
            for (const { function: fn } of calls) {
                toolsUsed.push(fn.name);
                try {
                    const text = await callMcpTool(fn.name, parseArgs(fn.arguments));
                    messages.push({ role: 'tool', content: text });
                }
                catch (e) {
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
        if (!reply)
            throw new Error('Empty reply from Ollama');
        return { reply, toolsUsed };
    }
    throw new Error('Too many tool rounds');
}
export async function ollamaUp() {
    try {
        return (await fetch(`${ollamaUrl()}/api/tags`, { signal: AbortSignal.timeout(3000) })).ok;
    }
    catch {
        return false;
    }
}
