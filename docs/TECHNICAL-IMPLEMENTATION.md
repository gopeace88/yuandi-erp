# 🔧 YUANDI-ERP 기술 구현 상세

## 📁 프로젝트 구조

```
/mnt/d/00.Projects/00.YUANDI-ERP/
├── app/                    # Next.js 14 App Router
│   ├── api/               # API Routes (31개)
│   ├── components/        # 컴포넌트
│   ├── dashboard/         # 대시보드 페이지들
│   ├── auth/             # 인증 페이지
│   └── track/            # 고객 조회 페이지
├── lib/                   # 핵심 비즈니스 로직
│   ├── supabase/         # DB 연결
│   ├── auth/             # 인증 로직
│   ├── i18n/             # 다국어
│   └── middleware/       # 미들웨어
├── components/            # 공통 컴포넌트
├── messages/              # 번역 파일
├── docs/                  # 문서
└── supabase/migrations/   # DB 스키마
```

## 🗄️ 데이터베이스 구현 상태

### Supabase 테이블 (생성 완료)
```sql
-- ✅ users 테이블
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  name VARCHAR(100),
  role VARCHAR(50), -- Admin, OrderManager, ShipManager
  locale VARCHAR(10), -- ko, zh-CN
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ✅ products 테이블  
CREATE TABLE products (
  id UUID PRIMARY KEY,
  sku VARCHAR(100) UNIQUE, -- ❌ 자동 생성 로직 미구현
  category VARCHAR(50),
  name VARCHAR(200),
  model VARCHAR(100),
  color VARCHAR(50),
  brand VARCHAR(100),
  cost_cny DECIMAL(10,2),
  on_hand INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ✅ orders 테이블
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  order_no VARCHAR(50) UNIQUE, -- ❌ 자동 생성 로직 미구현
  customer_name VARCHAR(100),
  customer_phone VARCHAR(20),
  pccc_code VARCHAR(20), -- ❌ 검증 로직 미구현
  shipping_address TEXT,
  zip_code VARCHAR(10),
  memo TEXT,
  status VARCHAR(20), -- PAID, SHIPPED, DONE, REFUNDED
  total_amount DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ✅ order_items 테이블
CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  product_id UUID REFERENCES products(id),
  sku VARCHAR(100),
  product_name VARCHAR(200),
  quantity INTEGER,
  unit_price DECIMAL(10,2),
  subtotal DECIMAL(10,2)
);

-- ✅ shipments 테이블
CREATE TABLE shipments (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  courier VARCHAR(50),
  tracking_no VARCHAR(100),
  tracking_url VARCHAR(500), -- ❌ 자동 생성 미구현
  shipment_photo VARCHAR(500), -- ❌ 업로드 미구현
  shipped_at TIMESTAMP
);

-- ✅ event_logs 테이블
CREATE TABLE event_logs (
  id UUID PRIMARY KEY,
  actor_id UUID,
  actor_name VARCHAR(100),
  event VARCHAR(100),
  ref_type VARCHAR(50),
  ref_id UUID,
  detail JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ⚠️ cashbook 테이블 (부분 구현)
CREATE TABLE cashbook (
  id UUID PRIMARY KEY,
  date DATE,
  type VARCHAR(20), -- sale, inbound, shipping, adjustment, refund
  amount DECIMAL(10,2),
  currency VARCHAR(3), -- CNY, KRW
  fx_rate DECIMAL(10,4), -- ❌ 환율 적용 미구현
  amount_krw DECIMAL(10,2),
  ref_type VARCHAR(50),
  ref_id UUID,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔌 API 구현 상세

### ✅ 완전 구현된 API

```typescript
// app/api/orders/route.ts
export async function POST(request: NextRequest) {
  // ✅ 주문 생성 API
  // ❌ 주문번호 자동 생성 누락
  // ❌ 재고 검증 누락
  // ❌ 재고 자동 차감 누락
  // ❌ Cashbook 자동 기록 누락
  
  const body = await request.json()
  const order = await supabase
    .from('orders')
    .insert({
      ...body,
      order_no: `TEMP-${Date.now()}`, // 임시 번호
      status: 'PAID'
    })
  
  return NextResponse.json(order)
}

// app/api/inventory/adjust/route.ts
export async function PATCH(request: NextRequest) {
  // ✅ 재고 조정 API
  // ❌ 트랜잭션 처리 누락
  // ❌ 이벤트 로그 누락
  
  const { product_id, quantity, reason } = await request.json()
  
  const result = await supabase
    .from('products')
    .update({ on_hand: quantity })
    .eq('id', product_id)
    
  return NextResponse.json(result)
}
```

### ⚠️ 부분 구현된 API

```typescript
// app/api/track/route.ts
export async function GET(request: NextRequest) {
  // ✅ 고객 조회 API
  // ✅ 이름 + 전화번호 검증
  // ❌ 최근 5건만 제한 누락
  
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')
  const phone = searchParams.get('phone')
  
  const orders = await supabase
    .from('orders')
    .select('*')
    .eq('customer_name', name)
    .eq('customer_phone', phone)
    // .limit(5) // 누락
    .order('created_at', { ascending: false })
    
  return NextResponse.json(orders)
}
```

## 🎨 UI 컴포넌트 구현

### ✅ 완성된 컴포넌트

```typescript
// components/ui/language-switcher.tsx
export function LanguageSwitcher() {
  // ✅ 언어 전환 기능
  // ✅ localStorage 저장
  // ✅ 실시간 UI 업데이트
  
  const [locale, setLocale] = useState<'ko' | 'zh-CN'>('ko')
  
  const handleChange = (newLocale: string) => {
    setLocale(newLocale)
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale)
    window.dispatchEvent(new CustomEvent('localeChange', { 
      detail: { locale: newLocale } 
    }))
  }
  
  return (
    <select value={locale} onChange={(e) => handleChange(e.target.value)}>
      <option value="ko">한국어</option>
      <option value="zh-CN">中文</option>
    </select>
  )
}
```

### ❌ 미구현 컴포넌트

```typescript
// components/forms/address-input.tsx (미구현)
export function AddressInput() {
  // ❌ Daum 우편번호 API 연동 필요
  // <script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js">
  
  const handleSearch = () => {
    new daum.Postcode({
      oncomplete: (data) => {
        // 주소 처리
      }
    }).open()
  }
}

