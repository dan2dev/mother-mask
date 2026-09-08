import { defineConfig } from 'tsdown'

export default defineConfig([{
  entry: { 'mother-mask': 'src/index.ts' },
  format: ['esm', 'cjs', 'umd'],
  outDir: 'dist',
  clean: true,
  dts: { tsgo: true },
  minify: true,
  sourcemap: true,
  globalName: 'MotherMask',
}, {
  entry: { react: 'src/react/index.ts' },
  format: ['esm', 'cjs'],
  outDir: 'dist',
  clean: false,
  dts: { tsgo: true },
  minify: true,
  sourcemap: true,
  // React is an optional peer, and core exports must retain their identity.
  deps: { neverBundle: ['mother-mask', 'react', /^react\//] },
}, {
  entry: { vue: 'src/vue/index.ts' },
  format: ['esm', 'cjs'],
  outDir: 'dist',
  clean: false,
  dts: { tsgo: true },
  minify: true,
  sourcemap: true,
  // Vue is an optional peer, and core exports must retain their identity.
  deps: { neverBundle: ['mother-mask', 'vue', /^@vue\//] },
}, {
  entry: { angular: 'src/angular/index.ts' },
  format: ['esm', 'cjs'],
  outDir: 'dist',
  clean: false,
  dts: { tsgo: true },
  minify: true,
  sourcemap: true,
  // Angular is an optional peer, and core exports must retain their identity.
  deps: { neverBundle: ['mother-mask', /^@angular\//] },
}, {
  entry: { svelte: 'src/svelte/index.ts' },
  format: ['esm', 'cjs'],
  outDir: 'dist',
  clean: false,
  dts: { tsgo: true },
  minify: true,
  sourcemap: true,
  // No Svelte runtime dependency at all — this entry is plain TS actions.
  deps: { neverBundle: ['mother-mask'] },
}, {
  entry: { solid: 'src/solid/index.ts' },
  format: ['esm', 'cjs'],
  outDir: 'dist',
  clean: false,
  dts: { tsgo: true },
  minify: true,
  sourcemap: true,
  // Solid is an optional peer, and core exports must retain their identity.
  deps: { neverBundle: ['mother-mask', 'solid-js'] },
}, {
  entry: { preact: 'src/preact/index.ts' },
  format: ['esm', 'cjs'],
  outDir: 'dist',
  clean: false,
  dts: { tsgo: true },
  minify: true,
  sourcemap: true,
  // Preact is an optional peer, and core exports must retain their identity.
  deps: { neverBundle: ['mother-mask', 'preact', /^preact\//] },
}, {
  entry: { lit: 'src/lit/index.ts' },
  format: ['esm', 'cjs'],
  outDir: 'dist',
  clean: false,
  dts: { tsgo: true },
  minify: true,
  sourcemap: true,
  // Lit is an optional peer, and core exports must retain their identity.
  deps: { neverBundle: ['mother-mask', 'lit', /^lit\//] },
}, {
  entry: { alpine: 'src/alpine/index.ts' },
  format: ['esm', 'cjs'],
  outDir: 'dist',
  clean: false,
  dts: { tsgo: true },
  minify: true,
  sourcemap: true,
  // Alpine is an optional peer, and core exports must retain their identity.
  deps: { neverBundle: ['mother-mask', 'alpinejs'] },
}, {
  entry: { 'web-components': 'src/web-components/index.ts' },
  format: ['esm', 'cjs'],
  outDir: 'dist',
  clean: false,
  dts: { tsgo: true },
  minify: true,
  sourcemap: true,
  // No framework dependency at all — plain customElements.
  deps: { neverBundle: ['mother-mask'] },
}, {
  entry: { inferno: 'src/inferno/index.ts' },
  format: ['esm', 'cjs'],
  outDir: 'dist',
  clean: false,
  dts: { tsgo: true },
  minify: true,
  sourcemap: true,
  // Inferno is an optional peer, and core exports must retain their identity.
  deps: { neverBundle: ['mother-mask', 'inferno'] },
}, {
  entry: { mithril: 'src/mithril/index.ts' },
  format: ['esm', 'cjs'],
  outDir: 'dist',
  clean: false,
  dts: { tsgo: true },
  minify: true,
  sourcemap: true,
  // Mithril is an optional peer, and core exports must retain their identity.
  deps: { neverBundle: ['mother-mask', 'mithril'] },
}, {
  entry: { ember: 'src/ember/index.ts' },
  format: ['esm', 'cjs'],
  outDir: 'dist',
  clean: false,
  dts: { tsgo: true },
  minify: true,
  sourcemap: true,
  // ember-modifier is an optional peer, and core exports must retain their identity.
  deps: { neverBundle: ['mother-mask', 'ember-modifier'] },
}, {
  entry: { knockout: 'src/knockout/index.ts' },
  format: ['esm', 'cjs'],
  outDir: 'dist',
  clean: false,
  dts: { tsgo: true },
  minify: true,
  sourcemap: true,
  // Knockout is an optional peer, and core exports must retain their identity.
  deps: { neverBundle: ['mother-mask', 'knockout'] },
}, {
  entry: { riot: 'src/riot/index.ts' },
  format: ['esm', 'cjs'],
  outDir: 'dist',
  clean: false,
  dts: { tsgo: true },
  minify: true,
  sourcemap: true,
  // Riot is an optional peer, and core exports must retain their identity.
  deps: { neverBundle: ['mother-mask', 'riot'] },
}])
