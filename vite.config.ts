import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Simple Chrome Extension build config (no @crxjs needed for initial dev)
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        dashboard: resolve(__dirname, 'src/dashboard/index.html'),
        content: resolve(__dirname, 'src/content/index.ts'),
        background: resolve(__dirname, 'src/background/index.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
    target: 'chrome100',
    minify: false, // Keep readable for debugging
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
