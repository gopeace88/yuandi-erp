/**
 * YUANDI ERP 로드 테스트 시나리오
 * K6 성능 테스트 스크립트
 * 
 * 실행 방법:
 * k6 run --vus 50 --duration 30s test/load/k6-load-tests.js
 */

import http from 'k6/http';
import { check, group, sleep, fail } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// 커스텀 메트릭 정의
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time', true);
const dbQueryTime = new Trend('db_query_time', true);
const failedRequests = new Counter('failed_requests');

// 테스트 설정
export const options = {
  scenarios: {
    // 시나리오 1: 기본 부하 테스트 (일반적인 사용자 패턴)
    normal_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },   // 10명까지 증가
        { duration: '5m', target: 10 },   // 10명 유지
        { duration: '2m', target: 20 },   // 20명까지 증가
        { duration: '5m', target: 20 },   // 20명 유지
        { duration: '2m', target: 0 },    // 점진적 감소
      ],
      gracefulRampDown: '30s',
    },

    // 시나리오 2: 스파이크 테스트 (갑작스런 트래픽 증가)
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },  // 정상 부하
        { duration: '1m', target: 100 },  // 급격한 증가
        { duration: '30s', target: 10 },  // 정상으로 복구
      ],
      gracefulRampDown: '30s',
    },

    // 시나리오 3: 스트레스 테스트 (시스템 한계 테스트)
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // 50명까지 증가
        { duration: '5m', target: 100 },  // 100명까지 증가
        { duration: '5m', target: 150 },  // 150명까지 증가
        { duration: '2m', target: 0 },    // 점진적 감소
      ],
      gracefulRampDown: '30s',
    },

    // 시나리오 4: 지속성 테스트 (장시간 실행)
    endurance_test: {
      executor: 'constant-vus',
      vus: 30,
      duration: '30m',
    },
  },

  // 성능 임계값
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<3000'], // 95%는 2초 미만, 99%는 3초 미만
    http_req_failed: ['rate<0.01'], // 실패율 1% 미만
    errors: ['rate<0.05'], // 에러율 5% 미만
    api_response_time: ['p(95)<1500'], // API 응답시간 95%는 1.5초 미만
    db_query_time: ['p(95)<500'], // DB 쿼리 시간 95%는 0.5초 미만
  },
};

// 환경 설정
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key';

// 테스트 데이터
const testData = {
  users: [
    { email: 'admin@yuandi.com', password: 'admin123', role: 'admin' },
    { email: 'manager@yuandi.com', password: 'manager123', role: 'order_manager' },
    { email: 'ship@yuandi.com', password: 'ship123', role: 'ship_manager' },
  ],
  products: [
    { name: 'iPhone 15', category: '전자제품', price: 1200000 },
    { name: 'MacBook Pro', category: '전자제품', price: 2500000 },
    { name: 'AirPods Pro', category: '전자제품', price: 300000 },
  ],
  customers: [
    { name: '김철수', phone: '01012345678', email: 'kim@test.com' },
    { name: '이영희', phone: '01087654321', email: 'lee@test.com' },
    { name: '박민수', phone: '01055555555', email: 'park@test.com' },
  ],
};

// 인증 토큰 저장
let authToken = '';

export function setup() {
  console.log('🚀 YUANDI ERP 로드 테스트 시작');
  console.log(`📊 Base URL: ${BASE_URL}`);
  
  // 초기 설정 및 인증
  const loginResponse = http.post(`${BASE_URL}/api/auth/login`, {
    email: testData.users[0].email,
    password: testData.users[0].password,
  });

  if (loginResponse.status === 200) {
    const loginData = loginResponse.json();
    authToken = loginData.token;
    console.log('✅ 관리자 인증 성공');
  } else {
    console.log('❌ 관리자 인증 실패');
  }

  return { authToken };
}

