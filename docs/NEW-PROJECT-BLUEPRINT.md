# 🎯 YUANDI-ERP 새 프로젝트 블루프린트

> 현재 구현의 문제점을 해결하고 처음부터 올바르게 시작하기 위한 설계도

## 📋 핵심 문제 해결 전략

### 1. 비즈니스 로직 우선 개발
**현재 문제**: UI는 100% 완성되었지만 비즈니스 로직은 33%만 구현
**해결책**: Domain-Driven Design으로 비즈니스 로직부터 구현

```typescript
// 1단계: 도메인 모델 정의
// src/domain/models/Product.ts
export class Product {
  private constructor(
    public readonly id: string,
    public readonly sku: string,
    public readonly category: string,
    public readonly name: string,
    public readonly onHand: number
  ) {}

  static create(props: CreateProductProps): Product {
    const sku = SKUGenerator.generate(props);
    return new Product(uuid(), sku, props.category, props.name, 0);
  }

  canFulfillOrder(quantity: number): boolean {
    return this.onHand >= quantity;
  }
}

// 2단계: 비즈니스 서비스 구현
// src/domain/services/InventoryService.ts
export class InventoryService {
  async deductStock(productId: string, quantity: number): Promise<void> {
    const product = await this.repo.findById(productId);
    
    if (!product.canFulfillOrder(quantity)) {
      throw new InsufficientStockError(productId, quantity, product.onHand);
    }
    
    await this.repo.updateStock(productId, product.onHand - quantity);
    await this.eventBus.publish(new StockDeductedEvent(productId, quantity));
  }
}
```

### 2. 테스트 주도 개발 (TDD)
**현재 문제**: 테스트 커버리지 0%
**해결책**: 비즈니스 로직부터 테스트 작성

```typescript
// src/domain/services/__tests__/OrderService.test.ts
describe('OrderService', () => {
  describe('createOrder', () => {
    it('should generate order number with correct pattern', async () => {
      const order = await orderService.createOrder({...});
      expect(order.orderNo).toMatch(/^ORD-\d{6}-\d{3}$/);
    });

    it('should deduct inventory automatically', async () => {
      const initialStock = 10;
      await orderService.createOrder({
        items: [{ productId: 'P1', quantity: 3 }]
      });
      
      const product = await productRepo.findById('P1');
      expect(product.onHand).toBe(initialStock - 3);
    });

    it('should record in cashbook automatically', async () => {
      const order = await orderService.createOrder({...});
      const entry = await cashbookRepo.findByRefId(order.id);
      
      expect(entry.type).toBe('sale');
      expect(entry.amount).toBe(order.totalAmount);
    });
  });
});
```

## 🏗️ 권장 아키텍처

### 기술 스택 재선정
```yaml
Frontend:
  Framework: Next.js 14 (유지)
  State: Zustand (Context API 대신)
  Forms: React Hook Form + Zod
  Testing: Vitest + React Testing Library

Backend:
  ORM: Prisma (Supabase SDK 대신)
  Database: PostgreSQL (직접 연결)
  Validation: Zod
  Testing: Vitest

Infrastructure:
  Container: Docker (처음부터)
  CI/CD: GitHub Actions
  Deployment: Docker Compose (개발/스테이징)
  Production: Kubernetes 또는 Managed Container Service
```

### 프로젝트 구조
```
yuandi-erp-v2/
├── src/
│   ├── domain/           # 비즈니스 로직 (프레임워크 독립)
│   │   ├── models/       # 도메인 모델
│   │   ├── services/     # 비즈니스 서비스
│   │   ├── events/       # 도메인 이벤트
│   │   └── repositories/ # Repository 인터페이스
│   │
│   ├── infrastructure/   # 기술적 구현
│   │   ├── database/     # Prisma, Repository 구현
│   │   ├── api/         # API Routes
│   │   ├── cache/       # Redis 캐싱
│   │   └── events/      # 이벤트 버스 구현
│   │
│   ├── application/      # 애플리케이션 서비스
│   │   ├── commands/    # Command Handlers
│   │   ├── queries/     # Query Handlers
│   │   └── dto/         # Data Transfer Objects
│   │
│   └── presentation/     # UI 레이어
│       ├── components/  # React 컴포넌트
│       ├── hooks/       # Custom Hooks
│       ├── stores/      # Zustand Stores
│       └── styles/      # Tailwind 설정
│
├── tests/
│   ├── unit/           # 단위 테스트
│   ├── integration/    # 통합 테스트
│   └── e2e/           # E2E 테스트 (Playwright)
│
└── docker/
    ├── development/    # 개발 환경
    └── production/    # 프로덕션 환경
```

## 🔑 핵심 비즈니스 로직 구현 순서

### Phase 1: 도메인 모델 (1주차)
```typescript
// 필수 구현 항목
1. SKUGenerator
   - 패턴: [카테고리]-[모델]-[색상]-[브랜드]-[HASH5]
   - 중복 방지 로직
   - 테스트 커버리지 100%

2. OrderNumberGenerator
   - 패턴: ORD-YYMMDD-###
   - 일별 카운터 리셋
   - 타임존: Asia/Seoul
   - 동시성 처리

3. InventoryManager
   - 재고 검증
   - 자동 차감/복구
   - 트랜잭션 보장
   - 이벤트 발행

4. CashbookService
   - 자동 기록 (sale, inbound, shipping, refund)
   - 환율 적용 (CNY ↔ KRW)
   - 일일 정산
```

