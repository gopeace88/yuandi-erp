import { test } from '@playwright/test';
import { getTestUrl, TEST_ACCOUNTS } from './test-config';

test('Supabase 세션 확인', async ({ page }) => {
  console.log('\n=== Supabase 세션 확인 ===\n');

  // 1. 로그인 페이지 접속
  await page.goto(getTestUrl('/ko'));

  // 2. 로그인 시도
  await page.fill('input[type="email"]', TEST_ACCOUNTS.admin.email);
  await page.fill('input[type="password"]', TEST_ACCOUNTS.admin.password);
  await page.click('button[type="submit"]');

  // 3. 로그인 후 대기
  await page.waitForTimeout(5000);

  // 4. 세션 정보 확인
  const sessionInfo = await page.evaluate(() => {
    const allKeys = Object.keys(localStorage);
    const sessionKeys = allKeys.filter(key =>
      key.includes('supabase') || key.startsWith('sb-')
    );

    const result: any = {
      allKeys,
      sessionKeys,
      userRole: localStorage.getItem('userRole'),
      cookies: document.cookie,
    };

    // 각 세션 키의 값도 확인
    sessionKeys.forEach(key => {
      const value = localStorage.getItem(key);
      result[key] = value ? value.substring(0, 50) + '...' : null;
    });

    return result;
  });

  console.log('📊 localStorage 전체 키:', sessionInfo.allKeys);
  console.log('🔑 Supabase 세션 키:', sessionInfo.sessionKeys);
  console.log('👤 userRole:', sessionInfo.userRole);
  console.log('🍪 Cookies:', sessionInfo.cookies);

  // Supabase 키 상세 정보
  sessionInfo.sessionKeys.forEach((key: string) => {
    console.log(`  - ${key}:`, sessionInfo[key]);
  });

  // 5. Network 요청 확인을 위한 API 호출
  const apiResponse = await page.evaluate(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      const data = await response.json();
      return { status: response.status, data };
    } catch (error) {
      return { error: String(error) };
    }
  });

  console.log('\n📡 API 응답:', apiResponse);

  // 6. 현재 URL
  console.log('🌐 현재 URL:', page.url());
});