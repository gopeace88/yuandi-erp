# 🔄 YUANDI-ERP 마이그레이션 스크립트

> 기존 프로젝트에서 재사용 가능한 코드와 데이터를 새 프로젝트로 이전하기 위한 스크립트 모음

## 📦 재사용 가능한 코드 추출

### 1. UI 컴포넌트 마이그레이션
```bash
#!/bin/bash
# migrate-components.sh

SOURCE_DIR="/mnt/d/00.Projects/00.YUANDI-ERP"
TARGET_DIR="/mnt/d/00.Projects/yuandi-erp-v2"

echo "🎨 UI 컴포넌트 마이그레이션 시작..."

# 컴포넌트 복사
mkdir -p "$TARGET_DIR/src/presentation/components"
cp -r "$SOURCE_DIR/components/ui" "$TARGET_DIR/src/presentation/components/"
cp -r "$SOURCE_DIR/app/components" "$TARGET_DIR/src/presentation/components/features"

# 임포트 경로 수정
find "$TARGET_DIR/src/presentation/components" -type f -name "*.tsx" -o -name "*.ts" | while read file; do
  sed -i 's|@/components/ui|@/presentation/components/ui|g' "$file"
  sed -i 's|@/lib/|@/infrastructure/|g' "$file"
done

echo "✅ UI 컴포넌트 마이그레이션 완료"
```

### 2. 다국어 파일 마이그레이션
```bash
#!/bin/bash
# migrate-i18n.sh

echo "🌍 다국어 파일 마이그레이션 시작..."

# 번역 파일 복사
mkdir -p "$TARGET_DIR/src/presentation/i18n/messages"
cp -r "$SOURCE_DIR/messages"/* "$TARGET_DIR/src/presentation/i18n/messages/"

# i18n 설정 파일 생성
cat > "$TARGET_DIR/src/presentation/i18n/config.ts" << 'EOF'
import { ko } from './messages/ko';
import { zhCN } from './messages/zh-CN';

export const messages = {
  ko,
  'zh-CN': zhCN,
} as const;

export type Locale = keyof typeof messages;
export const defaultLocale: Locale = 'ko';
EOF

echo "✅ 다국어 파일 마이그레이션 완료"
```

### 3. 타입 정의 추출
```bash
#!/bin/bash
# extract-types.sh

echo "📝 타입 정의 추출 시작..."

# 타입 파일 생성
mkdir -p "$TARGET_DIR/src/domain/types"

# 기존 타입에서 도메인 타입 추출
cat > "$TARGET_DIR/src/domain/types/models.ts" << 'EOF'
// Product 도메인 타입
export interface Product {
  id: string;
  sku: string;
  category: string;
  name: string;
  model: string;
  color: string;
  brand: string;
  costCny: number;
  onHand: number;
  lowStockThreshold: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Order 도메인 타입
export interface Order {
  id: string;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  pcccCode?: string;
  shippingAddress: string;
  zipCode: string;
  memo?: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus = 'PAID' | 'SHIPPED' | 'DONE' | 'REFUNDED';

// Cashbook 타입
export interface CashbookEntry {
  id: string;
  date: Date;
  type: TransactionType;
  amount: number;
  currency: 'CNY' | 'KRW';
  fxRate?: number;
  amountKrw: number;
  refType?: string;
  refId?: string;
  note?: string;
  createdAt: Date;
}

export type TransactionType = 'sale' | 'inbound' | 'shipping' | 'adjustment' | 'refund';
EOF

echo "✅ 타입 정의 추출 완료"
```

## 🗄️ 데이터베이스 마이그레이션

