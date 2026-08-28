import { defineConfig } from 'vite'
import pkg from '../packages/mother-mask/package.json' with { type: 'json' }

export default defineConfig({
  base: './',
  plugins: [{
    name: 'package-version',
    transformIndexHtml: (html) => html.replaceAll('__MOTHER_MASK_VERSION__', pkg.version),
  }],
})
