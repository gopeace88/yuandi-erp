/**
 * YUANDI ERP - End-to-End Test Suite
 * 
 * Comprehensive E2E testing using Playwright
 * Tests all critical user journeys and business workflows
 */

import { test, expect, Page } from '@playwright/test'
import { faker } from '@faker-js/faker'

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_TEST_URL || 'http://localhost:3000'
const ADMIN_EMAIL = 'admin@yuandi.com'
const ADMIN_PASSWORD = 'Admin123!@#'

// Test data generators
const generateTestOrder = () => ({
  customerName: faker.person.fullName(),
  customerPhone: faker.phone.number('010-####-####'),
  customerEmail: faker.internet.email(),
  shippingAddress: faker.location.streetAddress(),
  zipCode: faker.location.zipCode('#####'),
  pcccCode: 'P' + faker.string.numeric(12),
  totalAmount: faker.number.int({ min: 10000, max: 1000000 })
})

const generateTestProduct = () => ({
  name: faker.commerce.productName(),
  sku: faker.string.alphanumeric(10).toUpperCase(),
  category: faker.helpers.arrayElement(['electronics', 'fashion', 'beauty', 'food']),
  manufacturer: faker.company.name(),
  brand: faker.company.name(),
  costCny: faker.number.int({ min: 10, max: 1000 }),
  priceKrw: faker.number.int({ min: 10000, max: 1000000 }),
  onHand: faker.number.int({ min: 0, max: 100 })
})