### 1. Supabase → PostgreSQL 스키마 변환
```sql
-- export-schema.sql
-- Supabase 스키마를 표준 PostgreSQL로 변환

-- Users 테이블
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'OrderManager', 'ShipManager')),
  locale VARCHAR(10) DEFAULT 'ko',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Products 테이블
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  model VARCHAR(100),
  color VARCHAR(50),
  brand VARCHAR(100),
  cost_cny DECIMAL(10,2) NOT NULL,
  on_hand INTEGER DEFAULT 0 CHECK (on_hand >= 0),
  low_stock_threshold INTEGER DEFAULT 5,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Orders 테이블
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no VARCHAR(50) UNIQUE NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  pccc_code VARCHAR(20),
  shipping_address TEXT NOT NULL,
  zip_code VARCHAR(10) NOT NULL,
  memo TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PAID',
  total_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_status CHECK (status IN ('PAID', 'SHIPPED', 'DONE', 'REFUNDED'))
);

-- Order Items 테이블
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  sku VARCHAR(100) NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Shipments 테이블
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  courier VARCHAR(50),
  tracking_no VARCHAR(100),
  tracking_url VARCHAR(500),
  shipment_photo VARCHAR(500),
  shipped_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cashbook 테이블
CREATE TABLE cashbook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  type VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'CNY',
  fx_rate DECIMAL(10,4),
  amount_krw DECIMAL(10,2),
  ref_type VARCHAR(50),
  ref_id UUID,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_type CHECK (type IN ('sale', 'inbound', 'shipping', 'adjustment', 'refund'))
);

-- Event Logs 테이블
CREATE TABLE event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_name VARCHAR(100),
  event VARCHAR(100) NOT NULL,
  ref_type VARCHAR(50),
  ref_id UUID,
  detail JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_orders_order_no ON orders(order_no);
CREATE INDEX idx_orders_customer ON orders(customer_name, customer_phone);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_shipments_order ON shipments(order_id);
CREATE INDEX idx_cashbook_date ON cashbook(date);
CREATE INDEX idx_cashbook_ref ON cashbook(ref_type, ref_id);
CREATE INDEX idx_event_logs_created ON event_logs(created_at);

-- 트리거 함수: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 적용
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 2. Prisma 스키마 생성
```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  name         String
  role         UserRole
  locale       String   @default("ko")
  active       Boolean  @default(true)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  
  @@map("users")
}

enum UserRole {
  Admin
  OrderManager
  ShipManager
}

model Product {
  id                 String      @id @default(uuid())
  sku                String      @unique
  category           String
  name               String
  model              String?
  color              String?
  brand              String?
  costCny            Decimal     @map("cost_cny")
  onHand             Int         @default(0) @map("on_hand")
  lowStockThreshold  Int         @default(5) @map("low_stock_threshold")
  active             Boolean     @default(true)
  createdAt          DateTime    @default(now()) @map("created_at")
  updatedAt          DateTime    @updatedAt @map("updated_at")
  
  orderItems         OrderItem[]
  
  @@index([sku])
  @@index([category])
  @@map("products")
}

model Order {
  id               String      @id @default(uuid())
  orderNo          String      @unique @map("order_no")
  customerName     String      @map("customer_name")
  customerPhone    String      @map("customer_phone")
  pcccCode         String?     @map("pccc_code")
  shippingAddress  String      @map("shipping_address")
  zipCode          String      @map("zip_code")
  memo             String?
  status           OrderStatus @default(PAID)
  totalAmount      Decimal     @map("total_amount")
  createdAt        DateTime    @default(now()) @map("created_at")
  updatedAt        DateTime    @updatedAt @map("updated_at")
  
  items            OrderItem[]
  shipments        Shipment[]
  
  @@index([orderNo])
  @@index([customerName, customerPhone])
  @@index([status])
  @@map("orders")
}

enum OrderStatus {
  PAID
  SHIPPED
  DONE
  REFUNDED
}

model OrderItem {
  id           String   @id @default(uuid())
  orderId      String   @map("order_id")
  productId    String   @map("product_id")
  sku          String
  productName  String   @map("product_name")
  quantity     Int
  unitPrice    Decimal  @map("unit_price")
  subtotal     Decimal
  createdAt    DateTime @default(now()) @map("created_at")
  
  order        Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product      Product  @relation(fields: [productId], references: [id])
  
  @@index([orderId])
  @@map("order_items")
}

model Shipment {
  id            String    @id @default(uuid())
  orderId       String    @map("order_id")
  courier       String?
  trackingNo    String?   @map("tracking_no")
  trackingUrl   String?   @map("tracking_url")
  shipmentPhoto String?   @map("shipment_photo")
  shippedAt     DateTime? @map("shipped_at")
  createdAt     DateTime  @default(now()) @map("created_at")
  
  order         Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  @@index([orderId])
  @@map("shipments")
}