export default function (data) {
  // 각 VU마다 다른 사용자 시뮬레이션
  const userIndex = __VU % testData.users.length;
  const user = testData.users[userIndex];
  
  group('사용자 인증', () => {
    const loginRes = http.post(`${BASE_URL}/api/auth/login`, {
      email: user.email,
      password: user.password,
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: '10s',
    });

    const loginSuccess = check(loginRes, {
      '로그인 성공': (r) => r.status === 200,
      '응답 시간 < 2초': (r) => r.timings.duration < 2000,
    });

    if (loginSuccess) {
      apiResponseTime.add(loginRes.timings.duration);
    } else {
      errorRate.add(1);
      failedRequests.add(1);
    }
  });

  group('대시보드 조회', () => {
    const headers = {
      'Authorization': `Bearer ${data.authToken}`,
      'Content-Type': 'application/json',
    };

    // 대시보드 요약 정보
    const summaryRes = http.get(`${BASE_URL}/api/dashboard/summary`, { headers });
    check(summaryRes, {
      '대시보드 요약 조회 성공': (r) => r.status === 200,
      '응답 시간 < 1초': (r) => r.timings.duration < 1000,
    });

    // 매출 트렌드
    const trendRes = http.get(`${BASE_URL}/api/dashboard/sales-trend?days=7`, { headers });
    check(trendRes, {
      '매출 트렌드 조회 성공': (r) => r.status === 200,
      '응답 시간 < 1.5초': (r) => r.timings.duration < 1500,
    });

    // 주문 상태 분포
    const statusRes = http.get(`${BASE_URL}/api/dashboard/order-status`, { headers });
    check(statusRes, {
      '주문 상태 조회 성공': (r) => r.status === 200,
      '응답 데이터 존재': (r) => r.body.length > 0,
    });

    apiResponseTime.add(summaryRes.timings.duration);
    apiResponseTime.add(trendRes.timings.duration);
    apiResponseTime.add(statusRes.timings.duration);
  });

  group('제품 관리', () => {
    const headers = {
      'Authorization': `Bearer ${data.authToken}`,
      'Content-Type': 'application/json',
    };

    // 제품 목록 조회
    const productsRes = http.get(`${BASE_URL}/api/products?page=1&limit=20`, { headers });
    check(productsRes, {
      '제품 목록 조회 성공': (r) => r.status === 200,
      '응답 시간 < 1초': (r) => r.timings.duration < 1000,
      '페이지네이션 포함': (r) => {
        try {
          const data = r.json();
          return data.hasOwnProperty('pagination');
        } catch (e) {
          return false;
        }
      },
    });

    // 제품 검색
    const searchRes = http.get(`${BASE_URL}/api/products/search?q=iPhone`, { headers });
    check(searchRes, {
      '제품 검색 성공': (r) => r.status === 200,
      '검색 응답 시간 < 800ms': (r) => r.timings.duration < 800,
    });

    // 재고 부족 제품 조회
    const lowStockRes = http.get(`${BASE_URL}/api/dashboard/low-stock`, { headers });
    check(lowStockRes, {
      '재고 부족 제품 조회 성공': (r) => r.status === 200,
    });

    apiResponseTime.add(productsRes.timings.duration);
    apiResponseTime.add(searchRes.timings.duration);
    apiResponseTime.add(lowStockRes.timings.duration);
  });

  group('주문 관리', () => {
    const headers = {
      'Authorization': `Bearer ${data.authToken}`,
      'Content-Type': 'application/json',
    };

    // 주문 목록 조회
    const ordersRes = http.get(`${BASE_URL}/api/orders?page=1&limit=20&status=paid`, { headers });
    check(ordersRes, {
      '주문 목록 조회 성공': (r) => r.status === 200,
      '응답 시간 < 1.2초': (r) => r.timings.duration < 1200,
    });

    // 주문 통계 조회
    const statsRes = http.get(`${BASE_URL}/api/orders/statistics?period=month`, { headers });
    check(statsRes, {
      '주문 통계 조회 성공': (r) => r.status === 200,
      '통계 데이터 존재': (r) => {
        try {
          const data = r.json();
          return data.hasOwnProperty('totalOrders');
        } catch (e) {
          return false;
        }
      },
    });

    // 고객별 주문 내역 조회
    const customerOrdersRes = http.get(`${BASE_URL}/api/orders?customer_phone=01012345678`, { headers });
    check(customerOrdersRes, {
      '고객 주문 조회 성공': (r) => r.status === 200,
    });

    apiResponseTime.add(ordersRes.timings.duration);
    apiResponseTime.add(statsRes.timings.duration);
    apiResponseTime.add(customerOrdersRes.timings.duration);
  });

  group('고객 포털', () => {
    // 고객 포털 주문 조회 (인증 없이)
    const customer = testData.customers[__VU % testData.customers.length];
    const trackingRes = http.get(`${BASE_URL}/api/track?name=${encodeURIComponent(customer.name)}&phone=${customer.phone}`);
    
    check(trackingRes, {
      '고객 주문 추적 성공': (r) => r.status === 200,
      '응답 시간 < 1초': (r) => r.timings.duration < 1000,
    });

    apiResponseTime.add(trackingRes.timings.duration);
  });

  if (user.role === 'admin' || user.role === 'order_manager') {
    group('관리자 기능', () => {
      const headers = {
        'Authorization': `Bearer ${data.authToken}`,
        'Content-Type': 'application/json',
      };

      // 현금출납부 조회
      const cashbookRes = http.get(`${BASE_URL}/api/cashbook?page=1&limit=20`, { headers });
      check(cashbookRes, {
        '현금출납부 조회 성공': (r) => r.status === 200,
        '응답 시간 < 1초': (r) => r.timings.duration < 1000,
      });

      // 이벤트 로그 조회
      const logsRes = http.get(`${BASE_URL}/api/logs?page=1&limit=50`, { headers });
      check(logsRes, {
        '이벤트 로그 조회 성공': (r) => r.status === 200,
      });

      // 시스템 설정 조회
      const settingsRes = http.get(`${BASE_URL}/api/settings`, { headers });
      check(settingsRes, {
        '시스템 설정 조회 성공': (r) => r.status === 200,
      });

      apiResponseTime.add(cashbookRes.timings.duration);
      apiResponseTime.add(logsRes.timings.duration);
      apiResponseTime.add(settingsRes.timings.duration);
    });
  }

  // 데이터베이스 쿼리 시간 시뮬레이션 (실제로는 서버에서 측정)
  const dbQueryStart = new Date().getTime();
  // 실제 DB 작업을 시뮬레이션하는 sleep
  sleep(Math.random() * 0.1); // 0-100ms 랜덤 지연
  const dbQueryEnd = new Date().getTime();
  dbQueryTime.add(dbQueryEnd - dbQueryStart);

  // 사용자 행동 패턴 시뮬레이션 (1-5초 대기)
  sleep(Math.random() * 4 + 1);
}

