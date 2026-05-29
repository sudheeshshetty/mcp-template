# widget

**Required (build).** Embeddable chat micro-frontend.

```bash
pnpm --filter @mcp-chat-template/widget build
```

Output: `dist/chat-widget.js` — served by chat-api at `/chat-widget.js` or host on your CDN.

```html
<link rel="stylesheet" href="http://localhost:8787/chat-widget.css" />
<script src="http://localhost:8787/chat-widget.js" data-api-url="http://localhost:8787" defer></script>
<div id="mcp-chat"></div>
```

(`mountChatWidget` injects the stylesheet automatically if you omit the link.)

Full guide: [docs/GUIDE.md § Widget](../docs/GUIDE.md#6-the-micro-frontend-widget)