model Cashbook {
  id         String           @id @default(uuid())
  date       DateTime
  type       TransactionType
  amount     Decimal
  currency   String           @default("CNY")
  fxRate     Decimal?         @map("fx_rate")
  amountKrw  Decimal?         @map("amount_krw")
  refType    String?          @map("ref_type")
  refId      String?          @map("ref_id")
  note       String?
  createdAt  DateTime         @default(now()) @map("created_at")
  
  @@index([date])
  @@index([refType, refId])
  @@map("cashbook")
}

enum TransactionType {
  sale
  inbound
  shipping
  adjustment
  refund
}

model EventLog {
  id         String   @id @default(uuid())
  actorId    String?  @map("actor_id")
  actorName  String?  @map("actor_name")
  event      String
  refType    String?  @map("ref_type")
  refId      String?  @map("ref_id")
  detail     Json?
  ipAddress  String?  @map("ip_address")
  userAgent  String?  @map("user_agent")
  createdAt  DateTime @default(now()) @map("created_at")
  
  @@index([createdAt])
  @@map("event_logs")
}
```

### 3. 데이터 마이그레이션 스크립트
```typescript
// scripts/migrate-data.ts
import { PrismaClient as OldPrisma } from './old-prisma-client';
import { PrismaClient as NewPrisma } from '@prisma/client';

const oldDb = new OldPrisma();
const newDb = new NewPrisma();

async function migrateProducts() {
  console.log('📦 상품 데이터 마이그레이션 시작...');
  
  const products = await oldDb.product.findMany();
  
  for (const product of products) {
    await newDb.product.create({
      data: {
        id: product.id,
        sku: product.sku || generateSKU(product), // SKU 없으면 생성
        category: product.category,
        name: product.name,
        model: product.model,
        color: product.color,
        brand: product.brand,
        costCny: product.cost_cny,
        onHand: product.on_hand,
        lowStockThreshold: product.low_stock_threshold || 5,
        active: product.active,
        createdAt: product.created_at,
      }
    });
  }
  
  console.log(`✅ ${products.length}개 상품 마이그레이션 완료`);
}

async function migrateOrders() {
  console.log('📋 주문 데이터 마이그레이션 시작...');
  
  const orders = await oldDb.order.findMany({
    include: { order_items: true }
  });
  
  for (const order of orders) {
    // 주문 생성
    await newDb.order.create({
      data: {
        id: order.id,
        orderNo: order.order_no || generateOrderNo(order.created_at),
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        pcccCode: order.pccc_code,
        shippingAddress: order.shipping_address,
        zipCode: order.zip_code,
        memo: order.memo,
        status: order.status,
        totalAmount: order.total_amount,
        createdAt: order.created_at,
        items: {
          create: order.order_items.map(item => ({
            productId: item.product_id,
            sku: item.sku,
            productName: item.product_name,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            subtotal: item.subtotal,
          }))
        }
      }
    });
  }
  
  console.log(`✅ ${orders.length}개 주문 마이그레이션 완료`);
}

async function migrateCashbook() {
  console.log('💰 출납장부 데이터 마이그레이션 시작...');
  
  const entries = await oldDb.cashbook.findMany();
  
  for (const entry of entries) {
    await newDb.cashbook.create({
      data: {
        id: entry.id,
        date: entry.date,
        type: entry.type,
        amount: entry.amount,
        currency: entry.currency,
        fxRate: entry.fx_rate,
        amountKrw: entry.amount_krw || calculateKRW(entry.amount, entry.fx_rate),
        refType: entry.ref_type,
        refId: entry.ref_id,
        note: entry.note,
        createdAt: entry.created_at,
      }
    });
  }
  
  console.log(`✅ ${entries.length}개 출납 기록 마이그레이션 완료`);
}

// 헬퍼 함수들
function generateSKU(product: any): string {
  const hash = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${product.category}-${product.model}-${product.color}-${product.brand}-${hash}`;
}

function generateOrderNo(date: Date): string {
  const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
  const sequence = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${dateStr}-${sequence}`;
}

function calculateKRW(amount: number, fxRate?: number): number {
  const rate = fxRate || 180; // 기본 환율
  return Math.round(amount * rate);
}

// 메인 실행
async function main() {
  try {
    await migrateProducts();
    await migrateOrders();
    await migrateCashbook();
    
    console.log('🎉 모든 데이터 마이그레이션 완료!');
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  } finally {
    await oldDb.$disconnect();
    await newDb.$disconnect();
  }
}

