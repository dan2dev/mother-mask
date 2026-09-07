/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: [{ find: /^mother-mask$/, replacement: fileURLToPath(new URL('./src/index.ts', import.meta.url)) }],
    // Vitest runs test files in Node, so package.json "exports" resolution
    // picks the "node" condition by default — for solid-js that's its
    // server/SSR build, where effects are no-ops. Adding "browser" picks
    // its real DOM build instead, matching how a bundler would resolve it
    // for an actual app.
    conditions: ['browser'],
  },
  test: {
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/package.test.mjs'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['node_modules/**', 'dist/**', '**/*.d.ts', 'src/index.ts', 'src/react/index.ts', 'src/vue/index.ts', 'src/angular/index.ts', 'src/svelte/index.ts', 'src/solid/index.ts', 'src/preact/index.ts', 'src/lit/index.ts', 'src/alpine/index.ts', 'src/web-components/index.ts', 'src/types.ts'],
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 95,
        branches: 85,
        functions: 100,
        statements: 95,
        'src/react/*.{ts,tsx}': {
          perFile: true,
          lines: 95,
          branches: 85,
          functions: 100,
          statements: 95,
        },
        // Vue/Angular/Solid each guard a `bindInput`-style function with a
        // defensive `if (!input) return`/`if (!config) return` for TS null
        // safety on a ref/signal that, per that framework's own lifecycle
        // guarantees, is never actually null when the function runs (bind
        // only fires after mount; the config signal is set by ngOnChanges
        // before afterRenderEffect's first run). That one branch is
        // structurally unreachable through the public API, hence 80 rather
        // than 85 for `branches` on these three.
        'src/vue/*.ts': {
          perFile: true,
          lines: 95,
          branches: 80,
          functions: 100,
          statements: 95,
        },
        'src/angular/*.ts': {
          perFile: true,
          lines: 95,
          branches: 80,
          functions: 100,
          statements: 95,
        },
        'src/svelte/*.ts': {
          perFile: true,
          lines: 95,
          branches: 85,
          functions: 100,
          statements: 95,
        },
        'src/solid/*.ts': {
          perFile: true,
          lines: 95,
          branches: 80,
          functions: 100,
          statements: 95,
        },
        'src/preact/*.{ts,tsx}': {
          perFile: true,
          lines: 95,
          branches: 85,
          functions: 100,
          statements: 95,
        },
        'src/lit/*.ts': {
          perFile: true,
          lines: 95,
          branches: 80,
          functions: 100,
          statements: 95,
        },
        'src/alpine/*.ts': {
          perFile: true,
          lines: 95,
          branches: 80,
          functions: 100,
          statements: 95,
        },
        'src/web-components/*.ts': {
          perFile: true,
          lines: 95,
          branches: 80,
          functions: 100,
          statements: 95,
        },
      },
    },
  },
})
