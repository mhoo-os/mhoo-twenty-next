import { defineConfig, devices } from '@playwright/test';

const storageState = process.env.FINANCE_STORAGE_STATE;

if (!storageState) {
  throw new Error(
    'Set FINANCE_STORAGE_STATE to an operator-owned Playwright storage-state file. Do not commit that file.',
  );
}

export default defineConfig({
  testDir: './tests/mhoo-finance',
  outputDir: './run_results/finance-audit',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: [['list']],
  use: {
    baseURL: process.env.FINANCE_BASE_URL ?? 'https://hass-kitchen.mhoo.app',
    storageState,
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'narrow', use: { ...devices['Desktop Chrome'], viewport: { width: 760, height: 900 } } },
  ],
});
