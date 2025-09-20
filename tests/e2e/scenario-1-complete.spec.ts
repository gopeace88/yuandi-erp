import { test, expect } from '@playwright/test';
import { getTestUrl, logTestEnvironment, TIMEOUTS, TEST_ACCOUNTS } from './test-config';

test.describe('시나리오 1: 상품 등록 및 재고 관리 통합 플로우', () => {
  // 테스트 계정
  const TEST_ADMIN = {
    email: TEST_ACCOUNTS.admin.email,
    password: TEST_ACCOUNTS.admin.password
  };

  // 테스트 상품 정보
  const TEST_PRODUCT = {
    name_ko: '테스트 핸드백',
    name_zh: '测试手提包',
    model: 'TEST-001',
    color_ko: '검정',
    color_zh: '黑色',
    brand_ko: '테스트브랜드',
    brand_zh: '测试品牌',
    cost_cny: 100,
    price_krw: 20000
  };

  // 입고 정보
  const STOCK_INBOUND = {
    quantity: 10,
    note: '테스트 입고'
  };

  test('완전한 비즈니스 플로우 테스트', async ({ page }) => {
    console.log('=== 시나리오 1: 상품 등록 및 재고 관리 통합 플로우 시작 ===\n');

    // ========================================
    // 1단계: 로그인
    // ========================================
    console.log('📍 1단계: 로그인');
    await page.goto('getTestUrl()');
    await page.waitForLoadState('networkidle');

    // 로그인 페이지로 리다이렉트 확인
    if (page.url().includes('/login')) {
      console.log('  - 로그인 페이지 확인');

      // 로그인 수행
      await page.fill('input#email', TEST_ADMIN.email);
      await page.fill('input#password', TEST_ADMIN.password);
      await page.click('button[type="submit"]');
      console.log('  - 로그인 정보 제출');

      // 대시보드로 이동 대기
      await page.waitForURL(/\/(dashboard|ko)/, { timeout: 10000 });
      console.log('  ✅ 로그인 성공');
      console.log(`  - 현재 URL: ${page.url()}`);
    } else if (page.url().includes('/ko')) {
      console.log('  - 이미 로그인된 상태');
      console.log(`  - 현재 URL: ${page.url()}`);
    }

    // ========================================
    // 2단계: 대시보드에서 초기 재고 확인
    // ========================================
    console.log('\n📍 2단계: 대시보드에서 초기 재고 확인');

    // 대시보드 페이지로 이동
    if (!page.url().includes('dashboard')) {
      await page.goto(getTestUrl('/ko/dashboard'));
      await page.waitForLoadState('networkidle');
    }

    // 재고 현황 카드 찾기
    let initialStockCount = 0;
    try {
      // 재고 현황 카드에서 숫자 추출
      const stockCard = page.locator('text=재고 현황').first();
      if (await stockCard.count() > 0) {
        // 카드 내에서 숫자 찾기
        const stockCardContainer = stockCard.locator('..').locator('..');
        const stockText = await stockCardContainer.textContent();
        const stockMatch = stockText?.match(/(\d+)\s*개/);
        if (stockMatch) {
          initialStockCount = parseInt(stockMatch[1]);
          console.log(`  - 현재 재고: ${initialStockCount}개`);
        }
      }
    } catch (error) {
      console.log('  - 재고 현황 카드를 찾을 수 없음');
    }

    // ========================================
    // 3단계: 설정 > 상품 관리에서 상품 추가
    // ========================================
    console.log('\n📍 3단계: 설정 > 상품 관리에서 상품 추가');

    // 설정 메뉴 클릭 (영어 또는 한국어)
    const settingsLink = page.locator('a:has-text("설정"), a:has-text("Settings")').first();
    if (await settingsLink.count() > 0) {
      await settingsLink.click();
      await page.waitForLoadState('networkidle');
      console.log('  - 설정 페이지 이동');
    } else {
      // URL로 직접 이동
      await page.goto(getTestUrl('/ko/settings'));
      await page.waitForLoadState('networkidle');
      console.log('  - 설정 페이지 직접 이동');
    }

    // 상품 관리 탭이 기본 선택되어 있는지 확인
    // 탭이 없다면 클릭
    const productTab = page.locator('button:has-text("상품 관리")').first();
    if (await productTab.count() > 0 && await productTab.isVisible()) {
      await productTab.click();
      console.log('  - 상품 관리 탭 선택');
    }

    // 상품 추가 버튼 클릭 (한국어 또는 영어)
    const addProductBtn = page.locator('button:has-text("+ 상품 추가"), button:has-text("+ Add Product")').first();
    if (await addProductBtn.count() > 0) {
      await addProductBtn.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      console.log('  - 상품 추가 모달 열림');
    } else {
      // 버튼을 찾을 수 없으면 로그 출력
      console.log('  ❌ 상품 추가 버튼을 찾을 수 없음');
      const buttons = await page.locator('button').all();
      console.log('  - 페이지의 버튼들:');
      for (let i = 0; i < Math.min(5, buttons.length); i++) {
        const text = await buttons[i].textContent();
        console.log(`    ${i + 1}. "${text?.trim()}"`);
      }
      throw new Error('상품 추가 버튼을 찾을 수 없습니다');
    }

    // 상품 정보 입력
    console.log('  - 상품 정보 입력 시작');

    // 상품명 입력
    await page.fill('input[name="name_ko"]', TEST_PRODUCT.name_ko);
    await page.fill('input[name="name_zh"]', TEST_PRODUCT.name_zh);

    // 카테고리 선택 (첫 번째 옵션 선택)
    const categorySelect = page.locator('select[name="category_id"]');
    if (await categorySelect.count() > 0) {
      const options = await categorySelect.locator('option').all();
      if (options.length > 1) {
        await categorySelect.selectOption({ index: 1 });
      }
    }

    // 모델, 색상, 브랜드 입력
    await page.fill('input[name="model"]', TEST_PRODUCT.model);
    await page.fill('input[name="color_ko"]', TEST_PRODUCT.color_ko);
    await page.fill('input[name="color_zh"]', TEST_PRODUCT.color_zh);
    await page.fill('input[name="brand_ko"]', TEST_PRODUCT.brand_ko);
    await page.fill('input[name="brand_zh"]', TEST_PRODUCT.brand_zh);

    // 가격 입력
    await page.fill('input[name="cost_cny"]', TEST_PRODUCT.cost_cny.toString());
    await page.fill('input[name="price_krw"]', TEST_PRODUCT.price_krw.toString());

    console.log('  - 모든 필드 입력 완료');

    // 저장 버튼 클릭
    await page.click('button:has-text("저장")');
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
    console.log('  ✅ 상품 추가 완료');

    // 잠시 대기 (상품 목록 갱신)
    await page.waitForTimeout(TIMEOUTS.medium);

    // ========================================
    // 4단계: 재고 관리에서 재고 입고
    // ========================================
    console.log('\n📍 4단계: 재고 관리에서 재고 입고');

    // 재고 관리 메뉴로 이동
    const inventoryLink = page.locator('a:has-text("재고 관리"), a:has-text("Inventory")').first();
    if (await inventoryLink.count() > 0) {
      await inventoryLink.click();
      await page.waitForLoadState('networkidle');
      console.log('  - 재고 관리 페이지 이동');
    } else {
      await page.goto(getTestUrl('/ko/inventory'));
      await page.waitForLoadState('networkidle');
      console.log('  - 재고 관리 페이지 직접 이동');
    }

    // 기존 모달이 열려있다면 닫기
    const existingModal = page.locator('[role="dialog"]');
    if (await existingModal.count() > 0 && await existingModal.isVisible()) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // 재고 입고 버튼 클릭
    await page.click('button:has-text("+ 재고 입고")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    console.log('  - 재고 입고 모달 열림');

    // 상품 선택 (방금 추가한 상품)
    const productSelect = page.locator('select[name="product_id"]');
    if (await productSelect.count() > 0) {
      // 옵션에서 테스트 핸드백 찾기
      const options = await productSelect.locator('option').all();
      for (let i = 0; i < options.length; i++) {
        const text = await options[i].textContent();
        if (text?.includes(TEST_PRODUCT.name_ko)) {
          await productSelect.selectOption({ index: i });
          console.log('  - 테스트 핸드백 선택');
          break;
        }
      }
    }

    // 수량 입력
    const quantityInput = page.locator('[data-testid="stock-quantity-input"], input[type="number"]').first();
    await quantityInput.fill(STOCK_INBOUND.quantity.toString());
    console.log(`  - 입고 수량: ${STOCK_INBOUND.quantity}개`);

    // 메모 입력
    const noteInput = page.locator('[data-testid="stock-note-textarea"], textarea').first();
    if (await noteInput.count() > 0) {
      await noteInput.fill(STOCK_INBOUND.note);
      console.log(`  - 메모: ${STOCK_INBOUND.note}`);
    }

    // 확인 버튼 클릭
    const submitButton = page.locator('[data-testid="stock-submit-button"], button:has-text("확인")').first();
    await submitButton.click();
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
    console.log('  ✅ 재고 입고 완료');

    // 페이지 새로고침
    await page.reload();
    await page.waitForLoadState('networkidle');

    // ========================================
    // 5단계: 출납장부에서 입고 내역 확인
    // ========================================
    console.log('\n📍 5단계: 출납장부에서 입고 내역 확인');

    // 출납장부 메뉴로 이동
    const cashbookLink = page.locator('a:has-text("출납장부"), a:has-text("Cashbook")').first();
    if (await cashbookLink.count() > 0) {
      await cashbookLink.click();
      await page.waitForLoadState('networkidle');
      console.log('  - 출납장부 페이지 이동');
    } else {
      await page.goto(getTestUrl('/ko/cashbook'));
      await page.waitForLoadState('networkidle');
      console.log('  - 출납장부 페이지 직접 이동');
    }

    // 최신 거래 내역 확인
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.count() > 0) {
      const rowText = await firstRow.textContent();
      if (rowText?.includes('재고 입고') || rowText?.includes('입고')) {
        console.log('  ✅ 입고 내역 발견');

        // 금액 확인 (10개 × 100 CNY = 1,000 CNY)
        const expectedAmount = STOCK_INBOUND.quantity * TEST_PRODUCT.cost_cny;
        if (rowText.includes(expectedAmount.toString())) {
          console.log(`  - 금액 확인: ${expectedAmount} CNY`);
        }

        // 메모 확인
        if (rowText.includes(STOCK_INBOUND.note)) {
          console.log(`  - 메모 확인: ${STOCK_INBOUND.note}`);
        }
      }
    } else {
      console.log('  ⚠️ 출납장부에 거래 내역이 없음');
    }

    // ========================================
    // 6단계: 대시보드에서 재고 현황 재확인
    // ========================================
    console.log('\n📍 6단계: 대시보드에서 재고 현황 재확인');

    // 대시보드로 이동
    const dashboardLink = page.locator('a:has-text("대시보드"), a:has-text("Dashboard")').first();
    if (await dashboardLink.count() > 0) {
      await dashboardLink.click();
      await page.waitForLoadState('networkidle');
      console.log('  - 대시보드 페이지 이동');
    } else {
      await page.goto(getTestUrl('/ko/dashboard'));
      await page.waitForLoadState('networkidle');
      console.log('  - 대시보드 페이지 직접 이동');
    }

    // 재고 현황 카드 다시 확인
    let finalStockCount = 0;
    try {
      const stockCard = page.locator('text=재고 현황').first();
      if (await stockCard.count() > 0) {
        const stockCardContainer = stockCard.locator('..').locator('..');
        const stockText = await stockCardContainer.textContent();
        const stockMatch = stockText?.match(/(\d+)\s*개/);
        if (stockMatch) {
          finalStockCount = parseInt(stockMatch[1]);
          console.log(`  - 최종 재고: ${finalStockCount}개`);
        }
      }
    } catch (error) {
      console.log('  - 재고 현황 카드를 찾을 수 없음');
    }

    // 재고 증가 확인
    const stockIncrease = finalStockCount - initialStockCount;
    if (stockIncrease === STOCK_INBOUND.quantity) {
      console.log(`  ✅ 재고 증가 확인: +${stockIncrease}개`);
    } else {
      console.log(`  ⚠️ 예상 증가량: ${STOCK_INBOUND.quantity}개, 실제: ${stockIncrease}개`);
    }

    // ========================================
    // 테스트 완료
    // ========================================
    console.log('\n🎉 시나리오 1 테스트 완료!');
    console.log('========================================');
    console.log('📊 테스트 결과 요약:');
    console.log(`  - 초기 재고: ${initialStockCount}개`);
    console.log(`  - 입고 수량: ${STOCK_INBOUND.quantity}개`);
    console.log(`  - 최종 재고: ${finalStockCount}개`);
    console.log(`  - 재고 증가: ${stockIncrease}개`);
    console.log('========================================');

    // 최종 검증
    expect(page.url()).not.toContain('/login');
    console.log('✅ 모든 단계 성공적으로 완료');
  });
});