import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Chrome Extension build — three passes:
// 1. Default: popup + dashboard HTML pages (can chunk freely)
// 2. BUILD_TARGET=content: self-contained IIFE content script
// 3. BUILD_TARGET=background: self-contained IIFE background script

const target = process.env.BUILD_TARGET;
const alias = { '@': resolve(__dirname, 'src') };

function scriptConfig(entry: string, name: string, fileName: string): UserConfig {
  return {
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        entry: resolve(__dirname, entry),
        formats: ['iife'],
        name,
        fileName: () => fileName,
      },
      target: 'chrome100',
      minify: false,
    },
    resolve: { alias },
  };
}

let config: UserConfig;

if (target === 'content') {
  config = scriptConfig('src/content/index.ts', 'FeedCleanerContent', 'content.js');
} else {
  config = {
    plugins: [react()],
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'src/popup/index.html'),
          dashboard: resolve(__dirname, 'src/dashboard/index.html'),
          background: resolve(__dirname, 'src/background/index.ts'),
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: 'assets/[name][extname]',
        },
      },
      target: 'chrome100',
      minify: false,
    },
    resolve: { alias },
  };
}

export default defineConfig(config);
