import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: { 'mother-mask': 'src/index.ts' },
  format: ['esm', 'cjs', 'umd'],
  outDir: 'dist',
  clean: true,
  dts: { tsgo: true },
  minify: true,
  sourcemap: true,
  globalName: 'MotherMask',
})
