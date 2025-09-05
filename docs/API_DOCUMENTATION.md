# YUANDI ERP API Documentation

## 📚 API Reference

### Base URL
- **Development**: `http://localhost:3000/api`
- **Production**: `https://yuandi-erp.vercel.app/api`

### Authentication
모든 API 요청은 Supabase Auth를 통해 인증됩니다.

```http
Authorization: Bearer <token>
```

### Response Format
```json
{
  "success": true,
  "data": {},
  "error": null,
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100
  }
}
```

---

## 🏠 Dashboard Endpoints

### Get Dashboard Summary
대시보드 요약 정보를 조회합니다.

**Endpoint**: `GET /api/dashboard/summary`

**Response**:
```json
{
  "sales": {
    "today": 1500000,
    "yesterday": 1200000,
    "week": 8500000,
    "month": 35000000,
    "todayYoY": 25.5,
    "weekYoY": 15.3,
    "monthYoY": 18.7
  },
  "orders": {
    "pending": 5,
    "processing": 12,
    "shipped": 8,
    "completed": 145
  },
  "inventory": {
    "totalProducts": 250,
    "totalValue": 15000000,
    "lowStock": 8,
    "outOfStock": 2
  }
}
```

### Get Sales Trend
최근 7일간 판매 트렌드를 조회합니다.

**Endpoint**: `GET /api/dashboard/sales-trend`

**Query Parameters**:
- `days` (optional, default: 7): 조회 기간

**Response**:
```json
{
  "trend": [
    {
      "date": "2024-08-20",
      "sales": 1500000,
      "orders": 15,
      "units": 45
    }
  ]
}
```

### Get Order Status Distribution
주문 상태별 분포를 조회합니다.

**Endpoint**: `GET /api/dashboard/order-status`

**Response**:
```json
{
  "distribution": [
    { "status": "PENDING", "count": 5, "percentage": 10 },
    { "status": "PAID", "count": 12, "percentage": 24 },
    { "status": "SHIPPED", "count": 8, "percentage": 16 },
    { "status": "DONE", "count": 25, "percentage": 50 }
  ]
}
```

### Get Low Stock Products
재고 부족 상품을 조회합니다.

**Endpoint**: `GET /api/dashboard/low-stock`

**Query Parameters**:
- `threshold` (optional, default: 5): 재고 임계값

**Response**:
```json
{
  "products": [
    {
      "id": "uuid",
      "sku": "ELEC-IP15-BLK-APPLE-A1B2C",
      "name": "iPhone 15 Pro",
      "on_hand": 2,
      "threshold": 5,
      "last_sale": "2024-08-20T10:30:00Z"
    }
  ]
}
```

### Get Popular Products
인기 상품 TOP 5를 조회합니다.

**Endpoint**: `GET /api/dashboard/popular-products`

**Query Parameters**:
- `period` (optional, default: "week"): week | month | year
- `limit` (optional, default: 5): 조회 개수

**Response**:
```json
{
  "products": [
    {
      "id": "uuid",
      "sku": "ELEC-IP15-BLK-APPLE-A1B2C",
      "name": "iPhone 15 Pro",
      "sales_count": 45,
      "revenue": 45000000,
      "rank": 1
    }
  ]
}
```

---

## 📦 Orders Endpoints

### Create Order
새 주문을 생성합니다.

**Endpoint**: `POST /api/orders`

**Request Body**:
```json
{
  "customer_name": "김철수",
  "customer_phone": "010-1234-5678",
  "customer_email": "customer@example.com",
  "shipping_address": "서울시 강남구 테헤란로 123",
  "shipping_address_detail": "5층 501호",
  "postal_code": "06234",
  "customs_id": "P123456789012",
  "items": [
    {
      "product_id": "uuid",
      "quantity": 2,
      "price": 150000
    }
  ],
  "payment_method": "CARD",
  "notes": "빠른 배송 부탁드립니다"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "order_no": "ORD-240823-001",
    "status": "PAID",
    "total_amount": 300000,
    "created_at": "2024-08-23T10:30:00Z"
  }
}
```

