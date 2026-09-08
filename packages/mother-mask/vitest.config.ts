/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// tests/qwik.test.tsx runs under its own vitest.qwik.config.ts, not this
// one: qwikVite's transform isn't scoped to its own srcDir the way its
// options suggest — adding it here as a plugin broke every other test
// file's unrelated JSX (e.g. React's <StrictMode>) the moment Qwik was
// installed, since qwikVite intercepts .tsx transforms globally.
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
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/package.test.mjs', 'tests/qwik.test.tsx', 'tests/octane.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['node_modules/**', 'dist/**', '**/*.d.ts', 'src/index.ts', 'src/react/index.ts', 'src/vue/index.ts', 'src/angular/index.ts', 'src/svelte/index.ts', 'src/solid/index.ts', 'src/preact/index.ts', 'src/lit/index.ts', 'src/alpine/index.ts', 'src/web-components/index.ts', 'src/qwik/index.ts', 'src/qwik/**', 'src/inferno/index.ts', 'src/octane/index.ts', 'src/octane/**', 'src/mithril/index.ts', 'src/ember/index.ts', 'src/ember/mask-input.ts', 'src/ember/mask-decimal.ts', 'src/knockout/index.ts', 'src/riot/index.ts', 'src/types.ts'],
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 95,
        branches: 85,
        // Global functions threshold is 99, not 100: Inferno's class
        // components (src/inferno/*.ts) each declare a `render`/lifecycle
        // method that isn't invoked by every test (e.g. `componentDidUpdate`
        // on a component that's only ever mounted once), pulling the
        // aggregate function count just under 100% — see the
        // src/inferno/*.ts override below for the per-file detail.
        functions: 99,
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
        // Inferno has no JSX runtime here (see src/inferno/h.ts) — h()'s ref
        // handling and the class components' update-guard branches include
        // defensive paths (e.g. no-ref render, no-op re-render) that aren't
        // exercised by every test and aren't worth forcing coverage of.
        'src/inferno/*.ts': {
          perFile: true,
          lines: 80,
          branches: 45,
          functions: 80,
          statements: 80,
        },
        'src/mithril/*.ts': {
          perFile: true,
          lines: 95,
          branches: 75,
          functions: 100,
          statements: 95,
        },
        // Only the handler modules — mask-input.ts/mask-decimal.ts (the
        // ember-modifier()-wrapped default exports) are excluded above:
        // ember-modifier imports Ember framework internals that only
        // resolve inside a real Ember app's build, so those two files are
        // never imported by this suite and are verified at the type level
        // (tsc --noEmit) instead. See mask-input-handler.ts's doc comment.
        'src/ember/*-handler.ts': {
          perFile: true,
          lines: 95,
          branches: 80,
          functions: 100,
          statements: 95,
        },
        'src/knockout/*.ts': {
          perFile: true,
          lines: 95,
          branches: 75,
          functions: 100,
          statements: 95,
        },
        'src/riot/*.ts': {
          perFile: true,
          lines: 85,
          branches: 70,
          functions: 80,
          statements: 85,
        },
      },
    },
  },
})
