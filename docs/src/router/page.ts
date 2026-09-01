/**
 * What a page module has to provide.
 *
 * `view()` is isomorphic: it runs under `renderToString()` during the build and
 * again in the browser, where `hydrate()` walks the same tree over the markup
 * the build produced. It must therefore stick to Nuclo builders and never touch
 * `document`, `window`, or a bound input.
 *
 * `setup()` is the client-only half. The router calls it once the page's nodes
 * are actually in the document, which is where `bind()` belongs — the demos are
 * live inputs, and a mask needs a real element. Anything it returns is called
 * when the page is navigated away from, so a page can dispose its bindings.
 */
export interface PageModule {
  view: () => NodeModFn
  setup?: () => PageTeardown | void
}

export type PageTeardown = () => void
