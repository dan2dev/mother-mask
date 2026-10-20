/**
 * The site's router — nuclo-router, isomorphic.
 *
 * The server starts it once per request and renders inside that Route's
 * `run()` (src/entry-server.ts); the browser starts it once, before
 * `hydrate()` (src/main.ts). Both build the same tree around the same
 * `router.outlet()`, which is what lets hydration claim the server's nodes.
 *
 * Every page is eager — the table's loaders return the page's `view` itself,
 * not an `import()` — so a navigation lands before the next paint with no
 * pending state to design around. Links are plain `<a href>`s: nuclo-router's
 * one delegated listener takes the ones it owns and leaves every other click
 * (modifier keys, new tabs, external links, downloads) to the browser.
 */
import { createRouter, type RouteTable } from 'nuclo-router'

import { syncToc } from '../components/Toc.ts'
import { closeMobileMenu } from '../lib/chrome.ts'
import { applyHeadTags, headTagsFor } from './head.ts'
import { NOT_FOUND } from './not-found.ts'
import { ROUTES, routeByPath, type Route } from './routes.ts'
import { BASE } from './url.ts'

// `/${path}` is the route's canonical URL; `*` is everything else, rendered
// as the 404 page (src/app-handler.ts answers those with a real 404 status).
const table: RouteTable = {
  ...Object.fromEntries(ROUTES.map((route) => [`/${route.path}`, () => route.page.view])),
  '*': () => NOT_FOUND.page.view,
}

/** What `onNavigate` last put on screen, to tell a page change from a hash change. */
let shown: Route | undefined

export const router = createRouter(table, {
  base: BASE,
  // Browser only, once the DOM has caught up with the navigation.
  onNavigate: (ctx, kind) => {
    const route = activeRoute()
    const changed = route !== shown
    shown = route

    // The server already rendered this page's <head> and body class.
    if (kind === 'start') return

    closeMobileMenu()
    if (!changed) return

    applyHeadTags(headTagsFor(route))
    document.body.classList.toggle('home-page', route.path === '')
    // Opts client-side pages into global.css's fade-in; a cold load never has it.
    document.body.classList.add('navigated')

    // A hash is scrolled to by the router, and Back/Forward by the browser.
    // A new page otherwise starts at the top — `instant`, because global.css
    // sets `scroll-behavior: smooth` and the reader shouldn't watch the page
    // they just left scroll past. Focus moves to <main> so a screen reader
    // notices the page was replaced.
    if (!ctx.hash) {
      if (kind === 'push') window.scrollTo({ top: 0, behavior: 'instant' })
      document.getElementById('main-content')?.focus({ preventScroll: true })
    }
    syncToc()
  },
})

/**
 * The docs route the router is showing — or, on the server, the one whose
 * `run()` is rendering. Header, sidebar and prev/next read it through
 * state-dependent values, so they follow every navigation without rebuilding.
 */
export function activeRoute(): Route {
  const pattern = router.pattern
  return (pattern === '*' ? undefined : routeByPath(pattern.slice(1))) ?? NOT_FOUND
}
