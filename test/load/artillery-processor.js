/**
 * Artillery.io 프로세서 - 커스텀 로직 및 데이터 처리
 * 로드 테스트 중 동적 데이터 생성 및 검증 로직
 */

const faker = require('faker');

// 한국어 로케일 설정
faker.locale = 'ko';

module.exports = {
  // 테스트 전 초기화
  setInitialContext,
  
  // 동적 테스트 데이터 생성
  generateTestData,
  generateCustomer,
  generateProduct,
  generateOrder,
  
  // 응답 검증
  validateDashboardData,
  validateOrderData,
  validateProductData,
  
  // 성능 메트릭 수집
  collectMetrics,
  
  // 에러 처리
  handleError,
  
  // 데이터 정리
  cleanup,
};

/**
 * 초기 컨텍스트 설정
 */
function setInitialContext(requestParams, context, ee, next) {
  // 세션별 고유 ID 생성
  context.vars.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // 테스트 시작 시간
  context.vars.testStartTime = Date.now();
  
  // 사용자 역할 랜덤 선택
  const roles = ['admin', 'order_manager', 'ship_manager'];
  context.vars.userRole = roles[Math.floor(Math.random() * roles.length)];
  
  // 테스트 카운터 초기화
  context.vars.requestCount = 0;
  context.vars.errorCount = 0;
  
  console.log(`세션 시작: ${context.vars.sessionId}, 역할: ${context.vars.userRole}`);
  
  return next();
}

/**
 * 동적 테스트 데이터 생성
 */
function generateTestData(requestParams, context, ee, next) {
  // 요청 카운터 증가
  context.vars.requestCount++;
  
  // 현재 시간 추가
  context.vars.currentTime = new Date().toISOString();
  
  // 랜덤 페이지 번호
  context.vars.randomPage = Math.floor(Math.random() * 10) + 1;
  
  // 랜덤 검색어
  const searchTerms = ['iPhone', 'MacBook', '가방', '화장품', '옷'];
  context.vars.searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
  
  return next();
}

/**
 * 고객 데이터 생성
 */
function generateCustomer(requestParams, context, ee, next) {
  context.vars.customer = {
    name: faker.name.findName(),
    phone: `010${faker.datatype.number({ min: 10000000, max: 99999999 })}`,
    email: faker.internet.email(),
    address: faker.address.streetAddress(),
    city: faker.address.city(),
    postalCode: faker.address.zipCode(),
  };
  
  // PCCC 코드 생성 (P + 11자리 숫자)
  context.vars.customer.pccc = `P${faker.datatype.number({ min: 10000000000, max: 99999999999 })}`;
  
  return next();
}

/**
 * 제품 데이터 생성
 */
function generateProduct(requestParams, context, ee, next) {
  const categories = ['전자제품', '패션', '뷰티', '생활용품', '식품'];
  const brands = ['Apple', 'Samsung', 'Nike', 'Adidas', '샤넬', 'LG'];
  const colors = ['블랙', '화이트', '실버', '골드', '로즈골드', '블루'];
  
  context.vars.product = {
    name: faker.commerce.productName(),
    category: categories[Math.floor(Math.random() * categories.length)],
    model: faker.commerce.productAdjective(),
    color: colors[Math.floor(Math.random() * colors.length)],
    brand: brands[Math.floor(Math.random() * brands.length)],
    costCny: faker.datatype.float({ min: 10, max: 1000, precision: 0.01 }),
    priceKrw: faker.datatype.number({ min: 10000, max: 2000000 }),
    weight: faker.datatype.number({ min: 50, max: 5000 }),
    description: faker.commerce.productDescription(),
  };
  
  return next();
}

/**
 * 주문 데이터 생성
 */
function generateOrder(requestParams, context, ee, next) {
  const statuses = ['paid', 'shipped', 'done', 'refunded'];
  const paymentMethods = ['카드', '계좌이체', '현금', '페이팔'];
  
  context.vars.order = {
    customerName: faker.name.findName(),
    customerPhone: `010${faker.datatype.number({ min: 10000000, max: 99999999 })}`,
    customerEmail: faker.internet.email(),
    status: statuses[Math.floor(Math.random() * statuses.length)],
    totalAmount: faker.datatype.number({ min: 10000, max: 500000 }),
    paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
    shippingAddress: faker.address.streetAddress(),
    notes: faker.lorem.sentence(),
  };
  
  return next();
}

/**
 * 대시보드 데이터 검증
 */