main();
```

## 🛠️ 유틸리티 코드 추출

### 1. 비즈니스 로직 생성기
```typescript
// scripts/generate-business-logic.ts

import fs from 'fs';
import path from 'path';

const businessLogicTemplates = {
  skuGenerator: `
export class SKUGenerator {
  private static readonly SEPARATOR = '-';
  
  static generate(props: {
    category: string;
    model: string;
    color: string;
    brand: string;
  }): string {
    const parts = [
      props.category.toUpperCase(),
      props.model.replace(/\\s+/g, ''),
      props.color.toUpperCase(),
      props.brand.replace(/\\s+/g, ''),
      this.generateHash()
    ];
    
    return parts.join(this.SEPARATOR);
  }
  
  private static generateHash(): string {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
  }
}`,

  orderNumberGenerator: `
export class OrderNumberGenerator {
  private static counter = new Map<string, number>();
  
  static async generate(): Promise<string> {
    const date = new Date();
    const dateKey = this.getDateKey(date);
    
    // 일별 카운터 관리
    let sequence = this.counter.get(dateKey) || 0;
    sequence++;
    this.counter.set(dateKey, sequence);
    
    // 자정에 카운터 리셋
    if (sequence === 1) {
      this.cleanOldCounters(dateKey);
    }
    
    return \`ORD-\${dateKey}-\${sequence.toString().padStart(3, '0')}\`;
  }
  
  private static getDateKey(date: Date): string {
    const year = date.getFullYear().toString().slice(2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return \`\${year}\${month}\${day}\`;
  }
  
  private static cleanOldCounters(currentKey: string): void {
    for (const key of this.counter.keys()) {
      if (key !== currentKey) {
        this.counter.delete(key);
      }
    }
  }
}`,

  inventoryService: `
export class InventoryService {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly eventBus: EventBus
  ) {}
  
  async validateStock(items: OrderItem[]): Promise<ValidationResult> {
    const errors: string[] = [];
    
    for (const item of items) {
      const product = await this.productRepo.findById(item.productId);
      
      if (!product) {
        errors.push(\`Product \${item.productId} not found\`);
        continue;
      }
      
      if (product.onHand < item.quantity) {
        errors.push(
          \`Insufficient stock for \${product.name}: ` +
          \`requested \${item.quantity}, available \${product.onHand}\`
        );
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  async deductStock(items: OrderItem[]): Promise<void> {
    // 트랜잭션으로 처리
    await this.productRepo.transaction(async (tx) => {
      for (const item of items) {
        const product = await tx.findById(item.productId);
        
        if (product.onHand < item.quantity) {
          throw new InsufficientStockError(product.id, item.quantity, product.onHand);
        }
        
        await tx.updateStock(product.id, product.onHand - item.quantity);
        
        // 이벤트 발행
        await this.eventBus.publish(new StockDeductedEvent({
          productId: product.id,
          quantity: item.quantity,
          remaining: product.onHand - item.quantity
        }));
      }
    });
  }
  
  async restoreStock(items: OrderItem[]): Promise<void> {
    for (const item of items) {
      const product = await this.productRepo.findById(item.productId);
      await this.productRepo.updateStock(
        product.id,
        product.onHand + item.quantity
      );
      
      await this.eventBus.publish(new StockRestoredEvent({
        productId: product.id,
        quantity: item.quantity,
        remaining: product.onHand + item.quantity
      }));
    }
  }
}`,

  cashbookService: `
export class CashbookService {
  private readonly FX_RATE_CNY_TO_KRW = 180; // 기본 환율
  
  constructor(
    private readonly cashbookRepo: CashbookRepository,
    private readonly fxRateService: FXRateService
  ) {}
  
  async recordSale(order: Order): Promise<void> {
    const fxRate = await this.fxRateService.getRate('CNY', 'KRW');
    
    await this.cashbookRepo.create({
      date: new Date(),
      type: 'sale',
      amount: order.totalAmount,
      currency: 'CNY',
      fxRate: fxRate,
      amountKrw: order.totalAmount * fxRate,
      refType: 'order',
      refId: order.id,
      note: \`주문 \${order.orderNo} 매출\`
    });
  }
  
  async recordInbound(inbound: Inbound): Promise<void> {
    const fxRate = await this.fxRateService.getRate('CNY', 'KRW');
    
    await this.cashbookRepo.create({
      date: new Date(),
      type: 'inbound',
      amount: -inbound.totalCost, // 지출은 음수
      currency: 'CNY',
      fxRate: fxRate,
      amountKrw: -inbound.totalCost * fxRate,
      refType: 'inbound',
      refId: inbound.id,
      note: \`입고 비용\`
    });
  }
  
  async recordRefund(order: Order): Promise<void> {
    const fxRate = await this.fxRateService.getRate('CNY', 'KRW');
    
    await this.cashbookRepo.create({
      date: new Date(),
      type: 'refund',
      amount: -order.totalAmount, // 환불은 음수
      currency: 'CNY',
      fxRate: fxRate,
      amountKrw: -order.totalAmount * fxRate,
      refType: 'order',
      refId: order.id,
      note: \`주문 \${order.orderNo} 환불\`
    });
  }
}`
};

