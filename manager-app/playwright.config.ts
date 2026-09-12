import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end checks against a built app. The server is started for you; set
 * E2E_BASE_URL to run against something already running.
 */
const port = Number(process.env.E2E_PORT ?? 3311);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: './tests',
  // A career takes a while to play through; matches run on a real clock.
  timeout: 180_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : [['list']],
  use: { baseURL, viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: `npx next start -p ${port}`,
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
