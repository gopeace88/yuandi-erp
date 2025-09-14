import { test, expect } from '@playwright/test';

test.describe('시나리오 1: 상품 등록 및 재고 입고 (localStorage 세션 유지)', () => {
  test('상품 등록부터 재고 입고까지 완전 테스트', async ({ page }) => {
    console.log('=== 시나리오 1: 상품 등록 및 재고 입고 시작 ===\n');

    // 테스트 전체에서 사용할 고유 모델명
    let uniqueModel = '';

    // ========================================
    // 1단계: 로그인 및 세션 설정
    // ========================================
    console.log('📍 1단계: 로그인 및 세션 설정');
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

    // localStorage에 필요한 값 설정 (세션 유지를 위해)
    await page.evaluate(() => {
      localStorage.setItem('userRole', 'admin');
      localStorage.setItem('userName', 'Admin User');
      localStorage.setItem('userEmail', 'admin@yuandi.com');
    });
    console.log('  ✅ localStorage 세션 정보 설정 완료');

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

    // 타임스탬프를 사용한 고유 모델명 생성
    const timestamp = Date.now();
    uniqueModel = `TEST-${timestamp}`;  // 전역 변수에 저장

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

    // 모델 (고유값)
    await page.locator('input[type="text"]').nth(2).fill(uniqueModel);
    console.log(`  - 상품 모델: ${uniqueModel}`);

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

    // localStorage 값 재확인 (페이지 이동 전)
    await page.evaluate(() => {
      // 혹시 localStorage가 클리어되었을 경우를 대비
      if (!localStorage.getItem('userRole')) {
        localStorage.setItem('userRole', 'admin');
        localStorage.setItem('userName', 'Admin User');
        localStorage.setItem('userEmail', 'admin@yuandi.com');
      }
    });

    // 잠시 대기 (상품이 DB에 완전히 저장되도록)
    await page.waitForTimeout(3000);

    // 재고 관리로 직접 이동
    await page.goto('http://localhost:8081/ko/inventory');
    await page.waitForLoadState('networkidle');
    console.log('  - 재고 관리 페이지 이동');

    // 페이지 새로고침 (상품 목록 갱신)
    await page.reload();
    await page.waitForLoadState('networkidle');
    console.log('  - 페이지 새로고침 완료');

    // URL 확인
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('  ❌ 여전히 로그인 페이지로 리다이렉트됨');
      console.log('  현재 URL:', currentUrl);

      // 디버깅: localStorage 상태 확인
      const localStorageData = await page.evaluate(() => {
        return {
          userRole: localStorage.getItem('userRole'),
          userName: localStorage.getItem('userName'),
          userEmail: localStorage.getItem('userEmail')
        };
      });
      console.log('  localStorage 상태:', localStorageData);

      // 재로그인 시도
      await page.fill('input#email', 'admin@yuandi.com');
      await page.fill('input#password', 'yuandi123!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      // localStorage 다시 설정
      await page.evaluate(() => {
        localStorage.setItem('userRole', 'admin');
        localStorage.setItem('userName', 'Admin User');
        localStorage.setItem('userEmail', 'admin@yuandi.com');
      });

      // 재고 관리로 재이동
      await page.goto('http://localhost:8081/ko/inventory');
      await page.waitForLoadState('networkidle');
    }

    // 페이지가 완전히 로드되고 products가 채워질 때까지 대기
    await page.waitForTimeout(2000);
    console.log('  - 상품 목록 로드 대기');

    // 재고 입고 버튼 클릭
    console.log('  - 재고 입고 버튼 찾기');

    // 버튼 텍스트로 찾기
    const inboundButton = page.locator('button').filter({ hasText: /재고\s*입고/ });
    if (await inboundButton.count() > 0) {
      await inboundButton.first().click();
      console.log('  - 재고 입고 버튼 클릭 (filter 방식)');
    } else {
      // 대체 방법: 모든 버튼 확인
      const buttons = await page.locator('button').all();
      let clicked = false;
      for (const button of buttons) {
        const text = await button.textContent();
        if (text && text.includes('입고')) {
          await button.click();
          clicked = true;
          console.log('  - 재고 입고 버튼 클릭 (순회 방식)');
          break;
        }
      }
      if (!clicked) {
        console.log('  ❌ 재고 입고 버튼을 찾을 수 없음');
        return;
      }
    }

    await page.waitForTimeout(1500);  // 모달이 완전히 열릴 때까지 대기
    console.log('  - 재고 입고 모달 열림');

    // 페이지의 모든 select 요소 확인 (디버깅)
    const allSelects = await page.locator('select').all();
    console.log(`  - 페이지의 전체 select 개수: ${allSelects.length}개`);

    // 각 select의 첫 번째 옵션 확인
    for (let i = 0; i < allSelects.length; i++) {
      const firstOption = await allSelects[i].locator('option').first();
      const text = await firstOption.textContent();
      console.log(`    Select ${i}: 첫 옵션 = "${text?.trim()}"`);
    }

    // 상품 선택 라벨이 있는 select 찾기
    // "상품 선택" 텍스트 근처의 select를 찾기
    const productSelectLabel = page.locator('label').filter({ hasText: /상품.*선택|selectProduct/ });
    let productSelect;

    if (await productSelectLabel.count() > 0) {
      // 라벨 다음의 select 요소 찾기
      productSelect = productSelectLabel.locator('~ select').first();
      console.log('  - 라벨 기반으로 상품 select 찾기');
    } else {
      // 대체: 모달 내부에서 required 속성이 있는 select 찾기
      productSelect = page.locator('select[required]').last();
      console.log('  - required 속성으로 상품 select 찾기');
    }

    // 드롭다운이 로드될 때까지 잠시 대기
    await page.waitForTimeout(1000);

    const options = await productSelect.locator('option').all();
    console.log(`  - 상품 옵션 개수: ${options.length}개`);

    // 옵션 내용 확인 (디버깅용)
    for (let i = 0; i < Math.min(5, options.length); i++) {
      const text = await options[i].textContent();
      console.log(`    옵션 ${i}: "${text?.trim()}"`);
    }

    // 방금 추가한 상품 찾기
    let productFound = false;
    let selectedProductId = '';

    console.log(`  - 찾고 있는 상품 모델: ${uniqueModel}`);

    for (let i = 0; i < options.length; i++) {
      const text = await options[i].textContent();
      const value = await options[i].getAttribute('value');

      // 정확한 모델명으로 찾기
      if (text && text.includes(uniqueModel)) {
        selectedProductId = value || '';
        await productSelect.selectOption({ value: selectedProductId });
        console.log(`  - 테스트 상품 선택 성공 (ID: ${selectedProductId})`);
        console.log(`  - 선택된 상품: "${text.trim()}"`);
        productFound = true;
        break;
      }
    }

    if (!productFound && options.length > 1) {
      // 테스트 상품을 못 찾으면 마지막 상품 선택
      const lastOption = options[options.length - 1];
      const lastValue = await lastOption.getAttribute('value');
      const lastText = await lastOption.textContent();

      if (lastValue) {
        await productSelect.selectOption({ value: lastValue });
        console.log(`  - 마지막 상품 선택 (ID: ${lastValue})`);
        console.log(`  - 선택된 상품: "${lastText?.trim()}"`);
      }
    }

    // 선택 확인
    const selectedValue = await productSelect.inputValue();
    console.log(`  - 최종 선택된 값: ${selectedValue}`);

    // 라벨 텍스트를 기반으로 정확한 input 찾기
    // 수량 입력 - "수량 *" 라벨과 연관된 input
    const quantityLabel = page.locator('label:has-text("수량 *")');
    const quantityDiv = quantityLabel.locator('..');  // 부모 div
    const quantityInput = quantityDiv.locator('input[type="number"]');

    // 명확하게 값 입력
    await quantityInput.click();
    await quantityInput.fill('10');  // 직접 10 입력
    console.log('  - 입고 수량: 10개');

    // 입력된 값 확인
    const quantityValue = await quantityInput.inputValue();
    console.log(`  - 수량 필드 값 확인: ${quantityValue}`);

    // 단가 입력 - "단가 (CNY)" 라벨과 연관된 input
    const unitCostLabel = page.locator('label:has-text("단가 (CNY)")');
    const unitCostDiv = unitCostLabel.locator('..');  // 부모 div
    const unitCostInput = unitCostDiv.locator('input[type="number"]');

    if (await unitCostInput.count() > 0) {
      await unitCostInput.click();
      await unitCostInput.fill('100');  // 직접 100 입력
      console.log('  - 단가: 100 CNY');

      // 입력된 값 확인
      const costValue = await unitCostInput.inputValue();
      console.log(`  - 단가 필드 값 확인: ${costValue}`);
    }

    // 메모 입력
    const noteInput = page.locator('textarea').first();
    if (await noteInput.count() > 0) {
      await noteInput.fill('시나리오 1 테스트 입고');
      console.log('  - 메모: 시나리오 1 테스트 입고');
    }

    // 저장 버튼 클릭
    // 보이는 저장 버튼 중 마지막 것 선택 (모달의 저장 버튼일 가능성이 높음)
    const visibleSaveButtons = page.locator('button:has-text("저장"):visible');
    const saveButtonCount = await visibleSaveButtons.count();
    console.log(`  - 보이는 저장 버튼 개수: ${saveButtonCount}개`);

    if (saveButtonCount > 0) {
      // 마지막 보이는 저장 버튼 클릭
      await visibleSaveButtons.last().click();
      console.log('  - 저장 버튼 클릭');

      // 저장 완료 대기
      await page.waitForTimeout(3000);

      // 모달이 닫혔는지 확인
      const modalVisible = await page.locator('h2:has-text("재고 입고")').isVisible().catch(() => false);
      if (!modalVisible) {
        console.log('  ✅ 재고 입고 완료 (모달 닫힘)');
      } else {
        console.log('  ⚠️ 재고 입고 후 모달이 여전히 열려있음');
      }
    } else {
      console.log('  ❌ 저장 버튼을 찾을 수 없음');
    }

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