import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS } from './test-config';

test.describe('Production 로그인 리다이렉트 테스트', () => {
  test('로그인 후 대시보드로 정상 리다이렉트 확인', async ({ page }) => {
    console.log('\n=== Production 로그인 리다이렉트 테스트 ===\n');
    
    // Production URL로 이동
    await page.goto('https://00-yuandi-erp.vercel.app/ko');
    console.log('1. 홈페이지 접속');
    
    // 로그인 폼 확인
    const hasEmailInput = await page.locator('input[type="email"]').count() > 0;
    if (!hasEmailInput) {
      console.log('❌ 로그인 폼을 찾을 수 없음');
      return;
    }
    
    console.log('2. 로그인 폼 발견');
    
    // 로그인 수행
    await page.fill('input[type="email"]', TEST_ACCOUNTS.admin.email);
    await page.fill('input[type="password"]', TEST_ACCOUNTS.admin.password);
    console.log('3. 로그인 정보 입력 완료');
    
    await page.click('button[type="submit"]');
    console.log('4. 로그인 버튼 클릭');
    
    // 대기
    await page.waitForTimeout(5000);
    
    // URL 확인
    const currentUrl = page.url();
    console.log(`5. 현재 URL: ${currentUrl}`);
    
    // 리다이렉트 문제 확인
    if (currentUrl.includes('/login?redirect=')) {
      console.log('❌ 문제 발생: 로그인 후 다시 로그인 페이지로 리다이렉트됨');
      console.log('   리다이렉트 URL:', currentUrl);
      return;
    }
    
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ 성공: 대시보드로 정상 리다이렉트됨');
    } else {
      console.log(`⚠️ 예상치 못한 페이지로 이동: ${currentUrl}`);
    }
  });
});