### Get Orders
주문 목록을 조회합니다.

**Endpoint**: `GET /api/orders`

**Query Parameters**:
- `page` (optional, default: 1): 페이지 번호
- `limit` (optional, default: 50): 페이지당 항목 수
- `status` (optional): PENDING | PAID | SHIPPED | DONE | CANCELLED | REFUNDED
- `customer_name` (optional): 고객명 검색
- `order_no` (optional): 주문번호 검색
- `date_from` (optional): 시작 날짜 (YYYY-MM-DD)
- `date_to` (optional): 종료 날짜 (YYYY-MM-DD)
- `sort` (optional, default: "created_at"): 정렬 필드
- `order` (optional, default: "desc"): 정렬 방향 (asc | desc)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "order_no": "ORD-240823-001",
      "customer_name": "김철수",
      "customer_phone": "010-1234-5678",
      "status": "PAID",
      "total_amount": 300000,
      "item_count": 2,
      "created_at": "2024-08-23T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "total_pages": 3
  }
}
```

### Get Order Details
특정 주문의 상세 정보를 조회합니다.

**Endpoint**: `GET /api/orders/:id`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "order_no": "ORD-240823-001",
    "customer": {
      "name": "김철수",
      "phone": "010-1234-5678",
      "email": "customer@example.com"
    },
    "shipping": {
      "address": "서울시 강남구 테헤란로 123",
      "address_detail": "5층 501호",
      "postal_code": "06234",
      "customs_id": "P123456789012",
      "tracking_no": "1234567890",
      "courier": "CJ대한통운",
      "shipped_at": "2024-08-24T14:00:00Z"
    },
    "items": [
      {
        "id": "uuid",
        "product": {
          "id": "uuid",
          "sku": "ELEC-IP15-BLK-APPLE-A1B2C",
          "name": "iPhone 15 Pro"
        },
        "quantity": 2,
        "price": 150000,
        "subtotal": 300000
      }
    ],
    "payment": {
      "method": "CARD",
      "status": "PAID",
      "paid_at": "2024-08-23T10:30:00Z"
    },
    "status": "SHIPPED",
    "total_amount": 300000,
    "notes": "빠른 배송 부탁드립니다",
    "created_at": "2024-08-23T10:30:00Z",
    "updated_at": "2024-08-24T14:00:00Z"
  }
}
```

### Update Order
주문 정보를 수정합니다.

**Endpoint**: `PATCH /api/orders/:id`

**Request Body**:
```json
{
  "customer_name": "김철수",
  "customer_phone": "010-1234-5679",
  "shipping_address": "서울시 강남구 테헤란로 124",
  "notes": "배송 전 연락 부탁드립니다"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "updated_at": "2024-08-23T11:00:00Z"
  }
}
```

### Register Shipping
배송 정보를 등록합니다.

**Endpoint**: `PATCH /api/orders/:id/ship`

**Request Body**:
```json
{
  "tracking_no": "1234567890",
  "courier": "cj",
  "shipped_at": "2024-08-24T14:00:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "SHIPPED",
    "tracking_url": "https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=1234567890"
  }
}
```

### Complete Order
주문을 완료 처리합니다.

