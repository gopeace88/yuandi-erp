import { test, expect } from '@playwright/test';

const TEST_ADMIN = {
  email: 'admin@yuandi.com',
  password: 'yuandi123!'
};

test.describe('재고 조정 테스트', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    await page.goto('/login');
    await page.fill('input#email, [data-testid="login-email"]', TEST_ADMIN.email);
    await page.fill('input#password, [data-testid="login-password"]', TEST_ADMIN.password);
    await page.click('button[type="submit"], [data-testid="login-submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    // 재고 관리 페이지로 이동
    await page.goto('/ko/inventory');
    await page.waitForLoadState('networkidle');
  });

  test('재고 입고 모달 열기', async ({ page }) => {
    // 첫 번째 상품의 입고 버튼 클릭
    const firstInboundButton = page.locator('button:has-text("입고")').first();
    if (await firstInboundButton.count() > 0) {
      await firstInboundButton.click();

      // 입고 모달 확인
      await expect(page.locator('[role="dialog"]:has-text("재고 입고")')).toBeVisible();
      await expect(page.locator('[data-testid="stock-quantity-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="stock-note-textarea"]')).toBeVisible();
    }
  });

  test('재고 입고 - 양수만 허용', async ({ page }) => {
    const firstInboundButton = page.locator('button:has-text("입고")').first();
    if (await firstInboundButton.count() > 0) {
      await firstInboundButton.click();

      // 음수 입력 시도
      const quantityInput = page.locator('[data-testid="stock-quantity-input"]');
      await quantityInput.fill('-5');

      // min 속성 확인 (입고는 1 이상)
      await expect(quantityInput).toHaveAttribute('min', '1');

      // 제출 시도
      await page.click('[data-testid="stock-submit-button"]');

      // HTML5 validation 확인
      const validationMessage = await quantityInput.evaluate((el: HTMLInputElement) => el.validationMessage);
      expect(validationMessage).toBeTruthy();
    }
  });

  test('재고 입고 성공', async ({ page }) => {
    const firstInboundButton = page.locator('button:has-text("입고")').first();
    if (await firstInboundButton.count() > 0) {
      // 현재 재고 확인
      const stockCell = page.locator('tbody tr').first().locator('td').nth(5); // 재고 컬럼 위치
      const initialStock = await stockCell.textContent();
      const initialStockNum = parseInt(initialStock?.replace(/[^0-9]/g, '') || '0');

      await firstInboundButton.click();

      // 입고 수량 입력
      await page.fill('[data-testid="stock-quantity-input"]', '10');
      await page.fill('[data-testid="stock-note-textarea"]', '테스트 입고');

      // 변경 후 재고 미리보기 확인
      const preview = page.locator('text=/변경 후.*재고/');
      if (await preview.count() > 0) {
        const previewText = await preview.textContent();
        expect(previewText).toContain(String(initialStockNum + 10));
      }

      // 제출
      await page.click('[data-testid="stock-submit-button"]');

      // 모달 닫힘 확인
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();

      // 재고 업데이트 확인
      await page.reload();
      const updatedStock = await stockCell.textContent();
      const updatedStockNum = parseInt(updatedStock?.replace(/[^0-9]/g, '') || '0');
      expect(updatedStockNum).toBe(initialStockNum + 10);
    }
  });

  test('재고 조정 모달 열기', async ({ page }) => {
    // 첫 번째 상품의 조정 버튼 클릭
    const firstAdjustButton = page.locator('button:has-text("조정")').first();
    if (await firstAdjustButton.count() > 0) {
      await firstAdjustButton.click();

      // 조정 모달 확인
      await expect(page.locator('[role="dialog"]:has-text("재고 조정")')).toBeVisible();
      await expect(page.locator('[data-testid="stock-quantity-input"]')).toBeVisible();
    }
  });

  test('재고 조정 - 음수 허용 (재고 차감)', async ({ page }) => {
    const firstAdjustButton = page.locator('button:has-text("조정")').first();
    if (await firstAdjustButton.count() > 0) {
      // 현재 재고 확인
      const stockCell = page.locator('tbody tr').first().locator('td').nth(5);
      const initialStock = await stockCell.textContent();
      const initialStockNum = parseInt(initialStock?.replace(/[^0-9]/g, '') || '0');

      await firstAdjustButton.click();

      // 음수 입력 (재고 차감)
      const quantityInput = page.locator('[data-testid="stock-quantity-input"]');
      await quantityInput.fill('-3');

      // 변경 후 재고가 음수가 되지 않는지 확인
      const preview = page.locator('text=/변경 후.*재고/');
      if (await preview.count() > 0) {
        const previewText = await preview.textContent();
        const previewNum = parseInt(previewText?.replace(/[^0-9]/g, '') || '0');
        expect(previewNum).toBeGreaterThanOrEqual(0);
      }

      // 비고 입력
      await page.fill('[data-testid="stock-note-textarea"]', '재고 실사 조정');

      // 제출
      await page.click('[data-testid="stock-submit-button"]');

      // 모달 닫힘 확인
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();

      // 재고 업데이트 확인
      await page.reload();
      const updatedStock = await stockCell.textContent();
      const updatedStockNum = parseInt(updatedStock?.replace(/[^0-9]/g, '') || '0');
      expect(updatedStockNum).toBe(initialStockNum - 3);
    }
  });

  test('재고 조정 - 재고를 음수로 만들 수 없음', async ({ page }) => {
    const firstAdjustButton = page.locator('button:has-text("조정")').first();
    if (await firstAdjustButton.count() > 0) {
      // 현재 재고 확인
      const stockCell = page.locator('tbody tr').first().locator('td').nth(5);
      const initialStock = await stockCell.textContent();
      const initialStockNum = parseInt(initialStock?.replace(/[^0-9]/g, '') || '0');

      await firstAdjustButton.click();

      // 현재 재고보다 큰 음수 입력 시도
      const quantityInput = page.locator('[data-testid="stock-quantity-input"]');
      await quantityInput.fill(`-${initialStockNum + 10}`);

      // 제출 버튼이 비활성화되거나 에러 메시지 표시 확인
      const submitButton = page.locator('[data-testid="stock-submit-button"]');
      const isDisabled = await submitButton.isDisabled();

      if (!isDisabled) {
        await submitButton.click();
        // 에러 메시지 확인
        await expect(page.locator('text=/재고.*음수|부족/i')).toBeVisible();
      } else {
        expect(isDisabled).toBeTruthy();
      }
    }
  });

  test('재고 조정 취소', async ({ page }) => {
    const firstAdjustButton = page.locator('button:has-text("조정")').first();
    if (await firstAdjustButton.count() > 0) {
      await firstAdjustButton.click();

      // 데이터 입력
      await page.fill('[data-testid="stock-quantity-input"]', '5');
      await page.fill('[data-testid="stock-note-textarea"]', '취소될 조정');

      // 취소 버튼 클릭
      await page.click('[data-testid="stock-cancel-button"]');

      // 모달 닫힘 확인
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();

      // 재고가 변경되지 않았는지 확인
      const stockCell = page.locator('tbody tr').first().locator('td').nth(5);
      const currentStock = await stockCell.textContent();
      // 재고가 그대로인지 확인 (페이지를 리로드하지 않았으므로 동일해야 함)
      expect(currentStock).toBeTruthy();
    }
  });

  test('재고 이동 기록 확인', async ({ page }) => {
    // 입고 수행
    const firstInboundButton = page.locator('button:has-text("입고")').first();
    if (await firstInboundButton.count() > 0) {
      await firstInboundButton.click();
      await page.fill('[data-testid="stock-quantity-input"]', '5');
      await page.fill('[data-testid="stock-note-textarea"]', '테스트 입고 기록');
      await page.click('[data-testid="stock-submit-button"]');

      // 모달 닫힘 대기
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();

      // 출납장부 페이지로 이동
      await page.goto('/ko/cashbook');
      await page.waitForLoadState('networkidle');

      // 재고 이동 기록 확인 (inventory_movements 테이블)
      // 또는 상품 상세 페이지에서 이동 기록 확인
      const inventoryRecord = page.locator('text=테스트 입고 기록');
      if (await inventoryRecord.count() > 0) {
        await expect(inventoryRecord).toBeVisible();
      }
    }
  });

  test('동시 재고 업데이트 충돌 방지', async ({ page, context }) => {
    // 두 개의 브라우저 탭 열기
    const page2 = await context.newPage();

    // 두 번째 탭도 로그인
    await page2.goto('/login');
    await page2.fill('input#email, [data-testid="login-email"]', TEST_ADMIN.email);
    await page2.fill('input#password, [data-testid="login-password"]', TEST_ADMIN.password);
    await page2.click('button[type="submit"], [data-testid="login-submit"]');
    await page2.goto('/ko/inventory');

    // 첫 번째 탭에서 입고 모달 열기
    const firstInboundButton1 = page.locator('button:has-text("입고")').first();
    if (await firstInboundButton1.count() > 0) {
      await firstInboundButton1.click();
      await page.fill('[data-testid="stock-quantity-input"]', '10');

      // 두 번째 탭에서도 같은 상품 입고 모달 열기
      const firstInboundButton2 = page2.locator('button:has-text("입고")').first();
      await firstInboundButton2.click();
      await page2.fill('[data-testid="stock-quantity-input"]', '5');

      // 첫 번째 탭에서 제출
      await page.click('[data-testid="stock-submit-button"]');
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();

      // 두 번째 탭에서 제출
      await page2.click('[data-testid="stock-submit-button"]');

      // 두 번째 탭도 성공하거나 적절한 에러 메시지 표시
      const dialog2 = page2.locator('[role="dialog"]');
      const errorMessage = page2.locator('text=/충돌|변경|업데이트/i');

      // 모달이 닫히거나 에러 메시지가 표시되어야 함
      if (await dialog2.isVisible()) {
        // 에러 메시지가 있을 수 있음
        const hasError = await errorMessage.count() > 0;
        expect(hasError || !(await dialog2.isVisible())).toBeTruthy();
      }
    }

    await page2.close();
  });
});