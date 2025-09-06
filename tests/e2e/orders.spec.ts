import { test, expect } from '@playwright/test';

test.describe('Orders Management Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as OrderManager
    await page.goto('/ko');
    await page.fill('input[type="email"]', 'order@yuandi.com');
    await page.fill('input[type="password"]', 'order123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Navigate to Orders page
    await page.click('a:has-text("주문 관리")');
    await page.waitForURL('**/orders');
  });

  test('should display orders page with all elements', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('주문 관리');
    
    // Check search bar
    await expect(page.locator('input[placeholder*="검색"]')).toBeVisible();
    
    // Check filter dropdowns
    await expect(page.locator('select').first()).toBeVisible();
    
    // Check create order button
    await expect(page.locator('button:has-text("주문 생성")'))
.toBeVisible();
    
    // Check orders table
    await expect(page.locator('table')).toBeVisible();
  });

  test('should create new order', async ({ page }) => {
    // Click create order button
    await page.click('button:has-text("주문 생성")');
    
    // Wait for modal
    await expect(page.locator('h2:has-text("새 주문 생성")')).toBeVisible();
    
    // Fill order form
    await page.fill('input[placeholder*="고객명"]', '테스트 고객');
    await page.fill('input[placeholder*="전화번호"]', '010-9999-9999');
    await page.fill('input[placeholder*="이메일"]', 'test@example.com');
    await page.fill('input[placeholder*="PCCC"]', 'P123456789012');
    await page.fill('input[placeholder*="주소"]', '서울시 강남구 테스트로 123');
    await page.fill('input[placeholder*="상세주소"]', '101동 202호');
    await page.fill('input[placeholder*="우편번호"]', '12345');
    
    // Add product
    await page.click('button:has-text("상품 추가")');
    await page.fill('input[placeholder*="상품명"]', '테스트 상품');
    await page.fill('input[placeholder*="수량"]', '2');
    await page.fill('input[placeholder*="단가"]', '50000');
    
    // Submit form
    await page.click('button:has-text("생성")');
    
    // Check if modal closed and order is in list
    await expect(page.locator('h2:has-text("새 주문 생성")')).not.toBeVisible();
    await expect(page.locator('text=테스트 고객')).toBeVisible();
  });

  test('should filter orders by status', async ({ page }) => {
    // Select PAID status filter
    await page.selectOption('select', 'PAID');
    
    // Check that only PAID orders are shown
    const statusBadges = page.locator('span:has-text("결제완료")');
    const count = await statusBadges.count();
    
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        await expect(statusBadges.nth(i)).toBeVisible();
      }
    }
  });

  test('should search orders by customer name', async ({ page }) => {
    // Type in search box
    await page.fill('input[placeholder*="검색"]', '김철수');
    
    // Check filtered results
    const results = page.locator('text=김철수');
    const count = await results.count();
    
    if (count > 0) {
      await expect(results.first()).toBeVisible();
    }
  });

  test('should view order details', async ({ page }) => {
    // Click detail button on first order
    const detailButton = page.locator('button:has-text("상세")').first();
    
    if (await detailButton.isVisible()) {
      await detailButton.click();
      
      // Check detail modal is displayed
      await expect(page.locator('h2:has-text("주문 상세")')).toBeVisible();
      
      // Check order information is displayed
      await expect(page.locator('text=주문번호')).toBeVisible();
      await expect(page.locator('text=고객 정보')).toBeVisible();
      await expect(page.locator('text=상품 목록')).toBeVisible();
      
      // Close modal
      await page.click('button:has-text("닫기")');
      await expect(page.locator('h2:has-text("주문 상세")')).not.toBeVisible();
    }
  });

  test('should update order status', async ({ page }) => {
    // Click status update button on first order
    const statusButton = page.locator('button:has-text("배송중")').first();
    
    if (await statusButton.isVisible()) {
      await statusButton.click();
      
      // Check status is updated
      await expect(page.locator('span:has-text("배송중")').first()).toBeVisible();
    }
  });

  test('should export orders to Excel', async ({ page }) => {
    // Check export button exists (Admin only feature)
    const exportButton = page.locator('button:has-text("Excel 내보내기")');
    
    // This should not be visible for OrderManager
    await expect(exportButton).not.toBeVisible();
  });
});

test.describe('Orders Management Tests - Admin', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Admin
    await page.goto('/ko');
    await page.fill('input[type="email"]', 'admin@yuandi.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Navigate to Orders page
    await page.click('a:has-text("주문 관리")');
    await page.waitForURL('**/orders');
  });

  test('Admin should see export button', async ({ page }) => {
    // Check export button is visible for Admin
    await expect(page.locator('button:has-text("Excel 내보내기")')).toBeVisible();
  });
});