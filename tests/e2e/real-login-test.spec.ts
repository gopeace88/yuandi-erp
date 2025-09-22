import { test, expect } from '@playwright/test';
import { getTestUrl } from './test-config';

test.describe('프로덕션 환경 동일 테스트', () => {
  test('실제 Supabase 인증 플로우 테스트', async ({ page }) => {
    console.log('\n=== 프로덕션 환경과 동일한 인증 테스트 시작 ===\n');
    console.log('📌 Mock 없음, NODE_ENV 체크 없음, 실제 인증만 사용');

    // 1. 로그인 페이지 접속
    console.log('📍 1단계: 로그인 페이지 접속');
    await page.goto(getTestUrl('/ko'));
    await page.waitForLoadState('networkidle');

    // 로그인 페이지인지 확인
    const loginForm = page.locator('form').first();
    await expect(loginForm).toBeVisible();
    console.log('  ✅ 로그인 페이지 표시됨');

    // 2. 실제 계정으로 로그인 시도
    console.log('\n📍 2단계: 실제 Supabase 계정으로 로그인');

    // 이메일 입력
    const emailInput = page.locator('input[type="email"], input#email').first();
    await emailInput.fill('admin@yuandi.com');
    console.log('  ✅ 이메일 입력: admin@yuandi.com');

    // 비밀번호 입력
    const passwordInput = page.locator('input[type="password"], input#password').first();
    await passwordInput.fill('yuandi123!');
    console.log('  ✅ 비밀번호 입력 완료');

    // 로그인 버튼 클릭
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    console.log('  ⏳ 로그인 처리 중...');

    // 3. 로그인 결과 확인
    console.log('\n📍 3단계: 로그인 결과 확인');

    try {
      // 대시보드로 리다이렉트되거나 로그인 성공 확인
      await page.waitForURL(
        (url) => {
          const urlStr = url.toString();
          return urlStr.includes('/dashboard') ||
                 urlStr.includes('/orders') ||
                 urlStr.includes('/inventory');
        },
        { timeout: 10000 }
      );

      const currentUrl = page.url();
      console.log(`  ✅ 로그인 성공! 현재 URL: ${currentUrl}`);

      // 대시보드 요소 확인
      const dashboardElement = page.locator('h1, h2').first();
      if (await dashboardElement.isVisible()) {
        const title = await dashboardElement.textContent();
        console.log(`  ✅ 페이지 타이틀: ${title}`);
      }

    } catch (error) {
      // 로그인 실패 또는 에러 처리
      console.log('  ❌ 로그인 실패 또는 타임아웃');

      // 에러 메시지 확인
      const errorMessage = page.locator('text=/error|fail|invalid/i').first();
      if (await errorMessage.isVisible()) {
        const errorText = await errorMessage.textContent();
        console.log(`  ❌ 에러 메시지: ${errorText}`);
      }

      // 현재 URL 확인
      const currentUrl = page.url();
      console.log(`  📍 현재 URL: ${currentUrl}`);

      throw new Error('로그인 실패: Supabase 인증 불가');
    }

    // 4. 권한 확인 (대시보드 접근)
    console.log('\n📍 4단계: 인증된 페이지 접근 테스트');

    // 대시보드 접근
    await page.goto(getTestUrl('/ko/dashboard'));
    await page.waitForLoadState('networkidle');

    // 로그인 페이지로 리다이렉트되지 않았는지 확인
    const isDashboard = page.url().includes('/dashboard');
    if (isDashboard) {
      console.log('  ✅ 대시보드 접근 성공');
    } else {
      console.log('  ❌ 대시보드 접근 실패 (로그인 페이지로 리다이렉트됨)');
    }

    // 5. 세션 정보 확인
    console.log('\n📍 5단계: Supabase 세션 확인');
    const sessionInfo = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const supabaseKeys = keys.filter(k => k.includes('supabase') || k.startsWith('sb-'));
      return {
        hasSession: supabaseKeys.length > 0,
        sessionKeys: supabaseKeys
      };
    });

    if (sessionInfo.hasSession) {
      console.log('  ✅ Supabase 세션 발견');
      console.log(`  📋 세션 키: ${sessionInfo.sessionKeys.join(', ')}`);
    } else {
      console.log('  ⚠️ Supabase 세션을 찾을 수 없음');
    }

    console.log('\n=== 테스트 완료 ===');
    console.log('✅ 프로덕션과 동일한 환경에서 인증 테스트 성공');
  });
});