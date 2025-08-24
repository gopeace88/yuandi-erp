# API 엔드포인트 설계서 - YUANDI 초미니 ERP

## 1. API 설계 원칙

### 1.1 RESTful Design Principles
- **Resource-Oriented**: 리소스 중심 URL 설계
- **HTTP Methods**: GET, POST, PATCH, DELETE 적절히 사용
- **Status Codes**: 표준 HTTP 상태 코드 준수
- **Versioning**: URL 경로 기반 버전 관리 (/api/v1/)
- **Pagination**: Cursor-based pagination 지원

### 1.2 Response Format
```typescript
// Success Response
{
  success: true,
  data: T,
  meta?: {
    page?: number,
    limit?: number,
    total?: number,
    cursor?: string
  }
}

// Error Response
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: any
  }
}
```

### 1.3 Authentication
- **Method**: JWT Bearer Token
- **Header**: `Authorization: Bearer <token>`
- **Token Expiry**: 24 hours
- **Refresh Token**: 7 days

## 2. API Endpoints Overview

### 2.1 Endpoint Categories
| Category | Base Path | Description | Auth Required |
|----------|-----------|-------------|---------------|
| Auth | `/api/auth` | 인증 관련 | Partial |
| Dashboard | `/api/dashboard` | 대시보드 데이터 | Yes |
| Orders | `/api/orders` | 주문 관리 | Yes |
| Products | `/api/products` | 상품 관리 | Yes |
| Inventory | `/api/inventory` | 재고 관리 | Yes |
| Shipping | `/api/shipping` | 배송 관리 | Yes |
| Cashbook | `/api/cashbook` | 출납장부 | Yes |
| Activity | `/api/activity-logs` | 작업 로그 | Yes |
| Users | `/api/users` | 사용자 관리 | Admin |
| Track | `/api/track` | 고객 조회 | No |
| Export | `/api/export` | 데이터 내보내기 | Admin |

## 3. Authentication Endpoints

### 3.1 POST /api/auth/login
**Description**: 사용자 로그인

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "홍길동",
      "role": "Admin",
      "locale": "ko"
    },
    "token": "jwt-token",
    "refreshToken": "refresh-token",
    "expiresAt": "2024-12-29T00:00:00Z"
  }
}
```

### 3.2 POST /api/auth/refresh
**Description**: 토큰 갱신

**Request Body**:
```json
{
  "refreshToken": "refresh-token"
}
```

### 3.3 POST /api/auth/logout
**Description**: 로그아웃

### 3.4 GET /api/auth/me
**Description**: 현재 사용자 정보

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "홍길동",
    "role": "Admin",
    "locale": "ko",
    "permissions": ["orders.create", "orders.update", "products.manage"]
  }
}
```

## 4. Dashboard Endpoints

### 4.1 GET /api/dashboard/summary
**Description**: 대시보드 요약 정보

**Query Parameters**:
- `period`: today | week | month | year
- `timezone`: Asia/Seoul (default)

**Response**:
```json
{
  "success": true,
  "data": {
    "sales": {
      "total": 5000000,
      "count": 45,
      "average": 111111,
      "growth": 15.5,
      "currency": "KRW"
    },
    "orders": {
      "pending": 5,
      "processing": 10,
      "completed": 30,
      "refunded": 0
    },
    "inventory": {
      "totalProducts": 150,
      "totalValue": 3000000,
      "lowStock": 8,
      "outOfStock": 2
    }
  }
}
```

### 4.2 GET /api/dashboard/sales-trend
**Description**: 매출 트렌드 (최근 7일)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-12-22",
      "sales": 500000,
      "orders": 5
    },
    {
      "date": "2024-12-23",
      "sales": 750000,
      "orders": 8
    }
  ]
}
```

### 4.3 GET /api/dashboard/order-status
**Description**: 상태별 주문 분포

### 4.4 GET /api/dashboard/low-stock
**Description**: 재고 부족 상품 (Admin, OrderManager only)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sku": "ELEC-iPhone15-Black-Apple-A1B2C",
      "name": "iPhone 15",
      "onHand": 2,
      "threshold": 5,
      "status": "critical"
    }
  ]
}
```

