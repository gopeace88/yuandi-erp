# 성능 최적화 가이드

## 📊 현재 성능 측정 결과

### 응답 시간 분석
- **데이터베이스 쿼리**: 50ms (100개 주문 조회)
- **API 응답 시간**: 평균 100-200ms
- **페이지 로딩**: < 3초 (목표 달성)
- **동시 사용자**: 5-10명 처리 가능

## 🚀 성능 최적화 전략

### 1. 데이터베이스 최적화

#### 인덱스 추가
```sql
-- 자주 조회되는 컬럼에 인덱스 추가
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer ON orders(customer_name, customer_phone);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_stock ON products(on_hand);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_shipments_order ON shipments(order_id);
```

#### 쿼리 최적화
```typescript
// ❌ Before: N+1 쿼리 문제
const orders = await supabase.from('orders').select('*');
for (const order of orders) {
  const items = await supabase.from('order_items')
    .select('*')
    .eq('order_id', order.id);
}

// ✅ After: JOIN으로 한 번에 조회
const orders = await supabase
  .from('orders')
  .select(`
    *,
    order_items (*)
  `);
```

### 2. API 응답 최적화

#### 페이지네이션 구현
```typescript
// app/api/orders/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;
  
  const { data, count } = await supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });
    
  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit)
    }
  });
}
```

#### 선택적 필드 조회
```typescript
// 필요한 필드만 선택적으로 조회
const fields = searchParams.get('fields') || '*';
const { data } = await supabase
  .from('products')
  .select(fields); // 예: 'id,name,sku,on_hand'
```

### 3. 캐싱 전략

#### Redis 캐싱 (프로덕션)
```typescript
// lib/cache.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getCachedData(key: string) {
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  return null;
}

export async function setCachedData(key: string, data: any, ttl = 300) {
  await redis.setex(key, ttl, JSON.stringify(data));
}

// 사용 예시
export async function getDashboardSummary() {
  const cacheKey = 'dashboard:summary';
  let data = await getCachedData(cacheKey);
  
  if (!data) {
    data = await calculateDashboardSummary();
    await setCachedData(cacheKey, data, 60); // 1분 캐시
  }
  
  return data;
}
```

#### Next.js 캐싱
```typescript
// app/api/products/route.ts
import { unstable_cache } from 'next/cache';

const getCachedProducts = unstable_cache(
  async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    return data;
  },
  ['products'],
  { revalidate: 60 } // 60초마다 재검증
);
```

### 4. 프론트엔드 최적화

#### 코드 스플리팅
```typescript
// 동적 임포트로 번들 크기 감소
const DashboardChart = dynamic(
  () => import('@/components/dashboard/Chart'),
  { loading: () => <Skeleton /> }
);
```

#### 이미지 최적화
```typescript
// Next.js Image 컴포넌트 활용
import Image from 'next/image';

<Image
  src={product.image_url}
  alt={product.name}
  width={200}
  height={200}
  loading="lazy"
  placeholder="blur"
/>
```

#### React Query로 데이터 관리
```typescript
// hooks/useProducts.ts
import { useQuery } from '@tanstack/react-query';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000, // 5분
    cacheTime: 10 * 60 * 1000, // 10분
  });
}
```

### 5. 실시간 업데이트 최적화

#### Supabase Realtime 구독 관리
```typescript
// 필요한 테이블만 구독
useEffect(() => {
  const subscription = supabase
    .channel('orders')
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'orders',
        filter: 'status=eq.PAID' // 특정 조건만 구독
      },
      handleOrderChange
    )
    .subscribe();
    
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

### 6. 서버 사이드 최적화

#### Edge Functions 활용
```typescript
// Vercel Edge Functions으로 지연시간 감소
export const runtime = 'edge';

export async function GET() {
  // Edge에서 실행되는 가벼운 로직
}
```

#### 병렬 처리
```typescript
// Promise.all로 병렬 쿼리 실행
const [products, orders, customers] = await Promise.all([
  supabase.from('products').select('*'),
  supabase.from('orders').select('*'),
  supabase.from('customers').select('*')
]);
```

## 📈 성능 모니터링

### 1. Vercel Analytics
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### 2. 커스텀 성능 측정
```typescript
// utils/performance.ts
export function measurePerformance(name: string) {
  const start = performance.now();
  
  return () => {
    const duration = performance.now() - start;
    console.log(`${name} took ${duration}ms`);
    
    // 성능 메트릭 전송
    if (typeof window !== 'undefined') {
      window.gtag?.('event', 'timing_complete', {
        name,
        value: Math.round(duration),
      });
    }
  };
}
```

## 🎯 성능 목표

### 현재 달성
- ✅ 응답 시간: < 200ms
- ✅ 페이지 로드: < 3초
- ✅ 동시 사용자: 5-10명

### 향후 목표
- 응답 시간: < 100ms
- 페이지 로드: < 2초
- 동시 사용자: 50명+
- Lighthouse 점수: 90+

## 🔧 구현 우선순위

1. **즉시 적용 (Phase 1)**
   - 데이터베이스 인덱스 추가
   - API 페이지네이션
   - 기본 캐싱

2. **단기 개선 (Phase 2)**
   - React Query 도입
   - 이미지 최적화
   - 코드 스플리팅

3. **장기 개선 (Phase 3)**
   - Redis 캐싱
   - CDN 구성
   - 마이크로서비스 분리

## 📊 성능 테스트 명령어

```bash
# Lighthouse 테스트
npx lighthouse http://localhost:3000 --output html

# 부하 테스트
npx autocannon -c 10 -d 30 http://localhost:3000/api/products

# 번들 분석
npm run analyze
```

## 🚨 주의사항

1. **과도한 최적화 방지**: 측정 없는 최적화는 하지 않기
2. **캐시 무효화**: 데이터 변경 시 캐시 업데이트 필수
3. **모니터링**: 성능 개선 후 지속적인 모니터링
4. **사용자 경험**: 성능과 UX의 균형 유지