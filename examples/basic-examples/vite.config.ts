import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        p01: resolve(__dirname, 'examples/01-process.html'),
        p02: resolve(__dirname, 'examples/02-bind.html'),
        p03: resolve(__dirname, 'examples/03-array-masks.html'),
        p04: resolve(__dirname, 'examples/04-bind-callback.html'),
        p05: resolve(__dirname, 'examples/05-buildmask.html'),
        p06: resolve(__dirname, 'examples/06-form.html'),
      },
    },
  },
})
