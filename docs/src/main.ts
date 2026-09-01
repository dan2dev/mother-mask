/**
 * Browser entry point.
 *
 * Every route arrives as a complete HTML document the build already wrote, so
 * this file's job is to adopt that document rather than replace it, and then
 * take over navigation. In order:
 *
 *  1. Work out which route the URL addresses.
 *  2. Build the same tree the build built, and `hydrate()` onto the existing
 *     markup — no nodes are re-created, so nothing moves or flashes.
 *  3. Start the router, which dispatches the current page immediately so its
 *     `setup()` runs and the masks come alive.
 *
 * Two situations serve markup that is not this URL's page: the host's 404
 * fallback (the document is `404.html`, but the URL may name a real page) and
 * the dev server (nothing is prerendered at all). `#app` carries the route it
 * was rendered for, so either mismatch is detected rather than guessed at, and
 * the page is rendered from scratch instead of hydrated onto the wrong tree.
 */
import 'nuclo'
import './styles/global.css'

import { createApp } from './app.ts'
import { initChrome, closeMobileMenu } from './lib/chrome.ts'
import { initTheme } from './lib/theme.ts'
import { applyHeadTags, headTagsFor } from './router/head.ts'
import { NOT_FOUND } from './router/not-found.ts'
import type { PageTeardown } from './router/page.ts'
import { startRouter, type Navigation } from './router/router.ts'
import { HOME, routeByPath, type Route } from './router/routes.ts'
import { BASE, routePathFromPathname } from './router/url.ts'

const container = document.getElementById('app')!
const prerenderedPath = container.dataset.route ?? ''

const requestedPath = routePathFromPathname(location.pathname)
const requested = requestedPath === null ? undefined : routeByPath(requestedPath)
const initial = requested ?? (prerenderedPath === NOT_FOUND.path ? NOT_FOUND : HOME)

const app = createApp(initial)

if (prerenderedPath === initial.path) {
  hydrate(app.element, container)
} else {
  // Either the host's 404 fallback served a different page than the URL names,
  // or this is the dev server, where nothing is prerendered. Neither leaves
  // anything worth claiming, so start clean — and, for the fallback, put the
  // canonical URL in the address bar so a reload or a share links to the real
  // file next time.
  container.replaceChildren()
  render(app.element, container)
  applyHeadTags(headTagsFor(initial))
  if (requested) history.replaceState({}, '', `${BASE}${requested.path}${location.hash}`)
}

document.body.classList.toggle('home-page', initial.path === '')

initTheme()
initChrome()

let teardown: PageTeardown | undefined

startRouter<Route>({ match: (path) => routeByPath(path), onNavigate })

/**
 * The page is already on screen for the `initial` dispatch — hydration put it
 * there — so that one only starts the demos. Every other dispatch may need the
 * page swapped first, and a dispatch to the page already showing (clicking the
 * active nav link) needs nothing swapped at all.
 */
function onNavigate(navigation: Navigation<Route>): void {
  const { route, previous, kind } = navigation
  const changed = kind !== 'initial' && route !== previous

  if (changed) {
    teardown?.()
    app.show(route)
    applyHeadTags(headTagsFor(route))
    document.body.classList.toggle('home-page', route.path === '')
  }

  if (kind !== 'initial') closeMobileMenu()
  if (changed || kind === 'initial') teardown = route.page.setup?.() ?? undefined

  restoreView(navigation, changed)
}

/**
 * Put the viewport and the keyboard where the reader expects them.
 *
 * Going Back or Forward restores the offset that entry was left at. A hash goes
 * to its target — smoothly when the page did not change, since that reads as
 * scrolling rather than navigating. Anything else starts at the top, and focus
 * moves to `<main>`: a screen reader has no other way to notice that the page
 * it is reading has been replaced.
 *
 * `behavior: 'instant'` is explicit throughout because global.css sets
 * `html { scroll-behavior: smooth }`, which would otherwise animate a
 * navigation's jump to the top — leaving the reader watching the page they just
 * left scroll past, and landing them mid-flight if they click again.
 */
function restoreView({ kind, hash, restoreScroll }: Navigation<Route>, changed: boolean): void {
  const target = hash ? document.getElementById(hash) : null

  if (restoreScroll !== null) window.scrollTo({ top: restoreScroll, behavior: 'instant' })
  else if (target) target.scrollIntoView({ behavior: changed ? 'instant' : 'smooth', block: 'start' })
  else if (kind !== 'initial') window.scrollTo({ top: 0, behavior: 'instant' })

  if (changed && !target) document.getElementById('main-content')?.focus({ preventScroll: true })
}
