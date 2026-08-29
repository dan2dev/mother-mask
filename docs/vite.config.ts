import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import pkg from '../packages/mother-mask/package.json' with { type: 'json' }

const root = dirname(fileURLToPath(import.meta.url))
const pages = [
  'index',
  'quick-start',
  'examples',
  'advanced-patterns',
  'editing',
  'decimals',
  'regional',
  'patterns',
  'cdn',
  'api',
]

export default defineConfig({
  base: './',
  plugins: [{
    name: 'package-version',
    transformIndexHtml: (html) => html.replaceAll('__MOTHER_MASK_VERSION__', pkg.version),
  }],
  build: {
    rollupOptions: {
      input: Object.fromEntries(pages.map((page) => [page, resolve(root, `${page}.html`)])),
    },
  },
})
