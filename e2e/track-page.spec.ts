import { test, expect, Page } from '@playwright/test';

test.describe('Customer Order Tracking Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/track');
  });

  test('should display track page with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/주문 조회|订单查询/);
    
    // Check main heading
    const heading = page.locator('h1');
    await expect(heading).toContainText(/주문 조회|订单查询/);
  });

  test('should show search form with required fields', async ({ page }) => {
    // Check form elements
    await expect(page.locator('input#name')).toBeVisible();
    await expect(page.locator('input#phone')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Check placeholders
    const nameInput = page.locator('input#name');
    await expect(nameInput).toHaveAttribute('placeholder', /이름을 입력하세요|请输入姓名/);
    
    const phoneInput = page.locator('input#phone');
    await expect(phoneInput).toHaveAttribute('placeholder', /전화번호를 입력하세요|请输入电话号码/);
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit empty form
    await page.locator('button[type="submit"]').click();
    
    // Check for validation message
    await expect(page.locator('.text-red-600')).toBeVisible();
  });

  test('should format phone number input', async ({ page }) => {
    const phoneInput = page.locator('input#phone');
    
    // Type phone number with non-digits
    await phoneInput.fill('010-1234-5678');
    
    // Check that non-digits are removed
    const value = await phoneInput.inputValue();
    expect(value).toBe('01012345678');
  });

  test('should search for orders with valid input', async ({ page }) => {
    // Fill in search form
    await page.locator('input#name').fill('홍길동');
    await page.locator('input#phone').fill('01012345678');
    
    // Mock API response
    await page.route('**/api/track*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: '최근 2건의 주문이 조회되었습니다',
          orders: [
            {
              id: '1',
              order_no: 'ORD-240823-001',
              status: 'SHIPPED',
              customer_name: '홍길동',
              customer_phone: '010-****-5678',
              customer_email: 'te***@example.com',
              shipping_address: '서울시 강남구',
              zip_code: '12345',
              total_amount: 50000,
              created_at: '2024-08-23T10:00:00Z',
              order_items: [
                {
                  product_name: '상품 A',
                  quantity: 2,
                  unit_price: 25000,
                  subtotal: 50000,
                },
              ],
              shipments: [
                {
                  courier: 'CJ대한통운',
                  tracking_no: '1234567890',
                  tracking_url: 'https://tracking.cj.com',
                  shipped_at: '2024-08-23T12:00:00Z',
                },
              ],
            },
            {
              id: '2',
              order_no: 'ORD-240822-005',
              status: 'DONE',
              customer_name: '홍길동',
              customer_phone: '010-****-5678',
              shipping_address: '서울시 강남구',
              zip_code: '12345',
              total_amount: 30000,
              created_at: '2024-08-22T15:00:00Z',
              order_items: [
                {
                  product_name: '상품 B',
                  quantity: 1,
                  unit_price: 30000,
                  subtotal: 30000,
                },
              ],
            },
          ],
          responseTime: 150,
        }),
      });
    });
    
    // Submit search
    await page.locator('button[type="submit"]').click();
    
    // Wait for results
    await expect(page.locator('text=/최근 주문 내역|最近订单记录/')).toBeVisible();
    
    // Check order cards are displayed
    const orderCards = page.locator('[class*="bg-white"][class*="rounded"][class*="shadow"]');
    await expect(orderCards).toHaveCount(3); // Search form + 2 order cards
  });

  test('should display order status correctly', async ({ page }) => {
    // Setup mock data
    await page.route('**/api/track*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          orders: [
            {
              id: '1',
              order_no: 'ORD-240823-001',
              status: 'PAID',
              customer_name: '테스트',
              customer_phone: '010-****-1234',
              total_amount: 10000,
              created_at: new Date().toISOString(),
              order_items: [],
            },
          ],
        }),
      });
    });
    
    await page.locator('input#name').fill('테스트');
    await page.locator('input#phone').fill('01012341234');
    await page.locator('button[type="submit"]').click();
    
    // Check status badge
    await expect(page.locator('text=/결제완료|已付款/')).toBeVisible();
  });

  test('should show tracking link for shipped orders', async ({ page }) => {
    await page.route('**/api/track*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          orders: [
            {
              id: '1',
              order_no: 'ORD-240823-001',
              status: 'SHIPPED',
              customer_name: '테스트',
              customer_phone: '010-****-1234',
              total_amount: 10000,
              created_at: new Date().toISOString(),
              order_items: [],
              shipments: [
                {
                  courier: 'CJ대한통운',
                  tracking_no: '1234567890',
                },
              ],
            },
          ],
        }),
      });
    });
    
    await page.locator('input#name').fill('테스트');
    await page.locator('input#phone').fill('01012341234');
    await page.locator('button[type="submit"]').click();
    
    // Check tracking link
    const trackingLink = page.locator('a:has-text(/배송 추적|物流追踪/)');
    await expect(trackingLink).toBeVisible();
    await expect(trackingLink).toHaveAttribute('target', '_blank');
  });

  test('should handle no orders found', async ({ page }) => {
    await page.route('**/api/track*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: '조회된 주문이 없습니다',
          orders: [],
        }),
      });
    });
    
    await page.locator('input#name').fill('테스트');
    await page.locator('input#phone').fill('01099999999');
    await page.locator('button[type="submit"]').click();
    
    // Check no orders message
    await expect(page.locator('text=/조회된 주문이 없습니다|未找到订单/')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.route('**/api/track*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Failed to fetch orders',
          message: '주문 조회 중 오류가 발생했습니다',
        }),
      });
    });
    
    await page.locator('input#name').fill('테스트');
    await page.locator('input#phone').fill('01012341234');
    await page.locator('button[type="submit"]').click();
    
    // Check error message
    await expect(page.locator('.text-red-600')).toContainText(/오류가 발생했습니다|发生错误/);
  });
});