### Phase 2: 인프라 구현 (2주차)
```typescript
// Repository Pattern 구현
export interface ProductRepository {
  findById(id: string): Promise<Product>;
  findBySKU(sku: string): Promise<Product>;
  save(product: Product): Promise<void>;
  updateStock(id: string, quantity: number): Promise<void>;
}

// Prisma 구현
export class PrismaProductRepository implements ProductRepository {
  constructor(private prisma: PrismaClient) {}
  
  async findById(id: string): Promise<Product> {
    const data = await this.prisma.product.findUnique({
      where: { id }
    });
    return ProductMapper.toDomain(data);
  }
}
```

### Phase 3: API 구현 (3주차)
```typescript
// tRPC로 타입 안전한 API
export const orderRouter = router({
  create: procedure
    .input(createOrderSchema)
    .mutation(async ({ input, ctx }) => {
      // 1. 재고 검증
      await ctx.inventory.validate(input.items);
      
      // 2. 주문 생성
      const order = await ctx.orders.create(input);
      
      // 3. 재고 차감 (트랜잭션)
      await ctx.inventory.deduct(input.items);
      
      // 4. 출납장부 기록
      await ctx.cashbook.record({
        type: 'sale',
        refId: order.id,
        amount: order.totalAmount
      });
      
      return order;
    })
});
```

## 🐳 Docker 기반 개발 환경

### docker-compose.yml
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: yuandi_erp
      POSTGRES_USER: yuandi
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  app:
    build: 
      context: .
      dockerfile: docker/development/Dockerfile
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://yuandi:${DB_PASSWORD}@postgres:5432/yuandi_erp
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
```

### Dockerfile (개발용)
```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# Dependencies
COPY package*.json ./
RUN npm ci

# Development
FROM base AS dev
ENV NODE_ENV=development
CMD ["npm", "run", "dev"]

# Production
FROM base AS prod
COPY . .
RUN npm run build
ENV NODE_ENV=production
CMD ["npm", "start"]
```

## 📊 마이그레이션 전략

### 재사용 가능한 코드
```typescript
// 1. UI 컴포넌트 (100% 재사용)
cp -r app/components new-project/src/presentation/components

// 2. 다국어 파일 (100% 재사용)
cp -r messages new-project/src/presentation/i18n

// 3. API 스키마 (수정 후 재사용)
// 기존 API를 tRPC 스키마로 변환
```

### 데이터 마이그레이션
```sql
-- 1. 스키마 내보내기
pg_dump -h old-db -U user -s yuandi > schema.sql

-- 2. 데이터 내보내기 (테스트용)
pg_dump -h old-db -U user -a -t products -t orders > data.sql

-- 3. 새 DB에 적용
psql -h new-db -U user yuandi < schema.sql
psql -h new-db -U user yuandi < data.sql
```

## ✅ 구현 체크리스트

### Week 1: 도메인 모델
- [ ] Product 도메인 모델 + 테스트
- [ ] Order 도메인 모델 + 테스트
- [ ] SKUGenerator 구현 + 테스트
- [ ] OrderNumberGenerator 구현 + 테스트
- [ ] InventoryService 구현 + 테스트
- [ ] CashbookService 구현 + 테스트

### Week 2: 인프라스트럭처
- [ ] Prisma 스키마 정의
- [ ] Repository 구현
- [ ] 이벤트 버스 구현
- [ ] Redis 캐싱 레이어
- [ ] Docker 환경 구성

### Week 3: API & 통합
- [ ] tRPC 라우터 구현
- [ ] 인증/인가 미들웨어
- [ ] 주문 생성 플로우 (재고→주문→출납)
- [ ] 통합 테스트
- [ ] E2E 테스트 시나리오

### Week 4: UI 마이그레이션
- [ ] 컴포넌트 이전
- [ ] Zustand 스토어 구현
- [ ] React Hook Form 통합
- [ ] 다국어 설정
- [ ] 프로덕션 배포

## 🚀 빠른 시작 명령어

```bash
# 1. 프로젝트 생성
npx create-next-app@14 yuandi-erp-v2 --typescript --tailwind --app

# 2. 도메인 모델 스캐폴딩
mkdir -p src/{domain,infrastructure,application,presentation}

# 3. 필수 패키지 설치
npm install prisma @prisma/client zod react-hook-form zustand
npm install -D vitest @testing-library/react playwright

# 4. Docker 환경 시작
docker-compose up -d

# 5. Prisma 초기화
npx prisma init
npx prisma migrate dev --name init

# 6. 개발 서버 시작
npm run dev
```

## 📈 성공 지표

### 기술적 지표
- 테스트 커버리지 > 80%
- 빌드 시간 < 2분
- API 응답 시간 < 200ms
- 재고 차감 정확도 100%

### 비즈니스 지표
- 주문 처리 시간 50% 단축
- 재고 오류 0건
- 출납장부 자동화 100%
- 고객 조회 응답 < 1초

## 🔄 점진적 마이그레이션 옵션

만약 새 프로젝트가 부담스럽다면:

### Option 1: 비즈니스 로직만 재구현
```bash
# 현재 프로젝트에 도메인 레이어 추가
mkdir -p lib/domain/{models,services,repositories}

# 핵심 로직부터 구현
- SKUGenerator
- OrderNumberGenerator  
- InventoryService
- CashbookService

# 기존 API에 통합
```

### Option 2: 병렬 운영
```bash
# 새 프로젝트를 별도로 구축
# 기존 시스템과 API 통신
# 점진적으로 기능 이전
```

---

*이 블루프린트는 현재 구현의 문제점을 해결하고 확장 가능한 아키텍처를 제공합니다.*