**Endpoint**: `PATCH /api/orders/:id/complete`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "DONE",
    "completed_at": "2024-08-25T10:00:00Z"
  }
}
```

### Cancel Order
주문을 취소합니다.

**Endpoint**: `PATCH /api/orders/:id/cancel`

**Request Body**:
```json
{
  "reason": "고객 요청으로 인한 취소"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "CANCELLED",
    "cancelled_at": "2024-08-23T15:00:00Z"
  }
}
```

### Refund Order
주문을 환불 처리합니다.

**Endpoint**: `PATCH /api/orders/:id/refund`

**Request Body**:
```json
{
  "amount": 300000,
  "reason": "상품 불량",
  "refund_method": "CARD"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "REFUNDED",
    "refund_amount": 300000,
    "refunded_at": "2024-08-25T11:00:00Z"
  }
}
```

---

## 🛍️ Products Endpoints

### Get Products
상품 목록을 조회합니다.

**Endpoint**: `GET /api/products`

**Query Parameters**:
- `page` (optional, default: 1): 페이지 번호
- `limit` (optional, default: 50): 페이지당 항목 수
- `category` (optional): 카테고리 필터
- `search` (optional): 상품명/SKU 검색
- `in_stock` (optional): true | false
- `sort` (optional, default: "created_at"): 정렬 필드
- `order` (optional, default: "desc"): 정렬 방향

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sku": "ELEC-IP15-BLK-APPLE-A1B2C",
      "name": "iPhone 15 Pro",
      "category": "전자기기",
      "model": "IP15",
      "color": "Black",
      "manufacturer": "Apple",
      "brand": "Apple",
      "cost_cny": 8000,
      "price_krw": 1500000,
      "on_hand": 10,
      "images": [
        "https://storage.supabase.co/products/xxx.jpg"
      ],
      "active": true,
      "created_at": "2024-08-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 250
  }
}
```

### Get Product Details
특정 상품의 상세 정보를 조회합니다.

**Endpoint**: `GET /api/products/:id`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sku": "ELEC-IP15-BLK-APPLE-A1B2C",
    "name": "iPhone 15 Pro",
    "category": "전자기기",
    "model": "IP15",
    "color": "Black",
    "manufacturer": "Apple",
    "brand": "Apple",
    "cost_cny": 8000,
    "price_krw": 1500000,
    "on_hand": 10,
    "reserved": 2,
    "available": 8,
    "threshold": 5,
    "images": [
      "https://storage.supabase.co/products/xxx.jpg"
    ],
    "description": "최신 iPhone 15 Pro 모델",
    "active": true,
    "sales_stats": {
      "total_sold": 45,
      "last_30_days": 12,
      "average_per_month": 15
    },
    "created_at": "2024-08-01T10:00:00Z",
    "updated_at": "2024-08-20T15:00:00Z"
  }
}
```

### Create Product
새 상품을 등록합니다.

**Endpoint**: `POST /api/products`

**Request Body**:
```json
{
  "name": "iPhone 15 Pro",
  "category": "전자기기",
  "model": "IP15",
  "color": "Black",
  "manufacturer": "Apple",
  "brand": "Apple",
  "cost_cny": 8000,
  "price_krw": 1500000,
  "initial_stock": 10,
  "threshold": 5,
  "description": "최신 iPhone 15 Pro 모델",
  "images": ["base64_image_data"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sku": "ELEC-IP15-BLK-APPLE-A1B2C",
    "created_at": "2024-08-23T10:00:00Z"
  }
}
```

### Update Product
상품 정보를 수정합니다.

**Endpoint**: `PATCH /api/products/:id`

**Request Body**:
```json
{
  "name": "iPhone 15 Pro Max",
  "price_krw": 1600000,
  "threshold": 3,
  "description": "업데이트된 설명"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "updated_at": "2024-08-23T11:00:00Z"
  }
}
```

### Delete Product
상품을 삭제합니다 (소프트 삭제).

**Endpoint**: `DELETE /api/products/:id`

**Response**:
```json
{
  "success": true,
  "message": "Product deactivated successfully"
}
```

---

## 📊 Inventory Endpoints

### Register Inbound
재고 입고를 등록합니다.

**Endpoint**: `POST /api/inventory/inbound`

**Request Body**:
```json
{
  "product_id": "uuid",
  "quantity": 20,
  "cost_cny": 8000,
  "notes": "8월 정기 입고",
  "received_at": "2024-08-23T10:00:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "movement_type": "INBOUND",
    "quantity": 20,
    "new_on_hand": 30,
    "created_at": "2024-08-23T10:00:00Z"
  }
}
```

### Adjust Inventory
재고 조정을 수행합니다.

**Endpoint**: `PATCH /api/inventory/adjust`

**Request Body**:
```json
{
  "product_id": "uuid",
  "adjustment": -2,
  "reason": "DAMAGED",
  "notes": "배송 중 파손"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "movement_type": "ADJUSTMENT",
    "quantity": -2,
    "new_on_hand": 28,
    "reason": "DAMAGED",
    "created_at": "2024-08-23T11:00:00Z"
  }
}
```

### Get Inventory Movements
재고 이동 내역을 조회합니다.

**Endpoint**: `GET /api/inventory/movements`

**Query Parameters**:
- `product_id` (optional): 특정 상품 필터
- `movement_type` (optional): INBOUND | OUTBOUND | ADJUSTMENT
- `date_from` (optional): 시작 날짜
- `date_to` (optional): 종료 날짜
- `page` (optional, default: 1)
- `limit` (optional, default: 50)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "product": {
        "id": "uuid",
        "sku": "ELEC-IP15-BLK-APPLE-A1B2C",
        "name": "iPhone 15 Pro"
      },
      "movement_type": "OUTBOUND",
      "quantity": -2,
      "before_qty": 30,
      "after_qty": 28,
      "reference_type": "ORDER",
      "reference_id": "uuid",
      "notes": "주문 출고",
      "created_at": "2024-08-23T14:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 500
  }
}
```

