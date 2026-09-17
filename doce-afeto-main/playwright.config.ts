import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: '**/*.e2e.ts', fullyParallel: false, workers: 1, timeout: 30000,
  use: { baseURL: 'http://localhost:5173', headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', trace: 'retain-on-failure' },
  reporter: [['list'], ['html', { open: 'never' }]],
});
