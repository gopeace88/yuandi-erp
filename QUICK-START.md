# ⚡ YUANDI-ERP v2 빠른 시작 가이드

> 30분 안에 새 프로젝트를 시작하고 핵심 기능을 구현하는 가이드

## 🎯 목표
- ✅ 프로젝트 구조 생성 (5분)
- ✅ 핵심 비즈니스 로직 구현 (15분)
- ✅ 데이터베이스 설정 (5분)
- ✅ 첫 API 테스트 (5분)

## 📦 Step 1: 프로젝트 초기화 (5분)

### 1.1 프로젝트 생성
```bash
# Next.js 14 프로젝트 생성
npx create-next-app@14 yuandi-erp-v2 \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*"

cd yuandi-erp-v2
```

### 1.2 필수 패키지 설치
```bash
# 핵심 패키지만 먼저 설치
npm install \
  prisma @prisma/client \
  zod \
  bcryptjs \
  jsonwebtoken

# 개발 도구
npm install -D \
  @types/bcryptjs \
  @types/jsonwebtoken \
  tsx
```

### 1.3 프로젝트 구조 생성
```bash
# 도메인 주도 설계 구조
mkdir -p src/core/{domain,services,utils}
mkdir -p src/lib/{db,auth}
mkdir -p src/app/api/{orders,products,inventory}
```

## 🧮 Step 2: 핵심 비즈니스 로직 (15분)

### 2.1 SKU 생성기 (2분)
```typescript
// src/core/utils/sku-generator.ts
export class SKUGenerator {
  static generate(product: {
    category: string;
    model: string;
    color: string;
    brand: string;
  }): string {
    const hash = Math.random().toString(36).substring(2, 7).toUpperCase();
    return [
      product.category.substring(0, 3).toUpperCase(),
      product.model.replace(/\s+/g, ''),
      product.color.substring(0, 3).toUpperCase(),
      product.brand.substring(0, 3).toUpperCase(),
      hash
    ].join('-');
  }
}

// 사용 예: ELEC-iPhone15-BLA-APP-A1B2C
```

### 2.2 주문번호 생성기 (3분)
```typescript
// src/core/utils/order-number-generator.ts
export class OrderNumberGenerator {
  private static counters = new Map<string, number>();

  static generate(): string {
    const now = new Date();
    // 한국 시간 기준
    const kstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    
    const dateKey = kstDate.toISOString().slice(2, 10).replace(/-/g, '');
    
    // 일별 카운터 관리
    let counter = this.counters.get(dateKey) || 0;
    counter++;
    this.counters.set(dateKey, counter);
    
    // 자정 리셋
    if (counter === 1) {
      for (const key of this.counters.keys()) {
        if (key !== dateKey) this.counters.delete(key);
      }
    }
    
    return `ORD-${dateKey}-${counter.toString().padStart(3, '0')}`;
  }
}

// 사용 예: ORD-240825-001
```

### 2.3 재고 관리 서비스 (5분)
```typescript
// src/core/services/inventory-service.ts
import { PrismaClient } from '@prisma/client';

export class InventoryService {
  constructor(private prisma: PrismaClient) {}

  async checkStock(productId: string, quantity: number): Promise<boolean> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId }
    });
    
    if (!product) throw new Error('Product not found');
    return product.onHand >= quantity;
  }

  async deductStock(items: Array<{productId: string; quantity: number}>) {
    return this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });
        
        if (!product || product.onHand < item.quantity) {
          throw new Error(`Insufficient stock for product ${item.productId}`);
        }
        
        await tx.product.update({
          where: { id: item.productId },
          data: { onHand: product.onHand - item.quantity }
        });
      }
    });
  }

  async restoreStock(items: Array<{productId: string; quantity: number}>) {
    return this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { onHand: { increment: item.quantity } }
        });
      }
    });
  }
}
```