### Get Stock Report
재고 현황 보고서를 조회합니다.

**Endpoint**: `GET /api/inventory/report`

**Query Parameters**:
- `category` (optional): 카테고리 필터
- `low_stock_only` (optional, default: false): 재고 부족만
- `include_inactive` (optional, default: false): 비활성 포함

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_products": 250,
      "total_quantity": 3500,
      "total_value_krw": 525000000,
      "low_stock_count": 8,
      "out_of_stock_count": 2
    },
    "by_category": [
      {
        "category": "전자기기",
        "product_count": 45,
        "total_quantity": 650,
        "total_value": 97500000
      }
    ],
    "critical_items": [
      {
        "id": "uuid",
        "sku": "ELEC-IP15-BLK-APPLE-A1B2C",
        "name": "iPhone 15 Pro",
        "on_hand": 2,
        "threshold": 5,
        "days_until_stockout": 3
      }
    ]
  }
}
```

---

## 🚚 Shipments Endpoints

### Get Shipments
배송 목록을 조회합니다.

**Endpoint**: `GET /api/shipments`

**Query Parameters**:
- `status` (optional): PREPARING | SHIPPED | DELIVERED | RETURNED
- `courier` (optional): 택배사 코드
- `tracking_no` (optional): 운송장 번호
- `date_from` (optional): 시작 날짜
- `date_to` (optional): 종료 날짜
- `page` (optional, default: 1)
- `limit` (optional, default: 50)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "order_id": "uuid",
      "order_no": "ORD-240823-001",
      "tracking_no": "1234567890",
      "courier": "cj",
      "courier_name": "CJ대한통운",
      "status": "SHIPPED",
      "recipient": {
        "name": "김철수",
        "phone": "010-1234-5678",
        "address": "서울시 강남구 테헤란로 123"
      },
      "shipped_at": "2024-08-24T14:00:00Z",
      "delivered_at": null,
      "created_at": "2024-08-24T13:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150
  }
}
```

### Create Shipment
새 배송을 생성합니다.

**Endpoint**: `POST /api/shipments`

**Request Body**:
```json
{
  "order_id": "uuid",
  "tracking_no": "1234567890",
  "courier": "cj",
  "weight_kg": 2.5,
  "shipping_cost": 3000,
  "notes": "취급주의"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tracking_url": "https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=1234567890",
    "created_at": "2024-08-24T13:00:00Z"
  }
}
```

### Update Shipment Status
배송 상태를 업데이트합니다.

**Endpoint**: `PATCH /api/shipments/:id/status`

**Request Body**:
```json
{
  "status": "DELIVERED",
  "delivered_at": "2024-08-26T10:00:00Z",
  "delivered_by": "김배송",
  "signature": "base64_signature_image"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "DELIVERED",
    "delivered_at": "2024-08-26T10:00:00Z"
  }
}
```

