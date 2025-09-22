import { test, expect } from '@playwright/test';
import { getTestUrl, TEST_ACCOUNTS } from './test-config';

test('Supabase 세션 저장 방식 확인', async ({ page, context }) => {
  console.log('\n=== Supabase 세션 저장 방식 디버그 ===\n');

  // 1. 홈페이지 접속
  await page.goto(getTestUrl('/ko'));
  await page.waitForLoadState('domcontentloaded');

  // 2. 로그인
  console.log('1. 로그인 시도...');
  await page.fill('input[type="email"]', TEST_ACCOUNTS.admin.email);
  await page.fill('input[type="password"]', TEST_ACCOUNTS.admin.password);
  await page.click('button[type="submit"]');

  // 대시보드로 이동 대기
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  console.log('2. 대시보드 도착:', page.url());

  // 3. 모든 쿠키 확인
  const cookies = await context.cookies();
  console.log('\n3. 모든 쿠키:');
  cookies.forEach(cookie => {
    if (cookie.name.includes('sb-') || cookie.name.includes('supabase')) {
      console.log(`   - ${cookie.name}: ${cookie.value.substring(0, 50)}...`);
    }
  });

  // 4. localStorage 확인
  const localStorageData = await page.evaluate(() => {
    const result: any = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (key.includes('supabase') || key.startsWith('sb-')) {
          result[key] = value ? value.substring(0, 100) + '...' : null;
        }
      }
    }
    return result;
  });
  console.log('\n4. localStorage (Supabase 관련):');
  if (Object.keys(localStorageData).length === 0) {
    console.log('   - Supabase 관련 키 없음');
  } else {
    Object.entries(localStorageData).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value}`);
    });
  }

  // 5. sessionStorage 확인
  const sessionStorageData = await page.evaluate(() => {
    const result: any = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        const value = sessionStorage.getItem(key);
        if (key.includes('supabase') || key.startsWith('sb-')) {
          result[key] = value ? value.substring(0, 100) + '...' : null;
        }
      }
    }
    return result;
  });
  console.log('\n5. sessionStorage (Supabase 관련):');
  if (Object.keys(sessionStorageData).length === 0) {
    console.log('   - Supabase 관련 키 없음');
  } else {
    Object.entries(sessionStorageData).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value}`);
    });
  }

  // 6. API 호출로 세션 확인
  const apiResponse = await page.evaluate(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      };
    } catch (error) {
      return { error: String(error) };
    }
  });
  console.log('\n6. API 호출 (/api/auth/me):');
  console.log('   - 응답:', JSON.stringify(apiResponse, null, 2));

  // 7. 네트워크 요청 헤더 확인
  const [request] = await Promise.all([
    page.waitForRequest(req => req.url().includes('/api/'), { timeout: 5000 }).catch(() => null),
    page.evaluate(() => fetch('/api/auth/me'))
  ]);

  if (request) {
    console.log('\n7. API 요청 헤더:');
    const headers = request.headers();
    Object.entries(headers).forEach(([key, value]) => {
      if (key.toLowerCase().includes('cookie') || key.toLowerCase().includes('auth')) {
        console.log(`   - ${key}: ${value}`);
      }
    });
  }

  // 결론
  const hasSupabaseCookie = cookies.some(c => c.name.includes('sb-'));
  const hasSupabaseLocal = Object.keys(localStorageData).length > 0;
  const hasSupabaseSession = Object.keys(sessionStorageData).length > 0;

  console.log('\n=== 결론 ===');
  console.log(`Supabase 세션 위치:`);
  console.log(`  - 쿠키: ${hasSupabaseCookie ? '✅' : '❌'}`);
  console.log(`  - localStorage: ${hasSupabaseLocal ? '✅' : '❌'}`);
  console.log(`  - sessionStorage: ${hasSupabaseSession ? '✅' : '❌'}`);
});