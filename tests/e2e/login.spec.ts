import { test, expect } from '@playwright/test';

// 테스트 데이터 (03.test_data.sql 기반)
const TEST_ACCOUNTS = {
  admin: {
    email: 'admin@yuandi.com',
    password: 'yuandi123!',
    role: 'admin'
  },
  orderManager: {
    email: 'order@yuandi.com',
    password: 'yuandi123!',
    role: 'order_manager'
  },
  shipManager: {
    email: 'ship@yuandi.com',
    password: 'yuandi123!',
    role: 'ship_manager'
  }
};

test.describe('로그인 폼 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('로그인 폼 요소 확인', async ({ page }) => {
    // 실제 selector 확인 (추측하지 않음)
    await expect(page.locator('input#email, [data-testid="login-email"]')).toBeVisible();
    await expect(page.locator('input#password, [data-testid="login-password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"], [data-testid="login-submit"]')).toBeVisible();

    // placeholder 확인
    const emailInput = page.locator('input#email, [data-testid="login-email"]');
    await expect(emailInput).toHaveAttribute('placeholder', 'admin@yuandi.com');
  });

  test('관리자 로그인 성공', async ({ page }) => {
    // 실제 selector 사용
    await page.fill('input#email, [data-testid="login-email"]', TEST_ACCOUNTS.admin.email);
    await page.fill('input#password, [data-testid="login-password"]', TEST_ACCOUNTS.admin.password);
    await page.click('button[type="submit"], [data-testid="login-submit"]');

    // 대시보드로 이동 확인
    await expect(page).toHaveURL(/.*dashboard/);

    // 관리자 메뉴 접근 가능 확인
    await expect(page.locator('text=설정')).toBeVisible();
  });

  test('주문 관리자 로그인 성공', async ({ page }) => {
    await page.fill('input#email, [data-testid="login-email"]', TEST_ACCOUNTS.orderManager.email);
    await page.fill('input#password, [data-testid="login-password"]', TEST_ACCOUNTS.orderManager.password);
    await page.click('button[type="submit"], [data-testid="login-submit"]');

    await expect(page).toHaveURL(/.*dashboard/);

    // 주문 관리자 권한 확인
    await expect(page.locator('text=주문관리')).toBeVisible();
    await expect(page.locator('text=재고관리')).toBeVisible();
  });

  test('배송 관리자 로그인 성공', async ({ page }) => {
    await page.fill('input#email, [data-testid="login-email"]', TEST_ACCOUNTS.shipManager.email);
    await page.fill('input#password, [data-testid="login-password"]', TEST_ACCOUNTS.shipManager.password);
    await page.click('button[type="submit"], [data-testid="login-submit"]');

    await expect(page).toHaveURL(/.*dashboard/);

    // 배송 관리자 권한 확인
    await expect(page.locator('text=배송관리')).toBeVisible();
  });

  test('잘못된 이메일로 로그인 실패', async ({ page }) => {
    await page.fill('input#email, [data-testid="login-email"]', 'wrong@email.com');
    await page.fill('input#password, [data-testid="login-password"]', 'wrongpassword');
    await page.click('button[type="submit"], [data-testid="login-submit"]');

    // 에러 메시지 확인 (Alert 컴포넌트)
    await expect(page.locator('[role="alert"]')).toBeVisible();
    await expect(page).toHaveURL(/.*login/);
  });

  test('빈 필드로 로그인 시도', async ({ page }) => {
    // HTML5 validation이 작동하는지 확인
    await page.click('button[type="submit"], [data-testid="login-submit"]');

    // 브라우저 기본 validation 메시지 확인
    const emailInput = page.locator('input#email, [data-testid="login-email"]');
    const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(validationMessage).toBeTruthy();
  });

  test('비밀번호 표시/숨기기 토글', async ({ page }) => {
    const passwordInput = page.locator('input#password, [data-testid="login-password"]');

    // 초기 상태는 password 타입
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // 토글 버튼 클릭 (Eye 아이콘)
    const toggleButton = page.locator('button:has(svg)').filter({ hasText: /show|hide/i }).first();
    if (await toggleButton.count() > 0) {
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');

      // 다시 클릭하여 숨기기
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    }
  });

  test('로딩 상태 확인', async ({ page }) => {
    await page.fill('input#email, [data-testid="login-email"]', TEST_ACCOUNTS.admin.email);
    await page.fill('input#password, [data-testid="login-password"]', TEST_ACCOUNTS.admin.password);

    // 제출 버튼 클릭
    const submitButton = page.locator('button[type="submit"], [data-testid="login-submit"]');
    await submitButton.click();

    // 로딩 중 버튼 비활성화 확인
    await expect(submitButton).toBeDisabled();
  });
});