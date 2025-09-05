import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// 커스텀 메트릭스
const orderCreationErrors = new Counter('order_creation_errors');
const orderCreationRate = new Rate('order_creation_rate');
const orderResponseTime = new Trend('order_response_time');
const inventoryUpdateErrors = new Counter('inventory_update_errors');
const dashboardLoadTime = new Trend('dashboard_load_time');

// 테스트 설정
export const options = {
  scenarios: {
    // 점진적 부하 테스트
    ramp_up_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },  // 2분간 10명까지 증가
        { duration: '5m', target: 10 },  // 5분간 10명 유지
        { duration: '2m', target: 20 },  // 2분간 20명까지 증가
        { duration: '5m', target: 20 },  // 5분간 20명 유지
        { duration: '2m', target: 0 },   // 2분간 0명으로 감소
      ],
      gracefulRampDown: '30s',
    },
    
    // 스트레스 테스트
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },
        { duration: '5m', target: 20 },
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
      startTime: '20m',  // ramp_up_test 후에 시작
    },
    
    // 스파이크 테스트
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 5 },
        { duration: '1m', target: 5 },
        { duration: '10s', target: 100 },  // 급격한 증가
        { duration: '3m', target: 100 },
        { duration: '10s', target: 5 },     // 급격한 감소
        { duration: '3m', target: 5 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '30s',
      startTime: '40m',  // stress_test 후에 시작
    }
  },
  
  thresholds: {
    http_req_duration: ['p(95)<3000', 'p(99)<5000'],  // 95%는 3초, 99%는 5초 이내
    http_req_failed: ['rate<0.01'],                   // 실패율 1% 미만
    order_creation_rate: ['rate>0.95'],               // 주문 생성 성공률 95% 이상
    order_response_time: ['p(95)<2000'],              // 주문 API 95%는 2초 이내
    dashboard_load_time: ['p(95)<1500'],              // 대시보드 95%는 1.5초 이내
  },
};

// 테스트 데이터 생성
function generateCustomerData() {
  const timestamp = Date.now();
  return {
    name: `고객_${timestamp}`,
    phone: `010${Math.floor(Math.random() * 90000000) + 10000000}`,
    email: `customer_${timestamp}@test.com`,
    pccc: `P${Math.floor(Math.random() * 900000000000) + 100000000000}`,
    address: '서울특별시 강남구 테헤란로 123',
    addressDetail: `${Math.floor(Math.random() * 20) + 1}층 ${Math.floor(Math.random() * 100) + 1}호`,
    zipCode: '06234'
  };
}

function generateOrderItems(products) {
  const numItems = Math.floor(Math.random() * 3) + 1;  // 1-3개 상품
  const items = [];
  
  for (let i = 0; i < numItems; i++) {
    const product = products[Math.floor(Math.random() * products.length)];
    items.push({
      productId: product.id,
      quantity: Math.floor(Math.random() * 3) + 1,  // 1-3개 수량
      unitPrice: product.price
    });
  }
  
  return items;
}

