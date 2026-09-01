/**
 * Build-time entry point: turns a route into the markup and the `<head>` the
 * prerenderer writes to disk.
 *
 * `nuclo/polyfill` has to be imported before `nuclo` — it installs the minimal
 * `document`/`Element` the builders create nodes through when there is no
 * browser. Import order in a module is source order, so the two lines below are
 * load-bearing; do not sort them.
 *
 * Nothing here is client code. The browser gets `main.ts`, which builds the
 * same tree from the same `createApp()` and hydrates onto this output.
 */
import 'nuclo/polyfill'
import 'nuclo'
import { renderToString } from 'nuclo/ssr'

import pageDates from 'virtual:page-dates'

import { createApp } from './app.ts'
import { headTagsFor, renderHeadTags } from './router/head.ts'
import { NOT_FOUND } from './router/not-found.ts'
import { ROUTES, type Route } from './router/routes.ts'

export interface RenderedPage {
  /** File to write, relative to the output directory. `''` means index.html. */
  path: string
  /** Serialized `<head>` tags for this route. */
  head: string
  /** The app tree, as it will sit inside `#app`. */
  html: string
  /** Class for `<body>`, so the home page's full-bleed layout is right on load. */
  bodyClass: string
  /**
   * ISO date this page's content last changed, from git, or null when the
   * history cannot say. The sitemap prints a `lastmod` only when it is set —
   * an invented date is worse than none.
   */
  lastModified: string | null
  route: Route
}

/** Every page the build emits: the documented routes plus the 404 fallback. */
export const PAGES: readonly Route[] = [...ROUTES, NOT_FOUND]

export function renderRoute(route: Route): RenderedPage {
  const { element } = createApp(route)

  return {
    path: route.path,
    head: renderHeadTags(headTagsFor(route)),
    html: renderToString(element),
    bodyClass: route.path === '' ? 'home-page' : '',
    lastModified: pageDates[route.slug]?.modified ?? null,
    route,
  }
}
