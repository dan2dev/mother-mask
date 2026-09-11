import { defineConfig } from 'vite'

import { ssrDevPlugin } from './vite/plugin-ssr-dev.ts'
import { BASE_PATH } from './src/site.ts'

export default defineConfig({
  // The site is deployed at its own domain's root, and the same value
  // reaches the client as `import.meta.env.BASE_URL`.
  base: BASE_PATH,

  plugins: [ssrDevPlugin()],

  // There is no `index.html` — every page is server-rendered per request
  // (src/app-handler.ts) rather than prerendered, so Vite has no HTML page to
  // serve or transform by default. `appType: 'custom'` turns that default
  // behavior off entirely; plugin-ssr-dev.ts's middleware takes over instead.
  appType: 'custom',

  server: {
    // Accept any Host header. The dev server otherwise rejects requests from
    // the ephemeral *.trycloudflare.com tunnel hostnames, which change on every
    // run and so cannot be listed individually.
    allowedHosts: true,
  },

  build: {
    // No HTML entry — the client bundle is just src/main.ts. The HTML shell
    // lives as a template string in src/app-handler.ts instead, filled in per
    // request using this build's manifest (below).
    rollupOptions: { input: 'src/main.ts' },
    // Emits `dist/.vite/manifest.json`, mapping this entry to its real hashed
    // output files — src/app-handler.ts's `buildProdTransform` reads it to
    // inject the right `<script>`/`<link>` tags into every response.
    manifest: true,
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
  },
})
