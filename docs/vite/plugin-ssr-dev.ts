/**
 * Dev-mode counterpart to the Cloudflare Pages Function: makes `bun run dev`
 * server-render every request the same way production does, instead of
 * serving a static `index.html`.
 *
 * Registered with `vite.config.ts`'s `appType: 'custom'`, which disables
 * Vite's own HTML-serving behavior entirely (there is no `index.html` to
 * serve — see docs/README.md). `configureServer` returning a function runs it
 * *after* Vite's built-in middlewares (HMR client, `@fs`, and — importantly —
 * static file serving from `public/`), so by the time a request reaches this
 * middleware it has already failed to match a real static asset and is
 * either a page route or genuinely unknown; `appFetch` (src/app-handler.ts)
 * resolves that the same way the Cloudflare Function does.
 *
 * `server.transformIndexHtml` is Vite's dev-time HTML transform — it injects
 * the HMR client and rewrites the shell's dev-time `<script src="/src/main.ts">`
 * into a transformable module URL. It stands in for `buildProdTransform`
 * (also in app-handler.ts), which does the equivalent job for a real build
 * using the Vite manifest instead of a live dev server.
 *
 * `app-handler.ts` is loaded via `server.ssrLoadModule()` inside the request
 * handler, not as a normal top-level import: this file (and therefore
 * whatever it imports eagerly) is itself imported by `vite.config.ts` to
 * register the plugin, which runs in Vite's own config-loading context — a
 * plain Node/esbuild evaluation, not Vite's dev module graph. `app-handler.ts`
 * transitively reaches `router/url.ts`, which reads `import.meta.env.BASE_URL`
 * at module scope; that global only exists for modules Vite itself transforms
 * and loads, which `ssrLoadModule` does and a bare `import` at config-load
 * time does not (`import type` below is compile-time only, so it costs
 * nothing at runtime).
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import type { appFetch as AppFetch } from '../src/app-handler.ts'

function toFetchRequest(req: IncomingMessage): Request {
  const encrypted = (req.socket as { encrypted?: boolean }).encrypted
  const url = `${encrypted ? 'https' : 'http'}://${req.headers.host ?? 'localhost'}${req.url ?? '/'}`

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    if (Array.isArray(value)) for (const item of value) headers.append(key, item)
    else headers.set(key, value)
  }

  return new Request(url, { method: req.method, headers })
}

async function sendFetchResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status
  response.headers.forEach((value, key) => res.setHeader(key, value))
  res.end(await response.text())
}

export function ssrDevPlugin(): Plugin {
  return {
    name: 'mother-mask-docs:ssr-dev',
    apply: 'serve',
    configureServer(server) {
      return () => {
        server.middlewares.use((req, res, next) => {
          void (async () => {
            try {
              const { appFetch } = await server.ssrLoadModule('/src/app-handler.ts') as { appFetch: typeof AppFetch }
              const response = await appFetch(toFetchRequest(req), (html) => server.transformIndexHtml(req.url ?? '/', html))
              await sendFetchResponse(res, response)
            } catch (error) {
              next(error)
            }
          })()
        })
      }
    },
  }
}
