import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

// `base` controls the URL prefix for built assets. v1 is local-only, so '/'.
// When this deploys to GitHub Pages at <user>.github.io/kutumbakam/, build
// with VITE_BASE=/kutumbakam/.
const BASE = process.env.VITE_BASE || '/';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig({
  base: BASE,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt' (not 'autoUpdate') so the app can show a user-visible
      // "New version available — Reload" banner instead of swapping SWs
      // silently in the background.
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      devOptions: { enabled: true },
      manifest: {
        name: 'Kutumbakam',
        short_name: 'Kutumbakam',
        description: 'A private, local-first family tree',
        start_url: './',
        display: 'standalone',
        background_color: '#f7f3ec',
        theme_color: '#f7f3ec',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    port: 5180,
    strictPort: false,
  },
});
