/**
 * 통합 테스트 - 실제 사용 시나리오 테스트
 */

const crypto = require('crypto');

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// 테스트 데이터
const testData = {
  products: [
    {
      id: 'prod-001',
      category: 'ELEC',
      name: 'iPhone 15 Pro',
      model: 'iPhone15Pro',
      color: 'Black',
      brand: 'Apple',
      onHand: 10,
      costCny: 5000,
      salePriceKrw: 1500000
    },
    {
      id: 'prod-002',
      category: 'CLOTH',
      name: '나이키 드라이핏 티셔츠',
      model: 'DRI-FIT-2024',
      color: 'White',
      brand: 'Nike',
      onHand: 3,
      costCny: 100,
      salePriceKrw: 45000
    },
    {
      id: 'prod-003',
      category: 'BAG',
      name: '루이비통 스피디',
      model: 'Speedy30',
      color: 'Brown',
      brand: 'LouisVuitton',
      onHand: 0,
      costCny: 8000,
      salePriceKrw: 2500000
    }
  ],
  customers: [
    {
      name: '홍길동',
      phone: '010-1234-5678',
      email: 'hong@example.com',
      pccc: 'P123456789012',
      address: '서울시 강남구 테헤란로 123',
      addressDetail: '아파트 101동 1501호',
      zipCode: '06234'
    },
    {
      name: '김철수',
      phone: '010-9876-5432',
      email: 'kim@example.com',
      pccc: 'P987654321098',
      address: '경기도 성남시 분당구 판교로',
      addressDetail: '판교타워 5층',
      zipCode: '13494'
    }
  ]
};

// 도메인 서비스 구현
class DomainServices {
  constructor() {
    this.orderSequences = new Map(); // 날짜별 시퀀스 저장
  }

  // SKU 생성
  generateSKU(product) {
    const sanitize = (text, maxLength = 20) => {
      if (!text) return '';
      return text.replace(/[^a-zA-Z0-9가-힣]/g, '').substring(0, maxLength);
    };

    const category = sanitize(product.category);
    const model = sanitize(product.model, 30);
    const color = sanitize(product.color || '');
    const brand = sanitize(product.brand || '');
    
    const uniqueString = `${category}${model}${color}${brand}-${Date.now()}-${Math.random()}`;
    const hash = crypto.createHash('sha256')
      .update(uniqueString)
      .digest('hex')
      .replace(/[^0-9A-Z]/gi, '')
      .toUpperCase()
      .substring(0, 5)
      .padEnd(5, '0');
    
    return `${category}-${model}-${color}-${brand}-${hash}`;
  }

  // 주문번호 생성
  generateOrderNumber(date = new Date()) {
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateString = `${year}${month}${day}`;
    
    // 시퀀스 관리 (실제로는 DB에서 관리)
    if (!this.orderSequences.has(dateString)) {
      this.orderSequences.set(dateString, 0);
    }
    
    const sequence = this.orderSequences.get(dateString) + 1;
    this.orderSequences.set(dateString, sequence);
    
    return `ORD-${dateString}-${sequence.toString().padStart(3, '0')}`;
  }

  // PCCC 검증
  validatePCCC(pccc) {
    if (!pccc || typeof pccc !== 'string') {
      return { isValid: false, error: 'PCCC is required' };
    }

    const cleaned = pccc.trim().toUpperCase();
    const pattern = /^P\d{12}$/;
    
    if (!pattern.test(cleaned)) {
      return { 
        isValid: false, 
        error: 'Invalid PCCC format. Must be P followed by 12 digits' 
      };
    }

    return { isValid: true, normalized: cleaned };
  }

  // 재고 확인
  checkStock(product, quantity) {
    if (!product) {
      throw new Error('Product not found');
    }

    if (quantity < 0) {
      throw new Error('Quantity must be non-negative');
    }

    return {
      hasStock: product.onHand >= quantity,
      available: product.onHand,
      requested: quantity,
      shortage: Math.max(0, quantity - product.onHand)
    };
  }

  // 재고 차감
  deductStock(product, quantity) {
    const stockCheck = this.checkStock(product, quantity);
    
    if (!stockCheck.hasStock) {
      throw new Error(
        `Insufficient stock: ${stockCheck.available} available, ${stockCheck.requested} requested`
      );
    }

    const previousStock = product.onHand;
    product.onHand -= quantity;
    
    return {
      productId: product.id,
      previousStock,
      newStock: product.onHand,
      deducted: quantity
    };
  }

  // 재고 복구
  restoreStock(product, quantity) {
    const previousStock = product.onHand;
    product.onHand += quantity;
    
    return {
      productId: product.id,
      previousStock,
      newStock: product.onHand,
      restored: quantity
    };
  }
}

