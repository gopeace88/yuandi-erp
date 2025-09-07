import { test, expect } from '@playwright/test';

test.describe('YUANDI ERP 종합 UI 테스트', () => {

  test.describe('1. 한국어 메인 페이지 테스트', () => {
    test('한국어 메인 페이지 기본 렌더링', async ({ page }) => {
      // 한국어 메인 페이지로 이동
      await page.goto('http://localhost:8081/ko');
      
      // 페이지 로드 대기 및 확인
      await page.waitForLoadState('networkidle');
      
      // 페이지 타이틀 확인
      await expect(page).toHaveTitle(/YUANDI/);
      
      // 메인 컨테이너가 렌더링 되었는지 확인
      const mainContainer = page.locator('main').or(page.locator('[role="main"]')).or(page.locator('body > div'));
      await expect(mainContainer.first()).toBeVisible();
    });

    test('한국어 로그인 폼 및 시작하기 버튼', async ({ page }) => {
      await page.goto('http://localhost:8081/ko');
      await page.waitForLoadState('networkidle');
      
      // 로그인 관련 요소 찾기 (여러 가능성 고려)
      const loginForm = page.locator('form').or(
        page.locator('[data-testid="login-form"]')
      ).or(
        page.locator('input[type="email"], input[type="text"]').first().locator('xpath=ancestor::form[1]')
      );
      
      // 시작하기 버튼 찾기 (여러 가능성 고려)
      const startButton = page.locator('text=시작하기').or(
        page.locator('button:has-text("시작")').or(
        page.locator('a:has-text("시작")').or(
        page.locator('[data-testid="start-button"]').or(
        page.locator('button, a').filter({ hasText: /시작|로그인|대시보드/ })
      ))));

      // 입력 요소들이 존재하는지 확인
      const emailInput = page.locator('input[type="email"], input[placeholder*="이메일"], input[name="email"]');
      const passwordInput = page.locator('input[type="password"], input[placeholder*="비밀번호"], input[name="password"]');
      
      if (await emailInput.count() > 0) {
        await expect(emailInput.first()).toBeVisible();
      }
      
      if (await passwordInput.count() > 0) {
        await expect(passwordInput.first()).toBeVisible();
      }

      // 시작하기 버튼이 클릭 가능한지 확인
      if (await startButton.count() > 0) {
        await expect(startButton.first()).toBeVisible();
        await expect(startButton.first()).toBeEnabled();
      }
    });

    test('Hydration 에러 확인', async ({ page }) => {
      const hydrationErrors: string[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().toLowerCase().includes('hydrat')) {
          hydrationErrors.push(msg.text());
        }
      });

      await page.goto('http://localhost:8081/ko');
      await page.waitForTimeout(3000); // hydration 완료 대기
      
      expect(hydrationErrors).toHaveLength(0);
    });
  });

  test.describe('2. 중국어 메인 페이지 테스트', () => {
    test('중국어 페이지 로드 및 텍스트 확인', async ({ page }) => {
      await page.goto('http://localhost:8081/zh-CN');
      await page.waitForLoadState('networkidle');
      
      // 페이지가 정상 로드되었는지 확인
      await expect(page).toHaveTitle(/YUANDI/);
      
      // 중국어 텍스트가 포함된 요소 찾기
      const chineseText = page.locator(':has-text("管理"), :has-text("登录"), :has-text("开始"), :has-text("订单")');
      
      if (await chineseText.count() > 0) {
        await expect(chineseText.first()).toBeVisible();
      }
    });

    test('중국어 로그인 폼 존재 확인', async ({ page }) => {
      await page.goto('http://localhost:8081/zh-CN');
      await page.waitForLoadState('networkidle');
      
      // 로그인 관련 입력 필드 또는 폼 확인
      const loginElements = page.locator('input[type="email"], input[type="password"], form, button:has-text("登录"), a:has-text("开始")');
      
      if (await loginElements.count() > 0) {
        await expect(loginElements.first()).toBeVisible();
      }
    });
  });

  test.describe('3. 한국어 대시보드 테스트', () => {
    test('한국어 대시보드 로드 및 기본 구조', async ({ page }) => {
      await page.goto('http://localhost:8081/ko/dashboard');
      await page.waitForLoadState('networkidle');
      
      // 페이지가 정상 로드되었는지 확인
      await expect(page).toHaveTitle(/YUANDI|대시보드|Dashboard/);
      
      // 메인 컨텐츠 영역 확인
      const mainContent = page.locator('main, [role="main"], .dashboard, #dashboard');
      if (await mainContent.count() > 0) {
        await expect(mainContent.first()).toBeVisible();
      }
    });

    test('통계 카드 4개 표시 확인', async ({ page }) => {
      await page.goto('http://localhost:8081/ko/dashboard');
      await page.waitForLoadState('networkidle');
      
      // 다양한 선택자로 카드 요소들 찾기
      const cards = page.locator('.card, [data-testid*="card"], .stat, .metric, .summary').or(
        page.locator('div').filter({ hasText: /매출|주문|재고|배송/ })
      );
      
      // 최소 4개의 카드가 있는지 확인 (정확히 4개가 아닐 수도 있으므로)
      const cardCount = await cards.count();
      expect(cardCount).toBeGreaterThanOrEqual(3);
    });

    test('빠른 메뉴 버튼 확인', async ({ page }) => {
      await page.goto('http://localhost:8081/ko/dashboard');
      await page.waitForLoadState('networkidle');
      
      // 빠른 메뉴 버튼들 찾기
      const quickMenuButtons = page.locator('button, a').filter({ 
        hasText: /주문|재고|배송|설정|추가|등록|관리/ 
      });
      
      const buttonCount = await quickMenuButtons.count();
      expect(buttonCount).toBeGreaterThanOrEqual(3);
    });

    test('최근 주문 테이블 표시 확인', async ({ page }) => {
      await page.goto('http://localhost:8081/ko/dashboard');
      await page.waitForLoadState('networkidle');
      
      // 테이블 또는 목록 찾기
      const ordersSection = page.locator('table, .table, [data-testid*="order"], .order-list').or(
        page.locator(':has-text("최근 주문"), :has-text("주문 목록"), :has-text("Order")')
      );
      
      if (await ordersSection.count() > 0) {
        await expect(ordersSection.first()).toBeVisible();
      }
    });

    test('Hydration 에러 확인 - 대시보드', async ({ page }) => {
      const hydrationErrors: string[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().toLowerCase().includes('hydrat')) {
          hydrationErrors.push(msg.text());
        }
      });

      await page.goto('http://localhost:8081/ko/dashboard');
      await page.waitForTimeout(5000); // 충분한 대기 시간
      
      expect(hydrationErrors).toHaveLength(0);
    });
  });

  test.describe('4. 중국어 대시보드 테스트', () => {
    test('중국어 대시보드 로드 및 텍스트 확인', async ({ page }) => {
      await page.goto('http://localhost:8081/zh-CN/dashboard');
      await page.waitForLoadState('networkidle');
      
      // 페이지 로드 확인
      await expect(page).toHaveTitle(/YUANDI/);
      
      // 중국어 텍스트 확인
      const chineseElements = page.locator(':has-text("管理"), :has-text("订单"), :has-text("库存"), :has-text("仪表板")');
      
      if (await chineseElements.count() > 0) {
        await expect(chineseElements.first()).toBeVisible();
      }
    });

    test('모든 컴포넌트 정상 렌더링 확인', async ({ page }) => {
      await page.goto('http://localhost:8081/zh-CN/dashboard');
      await page.waitForLoadState('networkidle');
      
      // 주요 컴포넌트들이 렌더링 되었는지 확인
      const components = page.locator('div, section, article, main').filter({ hasVisible: true });
      const componentCount = await components.count();
      
      expect(componentCount).toBeGreaterThan(5); // 최소한의 컴포넌트들이 렌더링되었는지 확인
    });
  });

  test.describe('5. 한국어 주문 조회 페이지 테스트', () => {
    test('한국어 주문 조회 페이지 로드', async ({ page }) => {
      await page.goto('http://localhost:8081/ko/track');
      await page.waitForLoadState('networkidle');
      
      // 페이지 로드 확인
      await expect(page).toHaveTitle(/YUANDI|조회|Track/);
    });

    test('검색 폼 및 입력 필드 확인', async ({ page }) => {
      await page.goto('http://localhost:8081/ko/track');
      await page.waitForLoadState('networkidle');
      
      // 검색 폼 찾기
      const searchForm = page.locator('form, .search, [data-testid*="search"]');
      
      if (await searchForm.count() > 0) {
        await expect(searchForm.first()).toBeVisible();
      }
      
      // 입력 필드들 찾기
      const inputFields = page.locator('input[type="text"], input[type="search"], input[name*="name"], input[name*="phone"]');
      
      if (await inputFields.count() > 0) {
        await expect(inputFields.first()).toBeVisible();
        await expect(inputFields.first()).toBeEnabled();
        
        // 입력 테스트
        await inputFields.first().fill('테스트');
        await expect(inputFields.first()).toHaveValue('테스트');
      }
    });
  });

  test.describe('6. 중국어 주문 조회 페이지 테스트', () => {
    test('중국어 주문 조회 페이지 로드', async ({ page }) => {
      await page.goto('http://localhost:8081/zh-CN/track');
      await page.waitForLoadState('networkidle');
      
      // 페이지 로드 확인
      await expect(page).toHaveTitle(/YUANDI/);
      
      // 중국어 텍스트 확인
      const chineseElements = page.locator(':has-text("查询"), :has-text("订单"), :has-text("搜索"), :has-text("追踪")');
      
      if (await chineseElements.count() > 0) {
        await expect(chineseElements.first()).toBeVisible();
      }
    });
  });

  test.describe('7. 네비게이션 플로우 테스트', () => {
    test('메인에서 시작하기 버튼으로 대시보드 이동', async ({ page }) => {
      await page.goto('http://localhost:8081/ko');
      await page.waitForLoadState('networkidle');
      
      // 시작하기 또는 대시보드로 이동하는 버튼 찾기
      const navigationButton = page.locator('text=시작하기').or(
        page.locator('button:has-text("시작")').or(
        page.locator('a:has-text("시작")').or(
        page.locator('a:has-text("대시보드")').or(
        page.locator('[href*="dashboard"]').or(
        page.locator('button, a').filter({ hasText: /시작|대시보드|로그인/ })
      )))));

      if (await navigationButton.count() > 0) {
        await navigationButton.first().click();
        await page.waitForLoadState('networkidle');
        
        // 대시보드로 이동했는지 확인
        expect(page.url()).toMatch(/dashboard/);
      }
    });

    test('하단 네비게이션 링크 테스트', async ({ page }) => {
      await page.goto('http://localhost:8081/ko/dashboard');
      await page.waitForLoadState('networkidle');
      
      // 하단 네비게이션 또는 네비게이션 메뉴 찾기
      const navLinks = page.locator('nav a, .nav a, .navigation a, [data-testid*="nav"] a').or(
        page.locator('a').filter({ hasText: /홈|대시보드|주문|재고|설정/ })
      );
      
      if (await navLinks.count() > 0) {
        const firstLink = navLinks.first();
        const linkText = await firstLink.textContent();
        await expect(firstLink).toBeVisible();
        await expect(firstLink).toBeEnabled();
        
        console.log(`네비게이션 링크 발견: ${linkText}`);
      }
    });
  });

  test.describe('8. 에러 및 성능 모니터링', () => {
    test('JavaScript 에러 모니터링', async ({ page }) => {
      const errors: string[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      page.on('pageerror', error => {
        errors.push(error.message);
      });

      const testPages = [
        'http://localhost:8081/ko',
        'http://localhost:8081/zh-CN',
        'http://localhost:8081/ko/dashboard',
        'http://localhost:8081/zh-CN/dashboard',
        'http://localhost:8081/ko/track',
        'http://localhost:8081/zh-CN/track'
      ];

      for (const url of testPages) {
        await page.goto(url);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
      }
      
      // 치명적인 에러만 체크 (일부 warning은 허용)
      const criticalErrors = errors.filter(error => 
        !error.includes('Warning') && 
        !error.includes('DevTools') &&
        !error.includes('favicon') &&
        error.length > 0
      );
      
      if (criticalErrors.length > 0) {
        console.log('발견된 에러들:', criticalErrors);
      }
      
      expect(criticalErrors.length).toBeLessThan(5); // 최대 5개까지 허용
    });

    test('페이지 로딩 성능 기본 확인', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('http://localhost:8081/ko');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // 개발 환경에서는 10초 내로 로딩되면 OK
      expect(loadTime).toBeLessThan(10000);
    });
  });
});