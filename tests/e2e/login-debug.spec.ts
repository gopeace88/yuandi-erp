import { test, expect } from '@playwright/test';
import { getTestUrl, TEST_ACCOUNTS } from './test-config';

test('디버그: 로그인 프로세스 확인', async ({ page }) => {
  console.log('\n=== 로그인 디버그 시작 ===\n');

  // 1. 홈페이지 접속
  const homeUrl = getTestUrl('/ko');
  console.log('1. 홈페이지 접속:', homeUrl);
  await page.goto(homeUrl);
  await page.waitForLoadState('domcontentloaded');

  // 현재 URL 확인
  console.log('2. 현재 URL:', page.url());

  // 로그인 폼 확인
  const emailInput = await page.locator('input[type="email"]').count();
  const passwordInput = await page.locator('input[type="password"]').count();
  const submitButton = await page.locator('button[type="submit"]').count();

  console.log('3. 로그인 폼 요소:');
  console.log('   - 이메일 입력: ', emailInput > 0 ? '있음' : '없음');
  console.log('   - 비밀번호 입력: ', passwordInput > 0 ? '있음' : '없음');
  console.log('   - 제출 버튼: ', submitButton > 0 ? '있음' : '없음');

  if (emailInput === 0 || passwordInput === 0) {
    // 페이지 HTML 출력
    const html = await page.content();
    console.log('4. 페이지 HTML (처음 500자):', html.substring(0, 500));
    throw new Error('로그인 폼을 찾을 수 없습니다');
  }

  // 로그인 시도
  console.log('4. 로그인 시도:');
  console.log('   - 이메일:', TEST_ACCOUNTS.admin.email);

  await page.fill('input[type="email"]', TEST_ACCOUNTS.admin.email);
  await page.fill('input[type="password"]', TEST_ACCOUNTS.admin.password);

  // 버튼 클릭 전 대기
  await page.waitForTimeout(500);

  // 제출 버튼 클릭
  await page.click('button[type="submit"]');

  // 응답 대기
  console.log('5. 로그인 버튼 클릭 후 대기...');
  await page.waitForTimeout(3000);

  // 로그인 후 URL 확인
  const afterLoginUrl = page.url();
  console.log('6. 로그인 후 URL:', afterLoginUrl);

  // localStorage 확인
  const localStorageKeys = await page.evaluate(() => {
    return Object.keys(localStorage);
  });
  console.log('7. localStorage 키들:', localStorageKeys);

  // Supabase 세션 확인
  const hasSession = await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    return keys.some(key =>
      key.includes('supabase') ||
      key.startsWith('sb-')
    );
  });
  console.log('8. Supabase 세션 존재:', hasSession ? '예' : '아니오');

  // 세션 상세 정보
  const sessionDetails = await page.evaluate(() => {
    const result: any = {};
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.startsWith('sb-')) {
        const value = localStorage.getItem(key);
        result[key] = value ? value.substring(0, 100) + '...' : null;
      }
    });
    return result;
  });
  console.log('9. 세션 상세:', sessionDetails);

  // userRole 확인
  const userRole = await page.evaluate(() => localStorage.getItem('userRole'));
  console.log('10. userRole:', userRole);

  expect(hasSession).toBeTruthy();
  expect(afterLoginUrl).toContain('dashboard');
});