/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { octane } from '@octanejs/vite-plugin'

// Separate from vitest.config.ts on purpose, mirroring vitest.qwik.config.ts:
// Octane's function components compile down to direct DOM-update code keyed
// to compiler-assigned hook slots — `useState`/`useRef`/`useLayoutEffect`
// only work once the Octane Vite plugin has run over the file, and adding
// it to the shared config would apply that transform to every other test
// file's unrelated JSX too. This config runs only tests/octane.test.tsx.
export default defineConfig({
  plugins: [octane()],
  resolve: {
    // Matches vitest.config.ts's alias: without it, `src/octane/index.ts`'s
    // own `export * from 'mother-mask'` resolves the bare specifier to the
    // built dist output via normal node_modules self-reference, while this
    // test file's direct `../src/index` import resolves straight to source
    // — two different module instances, so the "aliases core" identity
    // check fails even though both are functionally the same code.
    alias: [{ find: /^mother-mask$/, replacement: fileURLToPath(new URL('./src/index.ts', import.meta.url)) }],
  },
  test: {
    environment: 'jsdom',
    include: ['tests/octane.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['src/octane/**/*.tsx'],
      exclude: ['src/octane/index.ts'],
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage-octane',
      // Lower than every other entry's thresholds: the Octane compiler
      // rewrites each component's hooks into slot-indexed direct-DOM-update
      // code, and v8's coverage collector doesn't map every branch of that
      // rewritten form back to the original .tsx source lines as cleanly as
      // it does for ordinary same-file code, even though
      // tests/octane.test.tsx exercises initial bind, typing, mask/options/
      // value changes, and dispose for both components.
      thresholds: {
        lines: 85,
        branches: 55,
        functions: 85,
        statements: 80,
      },
    },
  },
})
