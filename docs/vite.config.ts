import { defineConfig } from 'vite'

import { devRoutesPlugin } from './vite/plugin-dev-routes.ts'
import { packageMetaPlugin } from './vite/plugin-package-meta.ts'
import { pageDatesPlugin } from './vite/plugin-page-dates.ts'
import { snippetsPlugin } from './vite/plugin-snippets.ts'
import { BASE_PATH } from './src/site.ts'

export default defineConfig({
  // GitHub Pages serves this project from a subdirectory, and the same value
  // reaches the client as `import.meta.env.BASE_URL`.
  base: BASE_PATH,

  plugins: [snippetsPlugin(), packageMetaPlugin(), pageDatesPlugin(), devRoutesPlugin()],

  server: {
    // Accept any Host header. The dev server otherwise rejects requests from
    // the ephemeral *.trycloudflare.com tunnel hostnames, which change on every
    // run and so cannot be listed individually.
    allowedHosts: true,
  },

  preview: {
    port: 4331,
    strictPort: true,
  },

  build: {
    // `index.html` is the entry, so Vite writes the shell with its hashed
    // script and stylesheet already inlined; prerender.ts uses that file as the
    // template for every page rather than rebuilding the tags from a manifest.
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
  },
})