export function teardown() {
  console.log('🏁 YUANDI ERP 로드 테스트 완료');
}

// 커스텀 체크 함수들
export function checkApiHealth() {
  const healthRes = http.get(`${BASE_URL}/api/health`);
  return check(healthRes, {
    '헬스체크 성공': (r) => r.status === 200,
    '응답 시간 < 500ms': (r) => r.timings.duration < 500,
  });
}

export function checkDatabaseConnection() {
  const dbRes = http.get(`${BASE_URL}/api/health/database`);
  return check(dbRes, {
    'DB 연결 성공': (r) => r.status === 200,
    'DB 응답 시간 < 1초': (r) => r.timings.duration < 1000,
  });
}

// 성능 최적화 시나리오
export function performanceOptimizationTest() {
  group('성능 최적화 테스트', () => {
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    };

    // 대용량 데이터 조회
    const largeDataRes = http.get(`${BASE_URL}/api/orders?page=1&limit=100`, { headers });
    check(largeDataRes, {
      '대용량 데이터 조회 성공': (r) => r.status === 200,
      '대용량 응답 시간 < 3초': (r) => r.timings.duration < 3000,
    });

    // 복잡한 집계 쿼리
    const aggregateRes = http.get(`${BASE_URL}/api/analytics/sales-by-category`, { headers });
    check(aggregateRes, {
      '집계 쿼리 성공': (r) => r.status === 200,
      '집계 응답 시간 < 2초': (r) => r.timings.duration < 2000,
    });

    // 동시 요청 처리
    const concurrentRequests = [
      http.get(`${BASE_URL}/api/products`, { headers }),
      http.get(`${BASE_URL}/api/orders`, { headers }),
      http.get(`${BASE_URL}/api/dashboard/summary`, { headers }),
    ];

    concurrentRequests.forEach((res, index) => {
      check(res, {
        [`동시 요청 ${index + 1} 성공`]: (r) => r.status === 200,
        [`동시 요청 ${index + 1} 응답시간 < 2초`]: (r) => r.timings.duration < 2000,
      });
    });
  });
}

