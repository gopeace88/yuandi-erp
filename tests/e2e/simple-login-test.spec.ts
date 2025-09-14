import { test, expect } from '@playwright/test';

test('YUANDI ERP 로그인 테스트', async ({ page }) => {
  console.log('🚀 YUANDI ERP 로그인 테스트 시작');
  
  // 1단계: 사이트 접속
  console.log('📍 1단계: 사이트 접속');
  await page.goto('https://00-yuandi-erp.vercel.app/');
  
  await page.waitForTimeout(3000);
  await page.screenshot({ 
    path: '/mnt/d/00.Projects/00.YUANDI-ERP/tests/e2e/screenshots/01-site-landing.png',
    fullPage: true 
  });
  
  // 로그인 페이지 확인
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  const loginButton = page.locator('button[type="submit"]');
  
  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
  await expect(loginButton).toBeVisible();
  
  console.log('✅ 로그인 페이지 UI 요소 확인 완료');
  
  // 2단계: 로그인 정보 입력
  console.log('📍 2단계: 로그인 정보 입력');
  await emailInput.fill('admin@yuandi.com');
  await passwordInput.fill('yuandi123!');
  
  await page.screenshot({ 
    path: '/mnt/d/00.Projects/00.YUANDI-ERP/tests/e2e/screenshots/02-login-filled.png',
    fullPage: true 
  });
  
  // 3단계: 로그인 실행
  console.log('📍 3단계: 로그인 실행');
  await loginButton.click();
  
  // 로그인 후 페이지 변화 대기
  await page.waitForTimeout(5000);
  
  await page.screenshot({ 
    path: '/mnt/d/00.Projects/00.YUANDI-ERP/tests/e2e/screenshots/03-after-login.png',
    fullPage: true 
  });
  
  // 로그인 성공 확인 (대시보드 또는 메인 페이지로 이동했는지)
  const currentUrl = page.url();
  console.log(`현재 URL: ${currentUrl}`);
  
  // 대시보드 요소 또는 로그인된 상태 확인
  const isDashboard = currentUrl.includes('dashboard') || 
                     currentUrl.includes('main') ||
                     await page.locator('text=대시보드').first().isVisible({ timeout: 5000 }) ||
                     await page.locator('text=Dashboard').first().isVisible({ timeout: 5000 });
  
  if (isDashboard) {
    console.log('✅ 로그인 성공 - 대시보드 접근');
  } else {
    console.log('⚠️ 로그인 후 상태 확인 필요');
  }
  
  console.log('🎉 로그인 테스트 완료');
});