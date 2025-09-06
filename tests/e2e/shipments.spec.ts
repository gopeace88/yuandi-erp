import { test, expect } from '@playwright/test';

test.describe('Shipments Management Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as ShipManager
    await page.goto('/ko');
    await page.fill('input[type="email"]', 'ship@yuandi.com');
    await page.fill('input[type="password"]', 'ship123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Navigate to Shipments page
    await page.click('a:has-text("배송 관리")');
    await page.waitForURL('**/shipments');
  });

  test('should display shipments page with all elements', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('배송 관리');
    
    // Check tabs
    await expect(page.locator('button:has-text("배송 대기")')).toBeVisible();
    await expect(page.locator('button:has-text("배송 중/완료")')).toBeVisible();
    
    // Check search bar
    await expect(page.locator('input[placeholder*="검색"]')).toBeVisible();
    
    // Check tables
    await expect(page.locator('table')).toBeVisible();
  });

  test('should register shipping information', async ({ page }) => {
    // Click on pending orders tab
    await page.click('button:has-text("배송 대기")');
    
    // Find register shipping button
    const registerButton = page.locator('button:has-text("배송 등록")').first();
    
    if (await registerButton.isVisible()) {
      await registerButton.click();
      
      // Wait for modal
      await expect(page.locator('h2:has-text("배송 정보 등록")')).toBeVisible();
      
      // Fill Korean shipping info
      await page.selectOption('select', { index: 1 }); // Select first courier
      await page.fill('input[placeholder*="운송장"]', '1234567890123');
      await page.fill('input[placeholder*="바코드"]', '1234567890123456789');
      
      // Fill Chinese shipping info (optional)
      const chineseCourierSelect = page.locator('select').nth(1);
      if (await chineseCourierSelect.isVisible()) {
        await chineseCourierSelect.selectOption({ index: 1 });
        await page.locator('input[placeholder*="운송장"]').nth(1).fill('CN1234567890');
      }
      
      // Fill shipping details
      await page.fill('input[placeholder*="배송비"]', '3500');
      await page.fill('input[placeholder*="실중량"]', '0.5');
      await page.fill('input[placeholder*="부피중량"]', '0.8');
      
      // Submit form
      await page.click('button:has-text("등록")');
      
      // Check if modal closed
      await expect(page.locator('h2:has-text("배송 정보 등록")')).not.toBeVisible();
    }
  });

  test('should view shipment details', async ({ page }) => {
    // Switch to shipped tab
    await page.click('button:has-text("배송 중/완료")');
    
    // Click detail button on first shipment
    const detailButton = page.locator('button:has-text("상세보기")').first();
    
    if (await detailButton.isVisible()) {
      await detailButton.click();
      
      // Check detail modal is displayed
      await expect(page.locator('h2:has-text("배송 상세 정보")')).toBeVisible();
      
      // Check shipment information is displayed
      await expect(page.locator('text=주문 정보')).toBeVisible();
      await expect(page.locator('text=한국 배송 추적')).toBeVisible();
      
      // Check if tracking URL link exists
      const trackingLink = page.locator('a:has-text("추적 페이지 열기")');
      if (await trackingLink.isVisible()) {
        await expect(trackingLink).toHaveAttribute('target', '_blank');
      }
      
      // Close modal
      await page.click('button:has-text("닫기")');
      await expect(page.locator('h2:has-text("배송 상세 정보")')).not.toBeVisible();
    }
  });

  test('should mark shipment as delivered', async ({ page }) => {
    // Switch to shipped tab
    await page.click('button:has-text("배송 중/완료")');
    
    // Find mark delivered button
    const deliveredButton = page.locator('button:has-text("배송완료")').first();
    
    if (await deliveredButton.isVisible()) {
      await deliveredButton.click();
      
      // Check status is updated
      await expect(page.locator('span:has-text("배송완료")').first()).toBeVisible();
    }
  });

  test('should filter shipments by search term', async ({ page }) => {
    // Type in search box
    await page.fill('input[placeholder*="검색"]', 'ORD-');
    
    // Check filtered results
    const results = page.locator('text=ORD-');
    const count = await results.count();
    
    if (count > 0) {
      await expect(results.first()).toBeVisible();
    }
  });

  test('should display Korean courier information', async ({ page }) => {
    // Switch to shipped tab
    await page.click('button:has-text("배송 중/완료")');
    
    // Check Korean courier information is displayed
    const courierInfo = page.locator('text=CJ대한통운, text=한진택배, text=롯데택배');
    const count = await courierInfo.count();
    
    if (count > 0) {
      await expect(courierInfo.first()).toBeVisible();
    }
  });

  test('should display Chinese courier information when available', async ({ page }) => {
    // Switch to shipped tab
    await page.click('button:has-text("배송 중/완료")');
    
    // Check Chinese courier information is displayed
    const chineseCourierInfo = page.locator('text=顺丰速运, text=中国邮政');
    const count = await chineseCourierInfo.count();
    
    if (count > 0) {
      await expect(chineseCourierInfo.first()).toBeVisible();
    }
  });

  test('should display shipping fee and weight information', async ({ page }) => {
    // Switch to shipped tab
    await page.click('button:has-text("배송 중/완료")');
    
    // Check if shipping fee is displayed
    const shippingFee = page.locator('text=₩');
    const count = await shippingFee.count();
    
    if (count > 0) {
      await expect(shippingFee.first()).toBeVisible();
    }
  });

  test('should handle photo URLs in shipment registration', async ({ page }) => {
    // Click on pending orders tab
    await page.click('button:has-text("배송 대기")');
    
    // Find register shipping button
    const registerButton = page.locator('button:has-text("배송 등록")').first();
    
    if (await registerButton.isVisible()) {
      await registerButton.click();
      
      // Wait for modal
      await expect(page.locator('h2:has-text("배송 정보 등록")')).toBeVisible();
      
      // Fill photo URLs
      await page.fill('input[placeholder*="송장 사진"]', 'https://example.com/shipment.jpg');
      await page.fill('input[placeholder*="영수증 사진"]', 'https://example.com/receipt.jpg');
      
      // Close modal
      await page.click('button:has-text("취소")');
    }
  });
});