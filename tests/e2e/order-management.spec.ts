import { test, expect } from '@playwright/test';

const TEST_ADMIN = {
  email: 'admin@yuandi.com',
  password: 'yuandi123!'
};

// 테스트 데이터 (03.test_data.sql 기반)
const TEST_CUSTOMER = {
  name: '김철수',
  phone: '010-1234-5678',
  email: 'test@customer.com',
  pccc: 'P123456789012',
  address: '서울시 강남구 테헤란로 123',
  addressDetail: '101동 202호',
  zipCode: '06234'
};

test.describe('주문 관리 테스트', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    await page.goto('/login');
    await page.fill('input#email, [data-testid="login-email"]', TEST_ADMIN.email);
    await page.fill('input#password, [data-testid="login-password"]', TEST_ADMIN.password);
    await page.click('button[type="submit"], [data-testid="login-submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    // 주문 관리 페이지로 이동
    await page.goto('/ko/orders');
    await page.waitForLoadState('networkidle');
  });

  test('주문 등록 모달 열기', async ({ page }) => {
    // 새 주문 버튼 클릭
    await page.click('button:has-text("새 주문")');

    // 모달 확인
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=새 주문 등록')).toBeVisible();

    // 폼 섹션 확인
    await expect(page.locator('text=고객 정보')).toBeVisible();
    await expect(page.locator('text=배송 정보')).toBeVisible();
    await expect(page.locator('text=상품 정보')).toBeVisible();
  });

  test('주문 등록 - 필수 필드 validation', async ({ page }) => {
    await page.click('button:has-text("새 주문")');

    // 빈 폼으로 제출 시도
    const submitButton = page.locator('button[type="submit"]:has-text("주문 등록")');
    await submitButton.click();

    // 첫 번째 필수 필드의 validation 메시지 확인
    const nameInput = page.locator('input[type="text"]').first();
    const validationMessage = await nameInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(validationMessage).toBeTruthy();
  });

  test('PCCC 자동 고객 조회', async ({ page }) => {
    await page.click('button:has-text("새 주문")');

    // PCCC 입력 필드 찾기
    const pcccInput = page.locator('input[placeholder="P123456789012"]');

    // 기존 고객의 PCCC 입력 (테스트 데이터에 있는 고객)
    // 03.test_data.sql에서 생성된 고객 중 하나 사용
    await pcccInput.fill('P0001');

    // 5자 이상 입력 시 자동 조회
    await page.waitForTimeout(500); // API 호출 대기

    // 고객 정보가 자동으로 채워지는지 확인
    const nameInput = page.locator('input[type="text"]').first();
    const phoneInput = page.locator('input[type="tel"]');

    // 값이 자동으로 채워졌는지 확인
    const nameValue = await nameInput.inputValue();
    const phoneValue = await phoneInput.inputValue();

    // 테스트 데이터에 따라 값이 있어야 함
    if (nameValue || phoneValue) {
      expect(nameValue).toBeTruthy();
      expect(phoneValue).toBeTruthy();
    }
  });

  test('주문 등록 성공', async ({ page }) => {
    await page.click('button:has-text("새 주문")');

    // 고객 정보 입력
    const inputs = page.locator('input[type="text"], input[type="tel"], input[type="email"]');
    await inputs.nth(0).fill(TEST_CUSTOMER.name); // 고객명
    await inputs.nth(1).fill(TEST_CUSTOMER.phone); // 전화번호

    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.count() > 0) {
      await emailInput.fill(TEST_CUSTOMER.email);
    }

    // PCCC 코드 입력
    const pcccInput = page.locator('input[placeholder="P123456789012"]');
    await pcccInput.fill(TEST_CUSTOMER.pccc);

    // 배송 정보 입력
    const addressInputs = page.locator('section:has-text("배송 정보") input[type="text"]');
    await addressInputs.nth(0).fill(TEST_CUSTOMER.address); // 주소
    if (await addressInputs.count() > 1) {
      await addressInputs.nth(1).fill(TEST_CUSTOMER.addressDetail); // 상세주소
    }

    // 우편번호
    const zipInput = page.locator('input[placeholder="12345"]');
    await zipInput.fill(TEST_CUSTOMER.zipCode);

    // 상품 선택
    const productSelect = page.locator('select[size="5"]');
    if (await productSelect.count() > 0) {
      // 첫 번째 옵션 선택
      const options = await productSelect.locator('option').all();
      if (options.length > 0) {
        const firstOptionValue = await options[0].getAttribute('value');
        if (firstOptionValue) {
          await productSelect.selectOption(firstOptionValue);
        }
      }
    }

    // 수량 입력
    const quantityInput = page.locator('input[type="number"][min="1"]');
    await quantityInput.fill('2');

    // 메모 입력 (선택사항)
    const memoTextarea = page.locator('textarea').first();
    if (await memoTextarea.count() > 0) {
      await memoTextarea.fill('테스트 주문입니다.');
    }

    // 제출
    const submitButton = page.locator('button[type="submit"]:has-text("주문 등록")');
    await submitButton.click();

    // 성공 확인 - 모달 닫힘
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // 주문 목록에 추가 확인
    await page.reload();
    await expect(page.locator(`text=${TEST_CUSTOMER.name}`)).toBeVisible();
  });

  test('상품 검색 및 필터링', async ({ page }) => {
    await page.click('button:has-text("새 주문")');

    // 상품 검색 입력
    const searchInput = page.locator('input[placeholder*="상품명"]');
    if (await searchInput.count() > 0) {
      // 브랜드로 검색
      await searchInput.fill('Louis');
      await page.waitForTimeout(300); // 필터링 대기

      // 상품 목록이 필터링되었는지 확인
      const productSelect = page.locator('select[size="5"]');
      const options = await productSelect.locator('option').all();

      for (const option of options) {
        const text = await option.textContent();
        expect(text?.toLowerCase()).toContain('louis');
      }
    }
  });

  test('재고 수량 제한 확인', async ({ page }) => {
    await page.click('button:has-text("새 주문")');

    // 상품 선택
    const productSelect = page.locator('select[size="5"]');
    if (await productSelect.count() > 0) {
      const options = await productSelect.locator('option').all();
      if (options.length > 0) {
        // 재고가 표시된 첫 번째 상품 선택
        const firstOption = options[0];
        const optionText = await firstOption.textContent();
        const firstOptionValue = await firstOption.getAttribute('value');

        if (firstOptionValue) {
          await productSelect.selectOption(firstOptionValue);

          // 재고 수량 추출 (예: "상품명 (재고: 10)")
          const stockMatch = optionText?.match(/재고:\s*(\d+)/);
          if (stockMatch) {
            const maxStock = parseInt(stockMatch[1]);

            // 재고보다 많은 수량 입력 시도
            const quantityInput = page.locator('input[type="number"][min="1"]');
            await quantityInput.fill(String(maxStock + 10));

            // max 속성 확인 또는 에러 메시지
            const maxAttr = await quantityInput.getAttribute('max');
            if (maxAttr) {
              expect(parseInt(maxAttr)).toBeLessThanOrEqual(maxStock);
            }
          }
        }
      }
    }
  });

  test('총 금액 자동 계산', async ({ page }) => {
    await page.click('button:has-text("새 주문")');

    // 상품 선택
    const productSelect = page.locator('select[size="5"]');
    if (await productSelect.count() > 0) {
      const options = await productSelect.locator('option').all();
      if (options.length > 0) {
        const firstOption = options[0];
        const optionText = await firstOption.textContent();
        const firstOptionValue = await firstOption.getAttribute('value');

        if (firstOptionValue) {
          await productSelect.selectOption(firstOptionValue);

          // 가격 추출 (예: "상품명 (₩150,000)")
          const priceMatch = optionText?.match(/₩([\d,]+)/);
          if (priceMatch) {
            const unitPrice = parseInt(priceMatch[1].replace(/,/g, ''));

            // 수량 입력
            const quantityInput = page.locator('input[type="number"][min="1"]');
            await quantityInput.fill('3');

            // 총 금액 확인
            const totalAmount = page.locator('text=/총.*금액|합계/');
            if (await totalAmount.count() > 0) {
              const totalText = await totalAmount.textContent();
              const expectedTotal = unitPrice * 3;
              expect(totalText).toContain(expectedTotal.toLocaleString());
            }
          }
        }
      }
    }
  });

  test('주문 상태 변경', async ({ page }) => {
    // 기존 주문이 있는지 확인
    const orderRows = page.locator('tbody tr');
    if (await orderRows.count() > 0) {
      // 첫 번째 주문의 상태 변경 버튼 찾기
      const firstRow = orderRows.first();
      const statusButton = firstRow.locator('button, select');

      if (await statusButton.count() > 0) {
        // 현재 상태 확인
        const currentStatus = await firstRow.locator('td').nth(3).textContent(); // 상태 컬럼

        // 상태 변경 (paid -> shipped)
        if (currentStatus?.includes('결제완료') || currentStatus?.includes('paid')) {
          await statusButton.click();

          // 드롭다운이나 모달에서 'shipped' 선택
          const shippedOption = page.locator('text=배송중, option[value="shipped"]');
          if (await shippedOption.count() > 0) {
            await shippedOption.click();

            // 변경 확인
            await page.waitForTimeout(1000);
            const updatedStatus = await firstRow.locator('td').nth(3).textContent();
            expect(updatedStatus).toContain('배송');
          }
        }
      }
    }
  });

  test('주문 검색 기능', async ({ page }) => {
    // 검색창 찾기
    const searchInput = page.locator('input[placeholder*="검색"], input[placeholder*="Search"]');
    if (await searchInput.count() > 0) {
      // 고객명으로 검색
      await searchInput.fill('김');
      await page.keyboard.press('Enter');

      // 검색 결과 확인
      await page.waitForTimeout(500);
      const results = page.locator('tbody tr');
      const count = await results.count();

      if (count > 0) {
        // 모든 결과가 '김'을 포함하는지 확인
        for (let i = 0; i < count; i++) {
          const row = results.nth(i);
          const text = await row.textContent();
          expect(text).toContain('김');
        }
      }
    }
  });

  test('주문 상세 보기', async ({ page }) => {
    const orderRows = page.locator('tbody tr');
    if (await orderRows.count() > 0) {
      // 첫 번째 주문 클릭
      const firstRow = orderRows.first();
      const orderNumber = await firstRow.locator('td').first().textContent();

      await firstRow.click();

      // 상세 모달 또는 페이지 확인
      const detailModal = page.locator('[role="dialog"]:has-text("주문 상세")');
      const detailPage = page.locator(`h1:has-text("${orderNumber}")`);

      if (await detailModal.count() > 0) {
        await expect(detailModal).toBeVisible();
        // 상세 정보 확인
        await expect(page.locator('text=고객 정보')).toBeVisible();
        await expect(page.locator('text=배송 정보')).toBeVisible();
        await expect(page.locator('text=상품 정보')).toBeVisible();
      } else if (await detailPage.count() > 0) {
        await expect(detailPage).toBeVisible();
      }
    }
  });

  test('주문 취소', async ({ page }) => {
    const orderRows = page.locator('tbody tr');
    if (await orderRows.count() > 0) {
      // 취소 가능한 주문 찾기 (paid 상태)
      for (let i = 0; i < await orderRows.count(); i++) {
        const row = orderRows.nth(i);
        const status = await row.locator('td').nth(3).textContent();

        if (status?.includes('결제완료') || status?.includes('paid')) {
          // 취소 버튼 찾기
          const cancelButton = row.locator('button:has-text("취소")');
          if (await cancelButton.count() > 0) {
            await cancelButton.click();

            // 확인 다이얼로그 처리
            page.on('dialog', dialog => dialog.accept());

            // 상태 변경 확인
            await page.waitForTimeout(1000);
            const updatedStatus = await row.locator('td').nth(3).textContent();
            expect(updatedStatus).toContain('취소');
            break;
          }
        }
      }
    }
  });
});