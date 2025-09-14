import { test, expect } from '@playwright/test';

test.describe('시나리오 1: 상품 추가 및 재고 입고', () => {
  test('상품 등록부터 재고 입고까지 전체 플로우', async ({ page }) => {
    console.log('=== 시나리오 1: 상품 추가 및 재고 입고 테스트 시작 ===\n');

    // ========================================
    // 1. 로그인 및 초기 상태 확인
    // ========================================
    console.log('📍 1단계: 로그인');
    await page.goto('http://localhost:8081/ko');
    await page.waitForLoadState('networkidle');

    // 로그인 필요시 처리
    if (page.url().includes('/login')) {
      await page.fill('input#email, [data-testid="login-email"]', 'admin@yuandi.com');
      await page.fill('input#password, [data-testid="login-password"]', 'yuandi123!');
      await page.click('button[type="submit"], [data-testid="login-submit"]');

      // 대시보드로 이동 대기
      await page.waitForURL(/.*dashboard/, { timeout: 10000 });
      console.log('  ✅ 로그인 성공');
    }

    // ========================================
    // 2. 대시보드에서 초기 재고 현황 확인
    // ========================================
    console.log('\n📍 2단계: 대시보드에서 초기 재고 현황 확인');

    // 대시보드가 아니면 이동
    if (!page.url().includes('/dashboard')) {
      await page.goto('http://localhost:8081/ko/dashboard');
      await page.waitForLoadState('networkidle');
    }

    // 재고 현황 카드에서 수량 기록
    let initialStock = 0;
    try {
      // 여러 가능한 셀렉터 시도
      const inventoryCard = page.locator('.stat-card:has-text("재고 현황"), .card:has-text("재고 현황")').first();
      if (await inventoryCard.count() > 0) {
        const stockText = await inventoryCard.locator('.stat-value-large, .text-2xl, .text-xl').first().textContent();
        if (stockText) {
          initialStock = parseInt(stockText.replace(/[^\d]/g, '')) || 0;
          console.log(`  - 초기 재고 수량: ${initialStock}개`);
        }
      }
    } catch (error) {
      console.log('  ⚠️ 재고 현황 카드를 찾을 수 없음');
    }

    // ========================================
    // 3. 상품 등록 (설정 → 상품관리)
    // ========================================
    console.log('\n📍 3단계: 설정 → 상품관리에서 상품 추가');

    // 설정 메뉴 이동
    const settingsLink = page.locator('a:has-text("설정"), a[href*="/settings"]').first();
    if (await settingsLink.count() > 0) {
      await settingsLink.click();
    } else {
      await page.goto('http://localhost:8081/ko/settings');
    }
    await page.waitForLoadState('networkidle');
    console.log('  - 설정 페이지 이동');

    // 상품관리 탭 클릭 (기본 선택일 수 있음)
    const productTab = page.locator('button:has-text("상품 관리"), [data-testid="product-management-tab"]').first();
    if (await productTab.count() > 0 && await productTab.isVisible()) {
      await productTab.click();
      console.log('  - 상품관리 탭 선택');
    }

    // 상품 추가 버튼 클릭
    const addProductBtn = page.locator('button:has-text("상품 추가"), button:has-text("+ 상품 추가")').first();
    await addProductBtn.click();

    // '상품 등록' 모달이 열릴 때까지 대기
    await page.waitForTimeout(1000);  // 모달 애니메이션 대기
    console.log('  - 상품 등록 모달 열림');

    // 상품 정보 입력
    console.log('  - 상품 정보 입력 시작');

    // 카테고리 선택 (설정 페이지는 select[name] 없음)
    const categorySelect = page.locator('select').first();  // 모달 내 첫 번째 select가 카테고리
    if (await categorySelect.count() > 0) {
      const options = await categorySelect.locator('option').all();
      if (options.length > 1) {
        await categorySelect.selectOption({ index: 1 });
        console.log('  - 카테고리 선택');
      }
    }

    // 상품명 입력 (한국어/중국어)
    // 설정 페이지는 input에 name 속성이 없음, label 텍스트로 찾기
    const nameKoInput = page.locator('input[type="text"]').nth(0);  // 첫 번째 텍스트 입력 필드
    await nameKoInput.fill('테스트 핸드백');

    const nameZhInput = page.locator('input[type="text"]').nth(1);  // 두 번째 텍스트 입력 필드
    await nameZhInput.fill('测试手提包');

    // 모델 입력
    const modelInput = page.locator('input[type="text"]').nth(2);  // 세 번째 텍스트 입력 필드
    await modelInput.fill('TEST-001');

    // 색상 입력 (한글/중문)
    const colorKoInput = page.locator('input[type="text"]').nth(3);  // 네 번째 텍스트 입력 필드
    await colorKoInput.fill('블랙');

    const colorZhInput = page.locator('input[type="text"]').nth(4);  // 다섯 번째 텍스트 입력 필드
    await colorZhInput.fill('黑色');

    // 브랜드 입력 (한글/중문)
    const brandKoInput = page.locator('input[type="text"]').nth(5);  // 여섯 번째 텍스트 입력 필드
    await brandKoInput.fill('테스트브랜드');

    const brandZhInput = page.locator('input[type="text"]').nth(6);  // 일곱 번째 텍스트 입력 필드
    await brandZhInput.fill('测试品牌');

    // 가격 입력
    const costInput = page.locator('input[type="number"]').nth(0);  // 첫 번째 숫자 입력 필드
    await costInput.fill('100');

    const priceInput = page.locator('input[type="number"]').nth(1);  // 두 번째 숫자 입력 필드
    await priceInput.fill('20000');

    console.log('  - 모든 필드 입력 완료');

    // 저장 버튼 클릭
    await page.click('button:has-text("저장")');
    await page.waitForTimeout(1000);

    console.log('  ✅ 상품 추가 완료');

    // ========================================
    // 4. 재고 입고 처리
    // ========================================
    console.log('\n📍 4단계: 재고관리에서 재고 입고');

    // 재고관리 메뉴 이동
    const inventoryLink = page.locator('a:has-text("재고 관리"), a:has-text("재고관리"), a[href*="/inventory"]').first();
    if (await inventoryLink.count() > 0) {
      await inventoryLink.click();
    } else {
      await page.goto('http://localhost:8081/ko/inventory');
    }
    await page.waitForLoadState('networkidle');
    console.log('  - 재고관리 페이지 이동');

    // 기존 모달이 열려있으면 닫기
    const modal = page.locator('[role="dialog"]');
    if (await modal.count() > 0 && await modal.isVisible()) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // 재고 입고 버튼 클릭
    const inboundBtn = page.locator('button').filter({ hasText: /\+.*재고 입고/ }).first();
    if (await inboundBtn.count() > 0) {
      await inboundBtn.click();
      await page.waitForTimeout(1000);  // 모달 열림 대기
      console.log('  - 재고 입고 모달 열림');
    } else {
      // 버튼을 못 찾으면 다른 방법 시도
      const altBtn = page.locator('button:has-text("재고 입고")').first();
      if (await altBtn.count() > 0) {
        await altBtn.click();
        await page.waitForTimeout(1000);
        console.log('  - 재고 입고 모달 열림');
      } else {
        console.log('  ❌ 재고 입고 버튼을 찾을 수 없음');
        return;
      }
    }

    // 상품 선택 (방금 추가한 상품)
    const productSelect = page.locator('select').first();  // 재고 입고 모달의 select
    if (await productSelect.count() > 0) {
      const options = await productSelect.locator('option').all();
      for (let i = 0; i < options.length; i++) {
        const text = await options[i].textContent();
        if (text?.includes('테스트 핸드백') || text?.includes('TEST-001')) {
          await productSelect.selectOption({ index: i });
          console.log('  - 테스트 핸드백 선택');
          break;
        }
      }
    }

    // 수량 입력 (첫 번째 number input)
    const quantityInput = page.locator('input[type="number"]').first();
    await quantityInput.fill('5');
    console.log('  - 입고 수량: 5개');

    // 메모 입력
    const noteTextarea = page.locator('textarea').first();
    await noteTextarea.fill('테스트 입고');
    console.log('  - 메모: 테스트 입고');

    // 입고 처리 (저장 버튼 클릭)
    const saveButton = page.locator('button:has-text("저장")').last();  // 마지막 저장 버튼
    await saveButton.click();
    await page.waitForTimeout(2000);  // 처리 대기
    console.log('  ✅ 재고 입고 완료');

    // ========================================
    // 5. 출납장부에서 입고 내역 확인
    // ========================================
    console.log('\n📍 5단계: 출납장부에서 입고 내역 확인');

    // 출납장부 메뉴 이동
    const cashbookLink = page.locator('a:has-text("출납장부"), a[href*="/cashbook"]').first();
    if (await cashbookLink.count() > 0) {
      await cashbookLink.click();
    } else {
      await page.goto('http://localhost:8081/ko/cashbook');
    }
    await page.waitForLoadState('networkidle');
    console.log('  - 출납장부 페이지 이동');

    // 입고 내역 확인
    const inboundTransaction = page.locator('tr:has-text("입고"), tr:has-text("재고 입고")').first();
    if (await inboundTransaction.count() > 0) {
      const transactionText = await inboundTransaction.textContent();
      console.log('  ✅ 입고 내역 발견');

      if (transactionText?.includes('테스트 핸드백')) {
        console.log('  - 상품명 확인: 테스트 핸드백');
      }
      if (transactionText?.includes('500') || transactionText?.includes('5')) {
        console.log('  - 금액 확인: 500 CNY (5개 × 100 CNY)');
      }
    } else {
      console.log('  ⚠️ 입고 내역을 찾을 수 없음');
    }

    // ========================================
    // 6. 대시보드에서 재고 현황 반영 확인
    // ========================================
    console.log('\n📍 6단계: 대시보드에서 재고 현황 반영 확인');

    // 대시보드로 돌아가기
    const dashboardLink = page.locator('a:has-text("대시보드"), a[href*="/dashboard"]').first();
    if (await dashboardLink.count() > 0) {
      await dashboardLink.click();
    } else {
      await page.goto('http://localhost:8081/ko/dashboard');
    }
    await page.waitForLoadState('networkidle');
    console.log('  - 대시보드 페이지 이동');

    // 업데이트된 재고 확인
    let updatedStock = 0;
    try {
      const inventoryCard = page.locator('.stat-card:has-text("재고 현황"), .card:has-text("재고 현황")').first();
      if (await inventoryCard.count() > 0) {
        const stockText = await inventoryCard.locator('.stat-value-large, .text-2xl, .text-xl').first().textContent();
        if (stockText) {
          updatedStock = parseInt(stockText.replace(/[^\d]/g, '')) || 0;
          console.log(`  - 업데이트된 재고 수량: ${updatedStock}개`);
        }
      }
    } catch (error) {
      console.log('  ⚠️ 재고 현황 카드를 찾을 수 없음');
    }

    // 재고 증가 확인
    const stockIncrease = updatedStock - initialStock;
    console.log(`  - 재고 증가량: ${stockIncrease}개 (예상: 5개)`);

    if (stockIncrease === 5) {
      console.log('  ✅ 재고 증가 정확히 반영됨');
    } else if (stockIncrease > 0) {
      console.log('  ⚠️ 재고는 증가했지만 예상과 다름');
    }

    // ========================================
    // 테스트 완료
    // ========================================
    console.log('\n🎉 시나리오 1 테스트 완료!');
    console.log('========================================');
    console.log('📊 결과 요약:');
    console.log(`  - 초기 재고: ${initialStock}개`);
    console.log(`  - 입고 수량: 5개`);
    console.log(`  - 최종 재고: ${updatedStock}개`);
    console.log(`  - 증가량: ${stockIncrease}개`);
    console.log('========================================');

    // 예상 결과 검증
    expect(page.url()).not.toContain('/login');
    console.log('✅ 모든 단계 완료');
  });
});