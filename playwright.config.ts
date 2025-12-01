import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30000,
  use: {
    headless: true,
    baseURL: `http://localhost:${process.env.PORT || 3000}`
  }
  ,
  webServer: {
    command: 'node ./scripts/start-with-temp-data.js',
    url: `http://localhost:${process.env.PORT || 3000}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000
  }
});
