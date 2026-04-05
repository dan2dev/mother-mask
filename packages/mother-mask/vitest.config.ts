/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['node_modules/**', 'dist/**', '**/*.d.ts', 'src/index.ts'],
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 95,
        branches: 85,
        functions: 100,
        statements: 95,
      },
    },
  },
})
