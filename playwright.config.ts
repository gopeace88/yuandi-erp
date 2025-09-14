import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000, // 60초 타임아웃
  expect: { timeout: 10000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // 단일 워커로 실행
  reporter: [['line'], ['html']],
  
  use: {
    headless: false, // 브라우저 UI 표시
    baseURL: 'https://00-yuandi-erp.vercel.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Playwright의 번들된 Chromium 사용
      },
    },
  ],
  
  // 웹서버 설정 제거 (외부 배포 사이트 테스트)
});