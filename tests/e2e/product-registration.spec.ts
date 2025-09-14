import { test, expect } from '@playwright/test';

test.describe('상품 등록 테스트', () => {
  test('상품을 성공적으로 등록할 수 있어야 한다', async ({ page }) => {
    // 1. 로그인 페이지로 이동
    await page.goto('http://localhost:8081/ko');
    
    // 2. 로그인
    await page.fill('input[type="email"]', 'admin@yuandi.com');
    await page.fill('input[type="password"]', 'yuandi123!');
    await page.click('button[type="submit"]');
    
    // 대시보드로 이동 대기
    await page.waitForURL('**/dashboard');
    console.log('✅ 로그인 성공');
    
    // 3. 재고 관리 페이지로 이동
    await page.goto('http://localhost:8081/ko/inventory');
    await page.waitForSelector('h1');
    console.log('✅ 재고 관리 페이지 로드');
    
    // 4. 상품 등록 버튼 클릭
    await page.click('button:has-text("상품 등록")');
    console.log('✅ 상품 등록 모달 열기');
    
    // 모달이 열릴 때까지 대기
    await page.waitForTimeout(1000);
    
    // 5. 상품 정보 입력
    // 상품명
    const inputs = await page.locator('input[type="text"]').all();
    if (inputs[0]) {
      await inputs[0].fill('Playwright테스트제품001');
      console.log('  ✅ 상품명 입력');
    }
    
    // 카테고리 선택 (드롭다운)
    await page.selectOption('select', '전자제품');
    console.log('  ✅ 카테고리 선택');
    
    // 모델
    if (inputs[1]) {
      await inputs[1].fill('PLAY-001');
      console.log('  ✅ 모델 입력');
    }
    
    // 색상
    if (inputs[2]) {
      await inputs[2].fill('블랙');
      console.log('  ✅ 색상 입력');
    }
    
    // 브랜드
    if (inputs[3]) {
      await inputs[3].fill('Playwright브랜드');
      console.log('  ✅ 브랜드 입력');
    }
    
    // 원가 (CNY)
    const numberInputs = await page.locator('input[type="number"]').all();
    if (numberInputs[0]) {
      await numberInputs[0].fill('5000');
      console.log('  ✅ 원가 입력');
    }
    
    // 판매가 (KRW)
    if (numberInputs[1]) {
      await numberInputs[1].fill('1000000');
      console.log('  ✅ 판매가 입력');
    }
    
    // 스크린샷 저장
    await page.screenshot({ path: 'playwright-form-filled.png' });
    
    // 6. 저장 버튼 클릭
    console.log('📋 저장 버튼 클릭...');
    
    // API 응답 모니터링 설정
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/products') && response.status() === 201
    );
    
    // 저장 버튼 클릭
    await page.click('button:has-text("저장")');
    
    // API 응답 대기 (최대 10초)
    try {
      const response = await responsePromise;
      console.log('✅ API 응답 받음:', response.status());
      
      // 응답 데이터 확인
      const responseData = await response.json();
      console.log('📦 생성된 상품:', {
        name: responseData.product.name,
        category_id: responseData.product.category_id,
        sku: responseData.product.sku
      });
      
      // 모달이 닫힐 때까지 대기
      await page.waitForTimeout(2000);
      
      // 7. 페이지 새로고침하여 상품 목록 확인
      await page.reload();
      await page.waitForTimeout(2000);
      
      // 상품이 목록에 나타나는지 확인
      const productRow = page.locator('tr:has-text("Playwright테스트제품001")');
      await expect(productRow).toBeVisible({ timeout: 5000 });
      
      console.log('✅ 상품이 목록에 표시됨!');
      
      // 최종 스크린샷
      await page.screenshot({ path: 'playwright-test-success.png' });
      
    } catch (error) {
      console.error('❌ API 호출 실패 또는 타임아웃:', error);
      await page.screenshot({ path: 'playwright-test-failed.png' });
      throw error;
    }
  });
  
  test('필수 필드 없이 저장 시 에러가 발생해야 한다', async ({ page }) => {
    // 로그인
    await page.goto('http://localhost:8081/ko');
    await page.fill('input[type="email"]', 'admin@yuandi.com');
    await page.fill('input[type="password"]', 'yuandi123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // 재고 관리 페이지로 이동
    await page.goto('http://localhost:8081/ko/inventory');
    await page.waitForSelector('h1');
    
    // 상품 등록 모달 열기
    await page.click('button:has-text("상품 등록")');
    await page.waitForTimeout(1000);
    
    // 필수 필드를 비우고 저장 시도
    await page.click('button:has-text("저장")');
    
    // alert 대화상자 처리
    page.on('dialog', async dialog => {
      console.log('Alert 메시지:', dialog.message());
      expect(dialog.message()).toContain('필수 필드');
      await dialog.accept();
    });
    
    await page.waitForTimeout(1000);
    console.log('✅ 필수 필드 검증 작동 확인');
  });
});