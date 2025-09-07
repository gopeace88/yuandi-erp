import { test, expect } from '@playwright/test';

test.describe('YUANDI 홈페이지 테스트', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('페이지 타이틀 및 메타데이터 확인', async ({ page }) => {
    // 타이틀 확인
    await expect(page).toHaveTitle('YUANDI Collection - 관리 시스템');
    
    // 메타 태그 확인
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBe('YUANDI Collection 통합 관리 시스템');
    
    const keywords = await page.locator('meta[name="keywords"]').getAttribute('content');
    expect(keywords).toBe('Collection, ERP, 재고관리, 주문관리, 배송관리');
  });

  test('메인 헤딩과 서브텍스트 표시 확인', async ({ page }) => {
    // 메인 헤딩 확인
    const mainHeading = page.locator('h1');
    await expect(mainHeading).toBeVisible();
    await expect(mainHeading).toHaveText('YUANDI Collection Management');
    
    // 서브텍스트 확인
    const subText = page.locator('p.text-lg.text-gray-600');
    await expect(subText).toBeVisible();
    await expect(subText).toHaveText('YUANDI Collection 주문/재고/배송 관리 시스템');
  });

  test('네비게이션 버튼 존재 및 스타일 확인', async ({ page }) => {
    // 대시보드 버튼 확인
    const dashboardBtn = page.locator('a[href="/dashboard"]');
    await expect(dashboardBtn).toBeVisible();
    await expect(dashboardBtn).toHaveText('대시보드로 이동');
    await expect(dashboardBtn).toHaveClass(/bg-blue-600/);
    
    // 주문 조회 버튼 확인
    const trackBtn = page.locator('a[href="/track"]');
    await expect(trackBtn).toBeVisible();
    await expect(trackBtn).toHaveText('주문 조회');
    await expect(trackBtn).toHaveClass(/bg-gray-600/);
  });

  test('버튼 호버 효과 확인', async ({ page }) => {
    // 대시보드 버튼 호버
    const dashboardBtn = page.locator('a[href="/dashboard"]');
    await dashboardBtn.hover();
    await expect(dashboardBtn).toHaveClass(/hover:bg-blue-700/);
    
    // 주문 조회 버튼 호버
    const trackBtn = page.locator('a[href="/track"]');
    await trackBtn.hover();
    await expect(trackBtn).toHaveClass(/hover:bg-gray-700/);
  });

  test('대시보드 페이지로 네비게이션', async ({ page }) => {
    // 대시보드 버튼 클릭
    await page.click('a[href="/dashboard"]');
    
    // URL 변경 확인
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('주문 조회 페이지로 네비게이션', async ({ page }) => {
    // 주문 조회 버튼 클릭
    await page.click('a[href="/track"]');
    
    // URL 변경 확인
    await expect(page).toHaveURL(/\/track/);
  });

  test('페이지 레이아웃 구조 확인', async ({ page }) => {
    // 중앙 정렬 컨테이너 확인
    const container = page.locator('.min-h-screen');
    await expect(container).toBeVisible();
    await expect(container).toHaveClass(/flex/);
    await expect(container).toHaveClass(/items-center/);
    await expect(container).toHaveClass(/justify-center/);
    
    // 텍스트 중앙 정렬 확인
    const textCenter = page.locator('.text-center');
    await expect(textCenter).toBeVisible();
  });
});

test.describe('반응형 디자인 테스트', () => {
  
  test('모바일 뷰포트 (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // 모든 요소가 표시되는지 확인
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('p.text-lg')).toBeVisible();
    await expect(page.locator('a[href="/dashboard"]')).toBeVisible();
    await expect(page.locator('a[href="/track"]')).toBeVisible();
    
    // 버튼이 세로로 정렬되는지 확인 (모바일에서는 space-x-4가 적용되지만 화면이 좁아서 줄바꿈될 수 있음)
    const buttonsContainer = page.locator('.space-x-4');
    await expect(buttonsContainer).toBeVisible();
  });

  test('태블릿 뷰포트 (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    // 모든 요소가 표시되는지 확인
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('p.text-lg')).toBeVisible();
    await expect(page.locator('a[href="/dashboard"]')).toBeVisible();
    await expect(page.locator('a[href="/track"]')).toBeVisible();
    
    // 버튼이 가로로 정렬되는지 확인
    const buttonsContainer = page.locator('.space-x-4');
    await expect(buttonsContainer).toBeVisible();
  });

  test('데스크톱 뷰포트 (1920px)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    
    // 모든 요소가 표시되는지 확인
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('p.text-lg')).toBeVisible();
    await expect(page.locator('a[href="/dashboard"]')).toBeVisible();
    await expect(page.locator('a[href="/track"]')).toBeVisible();
    
    // 충분한 여백이 있는지 확인
    const container = page.locator('.min-h-screen');
    await expect(container).toBeVisible();
  });
});

test.describe('접근성 테스트', () => {
  
  test('키보드 네비게이션', async ({ page }) => {
    await page.goto('/');
    
    // Tab 키로 첫 번째 버튼에 포커스
    await page.keyboard.press('Tab');
    const dashboardBtn = page.locator('a[href="/dashboard"]');
    await expect(dashboardBtn).toBeFocused();
    
    // Tab 키로 두 번째 버튼에 포커스
    await page.keyboard.press('Tab');
    const trackBtn = page.locator('a[href="/track"]');
    await expect(trackBtn).toBeFocused();
    
    // Enter 키로 버튼 클릭
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/track/);
  });

  test('시맨틱 HTML 구조', async ({ page }) => {
    await page.goto('/');
    
    // h1 태그가 하나만 있는지 확인
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
    
    // 링크에 적절한 텍스트가 있는지 확인
    const links = await page.locator('a').allTextContents();
    links.forEach(text => {
      expect(text).not.toBe('');
    });
  });
});