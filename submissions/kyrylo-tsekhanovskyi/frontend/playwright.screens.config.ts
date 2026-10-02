import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { baseURL } from './playwright.config';

// Visual review (AGENTS.md definition of done, step 4): screenshots of every page and dialog at phone,
// desktop and wide width, against the running stack. They are evidence for a human or agent to look at,
// not an assertion suite, and they never run as part of `npm run e2e`.
// Output: `SCREENS_DIR`, else the active OpenSpec change's evidence/screens, else docs/screens.
const changesDir = path.join(__dirname, '..', 'openspec', 'changes');
const activeChange = fs.existsSync(changesDir)
  ? fs
      .readdirSync(changesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== 'archive')
      .map((d) => d.name)
      .sort()[0]
  : undefined;

export const screensDir =
  process.env['SCREENS_DIR'] ??
  (activeChange
    ? path.join(changesDir, activeChange, 'evidence', 'screens')
    : path.join(__dirname, '..', 'docs', 'screens'));

export default defineConfig({
  testDir: './e2e/screens',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: { baseURL },
  projects: [
    { name: 'phone', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'wide',
      use: { ...devices['Desktop Chrome'], viewport: { width: 2048, height: 1152 } },
    },
  ],
});
