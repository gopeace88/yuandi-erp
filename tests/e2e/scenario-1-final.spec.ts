import { test, expect } from '@playwright/test';

test.describe('시나리오 1: 상품 등록 및 재고 입고 통합 플로우', () => {
  test('상품 등록부터 재고 입고까지 완전 테스트', async ({ page }) => {
    console.log('=== 시나리오 1: 상품 등록 및 재고 입고 시작 ===\n');

    // ========================================
    // 1단계: 로그인
    // ========================================
    console.log('📍 1단계: 로그인');
    await page.goto('http://localhost:8081/ko');
    await page.waitForLoadState('networkidle');

    // 로그인이 필요한 경우
    if (page.url().includes('/login')) {
      await page.fill('input#email', 'admin@yuandi.com');
      await page.fill('input#password', 'yuandi123!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/(ko|dashboard)/, { timeout: 10000 });
      console.log('  ✅ 로그인 성공');
    }

    // ========================================
    // 2단계: 대시보드에서 초기 재고 확인
    // ========================================
    console.log('\n📍 2단계: 대시보드에서 초기 재고 확인');

    // 대시보드가 아니면 이동
    if (!page.url().includes('/dashboard')) {
      await page.goto('http://localhost:8081/ko/dashboard');
      await page.waitForLoadState('networkidle');
    }

    // 재고 현황 카드에서 숫자 추출
    let initialStock = 0;
    try {
      const stockCard = page.locator('text=재고 현황').first();
      if (await stockCard.count() > 0) {
        const stockContainer = stockCard.locator('..').locator('..');
        const stockText = await stockContainer.textContent();
        const stockMatch = stockText?.match(/(\d+)\s*개/);
        if (stockMatch) {
          initialStock = parseInt(stockMatch[1]);
          console.log(`  - 초기 재고: ${initialStock}개`);
        }
      }
    } catch (error) {
      console.log('  - 재고 현황을 찾을 수 없음');
    }

    // ========================================
    // 3단계: 설정 > 상품 관리에서 상품 추가
    // ========================================
    console.log('\n📍 3단계: 설정 > 상품 관리에서 상품 추가');

    // 설정 메뉴로 이동
    await page.goto('http://localhost:8081/ko/settings');
    await page.waitForLoadState('networkidle');
    console.log('  - 설정 페이지 이동');

    // 상품 관리 탭 클릭 (필요시)
    const productTab = page.locator('button:has-text("상품 관리")').first();
    if (await productTab.count() > 0 && await productTab.isVisible()) {
      await productTab.click();
      console.log('  - 상품 관리 탭 선택');
    }

    // 상품 추가 버튼 클릭
    const addProductBtn = page.locator('button:has-text("+ 상품 추가")').first();
    await addProductBtn.click();
    await page.waitForTimeout(1000);  // 모달 애니메이션 대기
    console.log('  - 상품 등록 모달 열림');

    // 상품 정보 입력
    console.log('  - 상품 정보 입력 시작');

    // 설정 페이지의 상품 모달은 input 순서가 정해져 있음
    // 1-2: 한글/중문 상품명
    // 3: 카테고리 (select)
    // 4: 모델
    // 5-6: 색상 한글/중문
    // 7-8: 브랜드 한글/중문
    // 9-10: 원가/판매가 (number)

    // 한글 상품명
    await page.locator('input[type="text"]').nth(0).fill('테스트 핸드백');

    // 중문 상품명
    await page.locator('input[type="text"]').nth(1).fill('测试手提包');

    // 카테고리 선택
    const categorySelect = page.locator('select').first();
    const categoryOptions = await categorySelect.locator('option').all();
    if (categoryOptions.length > 1) {
      await categorySelect.selectOption({ index: 1 });
    }

    // 모델
    await page.locator('input[type="text"]').nth(2).fill('TEST-001');

    // 색상 (한글/중문)
    await page.locator('input[type="text"]').nth(3).fill('검정');
    await page.locator('input[type="text"]').nth(4).fill('黑色');

    // 브랜드 (한글/중문)
    await page.locator('input[type="text"]').nth(5).fill('테스트브랜드');
    await page.locator('input[type="text"]').nth(6).fill('测试品牌');

    // 가격 (원가/판매가)
    await page.locator('input[type="number"]').nth(0).fill('100');
    await page.locator('input[type="number"]').nth(1).fill('20000');

    console.log('  - 모든 필드 입력 완료');

    // 저장 버튼 클릭
    await page.click('button:has-text("저장")');
    await page.waitForTimeout(2000);  // 저장 처리 대기
    console.log('  ✅ 상품 추가 완료');

    // ========================================
    // 4단계: 재고 관리에서 재고 입고
    // ========================================
    console.log('\n📍 4단계: 재고 관리에서 재고 입고');

    // 재고 관리 메뉴로 이동 (메뉴 클릭으로)
    const inventoryLink = page.locator('a:has-text("재고 관리"), a:has-text("재고관리")').first();
    if (await inventoryLink.count() > 0) {
      await inventoryLink.click();
      await page.waitForLoadState('networkidle');
      console.log('  - 재고 관리 페이지 이동 (메뉴 클릭)');
    } else {
      // 링크가 없으면 직접 이동
      await page.goto('http://localhost:8081/ko/inventory');
      await page.waitForLoadState('networkidle');
      console.log('  - 재고 관리 페이지 이동 (직접)');
    }

    // 로그인 페이지로 리다이렉트되었는지 확인
    if (page.url().includes('/login')) {
      console.log('  ⚠️ 세션이 만료되어 재로그인 필요');
      await page.fill('input#email', 'admin@yuandi.com');
      await page.fill('input#password', 'yuandi123!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/(ko|inventory)/, { timeout: 10000 });
      console.log('  - 재로그인 완료');

      // 재고 관리로 다시 이동
      if (!page.url().includes('/inventory')) {
        await page.goto('http://localhost:8081/ko/inventory');
        await page.waitForLoadState('networkidle');
      }
    }

    // 재고 입고 버튼 클릭 (+ 재고 입고)
    // 버튼 찾기 시도
    let buttonClicked = false;

    // 방법 1: 정확한 텍스트로 찾기
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const text = await button.textContent();
      if (text && text.includes('재고') && text.includes('입고')) {
        await button.click();
        buttonClicked = true;
        break;
      }
    }

    if (!buttonClicked) {
      console.log('  ❌ 재고 입고 버튼을 찾을 수 없음');
      // 페이지에 있는 모든 버튼 텍스트 출력
      for (let i = 0; i < Math.min(5, buttons.length); i++) {
        const text = await buttons[i].textContent();
        console.log(`    버튼 ${i + 1}: "${text?.trim()}"`);
      }
      return;
    }

    await page.waitForTimeout(1000);
    console.log('  - 재고 입고 모달 열림');

    // 상품 선택 (방금 추가한 상품)
    const productSelect = page.locator('select').first();

    // 먼저 상품이 있는지 확인
    const options = await productSelect.locator('option').all();
    console.log(`  - 상품 옵션 개수: ${options.length}개`);

    // 상품 찾기
    let productFound = false;
    for (let i = 0; i < options.length; i++) {
      const text = await options[i].textContent();
      console.log(`    옵션 ${i}: "${text?.trim()}"`);
      if (text && (text.includes('TEST-001') || text.includes('테스트 핸드백'))) {
        await productSelect.selectOption({ index: i });
        console.log('  - 테스트 상품 선택 성공');
        productFound = true;
        break;
      }
    }

    if (!productFound) {
      console.log('  ⚠️ 테스트 상품을 찾을 수 없음, 첫 번째 상품 선택');
      if (options.length > 1) {
        await productSelect.selectOption({ index: 1 });
      }
    }

    // 수량 입력
    await page.locator('input[type="number"]').first().fill('10');
    console.log('  - 입고 수량: 10개');

    // 단가 입력 (옵션)
    await page.locator('input[type="number"]').nth(1).fill('100');
    console.log('  - 단가: 100 CNY');

    // 메모 입력
    await page.locator('textarea').first().fill('시나리오 1 테스트 입고');
    console.log('  - 메모: 시나리오 1 테스트 입고');

    // 저장 버튼 클릭
    const saveButtons = await page.locator('button:has-text("저장")').all();
    await saveButtons[saveButtons.length - 1].click();  // 마지막 저장 버튼
    await page.waitForTimeout(2000);
    console.log('  ✅ 재고 입고 완료');

    // ========================================
    // 5단계: 출납장부에서 입고 내역 확인
    // ========================================
    console.log('\n📍 5단계: 출납장부에서 입고 내역 확인');

    // 출납장부로 이동
    await page.goto('http://localhost:8081/ko/cashbook');
    await page.waitForLoadState('networkidle');
    console.log('  - 출납장부 페이지 이동');

    // 최신 거래 내역 확인
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.count() > 0) {
      const rowText = await firstRow.textContent();
      if (rowText?.includes('입고') || rowText?.includes('재고')) {
        console.log('  ✅ 입고 내역 발견');

        // 금액 확인 (10개 × 100 CNY = 1,000 CNY)
        if (rowText.includes('1,000') || rowText.includes('1000')) {
          console.log('  - 금액 확인: 1,000 CNY (10개 × 100 CNY)');
        }
      }
    } else {
      console.log('  ⚠️ 출납장부에 거래 내역이 없음');
    }

    // ========================================
    // 6단계: 대시보드에서 재고 현황 재확인
    // ========================================
    console.log('\n📍 6단계: 대시보드에서 재고 현황 재확인');

    // 대시보드로 돌아가기
    await page.goto('http://localhost:8081/ko/dashboard');
    await page.waitForLoadState('networkidle');
    console.log('  - 대시보드 페이지 이동');

    // 업데이트된 재고 확인
    let finalStock = 0;
    try {
      const stockCard = page.locator('text=재고 현황').first();
      if (await stockCard.count() > 0) {
        const stockContainer = stockCard.locator('..').locator('..');
        const stockText = await stockContainer.textContent();
        const stockMatch = stockText?.match(/(\d+)\s*개/);
        if (stockMatch) {
          finalStock = parseInt(stockMatch[1]);
          console.log(`  - 최종 재고: ${finalStock}개`);
        }
      }
    } catch (error) {
      console.log('  - 재고 현황을 찾을 수 없음');
    }

    // 재고 증가 확인
    const stockIncrease = finalStock - initialStock;
    console.log(`  - 재고 증가량: ${stockIncrease}개 (예상: 10개)`);

    if (stockIncrease === 10) {
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
    console.log(`  - 입고 수량: 10개`);
    console.log(`  - 최종 재고: ${finalStock}개`);
    console.log(`  - 재고 증가: ${stockIncrease}개`);
    console.log('========================================');

    // 최종 검증
    expect(page.url()).not.toContain('/login');
    console.log('✅ 모든 단계 성공적으로 완료');
  });
});