/**
 * Client-side navigation over the prerendered pages.
 *
 * Every route already exists as a real HTML file, so the router's job is
 * narrow: when someone clicks a link this deployment owns, skip the round trip
 * and swap the page in place; when they do anything else — middle-click, open
 * in a new tab, follow an external link, hit Back — get out of the way and let
 * the browser be the browser.
 *
 * That second list is most of what a router is. The escape hatches in
 * `intercepted()` are the difference between a site that feels native and one
 * that quietly breaks Cmd-click.
 *
 * This module is client-only. Nothing on the server imports it.
 */
import { BASE, routePathFromPathname } from './url.ts'

/** Why a navigation happened. */
export type NavigationKind =
  /** The page the document was loaded with, dispatched once by `startRouter`. */
  | 'initial'
  /** A link click that added a history entry. */
  | 'push'
  /** A link click to the URL already showing; history is untouched. */
  | 'replace'
  /** Back or Forward. */
  | 'pop'

export interface Navigation<TRoute> {
  route: TRoute
  /** What was showing before, or `undefined` on the first dispatch. */
  previous: TRoute | undefined
  kind: NavigationKind
  /** The fragment without its `#`, or `''` when the URL had none. */
  hash: string
  /**
   * Where to put the viewport: a saved offset when the browser is going Back or
   * Forward, otherwise `null`, meaning "top, or the hash target if there is one".
   */
  restoreScroll: number | null
}

export interface RouterOptions<TRoute> {
  /** Resolve a route path (`''`, `'api.html'`) to a route, or nothing. */
  match: (path: string) => TRoute | undefined
  /** Render the navigation. Runs for the initial page too, after hydration. */
  onNavigate: (navigation: Navigation<TRoute>) => void
}

/** How long scrolling settles before the offset is written to history. */
const SCROLL_SAVE_MS = 250

interface HistoryState {
  /** Scroll offset for this entry, restored when the browser returns to it. */
  scroll?: number
}

/**
 * Bind the listeners and dispatch the page already on screen.
 *
 * Call once, after `hydrate()`, so the first `onNavigate` runs against a live
 * DOM. There is deliberately no handle to call back into: this site navigates
 * by links, and a second call would double-bind the click handler.
 */
export function startRouter<TRoute>({ match, onNavigate }: RouterOptions<TRoute>): void {
  let current: TRoute | undefined

  // The browser's own scroll restoration races a client-side render: it fires
  // against the outgoing page's height, before the incoming page exists.
  // Taking it over means the offset is applied after there is something to
  // apply it to.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

  function saveScroll(): void {
    const state = (history.state as HistoryState | null) ?? {}
    history.replaceState({ ...state, scroll: window.scrollY }, '', location.href)
  }

  function dispatch(route: TRoute, kind: NavigationKind, hash: string, restoreScroll: number | null): void {
    const previous = current
    current = route
    onNavigate({ route, previous, kind, hash, restoreScroll })
  }

  function onClick(event: MouseEvent): void {
    const anchor = intercepted(event)
    if (!anchor) return

    const url = new URL(anchor.href)
    const path = routePathFromPathname(url.pathname)
    if (path === null) return

    const route = match(path)
    if (!route) return

    event.preventDefault()

    // A link to the URL already showing — the active page's own nav entry —
    // is not a navigation. Dispatch it anyway so the view can respond (a bare
    // link scrolls back to the top, one with a hash jumps to it), but leave
    // history alone rather than stacking a duplicate entry.
    if (url.pathname === location.pathname && url.hash === location.hash) {
      dispatch(route, 'replace', url.hash.slice(1), null)
      return
    }

    saveScroll()
    history.pushState({}, '', `${BASE}${path}${url.hash}`)
    dispatch(route, 'push', url.hash.slice(1), null)
  }

  function onPopState(event: PopStateEvent): void {
    const path = routePathFromPathname(location.pathname)
    const route = path === null ? undefined : match(path)

    if (!route) {
      // Somewhere outside the app — a full load is the honest answer.
      location.reload()
      return
    }

    const state = event.state as HistoryState | null
    dispatch(route, 'pop', location.hash.slice(1), state?.scroll ?? null)
  }

  document.addEventListener('click', onClick)
  window.addEventListener('popstate', onPopState)

  // Keeping the current entry's offset up to date is what makes Forward work
  // as well as Back: leaving a page saves it once, but arriving at one and
  // scrolling has to be recorded too, or returning to it lands at the top.
  let scrollTimer: ReturnType<typeof setTimeout> | undefined
  window.addEventListener(
    'scroll',
    () => {
      clearTimeout(scrollTimer)
      scrollTimer = setTimeout(saveScroll, SCROLL_SAVE_MS)
    },
    { passive: true },
  )

  // Also on the way out, so returning through the back/forward cache lands
  // where the reader left off.
  window.addEventListener('pagehide', saveScroll)

  const path = routePathFromPathname(location.pathname)
  const route = path === null ? undefined : match(path)
  if (route) dispatch(route, 'initial', location.hash.slice(1), null)
}

/**
 * Decide whether a click is ours.
 *
 * Everything rejected here is a case where the browser's own behaviour is the
 * correct one: opening in a new tab or window, downloading, following a link
 * off-site, or an event a handler has already dealt with.
 */
function intercepted(event: MouseEvent): HTMLAnchorElement | null {
  if (event.defaultPrevented) return null
  // Only a plain left click. Modifier-clicks open tabs and windows, and so
  // does middle click — which `button` is the only way to see.
  if (event.button !== 0) return null
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null

  const anchor = (event.target as Element | null)?.closest?.('a')
  if (!(anchor instanceof HTMLAnchorElement)) return null

  if (anchor.hasAttribute('download')) return null
  if (anchor.target && anchor.target !== '_self') return null
  if (anchor.getAttribute('rel')?.split(/\s+/).includes('external')) return null

  // A bare `#id` belongs to the in-page anchor handler in lib/chrome.ts.
  const href = anchor.getAttribute('href')
  if (!href || href.startsWith('#')) return null

  // `anchor.href` is resolved against the document, so the origin check covers
  // protocol-relative and absolute off-site links as well as mailto: and tel:.
  let url: URL
  try {
    url = new URL(anchor.href)
  } catch {
    return null
  }
  if (url.origin !== location.origin) return null

  return anchor
}
