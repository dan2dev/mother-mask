# Performance baseline (before dependency update)

Recorded 2026-11-14 on branch `chore/update-dependencies`, before any dependency change.

## What "before" is

HEAD (`4eff350`) cannot build with its declared ranges: the Dependabot bump to
`tsdown@^0.23.1` pulls `rolldown-plugin-dts@>=0.28.8`, which crashes on
`dts: { tsgo: true }` (`Cannot create property 'path' on boolean 'true'`).
`bun.lock` is gitignored, so there is no committed pin to fall back on.

The baseline is therefore tag **`v3.53.0`**: its `src/`, `tsdown.config.ts`, `stencil-src/` and
`qwik.vite.config.mjs` are identical to HEAD, and only dependency ranges changed after it. Dependencies
were resolved as of the tag commit time (`bun install --minimum-release-age=<seconds since tag>`).
The resulting `dist/` is **byte-identical** to the `mother-mask@3.53.0` tarball on npm (all `.js`/`.d.ts`
files; only `.map` files differ), so these numbers describe the package users have today.

Key resolved tool versions: tsdown 0.22.14, rolldown-plugin-dts 0.27.14, vite 6.4.4, vitest 4.1.12,
TypeScript 7.0.2, Stencil 4.45.2, Qwik 1.20.2. The node benchmark below needs the Vitest 5 `bench`
fixture, so the runtime numbers below were taken with HEAD's Vitest 5.0.5 against this `dist/`. The
before/after comparison in [`after.md`](after.md) measures both `dist/` folders again, A/B, with one harness.

## Environment

- Intel i9-10850K (20 threads), 60 GB RAM, Ubuntu 26.10
- Node 26.13.1, Bun 1.4.4 (package manager, from `bun.lock`)
- Playwright 1.65.1, Chromium 159.0.8154.6 (headless shell), Firefox build 1572

## 1. Build

| Metric | Value |
|---|--:|
| `bun run build` wall time (tsdown + Stencil + Qwik), 3 runs | 5.50 s, 5.32 s, 5.31 s (median **5.32 s**) |
| `bun run typecheck` | 0.73 s, pass |
| Docs site `bun run build` | 2.81 s; 19 JS assets, 1,971,966 B raw / 111,497 B gzip |

Bundle sizes (all published JS; `minify: true`, so raw = minified):

| File | raw (= min) | gzip -9 | brotli q11 |
|---|--:|--:|--:|
| `alpine.cjs` | 1214 | 633 | 525 |
| `alpine.mjs` | 963 | 503 | 440 |
| `angular.cjs` | 3092 | 1006 | 870 |
| `angular.mjs` | 2600 | 932 | 821 |
| `ember.cjs` | 883 | 447 | 374 |
| `ember.mjs` | 638 | 333 | 299 |
| `inferno.cjs` | 2164 | 806 | 701 |
| `inferno.mjs` | 1895 | 706 | 616 |
| `knockout.cjs` | 2403 | 980 | 872 |
| `knockout.mjs` | 1593 | 645 | 568 |
| `lit.cjs` | 4949 | 1315 | 1126 |
| `lit.mjs` | 4493 | 1227 | 1050 |
| `mithril.cjs` | 1908 | 889 | 770 |
| `mithril.mjs` | 1156 | 557 | 480 |
| `mother-mask.cjs` | 22791 | 8314 | 7557 |
| `mother-mask.mjs` | 22672 | 8274 | 7535 |
| `mother-mask.umd.js` | 22921 | 8384 | 7643 |
| `nuclo.cjs` | 839 | 468 | 394 |
| `nuclo.mjs` | 616 | 348 | 303 |
| `preact.cjs` | 2384 | 901 | 790 |
| `preact.mjs` | 1978 | 774 | 672 |
| `qwik/index.qwik.mjs` | 2737 | 667 | 600 |
| `react.cjs` | 3527 | 1323 | 1151 |
| `react.mjs` | 2978 | 1208 | 1053 |
| `riot.cjs` | 1839 | 854 | 694 |
| `riot.mjs` | 1616 | 757 | 620 |
| `solid.cjs` | 1061 | 557 | 467 |
| `solid.mjs` | 809 | 441 | 383 |
| `stencil/index.js` | 10772 | 4906 | 4405 |
| `stencil/p-CixHyooo.js` | 21447 | 7802 | 7110 |
| `stencil/stencil-mask-decimal.js` | 1844 | 823 | 711 |
| `stencil/stencil-mask-input.js` | 1910 | 842 | 766 |
| `svelte.cjs` | 1160 | 515 | 432 |
| `svelte.mjs` | 937 | 426 | 364 |
| `vue.cjs` | 1647 | 732 | 633 |
| `vue.mjs` | 1424 | 592 | 512 |
| `web-components.cjs` | 4300 | 1115 | 958 |
| `web-components.mjs` | 4077 | 1005 | 854 |

## 2. Tests

| Suite | Files | Tests | Duration |
|---|--:|--:|--:|
| vitest (jsdom) | 50 | 2314 pass | 12.06 s |
| vitest (qwik config) | 1 | 10 pass | 0.99 s |
| vitest (octane config) | 1 | 10 pass | 3.08 s |
| `bun run test` total wall | 52 | **2334 pass, 0 fail** | 17.22 s |
| `node --test tests/package.test.mjs` | 1 | 4 pass | 1.36 s |
| docs `bun test tests` | 1 | 22 pass | 0.04 s |

