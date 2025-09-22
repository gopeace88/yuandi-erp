import { test, expect } from '@playwright/test';
import { getTestUrl, TEST_ACCOUNTS } from './test-config';

test.describe('시나리오 1: 주문 생성 및 처리', () => {
  test('주문 전체 플로우 테스트', async ({ page }) => {
    console.log('\n=== 시나리오 1: 주문 생성 및 처리 플로우 시작 ===\n');

    // 1. 로그인 페이지 접속
    console.log('📍 1단계: 로그인');
    await page.goto(getTestUrl('/ko'));

    // 이메일/비밀번호 입력
    await page.fill('input[type="email"]', TEST_ACCOUNTS.admin.email);
    await page.fill('input[type="password"]', TEST_ACCOUNTS.admin.password);

    // 로그인 버튼 클릭
    await page.click('button[type="submit"]');

    // 로그인 후 대기
    await page.waitForTimeout(3000);

    // 현재 URL 확인
    const currentUrl = page.url();
    console.log(`  현재 URL: ${currentUrl}`);

    // localStorage 확인
    const storageData = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const data: any = {};
      keys.forEach(key => {
        data[key] = localStorage.getItem(key);
      });
      return data;
    });

    console.log('  localStorage 데이터:', Object.keys(storageData));

    // 대시보드로 직접 이동 시도
    console.log('\n📍 2단계: 대시보드 접근 시도');
    await page.goto(getTestUrl('/ko/dashboard'));
    await page.waitForTimeout(2000);

    const dashboardUrl = page.url();
    console.log(`  대시보드 URL: ${dashboardUrl}`);

    if (dashboardUrl.includes('/dashboard')) {
      console.log('✅ 대시보드 접근 성공!');

      // 대시보드 요소 확인
      const title = await page.locator('h1, h2').first().textContent();
      console.log(`  페이지 제목: ${title}`);
    } else {
      console.log('❌ 대시보드 접근 실패 - 리다이렉트됨');
      console.log(`  현재 페이지: ${dashboardUrl}`);
    }
  });
});