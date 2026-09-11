/**
 * Turns a `Request` into an HTML `Response` — the one place a URL becomes a
 * page. Used identically by Vite's dev-mode SSR middleware (vite/plugin-ssr-dev.ts)
 * and the Cloudflare Pages Function (functions/[[path]].ts); only Fetch API
 * globals are used here (Request/Response/URL), no Vite-, Node-, Bun-, or
 * Workers-binding-specific API, so the same module works unmodified under
 * whichever bundler builds it.
 *
 * There is no prerendering: every request is server-rendered fresh via
 * `renderRoute()` (entry-server.ts), which is the same `renderToString()` +
 * `headTagsFor()` pipeline that used to run once per route at build time.
 * `src/main.ts` then `hydrate()`s onto exactly this markup — real per-request
 * SSR with genuine hydration, not prerendering.
 */
import { renderRoute } from './entry-server.ts'
import { NOT_FOUND } from './router/not-found.ts'
import { routeByPath, type Route } from './router/routes.ts'
import { href, routePathFromPathname } from './router/url.ts'

export interface ViteManifestEntry {
  file: string
  css?: string[]
  imports?: string[]
}

/** The shape of Vite's `.vite/manifest.json` (`build.manifest: true` in vite.config.ts). */
export type ViteManifest = Record<string, ViteManifestEntry>

/**
 * Present verbatim in the template so `transformHtml` has something to
 * replace: Vite's dev server rewrites it into an HMR-aware module URL
 * (`server.transformIndexHtml`); `buildProdTransform` below replaces it with
 * the real hashed asset tags for prod/Cloudflare.
 */
const DEV_SCRIPT_TAG = '<script type="module" src="/src/main.ts"></script>'

/**
 * Everything identical on every response: charset/viewport/icons/manifest,
 * theme-color, and the inline theme-flash-prevention script (kept in step
 * with src/lib/theme.ts). `{{head}}` and `{{html}}` are filled in per
 * request; `{{bodyAttrs}}` carries the home page's full-bleed layout class.
 */
const htmlTemplate = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
    <link rel="shortcut icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/site.webmanifest" />
    <meta name="apple-mobile-web-app-title" content="mother-mask" />
    <meta name="theme-color" content="#07080e" />
    {{head}}
    <script>
      /* Decides the theme before the first paint, so a cold load never flashes
         the wrong background. Kept in step with src/lib/theme.ts. */
      ;(function () {
        var stored = localStorage.getItem('theme')
        var theme = stored === 'dark' || stored === 'light' ? stored : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        document.documentElement.setAttribute('data-theme', theme)
        document.documentElement.style.colorScheme = theme
      })()
    </script>
    ${DEV_SCRIPT_TAG}
  </head>
  <body{{bodyAttrs}}>
    <div id="app">{{html}}</div>
  </body>
</html>
`

/**
 * Builds real hashed `<script>`/`<link>` tags from the Vite client manifest
 * and returns a `transformHtml` that swaps them in for the dev-time tag.
 * Mirrors nuclo/docs' `buildProdTransform` (src/app-handler.ts there).
 */
export function buildProdTransform(manifest: ViteManifest): (html: string) => string {
  const entry = manifest['src/main.ts']
  if (!entry) throw new Error("Vite manifest is missing the 'src/main.ts' entry — was `build.manifest` left off vite.config.ts?")

  const scriptTag = `<script type="module" crossorigin src="/${entry.file}"></script>`
  const cssTags = (entry.css ?? []).map((href) => `<link rel="stylesheet" crossorigin href="/${href}">`)
  const preloadTags = (entry.imports ?? [])
    .map((key) => manifest[key]?.file)
    .filter((file): file is string => Boolean(file))
    .map((file) => `<link rel="modulepreload" crossorigin href="/${file}">`)

  const prodTags = [scriptTag, ...cssTags, ...preloadTags].join('\n    ')

  return (html: string) => html.replace(DEV_SCRIPT_TAG, prodTags)
}

/** The route a pathname addresses, or the 404 page with a real 404 status. */
function resolveRoute(pathname: string): { route: Route; status: number } {
  const path = routePathFromPathname(pathname)
  const found = path === null ? undefined : routeByPath(path)
  return found ? { route: found, status: 200 } : { route: NOT_FOUND, status: 404 }
}

/**
 * The shared request pipeline: resolve the route, redirect to its canonical
 * URL if the request used another spelling, render it, inject it into the
 * shell, hand the result to `transformHtml` (dev HMR rewrite, or the prod
 * manifest-driven asset tags), respond.
 */
export async function appFetch(request: Request, transformHtml: (html: string) => string | Promise<string>): Promise<Response> {
  const url = new URL(request.url)
  const { route, status } = resolveRoute(url.pathname)

  // A known route reached via a non-canonical spelling — a legacy `.html`
  // link, a trailing slash, `/index.html` — gets sent to the one URL that's
  // ever linked, canonicalized, or put in the sitemap, rather than serving
  // duplicate content at two addresses. Unknown paths (status 404) have no
  // single canonical URL to redirect to, so those just render the 404 page.
  if (status !== 404 && url.pathname !== href(route.path)) {
    const canonical = new URL(`${href(route.path)}${url.search}${url.hash}`, url)
    return Response.redirect(canonical, 301)
  }

  const page = renderRoute(route)

  const bodyAttrs = page.bodyClass ? ` class="${page.bodyClass}"` : ''
  const filled = htmlTemplate.replace('{{head}}', () => page.head).replace('{{bodyAttrs}}', () => bodyAttrs).replace('{{html}}', () => page.html)

  const html = await transformHtml(filled)

  return new Response(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}
