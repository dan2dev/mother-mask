// @ts-check
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://dan2dev.github.io',
  base: '/mother-mask',
  // `trailingSlash` only governs dev-server route matching (and on-demand/SSR
  // redirects) — it has no effect on the static build's output filenames,
  // which come from `build.format` below. Leaving it at the default
  // ('ignore') means `astro dev` matches both `/mother-mask` and
  // `/mother-mask/`, matching how any static host (GitHub Pages included)
  // actually resolves a directory URL to its index.html.
  build: {
    // One `<name>.html` file per page (src/pages/api.astro -> /api.html),
    // matching every URL already indexed by public/sitemap.xml.
    format: 'file',
  },
})
