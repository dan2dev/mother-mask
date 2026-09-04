/**
 * The page a static host falls back to.
 *
 * Cloudflare's static-asset serving — and most file hosts — falls back to
 * `404.html` for any path that has no file behind it, so the build emits one.
 * It is a normal page of this site, chrome and all, which means someone who
 * mistyped a URL lands somewhere they can navigate out of rather than on a
 * bare host error.
 *
 * It is deliberately not in `ROUTES`: it must not appear in the nav, in
 * prev/next, or in the sitemap, and it is the one page that asks not to be
 * indexed.
 */
import type { Route } from './routes.ts'
import * as notFound from '../pages/not-found.ts'

export const NOT_FOUND: Route = {
  slug: 'not-found',
  path: '404.html',
  label: 'Not found',
  title: 'Page not found — mother-mask docs',
  description: 'That URL is not part of the mother-mask documentation.',
  priority: 0,
  noindex: true,
  page: notFound,
}
