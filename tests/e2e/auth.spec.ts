import { test, expect } from '@playwright/test';

test.describe('Authentication Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ko');
  });

  test('should display login page with all elements', async ({ page }) => {
    // Check title
    await expect(page.locator('h1')).toContainText('YUANDI Collection');
    
    // Check form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Check test account info
    await expect(page.locator('text=테스트 계정')).toBeVisible();
    
    // Check language switcher
    await expect(page.locator('a[href="/ko"]')).toBeVisible();
    await expect(page.locator('a[href="/zh-CN"]')).toBeVisible();
  });

  test('should login as Admin successfully', async ({ page }) => {
    // Fill login form
    await page.fill('input[type="email"]', 'admin@yuandi.com');
    await page.fill('input[type="password"]', 'admin123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL('**/dashboard');
    
    // Check dashboard is displayed
    await expect(page.locator('h1')).toContainText('대시보드');
  });

  test('should login as OrderManager successfully', async ({ page }) => {
    // Fill login form
    await page.fill('input[type="email"]', 'order@yuandi.com');
    await page.fill('input[type="password"]', 'order123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL('**/dashboard');
    
    // Check dashboard is displayed
    await expect(page.locator('h1')).toContainText('대시보드');
  });

  test('should login as ShipManager successfully', async ({ page }) => {
    // Fill login form
    await page.fill('input[type="email"]', 'ship@yuandi.com');
    await page.fill('input[type="password"]', 'ship123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL('**/dashboard');
    
    // Check dashboard is displayed
    await expect(page.locator('h1')).toContainText('대시보드');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill with invalid credentials
    await page.fill('input[type="email"]', 'invalid@yuandi.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check error message is displayed
    await expect(page.locator('text=로그인 실패')).toBeVisible();
    
    // Should stay on login page
    await expect(page).toHaveURL(/\/ko$/);
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.fill('input[type="email"]', 'admin@yuandi.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Click logout
    await page.click('button:has-text("로그아웃")');
    
    // Should redirect to login page
    await expect(page).toHaveURL(/\/ko$/);
    await expect(page.locator('h1')).toContainText('YUANDI Collection');
  });

  test('should switch language to Chinese', async ({ page }) => {
    // Click Chinese language link
    await page.click('a[href="/zh-CN"]');
    
    // Check Chinese text is displayed
    await expect(page.locator('h1')).toContainText('YUANDI Collection');
    await expect(page.locator('text=综合管理系统')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('登录');
  });

  test('should use quick login buttons', async ({ page }) => {
    // Click Admin quick login button
    await page.click('button:has-text("관리자: admin@yuandi.com")');
    
    // Check fields are filled
    await expect(page.locator('input[type="email"]')).toHaveValue('admin@yuandi.com');
    await expect(page.locator('input[type="password"]')).toHaveValue('admin123');
  });
});