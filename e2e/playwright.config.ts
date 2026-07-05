import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config per Lucid Me.
 * La web server viene avviata dal task `preview` di @lucidme/app dopo il build.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'it-IT',
    colorScheme: 'dark',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm --filter @lucidme/app build && pnpm --filter @lucidme/app preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