### 4.5 GET /api/dashboard/popular-products
**Description**: 인기 상품 TOP 5

## 5. Order Management Endpoints

### 5.1 GET /api/orders
**Description**: 주문 목록 조회

**Query Parameters**:
- `status`: PAID | SHIPPED | DONE | REFUNDED
- `search`: 검색어 (고객명, 전화번호, 주문번호)
- `startDate`: YYYY-MM-DD
- `endDate`: YYYY-MM-DD
- `page`: 페이지 번호 (default: 1)
- `limit`: 페이지당 항목 수 (default: 20, max: 100)
- `sort`: createdAt | totalAmount | status (default: -createdAt)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "orderNo": "ORD-241228-001",
      "customerName": "김철수",
      "customerPhone": "01012345678",
      "status": "PAID",
      "totalAmount": 150000,
      "itemCount": 3,
      "createdAt": "2024-12-28T10:00:00Z",
      "updatedAt": "2024-12-28T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### 5.2 GET /api/orders/:id
**Description**: 주문 상세 조회

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "orderNo": "ORD-241228-001",
    "customerName": "김철수",
    "customerPhone": "01012345678",
    "customerEmail": "kim@example.com",
    "pcccCode": "P123456789012",
    "shippingAddress": "서울시 강남구 테헤란로 123",
    "zipCode": "06234",
    "status": "PAID",
    "totalAmount": 150000,
    "customerMemo": "빠른 배송 부탁드립니다",
    "internalMemo": "VIP 고객",
    "items": [
      {
        "id": "uuid",
        "productId": "uuid",
        "sku": "ELEC-iPhone15-Black-Apple-A1B2C",
        "productName": "iPhone 15 Black",
        "quantity": 1,
        "unitPrice": 150000,
        "subtotal": 150000
      }
    ],
    "shipment": null,
    "createdAt": "2024-12-28T10:00:00Z",
    "updatedAt": "2024-12-28T10:00:00Z",
    "createdBy": {
      "id": "uuid",
      "name": "관리자"
    }
  }
}
```

### 5.3 POST /api/orders
**Description**: 주문 생성 (Admin, OrderManager)

**Request Body**:
```json
{
  "customerName": "김철수",
  "customerPhone": "01012345678",
  "customerEmail": "kim@example.com",
  "pcccCode": "P123456789012",
  "shippingAddress": "서울시 강남구 테헤란로 123",
  "shippingAddressDetail": "A동 1234호",
  "zipCode": "06234",
  "customerMemo": "빠른 배송 부탁드립니다",
  "internalMemo": "VIP 고객",
  "items": [
    {
      "productId": "uuid",
      "quantity": 2
    }
  ]
}
```

**Validation Rules**:
- `customerName`: Required, 2-50 characters
- `customerPhone`: Required, Korean phone format (01[0-9]{8,9})
- `pcccCode`: Required, Format: P + 12 digits
- `items`: Required, Min 1 item
- Stock validation for each item

### 5.4 PATCH /api/orders/:id
**Description**: 주문 수정

**Authorization**:
- Admin: All orders
- OrderManager: PAID status only

**Request Body**:
```json
{
  "customerMemo": "Updated memo",
  "internalMemo": "Priority order"
}
```

### 5.5 DELETE /api/orders/:id
**Description**: 주문 삭제 (Admin only, PAID status only)

### 5.6 POST /api/orders/validate-stock
**Description**: 주문 전 재고 검증

**Request Body**:
```json
{
  "items": [
    {
      "productId": "uuid",
      "quantity": 2
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "items": [
      {
        "productId": "uuid",
        "requested": 2,
        "available": 10,
        "sufficient": true
      }
    ]
  }
}
```

## 6. Shipping Management Endpoints

### 6.1 GET /api/shipping/pending
**Description**: 배송 대기 주문 (PAID status)

### 6.2 POST /api/shipping/:orderId/register
**Description**: 송장 등록 (Admin, ShipManager)

**Request Body**:
```json
{
  "courier": "CJ대한통운",
  "courierCode": "cj",
  "trackingNo": "1234567890",
  "shippingFee": 3000,
  "shipmentPhoto": "base64-encoded-image"
}
```

### 6.3 PATCH /api/shipping/:orderId/complete
**Description**: 배송 완료 처리 (SHIPPED → DONE)

### 6.4 POST /api/shipping/:orderId/refund
**Description**: 환불 처리 (Admin only)

**Request Body**:
```json
{
  "reason": "고객 요청",
  "amount": 150000,
  "refundMethod": "계좌이체"
}
```

## 7. Product & Inventory Endpoints

### 7.1 GET /api/products
**Description**: 상품 목록

**Query Parameters**:
- `search`: 상품명, SKU, 브랜드 검색
- `category`: 카테고리 필터
- `active`: true | false
- `lowStock`: true (재고 부족만)
- `page`, `limit`, `sort`

### 7.2 GET /api/products/:id
**Description**: 상품 상세

### 7.3 POST /api/products
**Description**: 상품 등록 (Admin, OrderManager)

**Request Body**:
```json
{
  "category": "ELECTRONICS",
  "name": "iPhone 15",
  "model": "A3090",
  "color": "Black",
  "brand": "Apple",
  "costCny": 5000,
  "salePriceKrw": 1500000,
  "lowStockThreshold": 5,
  "barcode": "1234567890123",
  "description": "Latest iPhone model"
}
```

### 7.4 PATCH /api/products/:id
**Description**: 상품 수정

### 7.5 DELETE /api/products/:id
**Description**: 상품 삭제 (Admin only, 주문 이력 없는 경우만)

### 7.6 GET /api/products/:id/stock
**Description**: 실시간 재고 조회

### 7.7 POST /api/inventory/inbound
**Description**: 입고 등록

**Request Body**:
```json
{
  "productId": "uuid",
  "quantity": 50,
  "unitCost": 5000,
  "note": "2024년 12월 정기 입고"
}
```

### 7.8 POST /api/inventory/adjust
**Description**: 재고 조정

**Request Body**:
```json
{
  "productId": "uuid",
  "adjustment": -2,
  "reason": "disposal",
  "note": "파손으로 인한 폐기"
}
```

### 7.9 GET /api/inventory/movements
**Description**: 재고 이동 내역

**Query Parameters**:
- `productId`: 특정 상품
- `movementType`: inbound | sale | adjustment | disposal
- `startDate`, `endDate`
- `page`, `limit`

## 8. Cashbook Endpoints

### 8.1 GET /api/cashbook
**Description**: 출납장부 조회

**Query Parameters**:
- `type`: sale | inbound | shipping | adjustment | refund
- `startDate`, `endDate`
- `currency`: CNY | KRW
- `page`, `limit`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "date": "2024-12-28",
      "type": "sale",
      "amount": 150000,
      "currency": "KRW",
      "description": "주문 ORD-241228-001",
      "balance": 5000000
    }
  ],
  "meta": {
    "summary": {
      "totalIncome": 5000000,
      "totalExpense": 1000000,
      "netProfit": 4000000
    }
  }
}
```

### 8.2 GET /api/cashbook/summary
**Description**: 출납장부 요약

**Query Parameters**:
- `period`: day | week | month | year
- `date`: YYYY-MM-DD

## 9. Activity Log Endpoints

### 9.1 GET /api/activity-logs
**Description**: 작업 로그 조회

**Query Parameters**:
- `actorId`: 작업자 ID
- `eventType`: order.created | product.updated | etc.
- `entityType`: order | product | user
- `entityId`: 특정 엔티티 ID
- `startDate`, `endDate`
- `page`, `limit`

### 9.2 GET /api/activity-logs/:id
**Description**: 작업 로그 상세

### 9.3 GET /api/activity-logs/entity/:type/:id
**Description**: 특정 엔티티의 전체 이력

## 10. User Management Endpoints (Admin Only)

### 10.1 GET /api/users
**Description**: 사용자 목록

### 10.2 GET /api/users/:id
**Description**: 사용자 상세

### 10.3 POST /api/users/invite
**Description**: 사용자 초대

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "name": "신규사용자",
  "role": "OrderManager",
  "locale": "ko"
}
```

### 10.4 PATCH /api/users/:id
**Description**: 사용자 정보 수정

### 10.5 PATCH /api/users/:id/deactivate
**Description**: 사용자 비활성화

### 10.6 PATCH /api/users/:id/activate
**Description**: 사용자 활성화

## 11. Public Track Endpoint

### 11.1 GET /api/track
**Description**: 고객 주문 조회 (인증 불필요)

**Query Parameters**:
- `name`: 고객명 (Required)
- `phone`: 전화번호 전체 (Required)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "orderNo": "ORD-241228-001",
      "orderDate": "2024-12-28",
      "status": "SHIPPED",
      "statusText": "배송중",
      "items": [
        {
          "productName": "iPhone 15",
          "quantity": 1
        }
      ],
      "shipment": {
        "courier": "CJ대한통운",
        "trackingNo": "1234567890",
        "trackingUrl": "https://trace.cjlogistics.com/1234567890"
      }
    }
  ]
}
```