### Upload Shipment Photo
배송 사진을 업로드합니다.

**Endpoint**: `POST /api/shipments/:id/photo`

**Request Body** (multipart/form-data):
- `photo`: 이미지 파일

**Response**:
```json
{
  "success": true,
  "data": {
    "photo_url": "https://storage.supabase.co/shipments/xxx.jpg",
    "uploaded_at": "2024-08-24T14:30:00Z"
  }
}
```

---

## 💰 Cashbook Endpoints

### Get Transactions
현금 거래 내역을 조회합니다.

**Endpoint**: `GET /api/cashbook`

**Query Parameters**:
- `type` (optional): INCOME | EXPENSE
- `category` (optional): 카테고리 필터
- `date_from` (optional): 시작 날짜
- `date_to` (optional): 종료 날짜
- `page` (optional, default: 1)
- `limit` (optional, default: 50)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "transaction_date": "2024-08-23",
      "type": "INCOME",
      "category": "판매대금",
      "amount": 300000,
      "description": "주문 ORD-240823-001",
      "reference_type": "ORDER",
      "reference_id": "uuid",
      "balance": 5000000,
      "created_at": "2024-08-23T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1000
  }
}
```

### Get Cashbook Summary
현금장부 요약을 조회합니다.

**Endpoint**: `GET /api/cashbook/summary`

**Query Parameters**:
- `period` (optional, default: "month"): day | week | month | year
- `date` (optional): 기준 날짜

**Response**:
```json
{
  "success": true,
  "data": {
    "period": "2024-08",
    "opening_balance": 3000000,
    "total_income": 15000000,
    "total_expense": 10000000,
    "net_change": 5000000,
    "closing_balance": 8000000,
    "by_category": {
      "income": [
        {
          "category": "판매대금",
          "amount": 14000000,
          "count": 45
        }
      ],
      "expense": [
        {
          "category": "상품구매",
          "amount": 8000000,
          "count": 20
        }
      ]
    }
  }
}
```

### Create Manual Transaction
수동 거래를 생성합니다.

**Endpoint**: `POST /api/cashbook/transaction`

**Request Body**:
```json
{
  "transaction_date": "2024-08-23",
  "type": "EXPENSE",
  "category": "운영비",
  "amount": 50000,
  "description": "사무용품 구매",
  "payment_method": "CARD",
  "notes": "프린터 토너 구매"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "balance": 7950000,
    "created_at": "2024-08-23T15:00:00Z"
  }
}
```

---

## 👥 Users Endpoints

### Get Users
사용자 목록을 조회합니다 (Admin only).

**Endpoint**: `GET /api/users`

**Query Parameters**:
- `role` (optional): Admin | OrderManager | ShipManager
- `active` (optional): true | false
- `search` (optional): 이름/이메일 검색

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "admin@yuandi.com",
      "name": "관리자",
      "role": "Admin",
      "department": "경영지원",
      "phone": "010-1234-5678",
      "active": true,
      "last_login": "2024-08-23T09:00:00Z",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Create User
새 사용자를 생성합니다 (Admin only).

**Endpoint**: `POST /api/users`

**Request Body**:
```json
{
  "email": "newuser@yuandi.com",
  "password": "securePassword123!",
  "name": "신규사용자",
  "role": "OrderManager",
  "department": "영업팀",
  "phone": "010-9876-5432"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "newuser@yuandi.com",
    "created_at": "2024-08-23T10:00:00Z"
  }
}
```

### Update User
사용자 정보를 수정합니다.

**Endpoint**: `PATCH /api/users/:id`

**Request Body**:
```json
{
  "name": "수정된이름",
  "role": "ShipManager",
  "department": "물류팀",
  "active": true
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "updated_at": "2024-08-23T11:00:00Z"
  }
}
```

### Delete User
사용자를 비활성화합니다 (Admin only).

**Endpoint**: `DELETE /api/users/:id`

**Response**:
```json
{
  "success": true,
  "message": "User deactivated successfully"
}
```

---

## 🔍 Customer Portal Endpoints

### Track Orders
고객이 주문을 조회합니다 (인증 없음).

**Endpoint**: `GET /api/track`

**Query Parameters**:
- `name` (required): 주문자명
- `phone` (required): 전화번호 (전체)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "order_no": "ORD-240823-001",
      "status": "SHIPPED",
      "status_text": "배송중",
      "total_amount": 300000,
      "items": [
        {
          "name": "iPhone 15 Pro",
          "quantity": 2
        }
      ],
      "tracking": {
        "courier": "CJ대한통운",
        "tracking_no": "1234567890",
        "tracking_url": "https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=1234567890"
      },
      "created_at": "2024-08-23T10:30:00Z",
      "expected_delivery": "2024-08-26"
    }
  ]
}
```

