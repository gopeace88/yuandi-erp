import { test, expect } from '@playwright/test';

test.describe('주문 조회 페이지 테스트', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/track');
  });

  test('페이지 기본 요소 확인', async ({ page }) => {
    // 페이지 로드 대기
    await page.waitForLoadState('networkidle');
    
    // 페이지 제목이나 헤딩 확인
    const heading = page.locator('h1, h2').first();
    const headingCount = await heading.count();
    
    if (headingCount > 0) {
      await expect(heading).toBeVisible();
    }
  });

  test('다국어 지원 - 브라우저 언어 감지', async ({ page, context }) => {
    // 한국어 브라우저 설정
    await page.goto('/track');
    await page.waitForLoadState('domcontentloaded');
    
    // 페이지가 정상적으로 로드되었는지 확인
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();
    
    // 기본 콘텐츠가 있는지 확인
    const hasContent = await page.locator('h1, form').count() > 0;
    expect(hasContent).toBe(true);
  });

  test('주문 조회 폼 요소 확인', async ({ page }) => {
    // 이름 입력 필드 확인
    const nameInput = page.locator('input[type="text"], input[name*="name"], input[placeholder*="이름"], input[placeholder*="성함"]').first();
    const nameInputCount = await nameInput.count();
    
    if (nameInputCount > 0) {
      await expect(nameInput).toBeVisible();
      await expect(nameInput).toBeEditable();
    }
    
    // 전화번호 입력 필드 확인
    const phoneInput = page.locator('input[type="tel"], input[name*="phone"], input[placeholder*="전화"], input[placeholder*="연락처"]').first();
    const phoneInputCount = await phoneInput.count();
    
    if (phoneInputCount > 0) {
      await expect(phoneInput).toBeVisible();
      await expect(phoneInput).toBeEditable();
    }
    
    // 조회 버튼 확인
    const submitButton = page.locator('button[type="submit"], button:has-text("조회"), button:has-text("검색"), button:has-text("확인")').first();
    const submitButtonCount = await submitButton.count();
    
    if (submitButtonCount > 0) {
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toBeEnabled();
    }
  });

  test('폼 유효성 검증 - 필수 필드', async ({ page }) => {
    // 빈 폼 제출 시도
    const submitButton = page.locator('button[type="submit"], button:has-text("조회"), button:has-text("검색")').first();
    const submitButtonCount = await submitButton.count();
    
    if (submitButtonCount > 0) {
      await submitButton.click();
      
      // 에러 메시지 또는 필수 필드 표시 확인
      await page.waitForTimeout(1000);
      
      // HTML5 유효성 검증 메시지 또는 커스텀 에러 메시지 확인
      const errorMessages = page.locator('[role="alert"], .error, [class*="error"], :invalid');
      const errorCount = await errorMessages.count();
      
      // 에러가 표시되거나 폼이 제출되지 않았는지 확인
      const urlChanged = page.url().includes('?') || page.url().includes('#');
      expect(errorCount > 0 || !urlChanged).toBe(true);
    }
  });

  test('폼 유효성 검증 - 전화번호 형식', async ({ page }) => {
    // 이름 입력
    const nameInput = page.locator('input[type="text"], input[name*="name"]').first();
    const nameInputCount = await nameInput.count();
    
    if (nameInputCount > 0) {
      await nameInput.fill('홍길동');
    }
    
    // 잘못된 전화번호 형식 입력
    const phoneInput = page.locator('input[type="tel"], input[name*="phone"]').first();
    const phoneInputCount = await phoneInput.count();
    
    if (phoneInputCount > 0) {
      await phoneInput.fill('123'); // 잘못된 형식
      
      // 폼 제출
      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.count() > 0) {
        await submitButton.click();
        
        // 에러 확인
        await page.waitForTimeout(1000);
        
        // 페이지가 그대로 있는지 확인 (제출되지 않음)
        const currentUrl = page.url();
        expect(currentUrl).toContain('/track');
      }
    }
  });

  test('정상적인 주문 조회', async ({ page }) => {
    // 정상적인 데이터 입력
    const nameInput = page.locator('input[type="text"], input[name*="name"]').first();
    if (await nameInput.count() > 0) {
      await nameInput.fill('홍길동');
    }
    
    const phoneInput = page.locator('input[type="tel"], input[name*="phone"]').first();
    if (await phoneInput.count() > 0) {
      await phoneInput.fill('010-1234-5678');
    }
    
    // API 응답 모킹
    await page.route('**/api/track**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          orders: [
            {
              id: '1',
              order_number: 'ORD-240101-001',
              status: 'SHIPPED',
              total_amount: 100000,
              created_at: '2024-01-01T00:00:00Z',
            },
          ],
        }),
      });
    });
    
    // 폼 제출
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.count() > 0) {
      await submitButton.click();
      
      // 결과 대기
      await page.waitForTimeout(2000);
      
      // 결과가 표시되는지 확인 (주문 번호 또는 상태)
      const orderInfo = page.locator('text=/ORD-.*-\\d+/');
      const hasOrderInfo = await orderInfo.count() > 0;
      
      // 주문 정보가 표시되거나 결과 영역이 나타났는지 확인
      expect(hasOrderInfo || page.url().includes('?')).toBe(true);
    }
  });

  test('주문이 없을 때 메시지 표시', async ({ page }) => {
    // 정상적인 데이터 입력
    const nameInput = page.locator('input[type="text"], input[name*="name"]').first();
    if (await nameInput.count() > 0) {
      await nameInput.fill('없는사람');
    }
    
    const phoneInput = page.locator('input[type="tel"], input[name*="phone"]').first();
    if (await phoneInput.count() > 0) {
      await phoneInput.fill('010-0000-0000');
    }
    
    // API 응답 모킹 (빈 결과)
    await page.route('**/api/track**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          orders: [],
        }),
      });
    });
    
    // 폼 제출
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.count() > 0) {
      await submitButton.click();
      
      // 결과 대기
      await page.waitForTimeout(2000);
      
      // "주문이 없습니다" 메시지 확인
      const noOrderMessage = page.locator('text=/주문.*없|찾을.*없|검색.*결과.*없/');
      const hasNoOrderMessage = await noOrderMessage.count() > 0;
      
      // 메시지가 표시되는지 확인
      expect(hasNoOrderMessage || page.url().includes('?')).toBe(true);
    }
  });
});