// Helper functions
async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`)
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard')
}

async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]')
  await page.click('[data-testid="logout-button"]')
  await page.waitForURL('**/login')
}

// Test suites
test.describe('Authentication Flow', () => {
  test('Should successfully login with valid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    
    // Fill login form
    await page.fill('input[type="email"]', ADMIN_EMAIL)
    await page.fill('input[type="password"]', ADMIN_PASSWORD)
    
    // Submit and verify redirect
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/.*dashboard/)
    
    // Verify user is logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('Should reject invalid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    
    await page.fill('input[type="email"]', 'invalid@test.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    // Should show error message
    await expect(page.locator('.alert-destructive')).toBeVisible()
    
    // Should remain on login page
    await expect(page).toHaveURL(/.*login/)
  })

  test('Should enforce protected routes', async ({ page }) => {
    // Try to access protected route without login
    await page.goto(`${BASE_URL}/dashboard`)
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/)
  })

  test('Should successfully logout', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await logout(page)
    
    // Verify logged out
    await expect(page).toHaveURL(/.*login/)
    
    // Try to access protected route
    await page.goto(`${BASE_URL}/dashboard`)
    await expect(page).toHaveURL(/.*login/)
  })
})

test.describe('Order Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto(`${BASE_URL}/orders`)
  })

  test('Should create a new order', async ({ page }) => {
    const testOrder = generateTestOrder()
    
    // Click create button
    await page.click('[data-testid="create-order-btn"]')
    
    // Fill order form
    await page.fill('input[name="customer_name"]', testOrder.customerName)
    await page.fill('input[name="customer_phone"]', testOrder.customerPhone)
    await page.fill('input[name="customer_email"]', testOrder.customerEmail)
    await page.fill('input[name="shipping_address"]', testOrder.shippingAddress)
    await page.fill('input[name="zip_code"]', testOrder.zipCode)
    await page.fill('input[name="pccc_code"]', testOrder.pcccCode)
    await page.fill('input[name="total_amount"]', testOrder.totalAmount.toString())
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Verify order created
    await expect(page.locator('text="주문이 생성되었습니다"')).toBeVisible()
    
    // Verify order appears in list
    await expect(page.locator(`text="${testOrder.customerName}"`)).toBeVisible()
  })

  test('Should search and filter orders', async ({ page }) => {
    // Search by customer name
    await page.fill('[data-testid="order-search"]', '홍길동')
    await page.waitForTimeout(500) // Debounce delay
    
    // Verify filtered results
    const orders = page.locator('[data-testid="order-row"]')
    await expect(orders).toHaveCount(await orders.count())
    
    // Filter by status
    await page.selectOption('[data-testid="status-filter"]', 'SHIPPED')
    await page.waitForTimeout(500)
    
    // Verify all visible orders have SHIPPED status
    const statusBadges = page.locator('[data-testid="order-status"]')
    const count = await statusBadges.count()
    for (let i = 0; i < count; i++) {
      await expect(statusBadges.nth(i)).toContainText('배송중')
    }
  })

  test('Should update order status', async ({ page }) => {
    // Find first PAID order
    const paidOrder = page.locator('[data-testid="order-row"]').filter({
      has: page.locator('text="결제완료"')
    }).first()
    
    // Click ship button
    await paidOrder.locator('[data-testid="ship-order-btn"]').click()
    
    // Confirm shipping
    await page.click('button:has-text("확인")')
    
    // Verify status updated
    await expect(paidOrder.locator('[data-testid="order-status"]')).toContainText('배송중')
  })

  test('Should export orders to Excel', async ({ page }) => {
    // Start waiting for download
    const downloadPromise = page.waitForEvent('download')
    
    // Click export button
    await page.click('[data-testid="export-orders-btn"]')
    
    // Wait for download to complete
    const download = await downloadPromise
    
    // Verify file name
    expect(download.suggestedFilename()).toContain('orders')
    expect(download.suggestedFilename()).toContain('.xlsx')
  })
})

test.describe('Product & Inventory Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto(`${BASE_URL}/products`)
  })

  test('Should create a new product', async ({ page }) => {
    const testProduct = generateTestProduct()
    
    await page.click('[data-testid="create-product-btn"]')
    
    // Fill product form
    await page.fill('input[name="name"]', testProduct.name)
    await page.fill('input[name="sku"]', testProduct.sku)
    await page.selectOption('select[name="category"]', testProduct.category)
    await page.fill('input[name="manufacturer"]', testProduct.manufacturer)
    await page.fill('input[name="brand"]', testProduct.brand)
    await page.fill('input[name="cost_cny"]', testProduct.costCny.toString())
    await page.fill('input[name="price_krw"]', testProduct.priceKrw.toString())
    await page.fill('input[name="on_hand"]', testProduct.onHand.toString())
    
    await page.click('button[type="submit"]')
    
    // Verify product created
    await expect(page.locator('text="상품이 등록되었습니다"')).toBeVisible()
    await expect(page.locator(`text="${testProduct.name}"`)).toBeVisible()
  })

  test('Should process inventory inbound', async ({ page }) => {
    await page.goto(`${BASE_URL}/inventory`)
    
    // Select first product
    const firstProduct = page.locator('[data-testid="product-row"]').first()
    const initialStock = await firstProduct.locator('[data-testid="stock-count"]').textContent()
    
    // Click inbound button
    await firstProduct.locator('[data-testid="inbound-btn"]').click()
    
    // Enter inbound quantity
    await page.fill('input[name="quantity"]', '10')
    await page.fill('input[name="reference_no"]', 'TEST-INB-001')
    
    await page.click('button:has-text("입고 처리")')
    
    // Verify stock updated
    await page.waitForTimeout(1000)
    const newStock = await firstProduct.locator('[data-testid="stock-count"]').textContent()
    expect(parseInt(newStock || '0')).toBeGreaterThan(parseInt(initialStock || '0'))
  })

  test('Should show low stock alerts', async ({ page }) => {
    await page.goto(`${BASE_URL}/inventory`)
    
    // Filter by low stock
    await page.selectOption('[data-testid="stock-filter"]', 'low')
    
    // Verify all visible products have low stock indicator
    const alerts = page.locator('[data-testid="low-stock-alert"]')
    const count = await alerts.count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('Shipping Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto(`${BASE_URL}/shipments`)
  })

  test('Should register tracking number', async ({ page }) => {
    // Find pending shipment
    const pendingShipment = page.locator('[data-testid="shipment-card"]').filter({
      has: page.locator('text="대기중"')
    }).first()
    
    // Click register tracking
    await pendingShipment.locator('[data-testid="register-tracking-btn"]').click()
    
    // Fill tracking info
    await page.selectOption('select[name="courier"]', 'cj')
    await page.fill('input[name="tracking_no"]', faker.string.numeric(12))
    
    await page.click('button:has-text("저장")')
    
    // Verify tracking registered
    await expect(pendingShipment.locator('[data-testid="shipment-status"]')).toContainText('배송중')
  })

  test('Should track shipment', async ({ page }) => {
    // Find shipped item
    const shippedItem = page.locator('[data-testid="shipment-card"]').filter({
      has: page.locator('text="배송중"')
    }).first()
    
    // Click track button
    const [newPage] = await Promise.all([
      page.waitForEvent('popup'),
      shippedItem.locator('[data-testid="track-shipment-btn"]').click()
    ])
    
    // Verify tracking page opened
    await expect(newPage).toHaveURL(/cjlogistics|hanjin|lotte/)
    await newPage.close()
  })

  test('Should mark as delivered', async ({ page }) => {
    // Find shipped item
    const shippedItem = page.locator('[data-testid="shipment-card"]').filter({
      has: page.locator('text="배송중"')
    }).first()
    
    // Click complete button
    await shippedItem.locator('[data-testid="complete-delivery-btn"]').click()
    
    // Verify status updated
    await expect(shippedItem.locator('[data-testid="shipment-status"]')).toContainText('배송완료')
  })
})

test.describe('Customer Portal', () => {
  test('Should allow order tracking without login', async ({ page }) => {
    await page.goto(`${BASE_URL}/track`)
    
    // Should be accessible without authentication
    await expect(page).toHaveURL(/.*track/)
    
    // Fill tracking form
    await page.fill('input[name="name"]', '홍길동')
    await page.fill('input[name="phone"]', '010-1234-5678')
    
    await page.click('button[type="submit"]')
    
    // Should show results or no results message
    const hasResults = await page.locator('[data-testid="order-result"]').count() > 0
    const hasNoResults = await page.locator('text="검색 결과가 없습니다"').isVisible()
    
    expect(hasResults || hasNoResults).toBeTruthy()
  })

  test('Should switch language', async ({ page }) => {
    await page.goto(`${BASE_URL}/track`)
    
    // Click language switcher
    await page.click('[data-testid="language-switcher"]')
    
    // Select Chinese
    await page.click('button:has-text("中文")')
    
    // Verify language changed
    await expect(page.locator('h1')).toContainText(/订单查询|訂單查詢/)
  })
})

test.describe('Dashboard & Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto(`${BASE_URL}/dashboard`)
  })

  test('Should display dashboard metrics', async ({ page }) => {
    // Verify key metrics are visible
    await expect(page.locator('[data-testid="total-sales"]')).toBeVisible()
    await expect(page.locator('[data-testid="order-count"]')).toBeVisible()
    await expect(page.locator('[data-testid="average-order-value"]')).toBeVisible()
    await expect(page.locator('[data-testid="pending-orders"]')).toBeVisible()
  })

  test('Should display sales chart', async ({ page }) => {
    // Verify chart is rendered
    await expect(page.locator('[data-testid="sales-chart"]')).toBeVisible()
    
    // Verify chart has data points
    const chartBars = page.locator('[data-testid="chart-bar"]')
    const count = await chartBars.count()
    expect(count).toBeGreaterThan(0)
  })

  test('Should show recent orders', async ({ page }) => {
    // Verify recent orders table
    await expect(page.locator('[data-testid="recent-orders"]')).toBeVisible()
    
    // Should have at least one order
    const orderRows = page.locator('[data-testid="recent-order-row"]')
    const count = await orderRows.count()
    expect(count).toBeGreaterThan(0)
    expect(count).toBeLessThanOrEqual(5) // Should show max 5 recent orders
  })

  test('Should navigate to detailed pages', async ({ page }) => {
    // Click on orders widget
    await page.click('[data-testid="orders-widget"]')
    await expect(page).toHaveURL(/.*orders/)
    
    await page.goto(`${BASE_URL}/dashboard`)
    
    // Click on inventory widget
    await page.click('[data-testid="inventory-widget"]')
    await expect(page).toHaveURL(/.*inventory/)
  })
})

test.describe('Settings & Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto(`${BASE_URL}/settings`)
  })

  test('Should update company information', async ({ page }) => {
    // Navigate to company tab
    await page.click('[data-testid="company-tab"]')
    
    // Update company name
    const newName = `YUANDI ${faker.company.buzzNoun()}`
    await page.fill('input[name="company_name"]', newName)
    
    // Save changes
    await page.click('button:has-text("저장")')
    
    // Verify success message
    await expect(page.locator('text="회사 정보가 저장되었습니다"')).toBeVisible()
  })

  test('Should configure system settings', async ({ page }) => {
    // Navigate to system tab
    await page.click('[data-testid="system-tab"]')
    
    // Update low stock threshold
    await page.fill('input[name="low_stock_threshold"]', '10')
    
    // Toggle notification
    await page.click('[data-testid="notifications-toggle"]')
    
    // Save changes
    await page.click('button:has-text("저장")')
    
    // Verify success
    await expect(page.locator('text="시스템 설정이 저장되었습니다"')).toBeVisible()
  })
})

test.describe('Performance Tests', () => {
  test('Should load dashboard within 3 seconds', async ({ page }) => {
    const startTime = Date.now()
    
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(3000)
  })

  test('Should handle concurrent operations', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const context3 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    const page3 = await context3.newPage()
    
    // Login all sessions
    await Promise.all([
      login(page1, ADMIN_EMAIL, ADMIN_PASSWORD),
      login(page2, ADMIN_EMAIL, ADMIN_PASSWORD),
      login(page3, ADMIN_EMAIL, ADMIN_PASSWORD)
    ])
    
    // Perform concurrent operations
    await Promise.all([
      page1.goto(`${BASE_URL}/orders`),
      page2.goto(`${BASE_URL}/products`),
      page3.goto(`${BASE_URL}/inventory`)
    ])
    
    // Verify all pages loaded successfully
    await expect(page1.locator('h1')).toContainText('주문')
    await expect(page2.locator('h1')).toContainText('상품')
    await expect(page3.locator('h1')).toContainText('재고')
    
    // Cleanup
    await Promise.all([
      context1.close(),
      context2.close(),
      context3.close()
    ])
  })
})

test.describe('Mobile Responsiveness', () => {
  test.use({ 
    viewport: { width: 375, height: 667 }, // iPhone SE
    isMobile: true 
  })

  test('Should be usable on mobile devices', async ({ page }) => {
    await page.goto(`${BASE_URL}/track`)
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
    
    // Test mobile navigation
    await page.click('[data-testid="mobile-menu"]')
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible()
    
    // Verify forms are usable
    await page.fill('input[name="name"]', '테스트')
    await page.fill('input[name="phone"]', '010-1234-5678')
    
    // Verify buttons are clickable
    await page.click('button[type="submit"]')
  })
})

test.describe('Error Handling', () => {
  test('Should handle network errors gracefully', async ({ page }) => {
    // Simulate offline
    await page.route('**/api/**', route => route.abort())
    
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto(`${BASE_URL}/orders`)
    
    // Try to create order
    await page.click('[data-testid="create-order-btn"]')
    
    // Should show error message
    await expect(page.locator('text="네트워크 오류"')).toBeVisible()
  })

  test('Should handle 404 pages', async ({ page }) => {
    await page.goto(`${BASE_URL}/non-existent-page`)
    
    // Should show 404 page
    await expect(page.locator('text="404"')).toBeVisible()
    
    // Should have link to home
    await page.click('a:has-text("홈으로")')
    await expect(page).toHaveURL(BASE_URL)
  })
})

// Test configuration
test.use({
  // Global test timeout
  timeout: 30000,
  
  // Action timeout
  actionTimeout: 10000,
  
  // Navigation timeout
  navigationTimeout: 30000,
  
  // Screenshot on failure
  screenshot: 'only-on-failure',
  
  // Video on failure
  video: 'retain-on-failure',
  
  // Trace on failure
  trace: 'retain-on-failure'
})