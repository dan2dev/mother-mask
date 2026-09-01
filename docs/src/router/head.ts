/**
 * The per-route half of `<head>`, described once and used twice.
 *
 * The prerenderer serializes these tags into each generated `.html` file, so a
 * crawler that never runs JavaScript still sees the right title, description,
 * canonical URL and structured data for the page it fetched. The client router
 * applies the same list to `document.head` after an in-page navigation, so the
 * tab title and anything reading the DOM stay correct as the SPA moves around.
 *
 * One description, two consumers: there is no second copy to forget.
 *
 * Tags that are identical on every page — charset, viewport, icons, manifest —
 * are not here. They live in the HTML shell in prerender.ts and are never
 * touched again.
 */
import { packageVersion } from 'virtual:package-meta'
import pageDates from 'virtual:page-dates'
import { AUTHOR, NPM_URL, REPO_URL, SITE_NAME, SITE_URL, SOCIAL_IMAGE, SOCIAL_IMAGE_ALT } from '../site.ts'
import { absoluteUrl } from './url.ts'
import type { Route } from './routes.ts'

export interface HeadTag {
  tag: 'title' | 'meta' | 'link' | 'script'
  attrs?: Record<string, string>
  /** Raw text content — the title, or a JSON-LD body. */
  text?: string
}

const SOFTWARE_ID = `${SITE_URL}#software`
const WEBSITE_ID = `${SITE_URL}#website`

export function headTagsFor(route: Route): HeadTag[] {
  const canonical = absoluteUrl(route.path)
  const isHome = route.path === ''

  const tags: HeadTag[] = [
    { tag: 'title', text: route.title },
    { tag: 'meta', attrs: { name: 'description', content: route.description } },
  ]

  if (route.keywords) tags.push({ tag: 'meta', attrs: { name: 'keywords', content: route.keywords } })

  tags.push(
    { tag: 'meta', attrs: { name: 'author', content: AUTHOR.name } },
    { tag: 'meta', attrs: { name: 'robots', content: route.noindex ? 'noindex, nofollow' : 'index, follow' } },
    { tag: 'link', attrs: { rel: 'canonical', href: canonical } },
    { tag: 'meta', attrs: { property: 'og:type', content: 'website' } },
    { tag: 'meta', attrs: { property: 'og:site_name', content: SITE_NAME } },
    { tag: 'meta', attrs: { property: 'og:locale', content: 'en_US' } },
    { tag: 'meta', attrs: { property: 'og:url', content: canonical } },
    { tag: 'meta', attrs: { property: 'og:title', content: route.title } },
    { tag: 'meta', attrs: { property: 'og:description', content: route.description } },
    { tag: 'meta', attrs: { property: 'og:image', content: SOCIAL_IMAGE } },
    { tag: 'meta', attrs: { property: 'og:image:secure_url', content: SOCIAL_IMAGE } },
    { tag: 'meta', attrs: { property: 'og:image:type', content: 'image/png' } },
    { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
    { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
    { tag: 'meta', attrs: { property: 'og:image:alt', content: SOCIAL_IMAGE_ALT } },
    { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
    { tag: 'meta', attrs: { name: 'twitter:title', content: route.title } },
    { tag: 'meta', attrs: { name: 'twitter:description', content: route.description } },
    { tag: 'meta', attrs: { name: 'twitter:image', content: SOCIAL_IMAGE } },
    { tag: 'meta', attrs: { name: 'twitter:image:alt', content: SOCIAL_IMAGE_ALT } },
  )

  // Structured data describes a page to a search engine, so there is no point
  // attaching any to one that asks not to be indexed.
  if (!route.noindex) {
    tags.push({
      tag: 'script',
      attrs: { type: 'application/ld+json' },
      text: JSON.stringify(structuredData(route, canonical)),
    })

    if (!isHome) {
      tags.push({
        tag: 'script',
        attrs: { type: 'application/ld+json' },
        text: JSON.stringify(breadcrumb(route, canonical)),
      })
    }
  }

  return tags
}

function webPage(route: Route, canonical: string): object {
  return {
    '@type': 'WebPage',
    '@id': `${canonical}#webpage`,
    url: canonical,
    name: route.title,
    description: route.description,
    isPartOf: { '@type': 'WebSite', '@id': WEBSITE_ID, name: SITE_NAME, url: SITE_URL },
    about: { '@id': SOFTWARE_ID },
  }
}

/**
 * Documentation pages are `TechArticle`, not a bare `WebPage`. It is the type
 * schema.org defines for exactly this — instructions and reference for a
 * technical audience — and it carries the authorship and revision dates a
 * generic page has nowhere to put.
 *
 * `dateModified` comes from the page module's own commit history (see
 * vite/plugin-page-dates.ts) and is simply left off when git cannot say, rather
 * than falling back to the build date and claiming every page changed today.
 */
function techArticle(route: Route, canonical: string): object {
  const dates = pageDates[route.slug]

  return {
    '@type': 'TechArticle',
    '@id': `${canonical}#article`,
    headline: route.title,
    name: route.title,
    description: route.description,
    url: canonical,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${canonical}#webpage` },
    isPartOf: { '@type': 'WebSite', '@id': WEBSITE_ID, name: SITE_NAME, url: SITE_URL },
    about: { '@id': SOFTWARE_ID },
    author: { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url },
    image: SOCIAL_IMAGE,
    inLanguage: 'en',
    ...(dates?.created ? { datePublished: dates.created } : {}),
    ...(dates?.modified ? { dateModified: dates.modified } : {}),
  }
}

function softwareSourceCode(): object {
  return {
    '@type': 'SoftwareSourceCode',
    '@id': SOFTWARE_ID,
    name: SITE_NAME,
    description:
      'Zero-dependency TypeScript input masks with custom tokens, transforms, dynamic patterns, Unicode, segmented editing, and decimal formatting.',
    url: SITE_URL,
    codeRepository: REPO_URL,
    downloadUrl: NPM_URL,
    programmingLanguage: 'TypeScript',
    runtimePlatform: 'Browser',
    softwareVersion: packageVersion,
    license: 'https://opensource.org/licenses/MIT',
    keywords: [
      'input mask',
      'input masking',
      'TypeScript input mask',
      'JavaScript input mask',
      'browser form masks',
      'currency mask',
      'phone mask',
      'CPF mask',
      'CNPJ mask',
    ],
    author: { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url },
  }
}

function structuredData(route: Route, canonical: string): object {
  // The home page is the library's landing page: it describes the software
  // itself, and every other page's `about` points back at that one node.
  return route.path === ''
    ? { '@context': 'https://schema.org', '@graph': [softwareSourceCode(), webPage(route, canonical)] }
    : { '@context': 'https://schema.org', '@graph': [techArticle(route, canonical), webPage(route, canonical)] }
}

function breadcrumb(route: Route, canonical: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: route.label, item: canonical },
    ],
  }
}

