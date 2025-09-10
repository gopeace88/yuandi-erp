import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://172.25.186.113:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Windows Chrome 사용
        channel: 'chrome', // Windows Chrome 채널 사용
        // 또는 직접 경로 지정
        // executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://172.25.186.113:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});