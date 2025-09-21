import { Page, expect } from '@playwright/test';
import { getTestUrl, TEST_ACCOUNTS, TIMEOUTS } from '../test-config';

type Role = 'admin' | 'orderManager' | 'shipManager';
type Locale = 'ko' | 'zh-CN';

type EnsureOptions = {
  redirectPath?: string;
  locale?: Locale;
};

type RoleMap = Record<Role, keyof typeof TEST_ACCOUNTS>;

const roleMap: RoleMap = {
  admin: 'admin',
  orderManager: 'orderManager',
  shipManager: 'shipManager',
};

const getEnv = () => process.env.TEST_ENV || 'local';
const isProductionEnv = () => getEnv() === 'production';

const normalizeOptions = (
  redirectOrOptions?: string | EnsureOptions
): EnsureOptions => {
  if (!redirectOrOptions) return {};
  if (typeof redirectOrOptions === 'string') return { redirectPath: redirectOrOptions };
  return redirectOrOptions;
};

const deriveLocale = (redirectPath?: string, explicit?: Locale): Locale => {
  if (explicit) return explicit;
  if (redirectPath) {
    const parts = redirectPath.split('/').filter(Boolean);
    const first = parts[0];
    if (first === 'ko' || first === 'zh-CN') {
      return first;
    }
  }
  return 'ko';
};

const buildRedirectPath = (locale: Locale, redirectPath?: string) => {
  if (redirectPath) return redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`;
  return `/${locale}/dashboard`;
};

export async function ensureLoggedIn(
  page: Page,
  role: Role = 'admin',
  redirectOrOptions?: string | EnsureOptions
) {
  const options = normalizeOptions(redirectOrOptions);
  const locale = deriveLocale(options.redirectPath, options.locale);
  const redirectPath = buildRedirectPath(locale, options.redirectPath);
  const creds = TEST_ACCOUNTS[roleMap[role]];
  const targetUrl = getTestUrl(redirectPath);

  if (!isProductionEnv()) {
    await page.goto(getTestUrl(`/${locale}`));
    await page.evaluate(
      ({ email, role, locale }) => {
        const sessionData = {
          id: '78502b6d-13e7-4acc-94a7-23a797de3519',
          email,
          name: role,
          role,
          last_login: new Date().toISOString(),
        };
        localStorage.setItem('userSession', JSON.stringify(sessionData));
        localStorage.setItem('userRole', role);
        localStorage.setItem('i18nextLng', locale);
        document.cookie = `mock-role=${role}; path=/`;
      },
      { email: creds.email, role, locale }
    );
    await page.goto(targetUrl, { waitUntil: 'networkidle' });
    return;
  }

  // 배포 환경에서는 홈페이지부터 시작
  console.log(`🔐 로그인 시도: ${role} 계정으로 로그인`);

  await page.context().clearCookies();

  // 먼저 홈페이지로 이동
  const homeUrl = getTestUrl('/ko');
  await page.goto(homeUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(TIMEOUTS.short);

  // 현재 URL 확인
  const currentUrl = page.url();
  console.log(`  현재 페이지: ${currentUrl}`);

  // 로그인 페이지인지 확인
  const hasEmailInput = await page.locator('input[type="email"]').count() > 0;

  if (hasEmailInput) {
    // 로그인 폼이 있으면 로그인 진행
    console.log('  로그인 폼 발견');
    await page.fill('input[type="email"]', creds.email);
    await page.fill('input[type="password"]', creds.password);

    await page.click('button[type="submit"]');
    await page.waitForTimeout(TIMEOUTS.medium);

    // 대시보드로 이동했는지 확인
    await page.waitForURL((url) => url.href.includes('dashboard'), {
      timeout: TIMEOUTS.navigation,
    });

    console.log('  ✅ 로그인 완료');
  } else {
    console.log('  ℹ️ 로그인 폼이 없음 - 이미 로그인되어 있거나 다른 페이지');

    // 대시보드로 직접 이동 시도
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(TIMEOUTS.short);

    // 리다이렉트 확인
    const afterUrl = page.url();
    if (afterUrl.includes('login')) {
      throw new Error('로그인 페이지로 리다이렉트됨 - 로그인 폼을 찾을 수 없음');
    }
  }
}

export async function clearAuth(page: Page) {
  if (!isProductionEnv()) {
    await page.evaluate(() => {
      localStorage.removeItem('userSession');
      localStorage.removeItem('userRole');
      localStorage.removeItem('i18nextLng');
      document.cookie = 'mock-role=; Max-Age=0; path=/';
    });
    return;
  }

  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}
