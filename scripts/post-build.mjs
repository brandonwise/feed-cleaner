#!/usr/bin/env node
// Post-build: copy manifest, icons, and CSS into dist/
import { cpSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dist = join(root, 'dist');

mkdirSync(join(dist, 'assets'), { recursive: true });

// Copy icons — check both locations
for (const size of [16, 48, 128]) {
  const candidates = [
    join(root, `public/icons/icon${size}.png`),
    join(root, `public/icons/icon-${size}.png`),
    join(root, `assets/icon-${size}.png`),
  ];
  for (const src of candidates) {
    try { cpSync(src, join(dist, `assets/icon-${size}.png`)); break; } catch {}
  }
}

// Copy CSS
try { cpSync(join(root, 'src/content/styles.css'), join(dist, 'assets/styles.css')); } catch {}

// Write manifest
const manifest = {
  manifest_version: 3,
  name: "Feed Cleaner — AI Content Filter",
  version: "2.0.0",
  description: "Transform your X feed. Filter AI slop, engagement bait, and bot content. See what's real.",
  permissions: ["storage"],
  host_permissions: ["https://x.com/*", "https://twitter.com/*"],
  content_scripts: [{
    matches: ["https://x.com/*", "https://twitter.com/*"],
    js: ["content.js"],
    css: ["assets/styles.css"],
    run_at: "document_idle",
  }],
  action: {
    default_popup: "src/popup/index.html",
    default_icon: { "16": "assets/icon-16.png", "48": "assets/icon-48.png", "128": "assets/icon-128.png" },
  },
  background: { service_worker: "background.js", type: "module" },
  icons: { "16": "assets/icon-16.png", "48": "assets/icon-48.png", "128": "assets/icon-128.png" },
};

writeFileSync(join(dist, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('✅ Post-build: manifest + assets copied to dist/');
