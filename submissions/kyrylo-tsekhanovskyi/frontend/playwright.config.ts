import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against the full stack started by the AppHost (`npm run start` in the repo
// root), which serves the API and the built UI on one URL (ADR 0005). Nothing is started from here.
export const baseURL = process.env['BOMKEEPER_URL'] ?? 'http://localhost:5272';

export default defineConfig({
  testDir: './e2e',
  // Screenshot capture for the visual review has its own config (`npm run screens`).
  testIgnore: ['screens/**'],
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
