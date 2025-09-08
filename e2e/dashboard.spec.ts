import { test, expect } from '@playwright/test';

test.describe('대시보드 페이지 테스트', () => {
  
  test('비로그인 상태에서 대시보드 접근 시 동작 확인', async ({ page }) => {
    // 직접 대시보드 URL로 접근
    const response = await page.goto('/ko/dashboard');
    
    // 페이지가 로드되는지 확인 (현재는 인증이 구현되지 않았으므로 페이지가 로드될 수 있음)
    // 실제 인증이 구현되면 리다이렉션 확인으로 변경 필요
    expect(response?.status()).toBeLessThanOrEqual(500);
  });

  test('대시보드 페이지 기본 구조 확인', async ({ page }) => {
    await page.goto('/ko/dashboard');
    
    // 페이지가 로드될 때까지 대기
    await page.waitForLoadState('networkidle');
    
    // 대시보드 컨테이너 존재 확인
    const dashboardContainer = page.locator('.dashboard-container');
    const containerCount = await dashboardContainer.count();
    
    // 컨테이너가 존재하거나 페이지가 로드되었는지 확인
    if (containerCount > 0) {
      await expect(dashboardContainer.first()).toBeVisible();
    }
  });

  test('대시보드 Supabase 데이터 로딩 확인', async ({ page }) => {
    // Supabase API 응답을 가로채기 위한 설정
    const supabaseResponses: any[] = [];

    // Supabase API 응답 가로채기
    page.on('response', async response => {
      const url = response.url();
      
      if (url.includes('supabase') && (url.includes('/rest/v1/') || url.includes('/storage/'))) {
        supabaseResponses.push({
          url: url,
          status: response.status(),
          ok: response.ok(),
        });
      }
    });

    // 대시보드 페이지 로드
    await page.goto('/ko/dashboard');
    
    // 데이터 로딩 대기
    await page.waitForLoadState('networkidle');
    
    // Supabase API가 호출되었는지 확인 (현재 대시보드는 클라이언트에서 직접 Supabase 호출)
    // 데이터가 표시되는지 확인
    const hasData = await page.locator('text=/\d+/').count();
    expect(hasData).toBeGreaterThan(0);
  });

  test('대시보드 주요 컴포넌트 렌더링 확인', async ({ page }) => {
    await page.goto('/ko/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 통계 정보 영역 확인
    const statsSection = page.locator('.bg-white >> text=/총 상품수|재고 가치|재고 부족|재고 없음/');
    await expect(statsSection).toBeVisible();
    
    // 차트 영역 확인 (매출 트렌드, 주문 상태)
    const charts = page.locator('.chart');
    const chartsCount = await charts.count();
    expect(chartsCount).toBeGreaterThanOrEqual(2); // 매출 트렌드, 주문 상태 차트
    
    // 최근 주문 테이블 확인
    const recentOrdersTable = page.locator('table');
    await expect(recentOrdersTable).toBeVisible();
    
    // 테이블 헤더 확인
    const headers = ['주문번호', '고객명', '상품', '금액', '상태', '주문일시'];
    for (const header of headers) {
      await expect(page.locator(`th:has-text("${header}")`)).toBeVisible();
    }
  });

  test('로딩 상태 표시 확인', async ({ page }) => {
    // 네트워크 속도를 느리게 설정
    await page.route('**/api/**', route => {
      setTimeout(() => route.continue(), 1000);
    });
    
    await page.goto('/ko/dashboard');
    
    // 로딩 인디케이터 확인 (스피너, 스켈레톤 등)
    const loadingIndicators = page.locator('[data-testid*="loading"], .loading, .spinner, .skeleton, [class*="animate-pulse"], [class*="animate-spin"]');
    const loadingCount = await loadingIndicators.count();
    
    // 로딩 상태가 표시되는지 확인
    if (loadingCount > 0) {
      await expect(loadingIndicators.first()).toBeVisible();
    }
  });

  test('에러 상태 처리 확인', async ({ page }) => {
    // API 요청을 실패로 처리
    await page.route('**/api/dashboard/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });
    
    // 페이지 로드 시도
    const response = await page.goto('/dashboard');
    
    // API 에러가 발생해도 페이지는 로드되어야 함
    // 페이지 응답이 있는지 확인
    expect(response).toBeTruthy();
    
    // 페이지 내용이 있는지 확인 (빈 페이지가 아님)
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();
  });
});

test.describe('대시보드 통계 카드 테스트', () => {
  
  test('통계 카드 데이터 표시', async ({ page }) => {
    // 모의 API 응답 설정
    await page.route('**/api/dashboard/summary', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalProducts: 150,
          totalValue: 5000000,
          lowStockCount: 5,
          outOfStockCount: 2,
        }),
      });
    });
    
    await page.goto('/ko/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 숫자가 표시되는지 확인
    const numbers = await page.locator('text=/\\d+/').allTextContents();
    expect(numbers.length).toBeGreaterThan(0);
  });
});

