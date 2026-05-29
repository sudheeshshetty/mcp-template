import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/chat-widget.ts'),
      name: 'McpChatWidget',
      fileName: () => 'chat-widget.js',
      formats: ['iife'],
    },
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false,
  },
});
