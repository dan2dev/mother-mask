# Performance after dependency update

Same machine, Node, Bun, Playwright and Chromium as [`baseline.md`](baseline.md). "Before" is the
`v3.53.0` build (byte-identical to npm `mother-mask@3.53.0`); "after" is this branch's build.

## Method

Both `dist/` folders were measured by the same harness (the updated Vitest bench and Playwright), A/B,
in two orders (base→new, then new→base), 5 runs each. That gives 10 runs per side, and the table shows
the median. The ops/sec budget is checked against the median of each 5-run block as well, so drift
during the session cannot hide a regression.

## Budgets

| Budget | Result |
|---|---|
| Bundle gzip: no entry point more than +1 % | **pass**: worst is `stencil/index.js` at +0.20 %; core `mother-mask.*` +0.02 % |
| Benchmark ops/sec: no drop more than 3 % (median of 5) | **pass**: worst 5-run block −1.0 % (`processDecimal`, Chromium 1x); medians −0.6 % to +5.6 % |
| p95 keystroke time at 6x CPU throttle: under 16 ms | **pass**: 1.5 ms (before 1.7 ms) |
| No new runtime dependency in the published package | **pass**: `dependencies` absent, `files` and `peerDependencies` unchanged |

## Bundle sizes

`minify: true`, so raw = minified. gzip -9, brotli q11. The Stencil chunk keeps its size but gets a new
content-hash name.

