/**
 * Server entry point: turns a request URL into the markup and the `<head>`
 * src/app-handler.ts puts in the response.
 *
 * `nuclo/polyfill` has to be imported before `nuclo` — it installs the minimal
 * `document`/`Element` the builders create nodes through when there is no
 * browser. Import order in a module is source order, so the two lines below are
 * load-bearing; do not sort them.
 *
 * Nothing here is client code. The browser gets `main.ts`, which starts the
 * same router, builds the same `App` and hydrates onto this output.
 */
import 'nuclo/polyfill'
import 'nuclo'
import { renderToString } from 'nuclo/ssr'

import { App } from './app.ts'
import { headTagsFor, renderHeadTags } from './router/head.ts'
import { activeRoute, router } from './router/router.ts'

export interface RenderedPage {
  /** Serialized `<head>` tags for this route. */
  head: string
  /** The app tree, as it will sit inside `#app`. */
  html: string
  /** Class for `<body>`, so the home page's full-bleed layout is right on load. */
  bodyClass: string
}

/**
 * One request's Route, rendered inside its own `run()` — concurrent requests
 * never see each other's route, since `start()` on the server touches nothing
 * shared.
 */
export async function renderPage(url: string): Promise<RenderedPage> {
  const route = await router.start(url)

  return route.run(() => {
    const page = activeRoute()
    return {
      head: renderHeadTags(headTagsFor(page)),
      html: renderToString(App),
      bodyClass: page.path === '' ? 'home-page' : '',
    }
  })
}
