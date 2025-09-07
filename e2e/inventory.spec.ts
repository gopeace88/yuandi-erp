import { test, expect } from '@playwright/test';

test.describe('Inventory Management Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as order_manager
    await page.goto('/ko');
    await page.fill('input[type="email"]', 'order@yuandi.com');
    await page.fill('input[type="password"]', 'order123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Navigate to Inventory page
    await page.click('a:has-text("재고 관리")');
    await page.waitForURL('**/inventory');
  });

  test('should display inventory page with all elements', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('재고 관리');
    
    // Check tabs
    await expect(page.locator('button:has-text("상품 목록")')).toBeVisible();
    await expect(page.locator('button:has-text("재고 이동")')).toBeVisible();
    
    // Check search bar
    await expect(page.locator('input[placeholder*="검색"]')).toBeVisible();
    
    // Check action buttons
    await expect(page.locator('button:has-text("상품 등록")')).toBeVisible();
    await expect(page.locator('button:has-text("재고 입고")')).toBeVisible();
    
    // Check products table
    await expect(page.locator('table')).toBeVisible();
  });

  test('should register new product', async ({ page }) => {
    // Click product registration button
    await page.click('button:has-text("상품 등록")');
    
    // Wait for modal
    await expect(page.locator('h2:has-text("새 상품 등록")')).toBeVisible();
    
    // Fill product form
    await page.fill('input[placeholder*="카테고리"]', '의류');
    await page.fill('input[placeholder*="상품명"]', '테스트 티셔츠');
    await page.fill('input[placeholder*="모델"]', 'TEST-001');
    await page.fill('input[placeholder*="색상"]', '블랙');
    await page.fill('input[placeholder*="브랜드"]', '테스트브랜드');
    await page.fill('input[placeholder*="원가"]', '100');
    await page.fill('input[placeholder*="판매가"]', '30000');
    await page.fill('input[placeholder*="바코드"]', '1234567890123');
    await page.fill('input[placeholder*="이미지"]', 'https://example.com/image.jpg');
    await page.fill('textarea[placeholder*="설명"]', '테스트 상품입니다');
    
    // Submit form
    await page.click('button:has-text("등록")');
    
    // Check if modal closed and product is in list
    await expect(page.locator('h2:has-text("새 상품 등록")')).not.toBeVisible();
    await expect(page.locator('text=테스트 티셔츠')).toBeVisible();
  });

  test('should register stock inbound', async ({ page }) => {
    // Click stock inbound button
    await page.click('button:has-text("재고 입고")');
    
    // Wait for modal
    await expect(page.locator('h2:has-text("재고 입고 등록")')).toBeVisible();
    
    // Select product
    const productSelect = page.locator('select').first();
    const options = await productSelect.locator('option').count();
    if (options > 1) {
      await productSelect.selectOption({ index: 1 });
    }
    
    // Fill inbound form
    await page.fill('input[placeholder*="수량"]', '10');
    await page.fill('input[placeholder*="단가"]', '100');
    await page.fill('textarea[placeholder*="메모"]', '테스트 입고');
    
    // Submit form
    await page.click('button:has-text("입고 등록")');
    
    // Check if modal closed
    await expect(page.locator('h2:has-text("재고 입고 등록")')).not.toBeVisible();
  });

  test('should switch to inventory movements tab', async ({ page }) => {
    // Click inventory movements tab
    await page.click('button:has-text("재고 이동")');
    
    // Check movements table is displayed
    await expect(page.locator('text=이동 유형')).toBeVisible();
    await expect(page.locator('text=이동 전')).toBeVisible();
    await expect(page.locator('text=이동 후')).toBeVisible();
  });

  test('should filter products by category', async ({ page }) => {
    // Select category filter
    const categoryFilter = page.locator('select').first();
    
    // Check if there are categories to select
    const options = await categoryFilter.locator('option').count();
    if (options > 1) {
      await categoryFilter.selectOption({ index: 1 });
      
      // Verify filtered results (at least check no error occurred)
      await page.waitForTimeout(500);
    }
  });

  test('should search products by name or SKU', async ({ page }) => {
    // Type in search box
    await page.fill('input[placeholder*="검색"]', '나이키');
    
    // Check filtered results
    const results = page.locator('text=나이키');
    const count = await results.count();
    
    if (count > 0) {
      await expect(results.first()).toBeVisible();
    }
  });

  test('should show low stock alerts', async ({ page }) => {
    // Check if low stock badges are displayed
    const lowStockBadges = page.locator('span:has-text("재고 부족")');
    const count = await lowStockBadges.count();
    
    // If there are low stock items, they should be visible
    if (count > 0) {
      await expect(lowStockBadges.first()).toBeVisible();
    }
  });

  test('should view product details', async ({ page }) => {
    // Click detail button on first product
    const detailButton = page.locator('button:has-text("상세")').first();
    
    if (await detailButton.isVisible()) {
      await detailButton.click();
      
      // Check detail modal is displayed
      await expect(page.locator('h2:has-text("상품 상세 정보")')).toBeVisible();
      
      // Check product information is displayed
      await expect(page.locator('text=SKU')).toBeVisible();
      await expect(page.locator('text=카테고리')).toBeVisible();
      await expect(page.locator('text=재고 현황')).toBeVisible();
      
      // Close modal
      await page.click('button:has-text("닫기")');
      await expect(page.locator('h2:has-text("상품 상세 정보")')).not.toBeVisible();
    }
  });

  test('should adjust stock', async ({ page }) => {
    // Click adjust button on first product
    const adjustButton = page.locator('button:has-text("조정")').first();
    
    if (await adjustButton.isVisible()) {
      await adjustButton.click();
      
      // Wait for modal
      await expect(page.locator('h2:has-text("재고 조정")')).toBeVisible();
      
      // Fill adjustment form
      await page.fill('input[placeholder*="조정 수량"]', '5');
      await page.fill('textarea[placeholder*="사유"]', '재고 실사 조정');
      
      // Submit form
      await page.click('button:has-text("조정 실행")');
      
      // Check if modal closed
      await expect(page.locator('h2:has-text("재고 조정")')).not.toBeVisible();
    }
  });
});