function validateDashboardData(requestParams, response, context, ee, next) {
  if (response.statusCode !== 200) {
    context.vars.errorCount++;
    ee.emit('customError', `Dashboard API failed with status ${response.statusCode}`);
    return next();
  }
  
  try {
    const data = JSON.parse(response.body);
    
    // 필수 필드 검증
    const requiredFields = ['totalOrders', 'totalRevenue', 'pendingOrders'];
    const missingFields = requiredFields.filter(field => !(field in data));
    
    if (missingFields.length > 0) {
      context.vars.errorCount++;
      ee.emit('customError', `대시보드 데이터 누락 필드: ${missingFields.join(', ')}`);
    }
    
    // 데이터 타입 검증
    if (typeof data.totalOrders !== 'number' || data.totalOrders < 0) {
      context.vars.errorCount++;
      ee.emit('customError', '총 주문 수가 유효하지 않음');
    }
    
    if (typeof data.totalRevenue !== 'number' || data.totalRevenue < 0) {
      context.vars.errorCount++;
      ee.emit('customError', '총 매출이 유효하지 않음');
    }
    
    // 성공 메트릭 수집
    ee.emit('customMetric', 'dashboard_validation_success', 1);
    
  } catch (error) {
    context.vars.errorCount++;
    ee.emit('customError', `대시보드 응답 파싱 실패: ${error.message}`);
  }
  
  return next();
}

/**
 * 주문 데이터 검증
 */
function validateOrderData(requestParams, response, context, ee, next) {
  if (response.statusCode !== 200) {
    context.vars.errorCount++;
    return next();
  }
  
  try {
    const data = JSON.parse(response.body);
    
    // 페이지네이션 검증
    if (data.pagination) {
      const { page, limit, total, totalPages } = data.pagination;
      
      if (typeof page !== 'number' || page < 1) {
        ee.emit('customError', '페이지 번호가 유효하지 않음');
      }
      
      if (typeof total !== 'number' || total < 0) {
        ee.emit('customError', '전체 개수가 유효하지 않음');
      }
    }
    
    // 주문 배열 검증
    if (Array.isArray(data.orders)) {
      data.orders.forEach((order, index) => {
        if (!order.id || !order.orderNumber) {
          ee.emit('customError', `주문 ${index}의 필수 필드 누락`);
        }
        
        if (!['paid', 'shipped', 'done', 'refunded', 'cancelled'].includes(order.status)) {
          ee.emit('customError', `주문 ${index}의 상태가 유효하지 않음: ${order.status}`);
        }
      });
    }
    
    ee.emit('customMetric', 'order_validation_success', 1);
    
  } catch (error) {
    context.vars.errorCount++;
    ee.emit('customError', `주문 응답 파싱 실패: ${error.message}`);
  }
  
  return next();
}

/**
 * 제품 데이터 검증
 */
function validateProductData(requestParams, response, context, ee, next) {
  if (response.statusCode !== 200) {
    context.vars.errorCount++;
    return next();
  }
  
  try {
    const data = JSON.parse(response.body);
    
    if (Array.isArray(data.products)) {
      data.products.forEach((product, index) => {
        // 필수 필드 검증
        const requiredFields = ['id', 'sku', 'name', 'costCny', 'priceKrw'];
        const missingFields = requiredFields.filter(field => !product[field]);
        
        if (missingFields.length > 0) {
          ee.emit('customError', `제품 ${index}의 필수 필드 누락: ${missingFields.join(', ')}`);
        }
        
        // 가격 검증
        if (product.costCny <= 0 || product.priceKrw <= 0) {
          ee.emit('customError', `제품 ${index}의 가격이 유효하지 않음`);
        }
        
        // SKU 형식 검증
        if (!/^[A-Z0-9\-]+$/.test(product.sku)) {
          ee.emit('customError', `제품 ${index}의 SKU 형식이 유효하지 않음: ${product.sku}`);
        }
      });
    }
    
    ee.emit('customMetric', 'product_validation_success', 1);
    
  } catch (error) {
    context.vars.errorCount++;
    ee.emit('customError', `제품 응답 파싱 실패: ${error.message}`);
  }
  
  return next();
}

/**
 * 성능 메트릭 수집
 */
