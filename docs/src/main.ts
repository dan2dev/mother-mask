/**
 * Browser entry point.
 *
 * Every route arrives as a complete, server-rendered HTML document (see
 * src/app-handler.ts) — this file's job is to adopt that document rather
 * than replace it, then let the router take over navigation:
 *
 *  1. `router.start()` resolves the URL to the same route the server just
 *     rendered, so the outlet starts populated.
 *  2. `hydrate()` builds the same tree and claims the server's nodes instead of
 *     re-creating them — nothing moves or flashes. The page's `onMount` runs as
 *     it is claimed, which is where its live demos bind their masks.
 */
import 'nuclo'
import './styles/global.css'

import { App } from './app.ts'
import { initToc } from './components/Toc.ts'
import { initChrome } from './lib/chrome.ts'
import { initTheme } from './lib/theme.ts'
import { router } from './router/router.ts'

await router.start()
hydrate(App, document.getElementById('app')!)

initTheme()
initChrome()
initToc()