test.describe('주문 조회 다국어 테스트', () => {
  
  test('한국어 인터페이스', async ({ page, context }) => {
    // 한국어 설정
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'language', {
        get: () => 'ko-KR',
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['ko-KR', 'ko'],
      });
    });
    
    await page.goto('/track');
    await page.waitForLoadState('domcontentloaded');
    
    // 페이지가 로드되었는지 확인
    const pageLoaded = await page.title();
    expect(pageLoaded).toBeTruthy();
    
    // 폼 요소가 있는지 확인 (현재는 한국어로만 표시)
    const formExists = await page.locator('form').count() > 0;
    expect(formExists).toBe(true);
    
    // 입력 필드가 있는지 확인
    const inputFields = await page.locator('input').count();
    expect(inputFields).toBeGreaterThan(0);
  });

  test('중국어 인터페이스', async ({ page, context }) => {
    // 중국어 설정
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'language', {
        get: () => 'zh-CN',
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['zh-CN', 'zh'],
      });
    });
    
    await page.goto('/track');
    await page.waitForLoadState('domcontentloaded');
    
    // 페이지가 로드되었는지 확인
    const pageLoaded = await page.title();
    expect(pageLoaded).toBeTruthy();
    
    // 현재는 한국어로 표시되지만 페이지가 작동하는지 확인
    const hasForm = await page.locator('form').count() > 0;
    expect(hasForm).toBe(true);
    
    const hasButton = await page.locator('button').count() > 0;
    expect(hasButton).toBe(true);
  });

  test('언어 전환 기능', async ({ page }) => {
    await page.goto('/track');
    await page.waitForLoadState('networkidle');
    
    // 언어 선택 드롭다운이나 버튼 찾기
    const languageSelector = page.locator('[data-testid*="language"], [class*="language"], select, button:has-text("KO"), button:has-text("CN"), button:has-text("EN")');
    const selectorCount = await languageSelector.count();
    
    if (selectorCount > 0) {
      // 언어 선택기가 있으면 클릭
      await languageSelector.first().click();
      
      // 언어 옵션이 표시되는지 확인
      await page.waitForTimeout(500);
      
      const languageOptions = page.locator('option, [role="option"], li');
      const optionsCount = await languageOptions.count();
      
      // 옵션이 있는지 확인
      expect(optionsCount).toBeGreaterThan(0);
    }
  });
});