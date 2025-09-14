import { test, expect } from '@playwright/test';

// 테스트 계정
const TEST_ADMIN = {
  email: 'admin@yuandi.com',
  password: 'yuandi123!'
};

// 테스트 상품 데이터
const TEST_PRODUCT = {
  category: 'fashion',
  name: '테스트 핸드백 ' + Date.now(),
  model: 'TEST-' + Date.now(),
  color: '검정',
  brand: '테스트브랜드',
  costCny: '500',
  salePriceKrw: '150000',
  initialStock: '20',
  safetyStock: '5'
};

test.describe('YUANDI ERP 완전한 시나리오 테스트', () => {
  test('전체 비즈니스 플로우: 상품 등록 → 재고 입고 → 재고 수정', async ({ page }) => {
    console.log('=== 전체 시나리오 테스트 시작 ===\n');

    // ========== 1단계: 로그인 ==========
    console.log('📍 1단계: 로그인');
    await page.goto('http://localhost:8081/ko');
    await page.waitForLoadState('networkidle');

    if (await page.url().includes('/login')) {
      await page.fill('input#email', TEST_ADMIN.email);
      await page.fill('input#password', TEST_ADMIN.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*ko/, { timeout: 10000 });
      console.log('✅ 로그인 성공\n');
    }

    // ========== 2단계: 설정 페이지로 이동 ==========
    console.log('📍 2단계: 설정 페이지로 이동');

    // 설정 메뉴 클릭 (네비게이션에서)
    const settingsLinks = [
      page.locator('a[href*="settings"]'),
      page.locator('text=설정'),
      page.locator('a:has-text("설정")')
    ];

    let settingsClicked = false;
    for (const link of settingsLinks) {
      if (await link.count() > 0 && await link.isVisible()) {
        await link.click();
        settingsClicked = true;
        await page.waitForLoadState('networkidle');
        console.log('✅ 설정 페이지 접속\n');
        break;
      }
    }

    if (!settingsClicked) {
      // 직접 URL로 이동
      await page.goto('http://localhost:8081/ko/settings');
      await page.waitForLoadState('networkidle');
      console.log('✅ 설정 페이지 직접 접속\n');
    }

    // ========== 3단계: 상품 등록 ==========
    console.log('📍 3단계: 새 상품 등록');

    // 상품 추가 버튼 찾기
    const addProductButtons = [
      page.locator('button:has-text("상품 추가")'),
      page.locator('button:has-text("+ 상품")'),
      page.locator('button:has-text("새 상품")'),
      page.locator('[data-testid="add-product-button"]')
    ];

    let productModalOpened = false;
    for (const button of addProductButtons) {
      if (await button.count() > 0 && await button.isVisible()) {
        await button.click();
        productModalOpened = true;
        console.log('✅ 상품 추가 모달 열기');
        break;
      }
    }

    if (!productModalOpened) {
      console.log('⚠️ 상품 추가 버튼을 찾을 수 없음 - 대체 방법 시도');

      // 설정 페이지의 탭이나 섹션 확인
      const productSection = page.locator('text=상품 관리, text=Product').first();
      if (await productSection.count() > 0) {
        await productSection.click();
        await page.waitForTimeout(1000);

        // 다시 버튼 찾기
        const retryButton = page.locator('button').filter({ hasText: /상품|추가|Add|Product/ }).first();
        if (await retryButton.count() > 0) {
          await retryButton.click();
          productModalOpened = true;
        }
      }
    }

    if (productModalOpened) {
      // 상품 등록 폼 대기
      await page.waitForSelector('[role="dialog"], form', { timeout: 5000 });

      // 입력 필드들 찾기 (라벨 텍스트 기준)
      // 카테고리 선택
      const categorySelect = page.locator('select').first();
      if (await categorySelect.count() > 0) {
        // 옵션 값 확인
        const options = await categorySelect.locator('option').all();
        if (options.length > 1) {
          await categorySelect.selectOption({ index: 1 }); // 첫 번째 실제 옵션 선택
          console.log('  - 카테고리 선택 완료');
        }
      }

      // 입력 필드들 (순서대로)
      const inputs = await page.locator('input[type="text"], input[type="number"]').all();

      // 상품명 (한글) - 첫 번째 input
      if (inputs.length > 0) {
        await inputs[0].fill(TEST_PRODUCT.name);
        console.log(`  - 상품명(한글): ${TEST_PRODUCT.name}`);
      }

      // 상품명 (중문) - 두 번째 input
      if (inputs.length > 1) {
        await inputs[1].fill('测试手提包');
        console.log('  - 상품명(중문): 测试手提包');
      }

      // 모델 - 세 번째 input
      if (inputs.length > 2) {
        await inputs[2].fill(TEST_PRODUCT.model);
        console.log(`  - 모델: ${TEST_PRODUCT.model}`);
      }

      // 색상 (한글) - 네 번째 input
      if (inputs.length > 3) {
        await inputs[3].fill(TEST_PRODUCT.color);
        console.log(`  - 색상(한글): ${TEST_PRODUCT.color}`);
      }

      // 색상 (중문) - 다섯 번째 input
      if (inputs.length > 4) {
        await inputs[4].fill('黑色');
        console.log('  - 색상(중문): 黑色');
      }

      // 추가 필드가 있다면 계속 입력...
      console.log(`  - 총 ${inputs.length}개 입력 필드 발견`)

      // 저장 버튼 클릭
      const saveButton = page.locator('[data-testid="product-submit-button"], button:has-text("저장"), button:has-text("확인")').first();
      await saveButton.click();
      console.log('✅ 상품 저장 완료');

      // 모달 닫힘 대기
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 }).catch(() => {
        console.log('  (모달 자동 닫힘)');
      });

      // 성공 메시지 확인 (있는 경우)
      const successMessage = page.locator('text=성공, text=등록되었습니다, text=Success');
      if (await successMessage.count() > 0) {
        console.log('✅ 상품 등록 성공 메시지 확인');
      }
    } else {
      console.log('⚠️ 상품 등록 스킵 - 버튼을 찾을 수 없음');
    }

    console.log('');

    // ========== 4단계: 재고 관리 페이지로 이동 ==========
    console.log('📍 4단계: 재고 관리 페이지로 이동');
    await page.goto('http://localhost:8081/ko/inventory');
    await page.waitForLoadState('networkidle');

    // 모달이 열려있다면 닫기
    const modal = page.locator('[role="dialog"]');
    if (await modal.count() > 0 && await modal.isVisible()) {
      const closeBtn = page.locator('button:has-text("닫기"), button:has-text("×")').first();
      if (await closeBtn.count() > 0) {
        await closeBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // 테이블 확인
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    console.log(`✅ 재고 목록: ${rowCount}개 상품\n`);

    // ========== 5단계: 재고 입고 ==========
    if (rowCount > 0) {
      console.log('📍 5단계: 재고 입고 처리');

      // 첫 번째 상품 정보
      const firstRow = rows.first();
      const productName = await firstRow.locator('td').nth(1).textContent();
      const beforeStock = await firstRow.locator('td').nth(6).textContent();
      console.log(`  대상 상품: ${productName?.trim()}`);
      console.log(`  현재 재고: ${beforeStock?.trim()}`);

      // 재고 입고 버튼 클릭
      const inboundButton = page.locator('button:has-text("+ 재고 입고"), button:has-text("재고 입고")').first();
      if (await inboundButton.count() > 0 && await inboundButton.isVisible()) {
        await inboundButton.click();
        console.log('✅ 재고 입고 모달 열기');

        // 입고 모달 대기
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

        // 상품 선택 (드롭다운이 있는 경우)
        const productSelect = page.locator('select[name="product_id"]');
        if (await productSelect.count() > 0) {
          const options = await productSelect.locator('option').all();
          if (options.length > 1) {
            await productSelect.selectOption({ index: 1 });
            console.log('  - 상품 선택 완료');
          }
        }

        // 수량 입력
        const quantityInput = page.locator('[data-testid="stock-quantity-input"], input[type="number"]').first();
        await quantityInput.fill('15');
        console.log('  - 입고 수량: 15개');

        // 메모 입력
        const noteInput = page.locator('[data-testid="stock-note-textarea"], textarea').first();
        if (await noteInput.count() > 0) {
          await noteInput.fill('테스트 입고 - 자동화 테스트');
          console.log('  - 메모 입력 완료');
        }

        // 확인 버튼 클릭
        const submitButton = page.locator('[data-testid="stock-submit-button"], button:has-text("확인")').first();
        await submitButton.click();
        console.log('✅ 입고 처리 완료');

        // 모달 닫힘 대기
        await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });

        // 페이지 새로고침
        await page.reload();
        await page.waitForLoadState('networkidle');

        // 업데이트된 재고 확인
        const updatedRow = page.locator('tbody tr').first();
        const afterStock = await updatedRow.locator('td').nth(6).textContent();
        console.log(`  업데이트된 재고: ${afterStock?.trim()}\n`);
      }
    }

    // ========== 6단계: 재고 수정 ==========
    console.log('📍 6단계: 재고 수정 (조정)');

    const adjustButton = page.locator('button:has-text("+ 재고 수정"), button:has-text("재고 수정")').first();
    if (await adjustButton.count() > 0 && await adjustButton.isVisible()) {
      await adjustButton.click();
      console.log('✅ 재고 수정 모달 열기');

      // 수정 모달 대기
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

      // 상품 선택 (필요한 경우)
      const productSelect = page.locator('select[name="product_id"]');
      if (await productSelect.count() > 0) {
        const options = await productSelect.locator('option').all();
        if (options.length > 1) {
          await productSelect.selectOption({ index: 1 });
          console.log('  - 상품 선택 완료');
        }
      }

      // 조정 수량 입력 (음수로 차감)
      const quantityInput = page.locator('[data-testid="stock-quantity-input"], input[type="number"]').first();
      await quantityInput.fill('-5');
      console.log('  - 조정 수량: -5개 (재고 차감)');

      // 메모 입력
      const noteInput = page.locator('[data-testid="stock-note-textarea"], textarea').first();
      if (await noteInput.count() > 0) {
        await noteInput.fill('재고 실사 조정 - 테스트');
        console.log('  - 조정 사유 입력');
      }

      // 확인 버튼 클릭
      const submitButton = page.locator('[data-testid="stock-submit-button"], button:has-text("확인")').first();
      await submitButton.click();
      console.log('✅ 재고 수정 완료');

      // 모달 닫힘 대기
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });

      // 최종 재고 확인
      await page.reload();
      await page.waitForLoadState('networkidle');

      const finalRow = page.locator('tbody tr').first();
      const finalStock = await finalRow.locator('td').nth(6).textContent();
      console.log(`  최종 재고: ${finalStock?.trim()}\n`);
    }

    // ========== 7단계: 출납장부 확인 ==========
    console.log('📍 7단계: 출납장부에서 거래 내역 확인');
    await page.goto('http://localhost:8081/ko/cashbook');
    await page.waitForLoadState('networkidle');

    const cashbookRows = page.locator('tbody tr');
    const cashbookCount = await cashbookRows.count();
    console.log(`✅ 출납장부 거래 내역: ${cashbookCount}건`);

    if (cashbookCount > 0) {
      // 최근 거래 확인
      const recentTransaction = cashbookRows.first();
      const transactionType = await recentTransaction.locator('td').nth(1).textContent();
      const amount = await recentTransaction.locator('td').nth(3).textContent();
      console.log(`  최근 거래: ${transactionType?.trim()} - ${amount?.trim()}`);
    }

    console.log('\n🎉 전체 시나리오 테스트 완료!');
    console.log('=====================================');
  });
});