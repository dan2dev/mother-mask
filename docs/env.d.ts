/// <reference types="vite/client" />
/// <reference types="nuclo/types" />

/**
 * Build-time data, supplied by the Vite plugins in `vite/`. Both modules are
 * computed in Node/Bun during the build, so nothing here costs the browser a
 * parse of Shiki or a read of the library bundle.
 */
declare module 'virtual:snippets' {
  const snippets: Record<
    import('./src/content/snippets.ts').SnippetName,
    import('./src/content/snippets.ts').HighlightedSnippet
  >
  export default snippets
}

declare module 'virtual:page-dates' {
  /** Keyed by page module name, which is also the route's slug. */
  const dates: Record<string, import('./vite/plugin-page-dates.ts').PageDates>
  export default dates
}

declare module 'virtual:package-meta' {
  /** The library's `package.json` version, e.g. `3.33.0`. */
  export const packageVersion: string
  /** Level-9 gzip size of the declared ESM artifact, in bytes. */
  export const bundleGzipBytes: number
  /** The same size rendered for display, e.g. `4.2 kB`. */
  export const bundleGzipSize: string
  /** Path of the measured artifact inside the package, e.g. `dist/mother-mask.mjs`. */
  export const bundleArtifact: string
}