## 12. Export Endpoints (Admin Only)

### 12.1 GET /api/export/orders
**Description**: 주문 데이터 Excel 내보내기

**Query Parameters**:
- Same as GET /api/orders
- `format`: xlsx | csv

**Response**: Binary file download

### 12.2 GET /api/export/inventory
**Description**: 재고 데이터 Excel 내보내기

### 12.3 GET /api/export/cashbook
**Description**: 출납장부 Excel 내보내기

## 13. WebSocket Events (Realtime)

### 13.1 Connection
```javascript
const ws = new WebSocket('wss://api.yuandi.com/realtime');
ws.send(JSON.stringify({
  type: 'auth',
  token: 'jwt-token'
}));
```

### 13.2 Event Types

#### order:created
```json
{
  "event": "order:created",
  "data": {
    "id": "uuid",
    "orderNo": "ORD-241228-001",
    "customerName": "김철수",
    "totalAmount": 150000
  }
}
```

#### order:updated
#### product:low-stock
#### shipment:registered

## 14. Error Codes

### 14.1 Standard HTTP Status Codes
- `200 OK`: Success
- `201 Created`: Resource created
- `204 No Content`: Success with no response body
- `400 Bad Request`: Invalid request
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Permission denied
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict
- `422 Unprocessable Entity`: Validation error
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### 14.2 Custom Error Codes
| Code | Description | HTTP Status |
|------|-------------|-------------|
| AUTH_INVALID_CREDENTIALS | Invalid email or password | 401 |
| AUTH_TOKEN_EXPIRED | JWT token expired | 401 |
| AUTH_INSUFFICIENT_PERMISSION | Insufficient permissions | 403 |
| VALIDATION_FAILED | Request validation failed | 422 |
| STOCK_INSUFFICIENT | Insufficient stock | 409 |
| ORDER_NOT_MODIFIABLE | Order cannot be modified | 409 |
| DUPLICATE_SKU | SKU already exists | 409 |
| RATE_LIMIT_EXCEEDED | Too many requests | 429 |