---

## 📤 Export Endpoints

### Export Orders
주문 내역을 엑셀로 내보냅니다 (Admin only).

**Endpoint**: `GET /api/export/orders`

**Query Parameters**:
- `date_from` (optional): 시작 날짜
- `date_to` (optional): 종료 날짜
- `status` (optional): 상태 필터

**Response**: Excel file (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)

### Export Inventory
재고 현황을 엑셀로 내보냅니다 (Admin only).

**Endpoint**: `GET /api/export/inventory`

**Query Parameters**:
- `category` (optional): 카테고리 필터
- `include_movements` (optional, default: false): 이동 내역 포함

**Response**: Excel file

### Export Cashbook
현금장부를 엑셀로 내보냅니다 (Admin only).

**Endpoint**: `GET /api/export/cashbook`

**Query Parameters**:
- `year` (required): 연도
- `month` (optional): 월 (없으면 전체 연도)

**Response**: Excel file

---

## ⚙️ Settings Endpoints

### Get System Settings
시스템 설정을 조회합니다.

**Endpoint**: `GET /api/settings`

**Response**:
```json
{
  "success": true,
  "data": {
    "company": {
      "name": "YUANDI Trading",
      "registration_no": "123-45-67890",
      "address": "서울시 강남구 테헤란로 123",
      "phone": "02-1234-5678",
      "email": "info@yuandi.com"
    },
    "system": {
      "language": "ko",
      "timezone": "Asia/Seoul",
      "currency": "KRW",
      "exchange_rate_cny": 185,
      "low_stock_threshold": 5
    },
    "shipping": {
      "default_courier": "cj",
      "free_shipping_threshold": 50000,
      "default_shipping_fee": 3000
    },
    "notification": {
      "email_enabled": true,
      "sms_enabled": false,
      "low_stock_alert": true,
      "order_notification": true
    }
  }
}
```

### Update Settings
시스템 설정을 업데이트합니다 (Admin only).

**Endpoint**: `PATCH /api/settings`

**Request Body**:
```json
{
  "system": {
    "language": "zh-CN",
    "low_stock_threshold": 10
  },
  "shipping": {
    "default_courier": "hanjin"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "updated_at": "2024-08-23T15:00:00Z"
  }
}
```

---

## 🔐 Authentication Endpoints

### Login
사용자 로그인을 수행합니다.

**Endpoint**: `POST /api/auth/login`

**Request Body**:
```json
{
  "email": "admin@yuandi.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@yuandi.com",
      "name": "관리자",
      "role": "Admin"
    },
    "token": "jwt_token",
    "expires_at": "2024-08-24T09:00:00Z"
  }
}
```

### Logout
로그아웃을 수행합니다.

**Endpoint**: `POST /api/auth/logout`

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Refresh Token
토큰을 갱신합니다.

**Endpoint**: `POST /api/auth/refresh`

**Request Body**:
```json
{
  "refresh_token": "refresh_token_string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "new_jwt_token",
    "refresh_token": "new_refresh_token",
    "expires_at": "2024-08-24T10:00:00Z"
  }
}
```

### Get Current User
현재 로그인한 사용자 정보를 조회합니다.

