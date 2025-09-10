const { test, expect } = require('@playwright/test');

test('간단한 테스트', async ({ page }) => {
    await page.goto('https://example.com');
    await expect(page).toHaveTitle(/Example/);
});

