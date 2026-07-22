import { defineConfig } from 'vite'

export default defineConfig({
  root: 'fixtures',
  server: {
    port: 5183,
    strictPort: true,
  },
})