**Endpoint**: `GET /api/auth/me`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "admin@yuandi.com",
    "name": "관리자",
    "role": "Admin",
    "permissions": [
      "orders.create",
      "orders.read",
      "orders.update",
      "orders.delete",
      "products.create",
      "products.read",
      "products.update",
      "products.delete",
      "users.manage"
    ]
  }
}
```

---

## 🔥 Webhook Endpoints

### Order Status Webhook
주문 상태 변경 시 호출됩니다.

**Endpoint**: `POST /webhooks/order-status`

**Headers**:
```http
X-Webhook-Secret: webhook_secret_key
```

**Request Body**:
```json
{
  "event": "order.status.changed",
  "timestamp": "2024-08-23T14:00:00Z",
  "data": {
    "order_id": "uuid",
    "order_no": "ORD-240823-001",
    "previous_status": "PAID",
    "new_status": "SHIPPED",
    "tracking_no": "1234567890"
  }
}
```

### Low Stock Webhook
재고 부족 시 호출됩니다.

**Endpoint**: `POST /webhooks/low-stock`

**Request Body**:
```json
{
  "event": "inventory.low_stock",
  "timestamp": "2024-08-23T15:00:00Z",
  "data": {
    "product_id": "uuid",
    "sku": "ELEC-IP15-BLK-APPLE-A1B2C",
    "name": "iPhone 15 Pro",
    "on_hand": 2,
    "threshold": 5
  }
}
```

---

## 🔄 Rate Limiting

API 요청 제한:
- **인증된 사용자**: 1000 requests/hour
- **Customer Portal**: 100 requests/hour per IP
- **Export endpoints**: 10 requests/hour

Rate limit 정보는 응답 헤더에 포함됩니다:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1692792000
```

---

## 🚨 Error Codes

| Code | Description | Example |
|------|-------------|---------|
| 400 | Bad Request | 잘못된 요청 형식 |
| 401 | Unauthorized | 인증 토큰 없음 |
| 403 | Forbidden | 권한 없음 |
| 404 | Not Found | 리소스를 찾을 수 없음 |
| 409 | Conflict | 중복된 리소스 |
| 422 | Unprocessable Entity | 유효성 검사 실패 |
| 429 | Too Many Requests | Rate limit 초과 |
| 500 | Internal Server Error | 서버 오류 |
| 503 | Service Unavailable | 서비스 일시 중단 |

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "유효성 검사에 실패했습니다",
    "details": {
      "field": "customer_phone",
      "reason": "올바른 전화번호 형식이 아닙니다"
    }
  }
}
```

---

## 📚 OpenAPI Specification

전체 OpenAPI 3.0 명세는 다음 엔드포인트에서 확인할 수 있습니다:

- **JSON**: `/api/openapi.json`
- **YAML**: `/api/openapi.yaml`
- **Swagger UI**: `/api/docs`

---

## 🔧 SDK & Client Libraries

### JavaScript/TypeScript
```bash
npm install @yuandi/erp-client
```

```typescript
import { YuandiClient } from '@yuandi/erp-client';

const client = new YuandiClient({
  apiKey: 'your_api_key',
  baseUrl: 'https://yuandi-erp.vercel.app/api'
});

// 주문 조회
const orders = await client.orders.list({
  status: 'PAID',
  limit: 10
});

// 상품 생성
const product = await client.products.create({
  name: 'iPhone 15 Pro',
  category: '전자기기',
  cost_cny: 8000
});
```

### Python
```bash
pip install yuandi-erp-client
```

```python
from yuandi_erp import YuandiClient

client = YuandiClient(
    api_key='your_api_key',
    base_url='https://yuandi-erp.vercel.app/api'
)

# 주문 조회
orders = client.orders.list(status='PAID', limit=10)

# 상품 생성
product = client.products.create(
    name='iPhone 15 Pro',
    category='전자기기',
    cost_cny=8000
)
```

---

## 📞 Support

API 관련 문의사항:
- Email: api-support@yuandi.com
- Documentation: https://docs.yuandi.com
- Status Page: https://status.yuandi.com