## 15. Rate Limiting

### 15.1 Limits by Endpoint
| Endpoint Category | Requests per Minute | Requests per Hour |
|------------------|--------------------|--------------------|
| Authentication | 10 | 60 |
| Public (/track) | 20 | 100 |
| Dashboard | 60 | 1000 |
| CRUD Operations | 100 | 2000 |
| Export | 5 | 20 |

### 15.2 Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1703764800
```

## 16. API Implementation Examples

### 16.1 Next.js API Route Example
```typescript
// app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { checkPermission } from '@/lib/auth';
import { OrderService } from '@/services/order.service';

const CreateOrderSchema = z.object({
  customerName: z.string().min(2).max(50),
  customerPhone: z.string().regex(/^01[0-9]{8,9}$/),
  pcccCode: z.string().regex(/^P[0-9]{12}$/),
  shippingAddress: z.string().min(5),
  zipCode: z.string().length(5),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().positive()
  })).min(1)
});

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } },
        { status: 401 }
      );
    }
    
    // Authorization
    const hasPermission = await checkPermission(user.id, 'orders.create');
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_INSUFFICIENT_PERMISSION', message: 'Permission denied' } },
        { status: 403 }
      );
    }
    
    // Validation
    const body = await request.json();
    const validation = CreateOrderSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_FAILED', 
            message: 'Validation failed',
            details: validation.error.flatten()
          }
        },
        { status: 422 }
      );
    }
    
    // Business Logic
    const orderService = new OrderService(supabase);
    const order = await orderService.createOrder(validation.data, user.id);
    
    // Response
    return NextResponse.json(
      { success: true, data: order },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Order creation error:', error);
    
    // Handle specific errors
    if (error.message === 'INSUFFICIENT_STOCK') {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'STOCK_INSUFFICIENT', 
            message: 'Insufficient stock for one or more items' 
          }
        },
        { status: 409 }
      );
    }
    
    // Generic error
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'An error occurred while processing your request' 
        }
      },
      { status: 500 }
    );
  }
}
```

### 16.2 API Client Example
```typescript
// lib/api/client.ts
export class ApiClient {
  private baseUrl: string;
  private token: string | null;
  
  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
    this.token = null;
  }
  
  setToken(token: string) {
    this.token = token;
  }
  
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
    };
    
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new ApiError(data.error);
    }
    
    return data.data;
  }
  
  // Order methods
  async getOrders(params?: OrderQueryParams) {
    const queryString = new URLSearchParams(params as any).toString();
    return this.request<Order[]>(`/orders${queryString ? `?${queryString}` : ''}`);
  }
  
  async createOrder(data: CreateOrderDto) {
    return this.request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}
