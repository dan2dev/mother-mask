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
}])