// 설정 초기화
export function setup() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  
  // 관리자 로그인
  const loginRes = http.post(`${baseUrl}/api/auth/login`, JSON.stringify({
    email: __ENV.ADMIN_EMAIL || 'admin@yuandi.com',
    password: __ENV.ADMIN_PASSWORD || 'admin123'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  const authToken = JSON.parse(loginRes.body).token;
  
  // 테스트용 상품 목록 조회
  const productsRes = http.get(`${baseUrl}/api/products`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  const products = JSON.parse(productsRes.body).data;
  
  return {
    baseUrl,
    authToken,
    products
  };
}

// 메인 테스트 시나리오
export default function(data) {
  const { baseUrl, authToken, products } = data;
  
  // 시나리오 1: 대시보드 조회 (30%)
  if (Math.random() < 0.3) {
    const startTime = Date.now();
    const dashboardRes = http.get(`${baseUrl}/api/dashboard/summary`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      tags: { name: 'Dashboard' }
    });
    
    dashboardLoadTime.add(Date.now() - startTime);
    
    check(dashboardRes, {
      'dashboard status is 200': (r) => r.status === 200,
      'dashboard has data': (r) => JSON.parse(r.body).success === true
    });
  }
  
  // 시나리오 2: 상품 목록 조회 (25%)
  else if (Math.random() < 0.55) {  // 0.3 + 0.25
    const productsRes = http.get(`${baseUrl}/api/products`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      tags: { name: 'ProductList' }
    });
    
    check(productsRes, {
      'products status is 200': (r) => r.status === 200,
      'products has items': (r) => JSON.parse(r.body).data.length > 0
    });
  }
  
  // 시나리오 3: 주문 생성 (25%)
  else if (Math.random() < 0.8) {  // 0.55 + 0.25
    const customer = generateCustomerData();
    const items = generateOrderItems(products);
    
    const orderPayload = {
      customer,
      items,
      paymentMethod: 'CARD',
      notes: `로드 테스트 주문 ${Date.now()}`
    };
    
    const startTime = Date.now();
    const orderRes = http.post(
      `${baseUrl}/api/orders`,
      JSON.stringify(orderPayload),
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        tags: { name: 'CreateOrder' }
      }
    );
    
    const responseTime = Date.now() - startTime;
    orderResponseTime.add(responseTime);
    
    const isSuccess = orderRes.status === 201;
    orderCreationRate.add(isSuccess);
    
    if (!isSuccess) {
      orderCreationErrors.add(1);
    }
    
    check(orderRes, {
      'order created': (r) => r.status === 201,
      'order has number': (r) => {
        const body = JSON.parse(r.body);
        return body.data && body.data.orderNumber;
      }
    });
  }
  
  // 시나리오 4: 주문 목록 조회 (15%)
  else if (Math.random() < 0.95) {  // 0.8 + 0.15
    const ordersRes = http.get(`${baseUrl}/api/orders?limit=20`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      tags: { name: 'OrderList' }
    });
    
    check(ordersRes, {
      'orders status is 200': (r) => r.status === 200,
      'orders has pagination': (r) => {
        const body = JSON.parse(r.body);
        return body.pagination && body.pagination.total >= 0;
      }
    });
  }
  
  // 시나리오 5: 재고 업데이트 (5%)
  else {
    if (products && products.length > 0) {
      const product = products[Math.floor(Math.random() * products.length)];
      const adjustmentPayload = {
        quantity: Math.floor(Math.random() * 10) + 1,
        type: 'inbound',
        reason: '로드 테스트 입고'
      };
      
      const inventoryRes = http.patch(
        `${baseUrl}/api/inventory/${product.id}/adjust`,
        JSON.stringify(adjustmentPayload),
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          tags: { name: 'InventoryUpdate' }
        }
      );
      
      const isSuccess = inventoryRes.status === 200;
      if (!isSuccess) {
        inventoryUpdateErrors.add(1);
      }
      
      check(inventoryRes, {
        'inventory updated': (r) => r.status === 200
      });
    }
  }
  
  // 사용자 행동 시뮬레이션을 위한 대기
  sleep(Math.random() * 3 + 1);  // 1-4초 대기
}

// 테스트 종료 후 리포트
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data),
    'load-test-results.html': htmlReport(data)
  };
}