| File | raw before → after | gzip before → after | Δ gzip | brotli before → after | ES level | ≤ +1 % gzip |
|---|--:|--:|--:|--:|:-:|:-:|
| `alpine.cjs` | 1214 → 1214 | 633 → 633 | +0.00 % | 525 → 525 | 2020 | pass |
| `alpine.mjs` | 963 → 963 | 503 → 503 | +0.00 % | 440 → 440 | 2020 | pass |
| `angular.cjs` | 3092 → 3092 | 1006 → 1006 | +0.00 % | 870 → 870 | 2020 | pass |
| `angular.mjs` | 2600 → 2600 | 932 → 932 | +0.00 % | 821 → 821 | 2020 | pass |
| `ember.cjs` | 883 → 883 | 447 → 447 | +0.00 % | 374 → 374 | 2020 | pass |
| `ember.mjs` | 638 → 638 | 333 → 333 | +0.00 % | 299 → 299 | 2020 | pass |
| `inferno.cjs` | 2164 → 2164 | 806 → 806 | +0.00 % | 701 → 701 | 2020 | pass |
| `inferno.mjs` | 1895 → 1895 | 706 → 706 | +0.00 % | 616 → 616 | 2020 | pass |
| `knockout.cjs` | 2403 → 2403 | 980 → 980 | +0.00 % | 872 → 872 | 2020 | pass |
| `knockout.mjs` | 1593 → 1593 | 645 → 645 | +0.00 % | 568 → 568 | 2020 | pass |
| `lit.cjs` | 4949 → 4949 | 1315 → 1315 | +0.00 % | 1126 → 1126 | 2020 | pass |
| `lit.mjs` | 4493 → 4493 | 1227 → 1227 | +0.00 % | 1050 → 1050 | 2020 | pass |
| `mithril.cjs` | 1908 → 1908 | 889 → 889 | +0.00 % | 770 → 770 | 2020 | pass |
| `mithril.mjs` | 1156 → 1156 | 557 → 557 | +0.00 % | 480 → 480 | 2020 | pass |
| `mother-mask.cjs` | 22791 → 22790 | 8314 → 8316 | +0.02 % | 7557 → 7567 | 2020 | pass |
| `mother-mask.mjs` | 22672 → 22671 | 8274 → 8276 | +0.02 % | 7535 → 7535 | 2020 | pass |
| `mother-mask.umd.js` | 22921 → 22920 | 8384 → 8386 | +0.02 % | 7643 → 7622 | 2020 | pass |
| `nuclo.cjs` | 839 → 839 | 468 → 468 | +0.00 % | 394 → 394 | 2020 | pass |
| `nuclo.mjs` | 616 → 616 | 348 → 348 | +0.00 % | 303 → 303 | 2020 | pass |
| `preact.cjs` | 2384 → 2384 | 901 → 901 | +0.00 % | 790 → 790 | 2020 | pass |
| `preact.mjs` | 1978 → 1978 | 774 → 774 | +0.00 % | 672 → 672 | 2020 | pass |
| `qwik/index.qwik.mjs` | 2737 → 2563 | 667 → 668 | +0.15 % | 600 → 592 | 2020 | pass |
| `react.cjs` | 3527 → 3527 | 1323 → 1323 | +0.00 % | 1151 → 1151 | 2020 | pass |
| `react.mjs` | 2978 → 2978 | 1208 → 1208 | +0.00 % | 1053 → 1053 | 2020 | pass |
| `riot.cjs` | 1839 → 1839 | 854 → 854 | +0.00 % | 694 → 694 | 2020 | pass |
| `riot.mjs` | 1616 → 1616 | 757 → 757 | +0.00 % | 620 → 620 | 2020 | pass |
| `solid.cjs` | 1061 → 1061 | 557 → 557 | +0.00 % | 467 → 467 | 2020 | pass |
| `solid.mjs` | 809 → 809 | 441 → 441 | +0.00 % | 383 → 383 | 2020 | pass |
| `stencil/index.js` | 10772 → 10814 | 4906 → 4916 | +0.20 % | 4405 → 4417 | 2017 | pass |
| `stencil/p-Be_2J1t-.js` | — → 21446 | — → 7803 | hashed chunk name | | 2020 | n/a |
| `stencil/p-CixHyooo.js` | 21447 → — | 7802 → — | hashed chunk name | | 2020 | n/a |
| `stencil/stencil-mask-decimal.js` | 1844 → 1844 | 823 → 823 | +0.00 % | 711 → 714 | 2020 | pass |
| `stencil/stencil-mask-input.js` | 1910 → 1910 | 842 → 843 | +0.12 % | 766 → 738 | 2020 | pass |
| `svelte.cjs` | 1160 → 1160 | 515 → 515 | +0.00 % | 432 → 432 | 2020 | pass |
| `svelte.mjs` | 937 → 937 | 426 → 426 | +0.00 % | 364 → 364 | 2020 | pass |
| `vue.cjs` | 1647 → 1647 | 732 → 732 | +0.00 % | 633 → 633 | 2020 | pass |
| `vue.mjs` | 1424 → 1424 | 592 → 592 | +0.00 % | 512 → 512 | 2020 | pass |
| `web-components.cjs` | 4300 → 4300 | 1115 → 1115 | +0.00 % | 958 → 958 | 2020 | pass |
| `web-components.mjs` | 4077 → 4077 | 1005 → 1005 | +0.00 % | 854 → 854 | 2020 | pass |
The Qwik entry is the one budget that failed at first: +62 % gzip (667 → 1081 B). Vite 8 (Rolldown) keeps
JSDoc and `// <module id>` comments in that unminified library build, and Vite 6 (esbuild) dropped them.
The code was identical. `qwik.vite.config.mjs` now sets `output.comments.jsdoc: false` and
`experimental.attachDebugInfo: 'none'`: 668 B gzip (+0.15 %), and brotli is smaller than before.

## Runtime (Node bench and Chromium with CDP CPU throttle)

