/**
 * The shell every page renders inside — one component, built on both sides.
 *
 * The server renders `App` inside the request's `route.run()`; the browser
 * `hydrate()`s the same component after `router.start()`, so the two trees are
 * structurally identical and the client claims the server's nodes instead of
 * rebuilding them.
 *
 * Navigation swaps what `router.outlet()` renders inside `<main>` and nothing
 * else. The header, sidebar, footer and prev/next are created once and read
 * the active route through state-dependent values, so moving between pages
 * neither rebuilds the chrome nor loses a sticky sidebar's scroll position.
 */
import { Footer } from './components/Footer.ts'
import { Header } from './components/Header.ts'
import { IconSprite } from './components/icons.ts'
import { PageNav } from './components/PageNav.ts'
import { Sidebar } from './components/Sidebar.ts'
import { Toc } from './components/Toc.ts'
import { activeRoute, router } from './router/router.ts'

/**
 * The home page is the marketing page: full-bleed hero, no sidebar, no
 * prev/next. Every other route is a docs page and gets both.
 */
const isDocs = () => activeRoute().path !== ''

export function App() {
  return div(
    { className: 'app-root' },

    IconSprite(),
    Header(),

    div(
      // Home vs docs layout is `body.home-page`, which the router sets directly
      // — see global.css. The sidebar, contents and prev/next still key off the
      // active route, since those are whole subtrees rather than a class.
      { className: 'layout' },

      when(isDocs, Sidebar()),

      div(
        { className: 'content' },
        // `tabindex="-1"` makes this focusable without adding it to the tab
        // order, so the router can move focus here after a navigation — a page
        // change a screen reader would otherwise have no way to notice.
        main({ id: 'main-content', tabindex: '-1' }, router.outlet(), when(isDocs, PageNav())),
        Footer(),
      ),

      when(isDocs, Toc()),
    ),
  )
}
