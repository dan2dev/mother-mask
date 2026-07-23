import { defineConfig, devices } from '@playwright/test'
import baseConfig from './playwright.config'

// Separate config so `npx playwright test` (the default, run by every
// contributor) doesn't suddenly require the Firefox binary. Run this one
// explicitly with `npm run test:firefox` (needs `npx playwright install
// firefox` once). Firefox is where the select-and-replace race in
// `select-replace-race.spec.ts` was originally found and reproduced — see
// that file's header comment for the full story.
export default defineConfig({
  ...baseConfig,
  projects: [
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
})
