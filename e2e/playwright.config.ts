import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5183',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx vite --port 5183 --strictPort',
    url: 'http://localhost:5183',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Emulated mobile viewport/touch/UA — this can't reproduce real
      // Android Gboard IME quirks, but it does exercise the same real
      // Chromium event loop/rAF timing (as opposed to jsdom's synchronous
      // simulation) under touch input, which is where the caret-drift bug
      // was reported.
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
})