// components/forms/pccc-input.tsx (미구현)
export function PCCCInput() {
  // ❌ 해외통관부호 검증
  // 형식: P + 12자리 숫자
  // 예: P123456789012
}
```

## 🌍 다국어 구현

### ✅ 구현 완료
```typescript
// messages/ko.ts
export const ko = {
  common: {
    dashboard: "대시보드",
    orders: "주문 관리",
    inventory: "재고 관리",
    // ... 200+ 번역 키
  },
  orders: {
    orderNo: "주문번호",
    customerName: "고객명",
    status: {
      paid: "결제완료",
      shipped: "배송중",
      done: "완료",
      refunded: "환불"
    }
  }
}

// messages/zh-CN.ts
export const zhCN = {
  common: {
    dashboard: "仪表板",
    orders: "订单管理",
    inventory: "库存管理",
    // ... 200+ 번역 키
  }
}
```

## 🔐 인증 및 권한

### ✅ 구현 완료
```typescript
// lib/auth/session.ts
export async function getServerSession() {
  const cookieStore = cookies()
  const token = cookieStore.get('auth-token')
  
  if (!token) return null
  
  try {
    const payload = jwt.verify(token.value, SESSION_SECRET)
    return payload as SessionUser
  } catch {
    return null
  }
}

// middleware.ts
export async function middleware(request: NextRequest) {
  const session = await getServerSession()
  
  // 보호된 라우트 체크
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect('/auth/signin')
    }
  }
  
  // 권한별 접근 제어
  if (request.nextUrl.pathname.startsWith('/dashboard/users')) {
    if (session.role !== 'Admin') {
      return NextResponse.redirect('/dashboard')
    }
  }
}
```

## 📊 차트 구현 (Recharts)

### ✅ SSR 문제 해결
```typescript
// app/components/dashboard/sales-chart-wrapper.tsx
const SalesChart = dynamic(
  () => import('./sales-chart').then(mod => mod.SalesChart),
  { 
    ssr: false, // SSR 비활성화로 "self is not defined" 해결
    loading: () => <div>Loading...</div>
  }
)
```

## 🚀 배포 설정

### ✅ Vercel 최적화
```javascript
// next.config.js
{
  output: 'standalone',
  transpilePackages: ['recharts'],
  experimental: {
    serverActions: { 
      allowedOrigins: ['*'],
      bodySizeLimit: '2mb'
    }
  }
}

// vercel.json
{
  "buildCommand": "pnpm build",
  "installCommand": "pnpm i --frozen-lockfile",
  "nodeVersion": "20.x"
}
```

### ✅ Docker 설정
```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci --legacy-peer-deps
RUN npm run build

FROM node:20-alpine AS runner
COPY --from=builder /app/.next/standalone ./
EXPOSE 3000
CMD ["node", "server.js"]
```

## 🐛 알려진 버그 및 이슈

1. **엑셀 내보내기 비활성화**
   - 원인: xlsx 라이브러리가 Vercel 빌드 실패 야기
   - 상태: API는 503 에러 반환

2. **재고 차감 미동작**
   - 원인: 비즈니스 로직 미구현
   - 영향: 주문 생성해도 재고 변화 없음

3. **주문번호 중복 가능**
   - 원인: 자동 생성 로직 없음
   - 현재: `TEMP-${timestamp}` 사용

4. **파일 업로드 미구현**
   - Supabase Storage 연동 필요
   - 송장 사진 업로드 불가

## 📝 코드 품질 지표

- **TypeScript 커버리지**: 95%
- **ESLint 에러**: 0
- **테스트 커버리지**: 0% (테스트 미작성)
- **빌드 시간**: 1-2분
- **번들 크기**: ~500KB

## 🔄 마이그레이션 가이드

### 새 프로젝트로 시작 시:
```bash
# 1. 기존 코드 복사
cp -r app/components new-project/
cp -r lib/supabase new-project/
cp -r messages new-project/

# 2. 비즈니스 로직 우선 구현
- [ ] SKU 생성기
- [ ] 주문번호 생성기
- [ ] 재고 관리자
- [ ] 출납장부 서비스

# 3. 테스트 작성
- [ ] 단위 테스트
- [ ] 통합 테스트
- [ ] E2E 테스트

# 4. Docker 기반 배포
docker build -t yuandi-erp .
docker run -p 3000:3000 yuandi-erp
```

---

*이 문서는 실제 소스 코드를 분석하여 작성되었습니다.*