### 2.4 출납장부 서비스 (5분)
```typescript
// src/core/services/cashbook-service.ts
import { PrismaClient } from '@prisma/client';

type TransactionType = 'sale' | 'inbound' | 'shipping' | 'refund';

export class CashbookService {
  private readonly DEFAULT_FX_RATE = 180; // CNY to KRW
  
  constructor(private prisma: PrismaClient) {}

  async recordTransaction(data: {
    type: TransactionType;
    amount: number;
    refType?: string;
    refId?: string;
    note?: string;
  }) {
    const fxRate = this.DEFAULT_FX_RATE; // 실제로는 API에서 가져옴
    
    return this.prisma.cashbook.create({
      data: {
        date: new Date(),
        type: data.type,
        amount: data.amount,
        currency: 'CNY',
        fxRate: fxRate,
        amountKrw: Math.round(data.amount * fxRate),
        refType: data.refType,
        refId: data.refId,
        note: data.note
      }
    });
  }

  async recordSale(orderId: string, amount: number) {
    return this.recordTransaction({
      type: 'sale',
      amount: amount,
      refType: 'order',
      refId: orderId,
      note: '주문 매출'
    });
  }

  async recordRefund(orderId: string, amount: number) {
    return this.recordTransaction({
      type: 'refund',
      amount: -amount, // 환불은 음수
      refType: 'order',
      refId: orderId,
      note: '주문 환불'
    });
  }
}
```

## 🗄️ Step 3: 데이터베이스 설정 (5분)

### 3.1 Docker Compose 설정
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: yuandi_erp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 3.2 Prisma 스키마 (최소 버전)
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Product {
  id        String   @id @default(uuid())
  sku       String   @unique
  category  String
  name      String
  model     String?
  color     String?
  brand     String?
  costCny   Decimal  @map("cost_cny")
  onHand    Int      @default(0) @map("on_hand")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  orderItems OrderItem[]
  
  @@map("products")
}

model Order {
  id            String      @id @default(uuid())
  orderNo       String      @unique @map("order_no")
  customerName  String      @map("customer_name")
  customerPhone String      @map("customer_phone")
  address       String
  status        OrderStatus @default(PAID)
  totalAmount   Decimal     @map("total_amount")
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  
  items OrderItem[]
  
  @@map("orders")
}

model OrderItem {
  id        String  @id @default(uuid())
  orderId   String  @map("order_id")
  productId String  @map("product_id")
  quantity  Int
  unitPrice Decimal @map("unit_price")
  
  order   Order   @relation(fields: [orderId], references: [id])
  product Product @relation(fields: [productId], references: [id])
  
  @@map("order_items")
}

model Cashbook {
  id        String   @id @default(uuid())
  date      DateTime
  type      String
  amount    Decimal
  currency  String   @default("CNY")
  fxRate    Decimal? @map("fx_rate")
  amountKrw Decimal? @map("amount_krw")
  refType   String?  @map("ref_type")
  refId     String?  @map("ref_id")
  note      String?
  createdAt DateTime @default(now())
  
  @@map("cashbook")
}

enum OrderStatus {
  PAID
  SHIPPED
  DONE
  REFUNDED
}
```

### 3.3 환경 변수 설정
```bash
# .env
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/yuandi_erp"
SESSION_SECRET="your-32-character-secret-key-here"
```

### 3.4 데이터베이스 초기화
```bash
# Docker 시작
docker-compose up -d

# Prisma 마이그레이션
npx prisma generate
npx prisma migrate dev --name init

# 시드 데이터 (선택사항)
npx tsx prisma/seed.ts
```

## 🚀 Step 4: 첫 API 구현 및 테스트 (5분)

### 4.1 주문 생성 API
```typescript
// src/app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { OrderNumberGenerator } from '@/core/utils/order-number-generator';
import { InventoryService } from '@/core/services/inventory-service';
import { CashbookService } from '@/core/services/cashbook-service';