function collectMetrics(requestParams, response, context, ee, next) {
  const responseTime = response.timings ? response.timings.response : 0;
  const requestSize = requestParams.body ? JSON.stringify(requestParams.body).length : 0;
  const responseSize = response.body ? response.body.length : 0;
  
  // 커스텀 메트릭 발송
  ee.emit('customMetric', 'response_time_ms', responseTime);
  ee.emit('customMetric', 'request_size_bytes', requestSize);
  ee.emit('customMetric', 'response_size_bytes', responseSize);
  
  // 성능 임계값 확인
  if (responseTime > 2000) {
    ee.emit('customError', `응답시간 임계값 초과: ${responseTime}ms`);
  }
  
  if (responseSize > 1024 * 1024) { // 1MB
    ee.emit('customError', `응답크기 임계값 초과: ${responseSize} bytes`);
  }
  
  // 세션별 통계 업데이트
  context.vars.totalResponseTime = (context.vars.totalResponseTime || 0) + responseTime;
  context.vars.avgResponseTime = context.vars.totalResponseTime / context.vars.requestCount;
  
  return next();
}

/**
 * 에러 처리
 */
function handleError(requestParams, response, context, ee, next) {
  if (response.statusCode >= 400) {
    context.vars.errorCount++;
    
    // 에러 분류
    let errorType = 'unknown_error';
    if (response.statusCode >= 400 && response.statusCode < 500) {
      errorType = 'client_error';
    } else if (response.statusCode >= 500) {
      errorType = 'server_error';
    }
    
    ee.emit('customMetric', errorType, 1);
    
    // 상세 에러 로깅
    const errorDetails = {
      statusCode: response.statusCode,
      url: requestParams.url,
      method: requestParams.method || 'GET',
      sessionId: context.vars.sessionId,
      timestamp: new Date().toISOString(),
    };
    
    console.error('로드 테스트 에러:', JSON.stringify(errorDetails));
  }
  
  return next();
}

/**
 * 데이터 정리
 */
function cleanup(requestParams, context, ee, next) {
  // 세션 종료 통계
  const sessionDuration = Date.now() - context.vars.testStartTime;
  const errorRate = context.vars.errorCount / context.vars.requestCount;
  
  ee.emit('customMetric', 'session_duration_ms', sessionDuration);
  ee.emit('customMetric', 'session_error_rate', errorRate);
  ee.emit('customMetric', 'session_request_count', context.vars.requestCount);
  
  console.log(`세션 종료: ${context.vars.sessionId}`);
  console.log(`- 지속시간: ${sessionDuration}ms`);
  console.log(`- 총 요청수: ${context.vars.requestCount}`);
  console.log(`- 에러율: ${(errorRate * 100).toFixed(2)}%`);
  console.log(`- 평균 응답시간: ${context.vars.avgResponseTime?.toFixed(2)}ms`);
  
  return next();
}

// 추가 유틸리티 함수들
module.exports.utils = {
  /**
   * 한국 전화번호 생성
   */
  generateKoreanPhone() {
    const prefixes = ['010', '011', '016', '017', '018', '019'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = faker.datatype.number({ min: 10000000, max: 99999999 });
    return `${prefix}${number}`;
  },

  /**
   * 한국 우편번호 생성
   */
  generateKoreanPostalCode() {
    return faker.datatype.number({ min: 10000, max: 99999 }).toString();
  },

  /**
   * 한국 주소 생성
   */
  generateKoreanAddress() {
    const cities = ['서울시', '부산시', '대구시', '인천시', '광주시', '대전시', '울산시'];
    const districts = ['강남구', '서초구', '중구', '종로구', '마포구', '영등포구'];
    const streets = ['테헤란로', '강남대로', '논현로', '선릉로', '역삼로', '삼성로'];
    
    const city = cities[Math.floor(Math.random() * cities.length)];
    const district = districts[Math.floor(Math.random() * districts.length)];
    const street = streets[Math.floor(Math.random() * streets.length)];
    const number = faker.datatype.number({ min: 1, max: 999 });
    
    return `${city} ${district} ${street} ${number}`;
  },

  /**
   * 주문번호 형식 검증
   */
  validateOrderNumber(orderNumber) {
    // ORD-YYMMDD-### 형식 검증
    const pattern = /^ORD-\d{6}-\d{3}$/;
    return pattern.test(orderNumber);
  },

  /**
   * SKU 형식 검증
   */
  validateSKU(sku) {
    // 카테고리-모델-색상-브랜드-해시 형식 검증
    const pattern = /^[A-Z0-9]+-[A-Z0-9]*-[A-Z0-9]*-[A-Z0-9]*-[A-Z0-9]{5}$/;
    return pattern.test(sku);
  },

  /**
   * 응답 시간 카테고리 분류
   */
  categorizeResponseTime(responseTime) {
    if (responseTime < 200) return 'excellent';
    if (responseTime < 500) return 'good';
    if (responseTime < 1000) return 'acceptable';
    if (responseTime < 2000) return 'poor';
    return 'unacceptable';
  },

  /**
   * 메모리 사용량 추적
   */
  trackMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
    };
  },
};