/**
 * What a page module has to provide.
 *
 * `view()` is isomorphic: it runs under `renderToString()` on the server and
 * again in the browser, where `hydrate()` walks the same tree over the markup
 * the server produced. It must therefore stick to Nuclo builders and never
 * touch `document`, `window`, or a bound input.
 *
 * The client-only half — `bind()`ing the live demos, which needs a real
 * element — goes in the page root's `onMount`, which Nuclo runs once the page
 * is in the document (claimed by `hydrate()`, or inserted by a navigation).
 * Whatever it returns is called when the router removes the page, so a page
 * disposes its bindings on the way out.
 */
export interface PageModule {
  view: () => NodeModFn
}

export type PageTeardown = () => void
