// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'cd backend && npm run dev',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: 'cd frontend && npm run dev',
      url: 'http://localhost:5174',
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});
