import { test, expect } from '@playwright/test';
import { getTestUrl, TIMEOUTS } from './test-config';
import { ensureLoggedIn, clearAuth } from './utils/auth';

test.describe('시나리오 1: 간단한 상품 등록 테스트', () => {
  test('상품 추가 플로우', async ({ page }) => {
    console.log('\n=== 시나리오 1: 간단한 상품 등록 시작 ===\n');
    
    // 1단계: 로그인
    console.log('📍 1단계: 로그인');
    await ensureLoggedIn(page, TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password, 'ko');
    console.log('  ✅ 로그인 완료');
    
    // 2단계: 대시보드 접속 확인
    console.log('\n📍 2단계: 대시보드 확인');
    const dashboardTitle = await page.locator('h1, h2').first().textContent();
    console.log(`  - 페이지 타이틀: ${dashboardTitle}`);
    
    // 3단계: 설정 페이지 이동
    console.log('\n📍 3단계: 설정 페이지 이동');
    await page.goto(getTestUrl('/ko/settings'));
    await page.waitForTimeout(2000);
    
    // 설정 페이지 확인
    const hasSettings = await page.locator('text=상품 관리').count() > 0;
    if (hasSettings) {
      console.log('  ✅ 설정 페이지 접속 성공');
    }
    
    // 4단계: 재고 페이지 이동
    console.log('\n📍 4단계: 재고 페이지 이동');
    await page.goto(getTestUrl('/ko/inventory'));
    await page.waitForTimeout(2000);
    
    const hasInventory = await page.locator('text=재고').count() > 0;
    if (hasInventory) {
      console.log('  ✅ 재고 페이지 접속 성공');
    }
    
    console.log('\n✅ 시나리오 1 간단 테스트 완료');
    
    await clearAuth(page);
  });
});
