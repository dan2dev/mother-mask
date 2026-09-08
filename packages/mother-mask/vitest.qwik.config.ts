/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { qwikVite } from '@builder.io/qwik/optimizer'

// Separate from vitest.config.ts on purpose: qwikVite's transform isn't
// scoped to its own `srcDir` option — added as a plugin in the shared
// config, it broke every other test file's unrelated JSX (React's
// <StrictMode>, Preact's/Solid's own runtimes, ...) the moment Qwik was
// installed. This config runs only tests/qwik.test.tsx, and the plugin
// only ever sees that one file's import graph.
//
// It also runs under Node, not jsdom: `@builder.io/qwik/testing`'s
// `createDOM()` brings its own mock DOM, and jsdom's globals (document,
// HTMLElement, ...) colliding with it is what causes cryptic failures like
// `node.isAncestor is not a function` on the very first render.
export default defineConfig({
  plugins: [qwikVite({ srcDir: 'src/qwik' })],
  resolve: {
    // Matches vitest.config.ts's alias: without it, `src/qwik/index.ts`'s
    // own `export * from 'mother-mask'` resolves the bare specifier to the
    // built dist output via normal node_modules self-reference, while this
    // test file's direct `../src/index` import resolves straight to source
    // — two different module instances, so the "aliases core" identity
    // check fails even though both are functionally the same code.
    alias: [{ find: /^mother-mask$/, replacement: fileURLToPath(new URL('./src/index.ts', import.meta.url)) }],
  },
  test: {
    environment: 'node',
    include: ['tests/qwik.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['src/qwik/**/*.tsx'],
      exclude: ['src/qwik/index.ts'],
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage-qwik',
      // Lower than every other entry's thresholds, and for a reason
      // specific to Qwik: the Optimizer extracts each `useVisibleTask$`
      // body into its own lazily-loaded QRL segment (a synthetic virtual
      // module), and v8's coverage collector can't map execution back from
      // that segment to line ranges in the original .tsx the way it does
      // for ordinary same-file code — so the task body's own branches
      // under-report here even though tests/qwik.test.tsx exercises all of
      // them (initial bind, typing, mask/options/value changes, dispose).
      thresholds: {
        lines: 95,
        branches: 55,
        functions: 100,
        statements: 85,
      },
    },
  },
})