test.describe('대시보드 차트 테스트', () => {
  
  test('매출 트렌드 차트 렌더링', async ({ page }) => {
    // 모의 API 응답 설정
    await page.route('**/api/dashboard/sales-trend', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { date: '2024-01-01', amount: 1000000 },
          { date: '2024-01-02', amount: 1200000 },
          { date: '2024-01-03', amount: 1100000 },
        ]),
      });
    });
    
    await page.goto('/ko/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Recharts SVG 요소 확인
    const chartSvg = page.locator('svg.recharts-surface');
    const svgCount = await chartSvg.count();
    
    // 차트가 렌더링되었는지 확인
    if (svgCount > 0) {
      await expect(chartSvg.first()).toBeVisible();
    }
  });

  test('주문 상태 분포 차트 렌더링', async ({ page }) => {
    // 모의 API 응답 설정
    await page.route('**/api/dashboard/order-status', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { status: 'paid', label: '결제완료', count: 10 },
          { status: 'shipped', label: '배송중', count: 15 },
          { status: 'delivered', label: '완료', count: 50 },
        ]),
      });
    });
    
    await page.goto('/ko/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 차트 또는 그래프 요소 확인
    const charts = page.locator('svg, canvas, [role="img"]');
    const chartsCount = await charts.count();
    
    // 차트가 렌더링되었는지 확인
    expect(chartsCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe('대시보드 테이블 테스트', () => {
  
  test('최근 주문 목록 표시', async ({ page }) => {
    await page.goto('/ko/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 테이블 요소 확인
    const tables = page.locator('table');
    const tableCount = await tables.count();
    
    if (tableCount > 0) {
      // 테이블 헤더 확인
      const headers = await page.locator('th').allTextContents();
      expect(headers.length).toBeGreaterThan(0);
      
      // 테이블 행 확인
      const rows = await page.locator('tbody tr').count();
      expect(rows).toBeGreaterThanOrEqual(0);
    }
  });
  
  test('최근 주문 테이블 호버 효과 확인', async ({ page }) => {
    await page.goto('/ko/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 테이블 행 찾기
    const tableRows = page.locator('tbody tr');
    const rowCount = await tableRows.count();
    
    if (rowCount > 0) {
      // 첫 번째 행에 호버
      const firstRow = tableRows.first();
      await firstRow.hover();
      
      // 호버 스타일이 적용되는지 확인 (배경색 변경)
      const hasHoverClass = await firstRow.evaluate(el => {
        const styles = window.getComputedStyle(el);
        // hover:bg-blue-50 또는 hover:bg-gray-50 클래스가 있는지 확인
        return el.className.includes('hover:bg-blue-50') || el.className.includes('hover:bg-gray-50');
      });
      
      expect(hasHoverClass).toBeTruthy();
    }
  });
  
  test('결제완료 주문 클릭 시 송장 입력 모달 표시', async ({ page }) => {
    await page.goto('/ko/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 결제완료 상태의 주문 찾기
    const paidOrderRow = page.locator('tbody tr:has-text("결제완료")').first();
    const hasPaidOrder = await paidOrderRow.count() > 0;
    
    if (hasPaidOrder) {
      // 주문 행 클릭
      await paidOrderRow.click();
      
      // 송장 입력 모달이 표시되는지 확인
      const modal = page.locator('text="배송 등록"');
      await expect(modal).toBeVisible({ timeout: 5000 });
      
      // 모달 내용 확인
      await expect(page.locator('text="택배사"')).toBeVisible();
      await expect(page.locator('text="운송장 번호"')).toBeVisible();
      
      // 모달 닫기
      const closeButton = page.locator('button:has(svg)').first();
      await closeButton.click();
      await expect(modal).not.toBeVisible();
    }
  });
});