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
}])