// 파일 생성
Object.entries(businessLogicTemplates).forEach(([name, content]) => {
  const filePath = path.join(process.cwd(), 'src/domain/services', `${name}.ts`);
  fs.writeFileSync(filePath, content.trim());
  console.log(`✅ Generated: ${filePath}`);
});
```

## 🚀 실행 스크립트

### 전체 마이그레이션 실행
```bash
#!/bin/bash
# run-migration.sh

echo "🚀 YUANDI-ERP 마이그레이션 시작"
echo "================================"

# 1. 새 프로젝트 생성
echo "1. 새 프로젝트 생성 중..."
npx create-next-app@14 yuandi-erp-v2 --typescript --tailwind --app --no-git

# 2. 디렉토리 구조 생성
echo "2. 프로젝트 구조 생성 중..."
cd yuandi-erp-v2
mkdir -p src/{domain,infrastructure,application,presentation}
mkdir -p src/domain/{models,services,repositories,events,types}
mkdir -p src/infrastructure/{database,api,cache,events}
mkdir -p src/application/{commands,queries,dto}
mkdir -p src/presentation/{components,hooks,stores,styles}

# 3. 패키지 설치
echo "3. 필수 패키지 설치 중..."
npm install prisma @prisma/client zod react-hook-form zustand @trpc/server @trpc/client
npm install -D vitest @testing-library/react playwright @types/node

# 4. 컴포넌트 마이그레이션
echo "4. UI 컴포넌트 마이그레이션 중..."
bash ../migrate-components.sh

# 5. 다국어 파일 마이그레이션
echo "5. 다국어 파일 마이그레이션 중..."
bash ../migrate-i18n.sh

# 6. 타입 추출
echo "6. 타입 정의 추출 중..."
bash ../extract-types.sh

# 7. Prisma 설정
echo "7. Prisma 설정 중..."
npx prisma init
cp ../prisma/schema.prisma ./prisma/

# 8. Docker 설정
echo "8. Docker 환경 설정 중..."
cp ../docker-compose.yml ./
mkdir -p docker/{development,production}
cp ../docker/development/Dockerfile ./docker/development/

# 9. 비즈니스 로직 생성
echo "9. 비즈니스 로직 템플릿 생성 중..."
npx ts-node ../scripts/generate-business-logic.ts

echo "================================"
echo "✅ 마이그레이션 완료!"
echo ""
echo "다음 단계:"
echo "1. cd yuandi-erp-v2"
echo "2. docker-compose up -d"
echo "3. npx prisma migrate dev"
echo "4. npm run dev"
```

## 📊 검증 체크리스트

### 마이그레이션 전 확인
- [ ] 기존 데이터베이스 백업 완료
- [ ] 환경 변수 준비 완료
- [ ] Docker 설치 확인

### 마이그레이션 후 검증
- [ ] 컴포넌트 임포트 경로 정상
- [ ] 다국어 파일 로드 정상
- [ ] 타입 정의 컴파일 성공
- [ ] Prisma 마이그레이션 성공
- [ ] 데이터 무결성 확인
- [ ] 비즈니스 로직 테스트 통과

---

*이 스크립트들은 기존 프로젝트의 재사용 가능한 부분을 효율적으로 마이그레이션합니다.*