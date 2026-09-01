/**
 * The shell every page renders inside — built once, on both sides.
 *
 * The build calls `createApp(route)` and serializes the result; the browser
 * calls it again with the same route and hands the identical tree to
 * `hydrate()`, which walks the prerendered markup and adopts it instead of
 * rebuilding it. Keeping one function for both is what makes that safe: there
 * is no second implementation of the header to drift out of step with the
 * first.
 *
 * Navigation replaces the contents of `<main>` and nothing else. The header,
 * sidebar, footer and prev/next links are created once and read the active
 * route through state-dependent values, so moving between pages neither
 * rebuilds the chrome nor loses the scroll position of a sticky sidebar.
 */
import { Footer } from './components/Footer.ts'
import { Header } from './components/Header.ts'
import { IconSprite } from './components/icons.ts'
import { PageNav } from './components/PageNav.ts'
import { Sidebar } from './components/Sidebar.ts'
import { setActiveRoute, activeRoute } from './router/active.ts'
import type { Route } from './router/routes.ts'

export interface App {
  /** The tree to render or hydrate, as one element under `#app`. */
  element: NodeModFn
  /** Swap the page inside `<main>`, and point the chrome at the new route. */
  show: (route: Route) => void
}

/**
 * The home page is the marketing page: full-bleed hero, no sidebar, no
 * prev/next. Every other route is a docs page and gets both.
 */
function isHome(): boolean {
  return activeRoute().path === ''
}

export function createApp(initial: Route): App {
  setActiveRoute(initial)

  // A one-element array so `list()` can swap the page by object identity: a
  // different route means a different object, which is the signal to tear the
  // old page's nodes down and build the new one's.
  let pages: Route[] = [initial]

  const element = div(
    { className: 'app-root' },

    IconSprite(),
    Header(),

    div(
      // Whether this is the home page or a docs page is expressed by
      // `body.home-page`, which the router sets directly — see global.css. The
      // sidebar and prev/next still key off the active route, since those are
      // whole subtrees rather than a class.
      { className: 'layout' },

      when(() => !isHome(), Sidebar()),

      div(
        { className: 'content' },
        // `tabindex="-1"` makes this focusable without adding it to the tab
        // order, so the router can move focus here after a navigation — a page
        // change a screen reader would otherwise have no way to notice.
        main(
          { id: 'main-content', tabindex: '-1' },
          list(
            () => pages,
            (route) => route.page.view(),
          ),
          when(() => !isHome(), PageNav()),
        ),
        Footer(),
      ),
    ),
  )

  function show(route: Route): void {
    setActiveRoute(route)
    pages = [route]
    update()
  }

  return { element, show }
}
