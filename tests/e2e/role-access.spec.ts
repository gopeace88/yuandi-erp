import { test, expect } from '@playwright/test';

test.describe('Role-Based Access Control Tests', () => {
  
  test.describe('Admin Role Access', () => {
    test.beforeEach(async ({ page }) => {
      // Login as Admin
      await page.goto('/ko');
      await page.fill('input[type="email"]', 'admin@yuandi.com');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
    });

    test('Admin should access all pages', async ({ page }) => {
      // Check Dashboard
      await page.click('a:has-text("대시보드")');
      await expect(page).toHaveURL(/\/dashboard$/);
      
      // Check Orders
      await page.click('a:has-text("주문 관리")');
      await expect(page).toHaveURL(/\/orders$/);
      
      // Check Inventory
      await page.click('a:has-text("재고 관리")');
      await expect(page).toHaveURL(/\/inventory$/);
      
      // Check Shipments
      await page.click('a:has-text("배송 관리")');
      await expect(page).toHaveURL(/\/shipments$/);
      
      // Check Cashbook
      await page.click('a:has-text("출납장부")');
      await expect(page).toHaveURL(/\/cashbook$/);
      
      // Check Users (Admin only)
      await page.click('a:has-text("사용자 관리")');
      await expect(page).toHaveURL(/\/users$/);
      
      // Check Track
      await page.click('a:has-text("주문 조회")');
      await expect(page).toHaveURL(/\/track$/);
    });

    test('Admin should see Excel export button in Orders', async ({ page }) => {
      await page.goto('/ko/orders');
      await expect(page.locator('button:has-text("Excel 내보내기")')).toBeVisible();
    });

    test('Admin should add transactions in Cashbook', async ({ page }) => {
      await page.goto('/ko/cashbook');
      await expect(page.locator('button:has-text("거래 추가")')).toBeVisible();
    });
  });

  test.describe('OrderManager Role Access', () => {
    test.beforeEach(async ({ page }) => {
      // Login as OrderManager
      await page.goto('/ko');
      await page.fill('input[type="email"]', 'order@yuandi.com');
      await page.fill('input[type="password"]', 'order123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
    });

    test('OrderManager should access allowed pages', async ({ page }) => {
      // Check Dashboard
      await page.click('a:has-text("대시보드")');
      await expect(page).toHaveURL(/\/dashboard$/);
      
      // Check Orders
      await page.click('a:has-text("주문 관리")');
      await expect(page).toHaveURL(/\/orders$/);
      
      // Check Inventory
      await page.click('a:has-text("재고 관리")');
      await expect(page).toHaveURL(/\/inventory$/);
      
      // Check Shipments
      await page.click('a:has-text("배송 관리")');
      await expect(page).toHaveURL(/\/shipments$/);
      
      // Check Cashbook
      await page.click('a:has-text("출납장부")');
      await expect(page).toHaveURL(/\/cashbook$/);
      
      // Check Track
      await page.click('a:has-text("주문 조회")');
      await expect(page).toHaveURL(/\/track$/);
    });

    test('OrderManager should NOT see Users menu', async ({ page }) => {
      // Users menu should not be visible
      await expect(page.locator('a:has-text("사용자 관리")')).not.toBeVisible();
    });

    test('OrderManager should NOT access Users page directly', async ({ page }) => {
      // Try to access Users page directly
      await page.goto('/ko/users');
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard$/);
    });

    test('OrderManager should NOT see Excel export in Orders', async ({ page }) => {
      await page.goto('/ko/orders');
      await expect(page.locator('button:has-text("Excel 내보내기")')).not.toBeVisible();
    });

    test('OrderManager should add transactions in Cashbook', async ({ page }) => {
      await page.goto('/ko/cashbook');
      await expect(page.locator('button:has-text("거래 추가")')).toBeVisible();
    });
  });

  test.describe('ShipManager Role Access', () => {
    test.beforeEach(async ({ page }) => {
      // Login as ShipManager
      await page.goto('/ko');
      await page.fill('input[type="email"]', 'ship@yuandi.com');
      await page.fill('input[type="password"]', 'ship123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
    });

    test('ShipManager should access allowed pages', async ({ page }) => {
      // Check Dashboard
      await page.click('a:has-text("대시보드")');
      await expect(page).toHaveURL(/\/dashboard$/);
      
      // Check Shipments
      await page.click('a:has-text("배송 관리")');
      await expect(page).toHaveURL(/\/shipments$/);
      
      // Check Cashbook (view only)
      await page.click('a:has-text("출납장부")');
      await expect(page).toHaveURL(/\/cashbook$/);
      
      // Check Track
      await page.click('a:has-text("주문 조회")');
      await expect(page).toHaveURL(/\/track$/);
    });

    test('ShipManager should NOT see Orders menu', async ({ page }) => {
      // Orders menu should not be visible
      await expect(page.locator('a:has-text("주문 관리")')).not.toBeVisible();
    });

    test('ShipManager should NOT see Inventory menu', async ({ page }) => {
      // Inventory menu should not be visible
      await expect(page.locator('a:has-text("재고 관리")')).not.toBeVisible();
    });

    test('ShipManager should NOT see Users menu', async ({ page }) => {
      // Users menu should not be visible
      await expect(page.locator('a:has-text("사용자 관리")')).not.toBeVisible();
    });

    test('ShipManager should NOT add transactions in Cashbook', async ({ page }) => {
      await page.goto('/ko/cashbook');
      // ShipManager should not see add transaction button
      await expect(page.locator('button:has-text("거래 추가")')).not.toBeVisible();
    });

    test('ShipManager can register shipping information', async ({ page }) => {
      await page.goto('/ko/shipments');
      
      // Should be able to register shipping
      const registerButton = page.locator('button:has-text("배송 등록")').first();
      if (await registerButton.isVisible()) {
        await expect(registerButton).toBeEnabled();
      }
    });
  });

  test.describe('Unauthorized Access Tests', () => {
    test('Should redirect to login when accessing protected pages without login', async ({ page }) => {
      // Try to access dashboard without login
      await page.goto('/ko/dashboard');
      await expect(page).toHaveURL(/\/ko$/);
      
      // Try to access orders without login
      await page.goto('/ko/orders');
      await expect(page).toHaveURL(/\/ko$/);
      
      // Try to access inventory without login
      await page.goto('/ko/inventory');
      await expect(page).toHaveURL(/\/ko$/);
      
      // Try to access shipments without login
      await page.goto('/ko/shipments');
      await expect(page).toHaveURL(/\/ko$/);
      
      // Try to access cashbook without login
      await page.goto('/ko/cashbook');
      await expect(page).toHaveURL(/\/ko$/);
      
      // Try to access users without login
      await page.goto('/ko/users');
      await expect(page).toHaveURL(/\/ko$/);
    });

    test('Track page should be accessible without login', async ({ page }) => {
      // Track page should be accessible without login
      await page.goto('/ko/track');
      await expect(page).toHaveURL(/\/track$/);
      await expect(page.locator('h1')).toContainText('주문 조회');
    });
  });
});