// 시나리오 테스트
async function runScenarios() {
  console.log(`${colors.magenta}🎬 Integration Test Scenarios${colors.reset}`);
  console.log('══════════════════════════════════════════\n');

  const services = new DomainServices();
  const results = [];

  // Scenario 1: 정상 주문 생성
  console.log(`${colors.blue}Scenario 1: Normal Order Creation${colors.reset}`);
  try {
    const product = { ...testData.products[0] }; // iPhone
    const customer = testData.customers[0];
    const quantity = 2;

    // 1. SKU 생성
    const sku = services.generateSKU(product);
    console.log(`  📦 Generated SKU: ${colors.green}${sku}${colors.reset}`);

    // 2. PCCC 검증
    const pcccValidation = services.validatePCCC(customer.pccc);
    console.log(`  ✅ PCCC Validated: ${colors.green}${pcccValidation.normalized}${colors.reset}`);

    // 3. 재고 확인
    const stockCheck = services.checkStock(product, quantity);
    console.log(`  📊 Stock Check: ${colors.green}${stockCheck.available} available${colors.reset}`);

    // 4. 재고 차감
    const stockResult = services.deductStock(product, quantity);
    console.log(`  📉 Stock Deducted: ${stockResult.previousStock} → ${colors.yellow}${stockResult.newStock}${colors.reset}`);

    // 5. 주문번호 생성
    const orderNo = services.generateOrderNumber();
    console.log(`  📝 Order Created: ${colors.green}${orderNo}${colors.reset}`);

    results.push({ scenario: 1, status: 'PASSED', orderNo });
    console.log(`  ${colors.green}✓ Scenario 1 Passed${colors.reset}\n`);
  } catch (error) {
    console.log(`  ${colors.red}✗ Scenario 1 Failed: ${error.message}${colors.reset}\n`);
    results.push({ scenario: 1, status: 'FAILED', error: error.message });
  }

  // Scenario 2: 재고 부족 상황
  console.log(`${colors.blue}Scenario 2: Insufficient Stock${colors.reset}`);
  try {
    const product = { ...testData.products[1] }; // Nike T-shirt (재고 3개)
    const customer = testData.customers[1];
    const quantity = 5; // 재고보다 많이 주문

    // 1. PCCC 검증
    const pcccValidation = services.validatePCCC(customer.pccc);
    console.log(`  ✅ PCCC Validated: ${colors.green}${pcccValidation.normalized}${colors.reset}`);

    // 2. 재고 확인
    const stockCheck = services.checkStock(product, quantity);
    console.log(`  📊 Stock Check: ${colors.yellow}${stockCheck.available} available, ${quantity} requested${colors.reset}`);
    console.log(`  ⚠️  Shortage: ${colors.red}${stockCheck.shortage} units${colors.reset}`);

    // 3. 재고 차감 시도 (실패 예상)
    const stockResult = services.deductStock(product, quantity);
    
    // 여기까지 오면 안됨
    results.push({ scenario: 2, status: 'FAILED', error: 'Should have thrown error' });
    console.log(`  ${colors.red}✗ Scenario 2 Failed: Should have thrown insufficient stock error${colors.reset}\n`);
  } catch (error) {
    console.log(`  ${colors.green}✓ Expected Error: ${error.message}${colors.reset}`);
    results.push({ scenario: 2, status: 'PASSED', expectedError: true });
    console.log(`  ${colors.green}✓ Scenario 2 Passed (Error handled correctly)${colors.reset}\n`);
  }

  // Scenario 3: 재고 없는 상품 주문
  console.log(`${colors.blue}Scenario 3: Out of Stock Product${colors.reset}`);
  try {
    const product = { ...testData.products[2] }; // Louis Vuitton (재고 0)
    const quantity = 1;

    const stockCheck = services.checkStock(product, quantity);
    console.log(`  📊 Stock Check: ${colors.red}${stockCheck.available} available${colors.reset}`);

    if (!stockCheck.hasStock) {
      console.log(`  ${colors.yellow}⚠️  Order cannot be processed: Out of stock${colors.reset}`);
      results.push({ scenario: 3, status: 'PASSED', message: 'Out of stock handled' });
      console.log(`  ${colors.green}✓ Scenario 3 Passed${colors.reset}\n`);
    }
  } catch (error) {
    console.log(`  ${colors.red}✗ Scenario 3 Failed: ${error.message}${colors.reset}\n`);
    results.push({ scenario: 3, status: 'FAILED', error: error.message });
  }

  // Scenario 4: 환불 처리 (재고 복구)
  console.log(`${colors.blue}Scenario 4: Refund Processing${colors.reset}`);
  try {
    const product = { ...testData.products[0] }; // iPhone
    product.onHand = 8; // 이전 시나리오에서 2개 차감됨
    const refundQuantity = 2;

    console.log(`  📊 Current Stock: ${colors.yellow}${product.onHand}${colors.reset}`);

    // 재고 복구
    const restoreResult = services.restoreStock(product, refundQuantity);
    console.log(`  📈 Stock Restored: ${restoreResult.previousStock} → ${colors.green}${restoreResult.newStock}${colors.reset}`);

    results.push({ scenario: 4, status: 'PASSED', restored: refundQuantity });
    console.log(`  ${colors.green}✓ Scenario 4 Passed${colors.reset}\n`);
  } catch (error) {
    console.log(`  ${colors.red}✗ Scenario 4 Failed: ${error.message}${colors.reset}\n`);
    results.push({ scenario: 4, status: 'FAILED', error: error.message });
  }

  // Scenario 5: 잘못된 PCCC
  console.log(`${colors.blue}Scenario 5: Invalid PCCC${colors.reset}`);
  try {
    const invalidPCCCs = [
      '123456789012',    // Missing P
      'P12345678901',    // Too short
      'PABC456789012',   // Contains letters
      ''                 // Empty
    ];

    let allInvalid = true;
    for (const pccc of invalidPCCCs) {
      const validation = services.validatePCCC(pccc);
      if (validation.isValid) {
        allInvalid = false;
        console.log(`  ${colors.red}✗ Should reject: ${pccc}${colors.reset}`);
      } else {
        console.log(`  ${colors.green}✓ Correctly rejected: ${pccc}${colors.reset}`);
      }
    }

    if (allInvalid) {
      results.push({ scenario: 5, status: 'PASSED' });
      console.log(`  ${colors.green}✓ Scenario 5 Passed${colors.reset}\n`);
    } else {
      results.push({ scenario: 5, status: 'FAILED', error: 'Some invalid PCCCs were accepted' });
      console.log(`  ${colors.red}✗ Scenario 5 Failed${colors.reset}\n`);
    }
  } catch (error) {
    console.log(`  ${colors.red}✗ Scenario 5 Failed: ${error.message}${colors.reset}\n`);
    results.push({ scenario: 5, status: 'FAILED', error: error.message });
  }

  // Scenario 6: 대량 주문 처리 (연속 주문번호)
  console.log(`${colors.blue}Scenario 6: Bulk Order Processing${colors.reset}`);
  try {
    const orderNumbers = [];
    for (let i = 0; i < 5; i++) {
      const orderNo = services.generateOrderNumber();
      orderNumbers.push(orderNo);
    }

    console.log(`  Generated ${colors.cyan}${orderNumbers.length}${colors.reset} order numbers:`);
    orderNumbers.forEach(no => console.log(`    - ${colors.green}${no}${colors.reset}`));

    // 시퀀스 검증
    const sequences = orderNumbers.map(no => parseInt(no.split('-')[2]));
    const isSequential = sequences.every((seq, i) => i === 0 || seq === sequences[i-1] + 1);

    if (isSequential) {
      results.push({ scenario: 6, status: 'PASSED', orders: orderNumbers.length });
      console.log(`  ${colors.green}✓ Scenario 6 Passed (Sequential numbers)${colors.reset}\n`);
    } else {
      results.push({ scenario: 6, status: 'FAILED', error: 'Non-sequential order numbers' });
      console.log(`  ${colors.red}✗ Scenario 6 Failed${colors.reset}\n`);
    }
  } catch (error) {
    console.log(`  ${colors.red}✗ Scenario 6 Failed: ${error.message}${colors.reset}\n`);
    results.push({ scenario: 6, status: 'FAILED', error: error.message });
  }

  // 결과 요약
  console.log('══════════════════════════════════════════');
  console.log(`\n${colors.cyan}📊 Integration Test Summary${colors.reset}`);
  
  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  
  console.log(`  Total Scenarios: ${results.length}`);
  console.log(`  ${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${failed}${colors.reset}`);
  
  const passRate = ((passed / results.length) * 100).toFixed(1);
  
  if (failed === 0) {
    console.log(`\n${colors.green}🎉 All integration tests passed! (${passRate}%)${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠️  Some tests failed. Pass rate: ${passRate}%${colors.reset}`);
    console.log('\nFailed Scenarios:');
    results
      .filter(r => r.status === 'FAILED')
      .forEach(r => console.log(`  - Scenario ${r.scenario}: ${r.error}`));
  }
}

// 실행
console.log(`${colors.yellow}🚀 Starting Integration Tests${colors.reset}`);
console.log('══════════════════════════════════════════\n');

runScenarios().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});