const prisma = new PrismaClient();
const inventory = new InventoryService(prisma);
const cashbook = new CashbookService(prisma);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 1. 재고 검증
    for (const item of body.items) {
      const hasStock = await inventory.checkStock(item.productId, item.quantity);
      if (!hasStock) {
        return NextResponse.json(
          { error: `Insufficient stock for product ${item.productId}` },
          { status: 400 }
        );
      }
    }
    
    // 2. 트랜잭션으로 주문 생성
    const order = await prisma.$transaction(async (tx) => {
      // 주문 생성
      const newOrder = await tx.order.create({
        data: {
          orderNo: OrderNumberGenerator.generate(),
          customerName: body.customerName,
          customerPhone: body.customerPhone,
          address: body.address,
          totalAmount: body.totalAmount,
          status: 'PAID',
          items: {
            create: body.items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice
            }))
          }
        },
        include: { items: true }
      });
      
      return newOrder;
    });
    
    // 3. 재고 차감 (별도 트랜잭션)
    await inventory.deductStock(body.items);
    
    // 4. 출납장부 기록
    await cashbook.recordSale(order.id, Number(order.totalAmount));
    
    return NextResponse.json(order);
    
  } catch (error) {
    console.error('Order creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
```

### 4.2 API 테스트
```bash
# 테스트용 상품 생성
npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const { SKUGenerator } = require('./src/core/utils/sku-generator');
const prisma = new PrismaClient();

async function createTestProduct() {
  const product = await prisma.product.create({
    data: {
      sku: 'TEST-001',
      category: 'ELECTRONICS',
      name: 'Test Product',
      model: 'Model-1',
      color: 'Black',
      brand: 'TestBrand',
      costCny: 100,
      onHand: 50
    }
  });
  console.log('Created product:', product);
  process.exit(0);
}

createTestProduct();
"

# API 테스트
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "테스트 고객",
    "customerPhone": "010-1234-5678",
    "address": "서울시 강남구",
    "totalAmount": 100,
    "items": [{
      "productId": "[위에서 생성된 product ID]",
      "quantity": 2,
      "unitPrice": 50
    }]
  }'
```

## 🎯 완료! 다음 단계

### 즉시 구현 가능한 기능들
1. **상품 관리 API** (`/api/products`)
2. **재고 조회 API** (`/api/inventory`)
3. **고객 주문 조회** (`/api/track`)
4. **대시보드 통계** (`/api/dashboard`)

### 30분 추가 구현
1. **인증 시스템** (NextAuth.js)
2. **관리자 UI** (shadcn/ui)
3. **실시간 재고 업데이트** (Prisma Pulse)
4. **엑셀 내보내기** (exceljs)

## 🔥 Pro Tips

### 1. 빠른 개발 서버 재시작
```json
// package.json
{
  "scripts": {
    "dev": "next dev --turbo",
    "db:reset": "prisma migrate reset --force",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

### 2. 타입 안전성 강화
```typescript
// src/types/api.ts
import { z } from 'zod';

export const CreateOrderSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().regex(/^010-\d{4}-\d{4}$/),
  address: z.string().min(1),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive()
  }))
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
```

### 3. 에러 처리 표준화
```typescript
// src/lib/api-error.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
  }
}

// 사용
if (!hasStock) {
  throw new ApiError(400, 'Insufficient stock', { productId, required, available });
}
```

## 📊 성능 최적화

### 데이터베이스 인덱스
```sql
-- 자주 조회되는 필드에 인덱스 추가
CREATE INDEX idx_orders_customer ON orders(customer_name, customer_phone);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_cashbook_date ON cashbook(date);
```

### API 응답 캐싱
```typescript
// src/app/api/dashboard/route.ts
export const revalidate = 60; // 60초 캐싱

export async function GET() {
  // 대시보드 데이터는 1분 단위로 캐싱
  const data = await getDashboardData();
  return NextResponse.json(data);
}
```

## ✅ 체크리스트

- [ ] 프로젝트 생성 완료
- [ ] 패키지 설치 완료
- [ ] Docker PostgreSQL 실행 중
- [ ] Prisma 마이그레이션 완료
- [ ] 핵심 비즈니스 로직 구현
- [ ] 첫 API 테스트 성공
- [ ] 재고 차감 동작 확인
- [ ] 출납장부 기록 확인

---

*30분 안에 실제 동작하는 ERP 시스템의 핵심을 구축할 수 있습니다!*