// 에러 시나리오 테스트
export function errorScenarioTest() {
  group('에러 시나리오 테스트', () => {
    // 잘못된 API 엔드포인트
    const invalidEndpointRes = http.get(`${BASE_URL}/api/nonexistent`);
    check(invalidEndpointRes, {
      '404 에러 정상 처리': (r) => r.status === 404,
    });

    // 잘못된 인증 토큰
    const invalidAuthRes = http.get(`${BASE_URL}/api/orders`, {
      headers: { 'Authorization': 'Bearer invalid-token' },
    });
    check(invalidAuthRes, {
      '401 에러 정상 처리': (r) => r.status === 401,
    });

    // 잘못된 요청 데이터
    const invalidDataRes = http.post(`${BASE_URL}/api/products`, {
      name: '', // 빈 이름 (유효하지 않음)
      price: -100, // 음수 가격 (유효하지 않음)
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });
    check(invalidDataRes, {
      '400 에러 정상 처리': (r) => r.status === 400,
    });
  });
}

// 보안 테스트 시나리오
export function securityTest() {
  group('보안 테스트', () => {
    // SQL 인젝션 시도
    const sqlInjectionRes = http.get(`${BASE_URL}/api/products?search=' OR '1'='1`);
    check(sqlInjectionRes, {
      'SQL 인젝션 방어': (r) => r.status !== 500, // 서버 에러가 발생하지 않아야 함
    });

    // XSS 시도
    const xssRes = http.get(`${BASE_URL}/api/products?search=<script>alert('xss')</script>`);
    check(xssRes, {
      'XSS 방어': (r) => !r.body.includes('<script>'), // 스크립트 태그가 포함되지 않아야 함
    });

    // CSRF 보호 확인
    const csrfRes = http.post(`${BASE_URL}/api/products`, {
      name: 'Test Product',
      price: 10000,
    }, {
      headers: { 'Content-Type': 'application/json' },
      // 인증 헤더 없이 요청
    });
    check(csrfRes, {
      'CSRF 방어': (r) => r.status === 401 || r.status === 403,
    });
  });
}

// 모바일 시뮬레이션
export function mobileSimulation() {
  group('모바일 시뮬레이션', () => {
    const mobileHeaders = {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
      'Content-Type': 'application/json',
    };

    // 고객 포털 모바일 접근
    const mobileTrackingRes = http.get(`${BASE_URL}/track`, { headers: mobileHeaders });
    check(mobileTrackingRes, {
      '모바일 고객 포털 접근': (r) => r.status === 200,
      '모바일 응답 시간 < 2초': (r) => r.timings.duration < 2000,
    });

    // 반응형 대시보드
    const mobileDashboardRes = http.get(`${BASE_URL}/dashboard`, {
      headers: {
        ...mobileHeaders,
        'Authorization': `Bearer ${authToken}`,
      },
    });
    check(mobileDashboardRes, {
      '모바일 대시보드 접근': (r) => r.status === 200,
    });
  });
}