| Metric | Before (median, 10 runs) | After (median, 10 runs) | Δ | Order A (base→new) Δ | Order B (new→base) Δ | Budget |
|---|--:|--:|--:|--:|--:|:-:|
| Node applyMask CPF ops/s | 790,468 | 801,185 | +1.4 % | -0.6 % | +0.5 % | pass (≥ −3 %) |
| Node applyMask phone array ops/s | 579,455 | 585,765 | +1.1 % | +0.9 % | +2.4 % | pass (≥ −3 %) |
| Node applyMask quantified date ops/s | 904,396 | 905,155 | +0.1 % | -0.3 % | +1.9 % | pass (≥ −3 %) |
| Node format on each keystroke (CPF) ops/s | 78,504 | 78,994 | +0.6 % | +1.3 % | +0.0 % | pass (≥ −3 %) |
| Node processDecimal ops/s | 1,641,299 | 1,631,030 | -0.6 % | +1.2 % | -0.9 % | pass (≥ −3 %) |
| Node unmaskDecimal (parse) ops/s | 3,696,545 | 3,767,576 | +1.9 % | +2.0 % | +1.7 % | pass (≥ −3 %) |
| Chromium 1x applyMaskCpf ops/s | 962,772 | 982,580 | +2.1 % | +4.4 % | +0.6 % | pass (≥ −3 %) |
| Chromium 1x applyMaskPhoneArray ops/s | 666,352 | 693,848 | +4.1 % | +4.7 % | +1.8 % | pass (≥ −3 %) |
| Chromium 1x processDecimal ops/s | 2,003,460 | 2,020,548 | +0.9 % | +2.0 % | -1.0 % | pass (≥ −3 %) |
| Chromium 1x keystroke p95 ms | 0.2 | 0.2 | +0.0 % | +0.0 % | +0.0 % | info |
| Chromium 1x keystroke max ms | 0.6 | 0.6 | +0.0 % | -16.7 % | +0.0 % | info |
| Chromium 4x applyMaskCpf ops/s | 230,428 | 238,352 | +3.4 % | +2.1 % | +5.1 % | pass (≥ −3 %) |
| Chromium 4x applyMaskPhoneArray ops/s | 159,440 | 164,316 | +3.1 % | +0.8 % | +9.7 % | pass (≥ −3 %) |
| Chromium 4x processDecimal ops/s | 477,088 | 481,420 | +0.9 % | +0.9 % | +1.5 % | pass (≥ −3 %) |
| Chromium 4x keystroke p95 ms | 1 | 0.9 | -10.0 % | -10.0 % | -10.0 % | info |
| Chromium 4x keystroke max ms | 2.4 | 2.1 | -12.5 % | +0.0 % | -23.1 % | info |
| Chromium 6x applyMaskCpf ops/s | 152,664 | 156,136 | +2.3 % | +1.8 % | +4.5 % | pass (≥ −3 %) |
| Chromium 6x applyMaskPhoneArray ops/s | 102,992 | 108,720 | +5.6 % | +4.9 % | +5.5 % | pass (≥ −3 %) |
| Chromium 6x processDecimal ops/s | 312,296 | 322,756 | +3.3 % | +3.5 % | +1.6 % | pass (≥ −3 %) |
| Chromium 6x keystroke p95 ms | 1.7 | 1.5 | -11.8 % | -11.8 % | -12.5 % | pass (< 16 ms) |
| Chromium 6x keystroke max ms | 3.7 | 3.1 | -16.2 % | -13.2 % | -11.8 % | info |
Keystroke times are mother-mask's main-thread work per key (240 key presses per run; timer resolution
0.1 ms). "info" rows have no budget.

## Build, tests, browsers

| Item | Before | After |
|---|---|---|
| `bun run build` (3 runs) | 5.50 / 5.32 / 5.31 s | 5.46 / 5.48 / 5.55 s |
| `bun run typecheck` | pass, 0.73 s | pass, 0.70 s |
| `bun run test` | 2334 pass, 17.2 s | 2334 pass, 17.8 s |
| `node --test tests/package.test.mjs` | 4 pass | 4 pass |
| docs build / test | 2.81 s / 22 pass | 3.14–3.26 s / 22 pass |
| docs JS assets (gzip) | 111,497 B | 112,291 B (+0.7 %; site, not published) |
| e2e desktop-chromium | 168 pass / 6 fail / 3 skip | identical |
| e2e mobile-chrome (Pixel 7, touch) | 168 / 6 / 3 | identical |
| e2e firefox | 162 / 6 / 9 | identical |
| e2e webkit, mobile-safari (iPhone 14) | cannot launch (missing `libmanette-0.2-0`) | cannot launch |
| Emitted syntax (all entries) | ES2020 (Stencil loader ES2017) | unchanged |

The 6 e2e failures are the same tests on both sides (pre-existing caret-matrix spec mismatch, see
`baseline.md`).
