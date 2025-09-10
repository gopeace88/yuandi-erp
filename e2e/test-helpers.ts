/**
 * Test helper functions for E2E tests
 * Uses environment variables for test credentials
 */

export const getTestCredentials = () => {
  // Test credentials should be set in environment variables
  // or in playwright.config.ts
  return {
    email: process.env.TEST_USER_EMAIL || '',
    password: process.env.TEST_USER_PASSWORD || ''
  };
};

export const loginAsTestUser = async (page: any) => {
  const credentials = getTestCredentials();
  
  if (!credentials.email || !credentials.password) {
    throw new Error('Test credentials not configured. Please set TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables.');
  }
  
  await page.fill('input[type="email"]', credentials.email);
  await page.fill('input[type="password"]', credentials.password);
  await page.click('button[type="submit"]');
  
  // Wait for navigation
  await page.waitForTimeout(3000);
};