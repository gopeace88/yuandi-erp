import { Page } from '@playwright/test';
import { getTestUrl } from '../test-config';

/**
 * Supabase 실제 로그인을 수행하는 헬퍼 함수
 */
export async function ensureLoggedIn(
  page: Page,
  email: string,
  password: string,
  locale: string = 'ko'
): Promise<void> {
  // 로그인 페이지로 이동
  await page.goto(getTestUrl(`/${locale}`));

  // 이미 로그인되어 있는지 확인 (쿠키 기반)
  const cookies = await page.context().cookies();
  const isLoggedIn = cookies.some(cookie =>
    cookie.name.includes('sb-') && cookie.name.includes('-auth-token')
  );

  if (isLoggedIn) {
    console.log('  ✅ 이미 로그인되어 있음');
    return;
  }

  // 실제 로그인 수행
  console.log('  🔐 Supabase 로그인 수행 중...');

  // 이메일 입력
  await page.fill('input[type="email"], input#email', email);

  // 비밀번호 입력
  await page.fill('input[type="password"], input#password', password);

  // 로그인 버튼 클릭
  await page.click('button[type="submit"]');

  // 로그인 성공 확인 (대시보드로 리다이렉트 되거나 세션 생성)
  await page.waitForURL(
    (url) => url.pathname.includes('/dashboard') || url.pathname.includes('/orders'),
    { timeout: 10000 }
  ).catch(() => {
    // URL 변경이 없더라도 세션이 생성되었는지 확인
  });

  // 세션 생성 확인 (쿠키 기반)
  const postLoginCookies = await page.context().cookies();
  const sessionCreated = postLoginCookies.some(cookie =>
    cookie.name.includes('sb-') && cookie.name.includes('-auth-token')
  );

  if (sessionCreated) {
    console.log('  ✅ 로그인 성공');
  } else {
    // 대시보드로 이동했는지 확인 (추가 검증)
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      console.log('  ✅ 로그인 성공 (대시보드 도달)');
    } else {
      console.log('  ❌ 로그인 실패');
      throw new Error('로그인 실패: 세션이 생성되지 않음');
    }
  }
}

/**
 * 로그아웃을 수행하는 헬퍼 함수
 */
export async function clearAuth(page: Page): Promise<void> {
  // 먼저 페이지가 로드되어 있는지 확인
  if (page.url() === 'about:blank') {
    await page.goto(getTestUrl('/ko'));
  }

  await page.evaluate(() => {
    // Supabase 관련 localStorage 제거
    const keysToRemove = Object.keys(localStorage).filter(key =>
      key.startsWith('sb-') || key.includes('supabase')
    );
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // 쿠키 제거
    document.cookie.split(';').forEach(cookie => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      if (name.startsWith('sb-')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    });
  });

  console.log('  ✅ 인증 정보 삭제 완료');
}