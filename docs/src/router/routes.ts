/**
 * The one list of pages.
 *
 * Adding an entry here is the whole job of adding a page: it registers the
 * route with the client router, gives the sidebar, mobile menu, footer and
 * prev/next links their entry, supplies the `<title>`/description/JSON-LD the
 * prerenderer writes into that page's HTML, and tells the build which file to
 * emit and which URL to put in the sitemap.
 *
 * Order is the reading order of the docs, and drives prev/next.
 *
 * Pages are imported statically rather than behind `import()`. The whole site
 * is a few pages of markup plus the mask demos, so a single bundle downloads in
 * one round trip, every navigation is synchronous, and there is no loading
 * state to design, flash, or hydrate around. Split them if that stops being
 * true.
 */
import type { PageModule } from './page.ts'

import * as overview from '../pages/overview.ts'
import * as quickStart from '../pages/quick-start.ts'
import * as examples from '../pages/examples.ts'
import * as advancedPatterns from '../pages/advanced-patterns.ts'
import * as editing from '../pages/editing.ts'
import * as decimals from '../pages/decimals.ts'
import * as regional from '../pages/regional.ts'
import * as patterns from '../pages/patterns.ts'
import * as cdn from '../pages/cdn.ts'
import * as api from '../pages/api.ts'

export interface Route {
  /** Stable id used to mark the active nav link. */
  slug: string
  /**
   * The file this page is served as, relative to the deploy base. `''` is the
   * home page (`index.html`). Doubles as the route key and the link target.
   */
  path: string
  /** Sidebar, mobile menu and breadcrumb label. */
  label: string
  /** `<title>` — each page's own, not the site name. */
  title: string
  /** `<meta name="description">`, and the og/twitter description. */
  description: string
  /** Home page only; every other page ranks on its content. */
  keywords?: string
  /** Relative sitemap weight. */
  priority: number
  /** Keep this page out of search results and out of the sitemap. */
  noindex?: boolean
  page: PageModule
}

export const ROUTES: readonly Route[] = [
  {
    slug: 'overview',
    path: '',
    label: 'Overview',
    title: 'mother-mask — TypeScript input masks for browser forms',
    description:
      'Zero-dependency TypeScript input masks with custom tokens, Unicode, dynamic patterns and decimal formatting. Documentation, API reference and live examples.',
    keywords:
      'input mask, input masking, TypeScript input mask, JavaScript input mask, browser form masks, currency mask, phone mask, CPF mask, CNPJ mask',
    priority: 1.0,
    page: overview,
  },
  {
    slug: 'quick-start',
    path: 'quick-start.html',
    label: 'Quick start',
    title: 'Quick start — mother-mask docs',
    description:
      'Install mother-mask and bind your first TypeScript input mask in a few lines: HTML input, bind(), and cleanup on dispose.',
    priority: 0.8,
    page: quickStart,
  },
  {
    slug: 'examples',
    path: 'examples.html',
    label: 'Examples',
    title: 'Examples — mother-mask docs',
    description:
      'Live mother-mask examples: CPF, CNPJ, CEP, phone, date, time, license plates, credit cards, and currency input masks.',
    priority: 0.8,
    page: examples,
  },
  {
    slug: 'advanced-patterns',
    path: 'advanced-patterns.html',
    label: 'Custom patterns',
    title: 'Custom tokens & dynamic patterns — mother-mask docs',
    description:
      'Define custom mask tokens, transforms, Unicode letters, and content-dependent patterns with resolveMask in mother-mask.',
    priority: 0.7,
    page: advancedPatterns,
  },
  {
    slug: 'editing',
    path: 'editing.html',
    label: 'Editing',
    title: 'Segmented editing — mother-mask docs',
    description:
      'How mother-mask handles segmented editing, eager literals, and backspace behavior across independent mask fields.',
    priority: 0.7,
    page: editing,
  },
  {
    slug: 'decimals',
    path: 'decimals.html',
    label: 'Decimals',
    title: 'Decimal formatting — mother-mask docs',
    description:
      'Format currency, quantities, and decimals with bindDecimal — prefixes, suffixes, locale separators, and fixed widths.',
    priority: 0.7,
    page: decimals,
  },
  {
    slug: 'regional',
    path: 'regional.html',
    label: 'Regional',
    title: 'Regional formats — mother-mask docs',
    description:
      'US, Canada, Germany, and Poland input mask examples with mother-mask: phone, SSN, ZIP+4, dates, postal code, SIN, IBAN, and VAT ID.',
    priority: 0.7,
    page: regional,
  },
  {
    slug: 'patterns',
    path: 'patterns.html',
    label: 'Patterns',
    title: 'Pattern syntax — mother-mask docs',
    description:
      'mother-mask pattern syntax reference: digit, letter, and alphanumeric tokens, bounded quantifiers, custom tokens, and escaped literals.',
    priority: 0.7,
    page: patterns,
  },
  {
    slug: 'cdn',
    path: 'cdn.html',
    label: 'CDN',
    title: 'UMD / CDN — mother-mask docs',
    description:
      'Use mother-mask directly from a CDN with the UMD build and the global MotherMask object — no bundler required.',
    priority: 0.6,
    page: cdn,
  },
  {
    slug: 'api',
    path: 'api.html',
    label: 'API',
    title: 'API reference — mother-mask docs',
    description:
      'Full mother-mask API reference: bind and bindDecimal, the pure formatting helpers applyMask, process and unmaskDecimal, and every TypeScript type.',
    priority: 0.8,
    page: api,
  },
]

const BY_PATH = new Map(ROUTES.map((route) => [route.path, route]))

export const HOME: Route = ROUTES[0]!

export function routeByPath(path: string): Route | undefined {
  return BY_PATH.get(path)
}

/**
 * The pages either side of this one, for the prev/next footer links. A slug
 * outside the reading order — the 404 page — simply has no neighbours, rather
 * than being an error.
 */
export function neighbours(slug: string): { prev?: Route; next?: Route } {
  const i = ROUTES.findIndex((item) => item.slug === slug)
  if (i === -1) return {}
  return { prev: ROUTES[i - 1], next: ROUTES[i + 1] }
}