E2E (`e2e/`, Playwright; not wired into CI):

| Project | Pass | Fail | Skip |
|---|--:|--:|--:|
| desktop-chromium | 168 | 6 | 3 |
| mobile-chrome (Pixel 7, touch) | 168 | 6 | 3 |
| firefox | 162 | 6 | 9 |
| webkit / mobile-safari | — | — | cannot launch: host is missing `libmanette-0.2-0` |

The 6 failures are the same in every engine and exist in the published 3.53.0: `caret-matrix.spec.ts`
(CPF, date, mercosul plate, CNPJ alnum) and `advanced-patterns.spec.ts` (2 supplementary-character
matrices). They expect a selection-delete across a separator to drop the separator (`"456.789-01"`);
the library restores it (`".456.789-01"`). They are a pre-existing spec/behaviour mismatch, not
dependency-related, and are the reference set for the "after" run.

## 3. Runtime benchmark (Node)

`packages/mother-mask/bench/mask.bench.ts`, run with `vitest bench --run bench/` (built-in Vitest bench
fixture, no new library). It imports the built `dist/mother-mask.mjs`, so it measures the published bundle.
Five runs; the value is the median of `throughput.mean`.

| Benchmark (Node, jsdom env) | ops/sec median of 5 | runs |
|---|--:|---|
| applyMask CPF | 794,144 | 794k, 802k, 796k, 794k, 782k |
| applyMask phone array | 576,943 | 577k, 574k, 593k, 586k, 574k |
| applyMask quantified date | 914,494 | 895k, 915k, 917k, 914k, 896k |
| format on each keystroke (CPF) | 79,300 | 78k, 81k, 79k, 79k, 80k |
| processDecimal | 1,672,565 | 1671k, 1704k, 1600k, 1673k, 1694k |
| unmaskDecimal (parse) | 3,774,189 | 3736k, 3774k, 3649k, 3778k, 3821k |


## 4. Low-end device simulation (headless Chromium, CDP `Emulation.setCPUThrottlingRate`)

`e2e/tests/perf.spec.ts` (`PERF=1 bunx playwright test perf --project=desktop-chromium`). The
published `dist/mother-mask.umd.js` is injected into a blank page; nothing is bundled by Vite.

- **ops/sec**: a 1-second in-page loop after 2000 warm-up calls.
- **Keystroke time**: main-thread time mother-mask spends per key (its `<input>` listeners plus the
  animation frames it schedules; vsync wait is not counted). Measured over 240 real Playwright key
  presses per rate: CPF, phone array, `9{1,2}/9{1,2}/9{4}` date and `$` decimal, each typed in full
  followed by 3 Backspaces, repeated 5 times. Timer resolution in this page is 0.1 ms.

Five runs; medians:

|---|--:|---|
| 1x ops applyMaskCpf | 968,088 | 962k, 985k, 934k, 985k, 968k |
| 1x ops applyMaskPhoneArray | 690,624 | 683k, 691k, 637k, 695k, 698k |
| 1x ops processDecimal | 2,007,652 | 1983k, 2008k, 1941k, 2024k, 2051k |
| 1x keystroke p95 ms | 0.3 | 0.3, 0.2, 0.3, 0.2, 0.3 |
| 1x keystroke max ms | 0.5 | 0.6, 0.7, 0.5, 0.4, 0.4 |
| 4x ops applyMaskCpf | 240,044 | 231k, 240k, 225k, 243k, 240k |
| 4x ops applyMaskPhoneArray | 163,308 | 162k, 165k, 156k, 163k, 165k |
| 4x ops processDecimal | 493,332 | 462k, 494k, 435k, 493k, 497k |
| 4x keystroke p95 ms | 0.9 | 1, 0.9, 0.9, 0.9, 0.9 |
| 4x keystroke max ms | 2.1 | 2.7, 1.4, 2.1, 2.4, 1.6 |
| 6x ops applyMaskCpf | 151,872 | 152k, 152k, 152k, 157k, 160k |
| 6x ops applyMaskPhoneArray | 101,784 | 98k, 101k, 102k, 107k, 102k |
| 6x ops processDecimal | 315,228 | 310k, 315k, 311k, 319k, 324k |
| 6x keystroke p95 ms | 1.5 | 1.5, 1.5, 1.5, 1.4, 1.5 |
| 6x keystroke max ms | 3.1 | 3, 3.7, 3.2, 2.9, 3.1 |

## 5. Browser support

| Item | Value |
|---|---|
| `browserslist` | none |
| `engines` | none |
| tsdown `target` | not set (follows tsconfig `target: esnext`; output is not down-levelled) |
| Qwik build target | `es2020` (`qwik.vite.config.mjs`) |
| Stencil | defaults |
| Emitted syntax level (lowest `ecmaVersion` acorn parses) | ES2020 for every entry; `stencil/index.js` ES2017 |

No minimum browser versions are declared. The effective floor is the emitted syntax, ES2020
(optional chaining): Chrome 80, Firefox 74, Safari 13.1.
