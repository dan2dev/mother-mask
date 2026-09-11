/**
 * Writes `dist/sitemap.xml` from the route table and the git-derived page
 * dates (see update-page-dates.ts). Run after `vite build` so `dist/` exists.
 *
 * `lastmod` is printed only for pages whose commit history actually supplies a
 * date. Stamping today's date on everything at build time is the common way to
 * do this and the wrong one: a `lastmod` that moves on every deploy tells a
 * crawler nothing, and teaches it to ignore the field for this site entirely.
 *
 * This used to be part of prerender.ts, generated alongside every page's HTML
 * file in the same pass. Under per-request SSR there is no more per-page
 * prerendering loop to piggyback on, so it's its own small step — the content
 * and logic are unchanged.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { BASE_PATH, SITE_URL } from '../src/site.ts'
import { ROUTES } from '../src/router/routes.ts'
import { NOT_FOUND } from '../src/router/not-found.ts'
import pageDates from '../src/generated/page-dates.ts'

const OUT_DIR = resolve(import.meta.dirname, '../dist')

function sitemap(): string {
  const pages = [...ROUTES, NOT_FOUND].filter((route) => !route.noindex)

  const urls = pages
    .map((route) => {
      const lastmod = pageDates[route.slug]?.modified
      const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''
      return `  <url>
    <loc>${SITE_URL}${route.path}</loc>${lastmodTag}
    <changefreq>monthly</changefreq>
    <priority>${route.priority.toFixed(1)}</priority>
  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}

console.log(`writing sitemap.xml to ${BASE_PATH}`)
await mkdir(OUT_DIR, { recursive: true })
await writeFile(resolve(OUT_DIR, 'sitemap.xml'), sitemap(), 'utf8')

const pages = [...ROUTES, NOT_FOUND].filter((route) => !route.noindex)
const dated = pages.filter((route) => pageDates[route.slug]?.modified).length
console.log(`  sitemap.xml: ${pages.length} URLs, ${dated} with lastmod`)
