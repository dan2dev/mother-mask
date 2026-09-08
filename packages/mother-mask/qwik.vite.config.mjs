// See scripts/build-qwik.mjs comment history / README for why this entry
// needs its own build: Qwik's `component$`/`useVisibleTask$`/etc. throw at
// runtime unless the Qwik Optimizer has already extracted their closures
// into QRLs first. This follows Qwik's own documented "Library" recipe
// (Vite's `build.lib` mode + `qwikVite()`, no `root.tsx`/manifest/app
// conventions) — see https://qwik.dev/docs/advanced/library/.
import { defineConfig } from 'vite'
import { qwikVite } from '@builder.io/qwik/optimizer'

export default defineConfig({
  // qwikVite reads Qwik's own build target from Vite's `mode`, not from an
  // option passed to the plugin itself — "lib" mode is what skips the
  // app-only `root.tsx` requirement and defaults the entry to `index.ts`.
  mode: 'lib',
  build: {
    target: 'es2020',
    outDir: 'dist/qwik',
    emptyOutDir: true,
    lib: {
      entry: './src/qwik/index.ts',
      formats: ['es'],
      fileName: () => 'index.qwik.mjs',
    },
    rollupOptions: {
      external: ['mother-mask', '@builder.io/qwik'],
    },
  },
  plugins: [qwikVite({ target: 'lib', srcDir: 'src/qwik' })],
})
