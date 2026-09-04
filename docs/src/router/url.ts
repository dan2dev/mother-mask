/**
 * URL shapes, in one place.
 *
 * The site is deployed at the root of its own domain, on a host that only
 * serves files, so every page is a real `<name>.html` sitting at the site root:
 * `quick-start.html`, `api.html`, and `index.html` for the home page. A route's
 * `path` is exactly that filename — `''` for home — which means one string
 * serves as the route key, the link target, and the file the prerenderer
 * writes. Nothing has to translate between three spellings of the same page,
 * and no host-side rewrite rule is needed for a deep link to work.
 */

import { SITE_URL } from '../site.ts'

/** Deploy path, always with a trailing slash — `/` today, or a project path if that ever changes. */
export const BASE: string = normalizeBase(import.meta.env.BASE_URL)

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
 * page — `/api.html`, `/api`, `/api/` — and returns the one canonical form
 * (`api.html`). The extensionless forms only ever reach the client through a
 * host 404 fallback; resolving them anyway means such a link still lands on
 * the right page instead of an error.
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
  return rest.endsWith('.html') ? rest : `${rest}.html`
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
