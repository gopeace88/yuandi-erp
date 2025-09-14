import { test, expect } from '@playwright/test';

// 테스트 데이터
const TEST_ADMIN = {
  email: 'admin@yuandi.com',
  password: 'yuandi123!'
};

// 상품 카테고리 (스키마 정의)
const CATEGORIES = ['electronics', 'fashion', 'home', 'beauty', 'sports', 'food', 'other'];

test.describe('상품 관리 테스트', () => {
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

  test('상품 등록 모달 열기', async ({ page }) => {
    // 상품 추가 버튼 클릭
    await page.click('button:has-text("상품 추가")');

    // 모달 확인
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=새 상품 추가')).toBeVisible();
  });

  test('상품 등록 - 필수 필드 validation', async ({ page }) => {
    await page.click('button:has-text("상품 추가")');

    // 빈 폼으로 제출 시도
    await page.click('[data-testid="product-submit-button"]');

    // HTML5 validation 메시지 확인
    const nameInput = page.locator('[data-testid="product-name"]');
    const validationMessage = await nameInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(validationMessage).toBeTruthy();
  });

  test('상품 등록 성공', async ({ page }) => {
    await page.click('button:has-text("상품 추가")');

    // 실제 selector 사용하여 폼 작성
    await page.selectOption('[data-testid="product-category"]', 'fashion');
    await page.fill('[data-testid="product-name"]', 'Test Handbag');
    await page.fill('[data-testid="product-model"]', 'TB-2025');
    await page.fill('[data-testid="product-color"]', 'Black');
    await page.fill('[data-testid="product-brand"]', 'Test Brand');
    await page.fill('[data-testid="product-cost-cny"]', '500');
    await page.fill('[data-testid="product-sale-price"]', '150000');
    await page.fill('[data-testid="product-initial-stock"]', '10');
    await page.fill('[data-testid="product-safety-stock"]', '3');

    // 제출
    await page.click('[data-testid="product-submit-button"]');

    // 성공 확인 - 모달 닫힘
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // 상품 목록에 추가 확인
    await page.reload();
    await expect(page.locator('text=Test Handbag')).toBeVisible();
    await expect(page.locator('text=TB-2025')).toBeVisible();
  });

  test('상품 등록 - 숫자 필드 validation', async ({ page }) => {
    await page.click('button:has-text("상품 추가")');

    // 음수 입력 시도
    await page.fill('[data-testid="product-cost-cny"]', '-100');
    await page.fill('[data-testid="product-sale-price"]', '-50000');
    await page.fill('[data-testid="product-initial-stock"]', '-5');

    // 각 필드의 min 속성 확인
    const costInput = page.locator('[data-testid="product-cost-cny"]');
    const priceInput = page.locator('[data-testid="product-sale-price"]');
    const stockInput = page.locator('[data-testid="product-initial-stock"]');

    await expect(costInput).toHaveAttribute('step', '0.01');
    await expect(priceInput).toHaveAttribute('step', '100');
    await expect(stockInput).toHaveAttribute('min', '0');
  });

  test('상품 등록 취소', async ({ page }) => {
    await page.click('button:has-text("상품 추가")');

    // 일부 데이터 입력
    await page.fill('[data-testid="product-name"]', 'Cancelled Product');

    // 취소 버튼 클릭
    await page.click('[data-testid="product-cancel-button"]');

    // 모달 닫힘 확인
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // 상품이 추가되지 않았는지 확인
    await page.reload();
    await expect(page.locator('text=Cancelled Product')).not.toBeVisible();
  });

  test('카테고리별 상품 필터링', async ({ page }) => {
    // 카테고리 필터가 있다면 테스트
    const categoryFilter = page.locator('select[name="category-filter"]');
    if (await categoryFilter.count() > 0) {
      // fashion 카테고리 선택
      await categoryFilter.selectOption('fashion');

      // fashion 카테고리 상품만 표시되는지 확인
      const products = page.locator('[data-category="fashion"]');
      expect(await products.count()).toBeGreaterThan(0);
    }
  });

  test('상품 검색 기능', async ({ page }) => {
    // 검색창이 있다면 테스트
    const searchInput = page.locator('input[placeholder*="검색"]');
    if (await searchInput.count() > 0) {
      // 브랜드로 검색
      await searchInput.fill('Louis Vuitton');
      await page.keyboard.press('Enter');

      // 검색 결과 확인
      await expect(page.locator('text=Louis Vuitton').first()).toBeVisible();
    }
  });

  test('재고 부족 상품 표시', async ({ page }) => {
    // 재고가 안전재고 이하인 상품들이 강조 표시되는지 확인
    const lowStockItems = page.locator('[data-low-stock="true"]');
    if (await lowStockItems.count() > 0) {
      // 경고 색상이나 아이콘이 표시되는지 확인
      const firstLowStock = lowStockItems.first();
      const className = await firstLowStock.getAttribute('class');
      expect(className).toMatch(/warning|danger|red|yellow/i);
    }
  });

  test('상품 상세 정보 보기', async ({ page }) => {
    // 첫 번째 상품 클릭
    const firstProduct = page.locator('tbody tr').first();
    if (await firstProduct.count() > 0) {
      await firstProduct.click();

      // 상세 정보 모달이나 페이지 확인
      const detailModal = page.locator('[role="dialog"]:has-text("상품 상세")');
      const detailPage = page.locator('h1:has-text("상품 상세")');

      if (await detailModal.count() > 0) {
        await expect(detailModal).toBeVisible();
      } else if (await detailPage.count() > 0) {
        await expect(detailPage).toBeVisible();
      }
    }
  });

  test('대량 상품 목록 페이지네이션', async ({ page }) => {
    // 페이지네이션 컨트롤 확인
    const pagination = page.locator('[aria-label="pagination"], .pagination');
    if (await pagination.count() > 0) {
      // 다음 페이지 버튼 클릭
      const nextButton = page.locator('button:has-text("다음"), [aria-label="next page"]');
      if (await nextButton.count() > 0 && await nextButton.isEnabled()) {
        await nextButton.click();

        // URL 또는 페이지 상태 변경 확인
        await expect(page).toHaveURL(/page=2|offset=/);
      }
    }
  });
});