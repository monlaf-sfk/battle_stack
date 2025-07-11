import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(),],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173, // 🔐 Fixed port for Google OAuth
    host: true,
    fs: {
      // Allow serving files from monaco-editor
      allow: ['..', './node_modules/monaco-editor'],
    },
    allowedHosts: ['battlestack.me', 'www.battlestack.me', 'localhost'],
  },
  optimizeDeps: {
    include: ['@monaco-editor/react', 'monaco-editor'],
    exclude: [
      'monaco-editor/esm/vs/language/typescript/ts.worker',
      'monaco-editor/esm/vs/language/json/json.worker',
      'monaco-editor/esm/vs/language/css/css.worker',
      'monaco-editor/esm/vs/language/html/html.worker',
      'monaco-editor/esm/vs/editor/editor.worker'
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ['monaco-editor', '@monaco-editor/react'],
        },
      },
    },
  },
  define: {
    global: 'globalThis',
  },
  worker: {
    format: 'es',
  },
})
