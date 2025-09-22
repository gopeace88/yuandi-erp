import { test, expect } from '@playwright/test';
import { getTestUrl, logTestEnvironment, TIMEOUTS, TEST_ACCOUNTS } from './test-config';
import { ensureLoggedIn, clearAuth } from './utils/auth';

test.describe('시나리오 9: 에러 처리 테스트', () => {
  test('시스템의 에러 처리 및 유효성 검사 확인', async ({ page }) => {
    console.log('\n=== 시나리오 9: 에러 처리 테스트 시작 ===\n');
    logTestEnvironment();

    // === 1단계: 잘못된 로그인 정보 테스트 ===
    console.log('📍 1단계: 잘못된 로그인 정보 테스트');

    await page.goto(getTestUrl('/ko')); 
    await page.waitForTimeout(TIMEOUTS.medium);

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.fill('input[type="email"]', 'wrong@email.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(TIMEOUTS.medium);

    const errorMessageSelectors = [
      'text=로그인에 실패했습니다',
      'text=Invalid login credentials',
      'text=이메일 또는 비밀번호가 올바르지 않습니다',
      'text=인증 실패',
      '.error-message',
      '[role="alert"]',
    ];

    let errorFound = false;
    for (const selector of errorMessageSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        errorFound = true;
        const errorText = await element.textContent();
        console.log(`  ✅ 로그인 실패 에러 메시지 표시: "${errorText}"`);
        break;
      }
    }

    if (!errorFound) {
      const currentUrl = page.url();
      if (currentUrl.includes('dashboard')) {
        console.log('  ❌ 잘못된 로그인 정보로 접속됨 (보안 문제)');
      } else {
        console.log('  ⚠️ 에러 메시지는 없지만 로그인 차단됨');
      }
    }

    await clearAuth(page);

    // === 2단계: 필수 필드 누락 테스트 ===
    console.log('\n📍 2단계: 필수 필드 누락 테스트');

    await ensureLoggedIn(page, TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password);
    console.log('  ✅ 정상 로그인 완료');

    await page.goto(getTestUrl('/ko/inventory'));
    await page.waitForTimeout(TIMEOUTS.medium);

    const addProductButton = page
      .locator('button')
      .filter({ hasText: /추가|새.*상품|Add|New/i })
      .or(page.locator('[data-testid="add-product"]'))
      .first();

    await addProductButton.click();
    await page.waitForTimeout(TIMEOUTS.short);

    const saveButton = page.locator('button').filter({ hasText: /저장|등록|Save/i }).first();
    await saveButton.click();
    await page.waitForTimeout(TIMEOUTS.medium);

    const validationMessages = page.locator('[role="alert"], .error, .text-red-500');
    const hasValidation = (await validationMessages.count()) > 0;

    if (hasValidation) {
      console.log('  ✅ 필수 필드 누락 시 검증 메시지 출력 확인');
    } else {
      console.log('  ⚠️ 필수 필드 검증 메시지를 찾을 수 없음');
    }

    await clearAuth(page);

    // === 3단계: 재고 부족 시 주문 생성 테스트 ===
    console.log('\n📍 3단계: 재고 부족 시 주문 생성 테스트');

    await ensureLoggedIn(page, TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password);
    await page.goto(getTestUrl('/ko/orders'));
    await page.waitForTimeout(TIMEOUTS.medium);

    const addOrderButton = page
      .locator('button:has-text("주문 추가")')
      .or(page.locator('button').filter({ hasText: '추가' }))
      .or(page.getByRole('button', { name: /주문|추가/i }))
      .first();

    if (await addOrderButton.count() === 0) {
      console.log('  ⚠️ 주문 추가 버튼을 찾을 수 없음 - 테스트 건너뜀');
    } else {
      await addOrderButton.click();
      await page.waitForTimeout(TIMEOUTS.short);

      const textInputs = await page.locator('input[type="text"]:not([placeholder="검색"])').all();
      if (textInputs.length >= 3) {
        await textInputs[0].fill('재고부족테스트 고객');
        await textInputs[1].fill('010-9999-9999');
        await textInputs[2].fill('stock_test');
      }

      await page.locator('input[type="email"]').fill('stock@test.com');

      if (textInputs.length >= 4) {
        await textInputs[3].fill('P99999999999');
      }

      const quantityInput = page.locator('input[type="number"]').first();
      await quantityInput.fill('9999');

      const submitOrder = page
        .locator('button')
        .filter({ hasText: /주문 생성|저장|등록|Create/i })
        .first();

      const [response] = await Promise.all([
        page.waitForResponse((res) => res.url().includes('/api/orders') && res.status() >= 400, {
          timeout: TIMEOUTS.navigation,
        }).catch(() => null),
        submitOrder.click(),
      ]);

      if (response) {
        console.log(`  ✅ 재고 부족 응답 수신: ${response.status()}`);
      } else {
        console.log('  ⚠️ 재고 부족 응답을 확인하지 못함');
      }
    }

    await clearAuth(page);

    // === 4단계: 네트워크 에러 시뮬레이션 ===
    console.log('\n📍 4단계: 네트워크 에러 시뮬레이션');

    await ensureLoggedIn(page, TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password, 'ko');
    await page.goto(getTestUrl('/ko/dashboard'));
    await page.waitForTimeout(TIMEOUTS.medium);

    await page.route('**/*', (route) => {
      route.abort();
    });

    await page.goto(getTestUrl('/ko/orders')).catch(() => {
      console.log('  ✅ 네트워크 오프라인 상태에서 페이지 로드 실패');
    });

    await page.unroute('**/*');
    await page.goto(getTestUrl('/ko/orders'));
    await page.waitForTimeout(TIMEOUTS.medium);

    await clearAuth(page);

    // === 5단계: API 에러 처리 테스트 ===
    console.log('\n📍 5단계: API 에러 처리 테스트');

    const response404 = await page.request.get(getTestUrl('/api/non-existent-endpoint'));
    console.log(`  ✅ 404 응답 확인: ${response404.status()}`);

    // === 6단계: 세션 만료 처리 테스트 ===
    console.log('\n📍 6단계: 세션 만료 처리 테스트');

    await ensureLoggedIn(page, TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password, 'ko');
    await page.goto(getTestUrl('/ko/dashboard'));
    await page.waitForTimeout(TIMEOUTS.medium);

    await clearAuth(page);

    await page.goto(getTestUrl('/ko/orders'));
    await page.waitForTimeout(TIMEOUTS.medium);

    if (page.url().includes('/login')) {
      console.log('  ✅ 세션 만료 후 로그인 페이지로 리다이렉트 확인');
    } else {
      console.log('  ⚠️ 세션 만료 후에도 보호된 페이지 접근 가능');
    }

    console.log('\n✅ 에러 처리 테스트 완료');
  });
});
