/**
 * Writes the site.
 *
 * Runs after both Vite builds — the client bundle in `dist/`, the server build
 * in `.ssr/` — and turns every route into a real file: `index.html`,
 * `quick-start.html`, `api.html`, and so on. What gets deployed is therefore
 * exactly what a plain file host already knows how to serve. No rewrite rules,
 * no server, and nothing a crawler or a reader with JavaScript off has to
 * execute before there is a page.
 *
 * The bundle each file links is the same app: it hydrates onto this markup
 * instead of replacing it, and from that point the site behaves as a
 * single-page app. The files are what the first request gets.
 *
 * `dist/index.html` — the shell Vite built, with the hashed script and
 * stylesheet already in it — is the template, so asset names never have to be
 * reconstructed from the manifest by hand.
 *
 * Also emits `404.html`, which is what most static hosts (Cloudflare's
 * static-asset serving included) serve for a path with no file behind it, and
 * `sitemap.xml`, generated from the same route table as the pages.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import { BASE_PATH, SITE_URL } from './src/site.ts'
import type { RenderedPage } from './src/entry-server.ts'

/**
 * The server build of src/entry-server.ts. Loading it through a computed URL
 * rather than a literal path is deliberate: the file only exists after
 * `vite build --ssr`, so a literal import would be unresolvable to `tsc` on a
 * clean checkout. The cast gives the real module's types back.
 */
const { PAGES, renderRoute } = (await import(
  new URL('./.ssr/entry-server.js', import.meta.url).href
)) as typeof import('./src/entry-server.ts')

const OUT_DIR = resolve(import.meta.dirname, 'dist')

/** Markers in index.html that this script fills in. */
const HEAD_SLOT = '<!--app-head-->'
const HTML_SLOT = '<!--app-html-->'
const ROUTE_SLOT = 'data-route="dev"'

/**
 * Every replacement goes through a function, never a string.
 * `String.prototype.replace` reads `$&`, `$'` and friends in a replacement
 * *string* as insertion patterns — and one of the code samples on this site is
 * `bindDecimal(input, { prefix: '$' })`, whose `$'` would splice the rest of
 * the template into the middle of a page. A replacer function is passed the
 * value verbatim.
 */
function documentFor(template: string, page: RenderedPage): string {
  const body = page.bodyClass ? `<body class="${page.bodyClass}">` : '<body>'

  return template
    .replace(ROUTE_SLOT, () => `data-route="${page.path}"`)
    .replace('<body>', () => body)
    .replace(HEAD_SLOT, () => page.head)
    .replace(HTML_SLOT, () => page.html)
}

/**
 * `lastmod` is printed only for pages whose commit history actually supplies a
 * date. Stamping today's date on everything at build time is the common way to
 * do this and the wrong one: a `lastmod` that moves on every deploy tells a
 * crawler nothing, and teaches it to ignore the field for this site entirely.
 */
function sitemap(pages: readonly RenderedPage[]): string {
  const urls = pages
    .filter((page) => !page.route.noindex)
    .map((page) => {
      const lastmod = page.lastModified ? `\n    <lastmod>${page.lastModified}</lastmod>` : ''
      return `  <url>
    <loc>${SITE_URL}${page.path}</loc>${lastmod}
    <changefreq>monthly</changefreq>
    <priority>${page.route.priority.toFixed(1)}</priority>
  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}

async function write(file: string, contents: string): Promise<void> {
  const target = resolve(OUT_DIR, file)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, contents, 'utf8')
}

const template = await readFile(resolve(OUT_DIR, 'index.html'), 'utf8')

for (const marker of [HEAD_SLOT, HTML_SLOT, ROUTE_SLOT]) {
  if (!template.includes(marker)) throw new Error(`dist/index.html is missing the ${marker} slot — is index.html still the build entry?`)
}

const rendered = PAGES.map(renderRoute)

console.log(`prerendering ${rendered.length} pages to ${BASE_PATH}`)

for (const page of rendered) {
  const file = page.path === '' ? 'index.html' : page.path
  const html = documentFor(template, page)
  await write(file, html)
  console.log(`  ${file.padEnd(24)} ${(html.length / 1024).toFixed(1)} kB`)
}

await write('sitemap.xml', sitemap(rendered))
const indexed = rendered.filter((page) => !page.route.noindex)
const dated = indexed.filter((page) => page.lastModified).length
console.log(`  ${'sitemap.xml'.padEnd(24)} ${indexed.length} URLs, ${dated} with lastmod`)