// ── Serializing (prerender) ─────────────────────────────────────────────────

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function escapeAttribute(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]!)
}

/**
 * `</script>` inside a JSON-LD body would end the element early, so the slash
 * is escaped — legal JSON, and the parser never sees a closing tag.
 */
function escapeJsonLd(value: string): string {
  return value.replace(/<\//g, '<\\/')
}

/** Marks the tags the client router owns, so it can replace exactly these. */
export const HEAD_MARKER = 'data-head'

export function renderHeadTags(tags: readonly HeadTag[]): string {
  return tags
    .map((tag) => {
      const attrs = Object.entries(tag.attrs ?? {})
        .map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
        .join('')

      // <title> is not marked: the router sets `document.title` instead of
      // replacing the element, which is what browsers and assistive tech watch.
      if (tag.tag === 'title') return `<title>${escapeAttribute(tag.text ?? '')}</title>`
      if (tag.tag === 'link' || tag.tag === 'meta') return `<${tag.tag}${HEAD_ATTR}${attrs} />`

      return `<script${HEAD_ATTR}${attrs}>${escapeJsonLd(tag.text ?? '')}</script>`
    })
    .join('\n    ')
}

const HEAD_ATTR = ` ${HEAD_MARKER}`

// ── Applying (client navigation) ────────────────────────────────────────────

/**
 * Swap the managed tags for this route's. Every tag the prerenderer wrote
 * carries `data-head`, so the whole set is replaced at once and nothing the
 * shell owns — icons, manifest, the theme script — is disturbed.
 */
export function applyHeadTags(tags: readonly HeadTag[]): void {
  for (const existing of document.head.querySelectorAll(`[${HEAD_MARKER}]`)) existing.remove()

  const fragment = document.createDocumentFragment()

  for (const tag of tags) {
    if (tag.tag === 'title') {
      document.title = tag.text ?? ''
      continue
    }

    const element = document.createElement(tag.tag)
    element.setAttribute(HEAD_MARKER, '')
    for (const [name, value] of Object.entries(tag.attrs ?? {})) element.setAttribute(name, value)
    if (tag.text !== undefined) element.textContent = tag.text
    fragment.append(element)
  }

  document.head.append(fragment)
}
