/**
 * URL shapes, in one place.
 *
 * Every page's canonical URL is its route path with no extension —
 * `/quick-start`, `/api`, and `/` for home — resolved fresh per request by
 * src/app-handler.ts rather than baked into files on disk, so there's no
 * host-side rewrite rule to keep in sync with this module.
 */

import { BASE_PATH, SITE_URL } from '../site.ts'

/**
 * Deploy path, always with a trailing slash — `/` today, or a project path if
 * that ever changes. Derived from `site.ts`'s `BASE_PATH` (also what
 * `vite.config.ts` sets as Vite's `base`) rather than reading
 * `import.meta.env.BASE_URL` directly: this module is imported by
 * src/app-handler.ts, which is bundled both by Vite (dev-mode SSR) and by
 * Wrangler's own bundler (the Cloudflare Pages Function) — the latter never
 * defines `import.meta.env`, Vite-injected globals only exist for code Vite
 * itself builds.
 */
export const BASE: string = normalizeBase(BASE_PATH)

function normalizeBase(base: string | undefined): string {
  if (!base) return '/'
  return base.endsWith('/') ? base : `${base}/`
}

/** Site-relative URL for a route path or a file in `public/`. */
export function href(path: string): string {
  return `${BASE}${path}`
}

/** Absolute production URL for a route path — canonical tags, JSON-LD, sitemap. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path}`
}

/**
 * Reduce a browser pathname to the route path it addresses, or `null` when the
 * URL is outside this deployment.
 *
 * Accepts every spelling a person or another site might produce for the same
 * page — the canonical `/api`, a lingering `/api.html` bookmark or backlink
 * from before this site dropped the extension, `/api/`, `/index.html` — and
 * resolves all of them to the one canonical form (`api`). src/app-handler.ts
 * renders that route either way, and 301-redirects the address bar to the
 * canonical spelling when the request didn't already use it.
 */
export function routePathFromPathname(pathname: string): string | null {
  const decoded = safeDecode(pathname)
  const withBase = decoded.startsWith('/') ? decoded : `/${decoded}`

  if (!withBase.startsWith(BASE)) {
    // Tolerate the base without its trailing slash — relevant if BASE is ever
    // a subdirectory again, e.g. `/mother-mask` is the directory itself, which
    // every host resolves to `/mother-mask/`.
    if (`${withBase}/` !== BASE) return null
    return ''
  }

  const rest = withBase.slice(BASE.length).replace(/^\/+|\/+$/g, '')
  if (rest === '' || rest === 'index.html') return ''
  return rest.endsWith('.html') ? rest.slice(0, -'.html'.length) : rest
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
