import { test, expect } from '@playwright/test';
import { getTestUrl, TEST_ACCOUNTS } from './test-config';
import { ensureLoggedIn, clearAuth } from './utils/auth';

test.describe('Supabase 실제 로그인 테스트', () => {
  test('관리자 계정으로 로그인', async ({ page }) => {
    console.log('=== Supabase 실제 로그인 테스트 시작 ===');

    // 1. 로그아웃 상태 확인
    await clearAuth(page);

    // 2. 실제 로그인 수행
    await ensureLoggedIn(
      page,
      TEST_ACCOUNTS.admin.email,
      TEST_ACCOUNTS.admin.password,
      'ko'
    );

    // 3. 대시보드 접근 확인
    await page.goto(getTestUrl('/ko/dashboard'));
    await page.waitForLoadState('networkidle');

    // 대시보드 요소 확인
    const dashboardTitle = page.locator('h1, h2').first();
    await expect(dashboardTitle).toBeVisible();

    console.log('✅ 로그인 및 대시보드 접근 성공');
  });
});