// 텍스트 요약 생성
function textSummary(data, options) {
  const { indent = '', enableColors = false } = options;
  
  const color = enableColors ? {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m'
  } : {
    green: '',
    red: '',
    yellow: '',
    reset: ''
  };
  
  let summary = '\n=== YUANDI ERP 로드 테스트 결과 ===\n\n';
  
  // 요청 통계
  summary += '📊 요청 통계:\n';
  summary += `${indent}총 요청 수: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}실패율: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`;
  summary += `${indent}평균 응답시간: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}P95 응답시간: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}P99 응답시간: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;
  
  // 비즈니스 메트릭
  summary += '💼 비즈니스 메트릭:\n';
  summary += `${indent}주문 생성 성공률: ${(data.metrics.order_creation_rate.values.rate * 100).toFixed(2)}%\n`;
  summary += `${indent}주문 생성 에러: ${data.metrics.order_creation_errors.values.count}\n`;
  summary += `${indent}재고 업데이트 에러: ${data.metrics.inventory_update_errors.values.count}\n`;
  summary += `${indent}대시보드 P95 로드시간: ${data.metrics.dashboard_load_time.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}주문 API P95 응답시간: ${data.metrics.order_response_time.values['p(95)'].toFixed(2)}ms\n\n`;
  
  // 임계값 검증
  summary += '✅ 임계값 검증:\n';
  for (const [metric, result] of Object.entries(data.thresholds)) {
    const passed = result.ok;
    const statusIcon = passed ? '✓' : '✗';
    const statusColor = passed ? color.green : color.red;
    summary += `${indent}${statusColor}${statusIcon} ${metric}${color.reset}\n`;
  }
  
  return summary;
}

// HTML 리포트 생성
function htmlReport(data) {
  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>YUANDI ERP 로드 테스트 결과</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
        .metric-card { background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff; }
        .metric-value { font-size: 24px; font-weight: bold; color: #333; }
        .metric-label { color: #666; margin-top: 5px; }
        .status-pass { color: #28a745; }
        .status-fail { color: #dc3545; }
        .threshold-list { list-style: none; padding: 0; }
        .threshold-item { padding: 10px; margin: 5px 0; background: #f8f9fa; border-radius: 5px; }
        .chart-container { margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 YUANDI ERP 로드 테스트 결과</h1>
        <p>테스트 실행 시간: ${new Date().toLocaleString('ko-KR')}</p>
        
        <h2>📊 요청 통계</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-value">${data.metrics.http_reqs.values.count.toLocaleString()}</div>
                <div class="metric-label">총 요청 수</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%</div>
                <div class="metric-label">실패율</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.metrics.http_req_duration.values.avg.toFixed(0)}ms</div>
                <div class="metric-label">평균 응답시간</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.metrics.http_req_duration.values['p(95)'].toFixed(0)}ms</div>
                <div class="metric-label">P95 응답시간</div>
            </div>
        </div>
        
        <h2>💼 비즈니스 메트릭</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-value">${(data.metrics.order_creation_rate.values.rate * 100).toFixed(1)}%</div>
                <div class="metric-label">주문 생성 성공률</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.metrics.order_creation_errors.values.count}</div>
                <div class="metric-label">주문 생성 에러</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.metrics.dashboard_load_time.values['p(95)'].toFixed(0)}ms</div>
                <div class="metric-label">대시보드 P95 로드시간</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.metrics.order_response_time.values['p(95)'].toFixed(0)}ms</div>
                <div class="metric-label">주문 API P95 응답시간</div>
            </div>
        </div>
        
        <h2>✅ 임계값 검증</h2>
        <ul class="threshold-list">
            ${Object.entries(data.thresholds).map(([metric, result]) => `
                <li class="threshold-item">
                    <span class="${result.ok ? 'status-pass' : 'status-fail'}">
                        ${result.ok ? '✓' : '✗'} ${metric}
                    </span>
                </li>
            `).join('')}
        </ul>
        
        <h2>📈 시나리오별 실행 결과</h2>
        <div class="chart-container">
            <p>Ramp-up Test: 점진적으로 부하를 증가시켜 시스템의 안정성 확인</p>
            <p>Stress Test: 높은 부하에서 시스템의 한계점 확인</p>
            <p>Spike Test: 급격한 부하 변화에 대한 시스템의 대응력 확인</p>
        </div>
    </div>
</body>
</html>
  `;
  
  return html;
}