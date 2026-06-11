import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync, appendFileSync } from 'node:fs';

// DEV-only diagnostics sink: the app (when opened with ?diag=1) measures its
// own SVG rendering and POSTs the findings here — lets us debug WebKit/Safari
// rendering without screen access. Writes to /tmp/kutu-diag.log.
const diagPlugin = {
  name: 'kutu-diag',
  configureServer(server) {
    server.middlewares.use('/__diag', (req, res) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          appendFileSync('/tmp/kutu-diag.log', body + '\n');
          res.end('ok');
        });
      } else {
        res.end('diag');
      }
    });
  },
};

// `base` controls the URL prefix for built assets. v1 is local-only, so '/'.
// When this deploys to GitHub Pages at <user>.github.io/kutumbakam/, build
// with VITE_BASE=/kutumbakam/.
const BASE = process.env.VITE_BASE || '/';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

// Bake the short git SHA into the bundle (Lekka's pattern) so Settings can
// show exactly which build a device is running — indispensable when
// debugging "is your phone on the new version yet?".
let buildSha = 'dev';
try {
  const { execSync } = await import('node:child_process');
  buildSha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim();
} catch {
  // not a git checkout
}

export default defineConfig({
  base: BASE,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_SHA__: JSON.stringify(buildSha),
  },
  plugins: [
    diagPlugin,
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
