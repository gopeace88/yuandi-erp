import { test, expect } from '@playwright/test';

test.describe('YUANDI ERP 출납장부 및 대시보드 테스트', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인 과정
    await page.goto('https://00-yuandi-erp.vercel.app/');
    await page.waitForTimeout(2000);
    
    await page.fill('input[type="email"]', 'admin@yuandi.com');
    await page.fill('input[type="password"]', 'yuandi123!');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000);
  });

  test('출납장부 반영 확인', async ({ page }) => {
    console.log('📍 5단계: 출납장부 반영 확인');
    
    // 출납장부 페이지로 이동
    const cashbookLinks = [
      'text=출납장부',
      'text=Cashbook',
      'text=장부',
      'a[href*="cashbook"]',
      'text=재정'
    ];
    
    let navigated = false;
    for (const selector of cashbookLinks) {
      const link = page.locator(selector).first();
      if (await link.isVisible({ timeout: 2000 })) {
        await link.click();
        console.log(`✅ 출납장부 페이지 이동: ${selector}`);
        navigated = true;
        break;
      }
    }
    
    if (!navigated) {
      console.log('⚠️ 출납장부 메뉴를 찾을 수 없음');
      
      // 사이드바의 모든 링크 확인
      const sidebarLinks = await page.locator('nav a, aside a, .sidebar a').all();
      console.log(`사이드바 링크 수: ${sidebarLinks.length}`);
      
      for (let i = 0; i < Math.min(sidebarLinks.length, 10); i++) {
        try {
          const text = await sidebarLinks[i].textContent();
          const href = await sidebarLinks[i].getAttribute('href');
          if (text && text.trim()) {
            console.log(`링크 ${i + 1}: "${text.trim()}" → ${href}`);
          }
        } catch (e) {
          // 무시
        }
      }
    }
    
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: '/mnt/d/00.Projects/00.YUANDI-ERP/tests/e2e/screenshots/13-cashbook-page.png',
      fullPage: true 
    });
    
    // 출납장부 데이터 확인
    const transactionRows = page.locator('tbody tr');
    const transactionCount = await transactionRows.count();
    console.log(`출납장부 거래 내역 수: ${transactionCount}`);
    
    if (transactionCount > 0) {
      console.log('✅ 출납장부에 거래 내역이 존재');
      
      // 최근 거래 몇 개 확인
      for (let i = 0; i < Math.min(transactionCount, 5); i++) {
        try {
          const row = transactionRows.nth(i);
          const rowText = await row.textContent();
          if (rowText && rowText.trim()) {
            console.log(`거래 ${i + 1}: ${rowText.trim().substring(0, 100)}...`);
          }
        } catch (e) {
          // 무시
        }
      }
    } else {
      console.log('⚠️ 출납장부에 거래 내역이 없음');
    }
    
    // 입고 관련 거래 찾기
    const stockInRecord = page.locator('td:has-text("입고")').first();
    const hasStockInRecord = await stockInRecord.isVisible({ timeout: 3000 });
    
    if (hasStockInRecord) {
      console.log('✅ 출납장부에 입고 관련 거래 확인');
    } else {
      console.log('⚠️ 출납장부에 입고 거래가 즉시 반영되지 않음');
      
      // 다른 키워드로도 확인
      const keywords = ['재고', '상품', '구매', 'purchase', 'stock'];
      for (const keyword of keywords) {
        const record = page.locator(`td:has-text("${keyword}")`).first();
        if (await record.isVisible({ timeout: 1000 })) {
          console.log(`✅ "${keyword}" 관련 거래 발견`);
          break;
        }
      }
    }
    
    console.log('🎉 출납장부 확인 완료');
  });

  test('대시보드 반영 확인', async ({ page }) => {
    console.log('📍 6단계: 대시보드 반영 확인');
    
    // 대시보드로 이동
    const dashboardLinks = [
      'text=대시보드',
      'text=Dashboard',
      'text=홈',
      'a[href*="dashboard"]',
      'text=메인'
    ];
    
    let navigated = false;
    for (const selector of dashboardLinks) {
      const link = page.locator(selector).first();
      if (await link.isVisible({ timeout: 2000 })) {
        await link.click();
        console.log(`✅ 대시보드 페이지 이동: ${selector}`);
        navigated = true;
        break;
      }
    }
    
    if (!navigated) {
      console.log('⚠️ 대시보드 메뉴를 찾을 수 없음 - URL로 직접 이동');
      await page.goto('https://00-yuandi-erp.vercel.app/ko/dashboard');
    }
    
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: '/mnt/d/00.Projects/00.YUANDI-ERP/tests/e2e/screenshots/14-dashboard-final.png',
      fullPage: true 
    });
    
    // 대시보드 통계 카드 확인
    const statCards = page.locator('[class*="stat"], [class*="card"], .bg-white');
    const cardCount = await statCards.count();
    console.log(`대시보드 카드/위젯 수: ${cardCount}`);
    
    // 주요 통계 정보 확인
    const statsToCheck = [
      { name: '총 주문', selectors: ['text=주문', 'text=order', 'text=Order'] },
      { name: '총 매출', selectors: ['text=매출', 'text=revenue', 'text=Revenue', 'text=₩', 'text=원'] },
      { name: '재고', selectors: ['text=재고', 'text=inventory', 'text=Inventory', 'text=상품'] },
      { name: '고객', selectors: ['text=고객', 'text=customer', 'text=Customer'] }
    ];
    
    for (const stat of statsToCheck) {
      let found = false;
      for (const selector of stat.selectors) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          console.log(`✅ ${stat.name} 정보 확인: ${selector}`);
          found = true;
          break;
        }
      }
      if (!found) {
        console.log(`⚠️ ${stat.name} 정보를 찾을 수 없음`);
      }
    }
    
    // 차트나 그래프 확인
    const charts = page.locator('canvas, svg, [class*="chart"], [class*="graph"]');
    const chartCount = await charts.count();
    console.log(`대시보드 차트/그래프 수: ${chartCount}`);
    
    if (chartCount > 0) {
      console.log('✅ 대시보드에 시각화 요소 존재');
    }
    
    // 최근 활동이나 알림 확인
    const activities = page.locator('[class*="activity"], [class*="recent"], [class*="notification"]');
    const activityCount = await activities.count();
    console.log(`최근 활동/알림 수: ${activityCount}`);
    
    console.log('🎉 대시보드 확인 완료');
  });
});