```

## 17. Testing Strategy

### 17.1 Unit Tests
```typescript
// __tests__/api/orders.test.ts
import { POST } from '@/app/api/orders/route';
import { createMockRequest } from '@/tests/utils';

describe('POST /api/orders', () => {
  it('should create order with valid data', async () => {
    const mockRequest = createMockRequest({
      method: 'POST',
      body: {
        customerName: '김철수',
        customerPhone: '01012345678',
        pcccCode: 'P123456789012',
        shippingAddress: '서울시 강남구',
        zipCode: '06234',
        items: [{ productId: 'uuid', quantity: 1 }]
      }
    });
    
    const response = await POST(mockRequest);
    const data = await response.json();
    
    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('orderNo');
  });
});
```

### 17.2 E2E Tests
```typescript
// e2e/orders.spec.ts
import { test, expect } from '@playwright/test';

test('create and track order', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'admin@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // Create order
  await page.goto('/orders/new');
  await page.fill('[name="customerName"]', '김철수');
  await page.fill('[name="customerPhone"]', '01012345678');
  // ... fill other fields
  await page.click('button:has-text("주문 생성")');
  
  // Verify order created
  await expect(page).toHaveURL(/\/orders\/[a-z0-9-]+/);
  await expect(page.locator('h1')).toContainText('ORD-');
});
```

---

**문서 버전**: 1.0.0
**작성일**: 2024-12-28
**작성자**: YUANDI API Architect