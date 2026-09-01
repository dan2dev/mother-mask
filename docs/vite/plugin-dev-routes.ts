/**
 * Makes the dev server answer the same URLs the built site does.
 *
 * Every page is deployed as a real `.html` file, so links point at
 * `quick-start.html` rather than `/quick-start`. In development those files do
 * not exist yet, and Vite's SPA fallback does not rewrite a request that names
 * one — so a reload on any page but the home page would 404.
 *
 * Rewriting only `.html` requests under the base is deliberately narrow: it
 * covers every route this site has, and cannot swallow Vite's own dev URLs
 * (`@vite/client`, `@fs/…`), which carry no extension.
 */
import type { Plugin } from 'vite'
import { BASE_PATH } from '../src/site.ts'

export function devRoutesPlugin(): Plugin {
  return {
    name: 'mother-mask-docs:dev-routes',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const path = req.url?.split('?')[0]
        if (path?.startsWith(BASE_PATH) && path.endsWith('.html')) req.url = BASE_PATH
        next()
      })
    },
  }
}