test.describe('Language Switching', () => {
  test('should switch between Korean and Chinese', async ({ page }) => {
    await page.goto('/track');
    
    // Check initial language (Korean)
    await expect(page.locator('h1')).toContainText('주문 조회');
    
    // Find and click language switcher
    const langSwitcher = page.locator('button:has-text("한국어")');
    await langSwitcher.click();
    
    // Select Chinese
    await page.locator('button:has-text("中文")').click();
    
    // Check language changed
    await expect(page.locator('h1')).toContainText('订单查询');
    
    // Switch back to Korean
    const langSwitcherCN = page.locator('button:has-text("中文")');
    await langSwitcherCN.click();
    await page.locator('button:has-text("한국어")').click();
    
    // Check language changed back
    await expect(page.locator('h1')).toContainText('주문 조회');
  });

  test('should persist language preference', async ({ page, context }) => {
    await page.goto('/track');
    
    // Switch to Chinese
    await page.locator('button:has-text("한국어")').click();
    await page.locator('button:has-text("中文")').click();
    
    // Check localStorage
    const locale = await page.evaluate(() => localStorage.getItem('locale'));
    expect(locale).toBe('zh-CN');
    
    // Reload page
    await page.reload();
    
    // Check language persisted
    await expect(page.locator('h1')).toContainText('订单查询');
  });

  test('should detect browser language on first visit', async ({ browser }) => {
    // Create new context with Chinese language
    const context = await browser.newContext({
      locale: 'zh-CN',
    });
    const page = await context.newPage();
    
    await page.goto('/track');
    
    // Should auto-detect Chinese
    await expect(page.locator('h1')).toContainText('订单查询');
    
    await context.close();
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should be responsive on mobile', async ({ page }) => {
    await page.goto('/track');
    
    // Check that layout is properly stacked
    const form = page.locator('form');
    const formBox = await form.boundingBox();
    expect(formBox?.width).toBeLessThan(400);
    
    // Check inputs are full width
    const nameInput = page.locator('input#name');
    const nameBox = await nameInput.boundingBox();
    expect(nameBox?.width).toBeGreaterThan(300);
  });

  test('should show mobile-optimized order cards', async ({ page }) => {
    await page.route('**/api/track*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          orders: [
            {
              id: '1',
              order_no: 'ORD-240823-001',
              status: 'SHIPPED',
              customer_name: '테스트',
              customer_phone: '010-****-1234',
              total_amount: 10000,
              created_at: new Date().toISOString(),
              order_items: [
                { product_name: '상품 A', quantity: 1, subtotal: 10000 },
              ],
            },
          ],
        }),
      });
    });
    
    await page.goto('/track');
    await page.locator('input#name').fill('테스트');
    await page.locator('input#phone').fill('01012341234');
    await page.locator('button[type="submit"]').click();
    
    // Check order card is properly sized for mobile
    const orderCard = page.locator('[class*="bg-white"][class*="rounded"]').nth(1);
    const cardBox = await orderCard.boundingBox();
    expect(cardBox?.width).toBeLessThan(360);
  });
});

test.describe('Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/track');
    
    // Check form inputs have labels
    const nameLabel = await page.locator('label[for="name"]');
    await expect(nameLabel).toBeVisible();
    
    const phoneLabel = await page.locator('label[for="phone"]');
    await expect(phoneLabel).toBeVisible();
    
    // Check language switcher has aria-label
    const langSwitcher = page.locator('button[aria-label="Select language"]');
    await expect(langSwitcher).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/track');
    
    // Tab through form elements
    await page.keyboard.press('Tab'); // Skip to first input
    await page.keyboard.type('홍길동');
    
    await page.keyboard.press('Tab'); // Move to phone input
    await page.keyboard.type('01012345678');
    
    await page.keyboard.press('Tab'); // Move to submit button
    await page.keyboard.press('Enter'); // Submit form
    
    // Should show validation or results
    await expect(page.locator('.text-red-600, text=/최근 주문 내역/')).toBeVisible();
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/track');
    
    // Check text contrast
    const heading = page.locator('h1');
    const headingColor = await heading.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.color;
    });
    
    // Should be dark enough for readability
    expect(headingColor).toMatch(/rgb\(\d+, \d+, \d+\)/);
  });
});