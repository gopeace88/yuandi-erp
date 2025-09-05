# YUANDI ERP - 성능 최적화 가이드

## 📋 목차
1. [성능 목표 및 지표](#성능-목표-및-지표)
2. [프론트엔드 최적화](#프론트엔드-최적화)
3. [백엔드 최적화](#백엔드-최적화)
4. [데이터베이스 최적화](#데이터베이스-최적화)
5. [네트워크 최적화](#네트워크-최적화)
6. [모니터링 및 프로파일링](#모니터링-및-프로파일링)

---

## 🎯 성능 목표 및 지표

### Core Web Vitals 목표
| 지표 | 목표 | 현재 | 상태 |
|------|------|------|------|
| **LCP** (Largest Contentful Paint) | < 2.5s | 2.1s | ✅ |
| **FID** (First Input Delay) | < 100ms | 45ms | ✅ |
| **CLS** (Cumulative Layout Shift) | < 0.1 | 0.05 | ✅ |
| **TTFB** (Time to First Byte) | < 600ms | 380ms | ✅ |
| **FCP** (First Contentful Paint) | < 1.8s | 1.2s | ✅ |

### 애플리케이션 성능 목표
```yaml
API Response Time:
  P50: < 100ms
  P95: < 500ms
  P99: < 1000ms

Database Query Time:
  Simple: < 10ms
  Complex: < 100ms
  Report: < 1000ms

Page Load Time:
  Home: < 1s
  Dashboard: < 2s
  Data Tables: < 3s

Concurrent Users:
  Minimum: 100
  Target: 500
  Maximum: 1000
```

---

## ⚡ 프론트엔드 최적화

### 1. 번들 크기 최적화

#### 코드 분할 (Code Splitting)
```typescript
// ❌ Bad: 모든 컴포넌트를 한번에 로드
import { OrderModal } from '@/components/orders/order-modal'
import { ProductModal } from '@/components/products/product-modal'
import { ReportViewer } from '@/components/reports/report-viewer'

// ✅ Good: Dynamic import로 필요할 때만 로드
const OrderModal = dynamic(() => 
  import('@/components/orders/order-modal'),
  { 
    loading: () => <Skeleton />,
    ssr: false 
  }
)

const ProductModal = lazy(() => 
  import('@/components/products/product-modal')
)
```

#### 번들 분석 및 최적화
```bash
# 번들 크기 분석
npm run analyze

# 사용하지 않는 의존성 제거
npm prune --production

# Tree shaking 확인
npm run build -- --stats
```

#### 의존성 최적화
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@tremor/react',
      'date-fns',
      'lodash'
    ]
  },
  
  // Webpack 설정
  webpack: (config, { webpack }) => {
    // 번들 크기 최소화
    config.plugins.push(
      new webpack.optimize.MinChunkSizePlugin({
        minChunkSize: 10000
      })
    )
    
    // 모듈 연결 최적화
    config.optimization = {
      ...config.optimization,
      concatenateModules: true,
      usedExports: true,
      sideEffects: false
    }
    
    return config
  }
}
```

### 2. 이미지 최적화

#### Next.js Image 컴포넌트 활용
```typescript
// ❌ Bad
<img src="/product.jpg" alt="Product" />

// ✅ Good
import Image from 'next/image'

<Image
  src="/product.jpg"
  alt="Product"
  width={500}
  height={300}
  placeholder="blur"
  blurDataURL={blurDataUrl}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  priority={isAboveFold}
/>
```

#### 이미지 포맷 최적화
```javascript
// next.config.js
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1년
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
  }
}
```

### 3. 렌더링 최적화

#### React 컴포넌트 최적화
```typescript
// ❌ Bad: 불필요한 리렌더링
const ProductList = ({ products, filters }) => {
  const filteredProducts = products.filter(p => /* filter logic */)
  return <div>{/* render */}</div>
}

// ✅ Good: Memoization 활용
const ProductList = memo(({ products, filters }) => {
  const filteredProducts = useMemo(
    () => products.filter(p => /* filter logic */),
    [products, filters]
  )
  
  const handleClick = useCallback((id) => {
    // handle click
  }, [])
  
  return <div>{/* render */}</div>
})
```

#### Virtual Scrolling
```typescript
// 대량 데이터 렌더링 최적화
import { FixedSizeList } from 'react-window'

const LargeList = ({ items }) => (
  <FixedSizeList
    height={600}
    itemCount={items.length}
    itemSize={80}
    width="100%"
  >
    {({ index, style }) => (
      <div style={style}>
        {items[index].name}
      </div>
    )}
  </FixedSizeList>
)
```

### 4. 상태 관리 최적화

#### React Query 캐싱 전략
```typescript
// lib/react-query.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 캐시 시간 설정
      staleTime: 5 * 60 * 1000, // 5분
      gcTime: 10 * 60 * 1000, // 10분
      
      // 리페치 전략
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      refetchOnMount: true,
      
      // 재시도 전략
      retry: (failureCount, error) => {
        if (error.status === 404) return false
        return failureCount < 3
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
    },
    mutations: {
      // Optimistic updates
      onMutate: async () => {
        await queryClient.cancelQueries()
      },
      onError: (err, variables, recover) => {
        recover()
      }
    }
  }
})
```

---

## 🚀 백엔드 최적화

### 1. API 응답 최적화

#### 페이지네이션 구현
```typescript
// app/api/orders/route.ts
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const offset = (page - 1) * limit
  
  const { data, count } = await supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false })
  
  return NextResponse.json({
    data,
    meta: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    }
  })
}
```

#### 필드 선택 최적화
```typescript
// ❌ Bad: 모든 필드 가져오기
const { data } = await supabase
  .from('orders')
  .select('*')

// ✅ Good: 필요한 필드만 선택
const { data } = await supabase
  .from('orders')
  .select(`
    id,
    order_no,
    customer_name,
    total_amount,
    status,
    created_at
  `)
```

### 2. 미들웨어 최적화

#### 캐싱 미들웨어
```typescript
// middleware/cache.ts
const cache = new Map()

export function withCache(handler: Function, ttl = 60) {
  return async (req: NextRequest) => {
    const key = req.url
    const cached = cache.get(key)
    
    if (cached && cached.expires > Date.now()) {
      return new Response(cached.data, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': `public, max-age=${ttl}`
        }
      })
    }
    
    const response = await handler(req)
    const data = await response.text()
    
    cache.set(key, {
      data,
      expires: Date.now() + ttl * 1000
    })
    
    return new Response(data, {
      headers: {
        ...response.headers,
        'X-Cache': 'MISS',
        'Cache-Control': `public, max-age=${ttl}`
      }
    })
  }
}
```

### 3. Edge Functions 활용

```typescript
// app/api/track/route.ts
export const runtime = 'edge' // Edge Runtime 사용

export async function GET(request: Request) {
  // Edge에서 실행되는 빠른 응답
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')
  const phone = searchParams.get('phone')
  
  // Supabase Edge Function 호출
  const response = await fetch(`${SUPABASE_URL}/functions/v1/track`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, phone })
  })
  
  return response
}
```

---

## 🗄️ 데이터베이스 최적화

### 1. 인덱스 전략

#### 효과적인 인덱스 생성
```sql
-- 자주 조회되는 컬럼에 인덱스
CREATE INDEX idx_orders_status ON orders(status) WHERE status != 'DONE';
CREATE INDEX idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- 복합 인덱스 (순서 중요!)
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);

-- 부분 인덱스 (특정 조건만)
CREATE INDEX idx_products_low_stock ON products(on_hand) 
WHERE on_hand < low_stock_threshold;

-- 함수 기반 인덱스
CREATE INDEX idx_orders_date ON orders(DATE(created_at));

-- JSON 필드 인덱스
CREATE INDEX idx_products_metadata ON products USING GIN (metadata);
```

#### 인덱스 사용 분석
```sql
-- 쿼리 실행 계획 확인
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM orders 
WHERE status = 'PAID' 
ORDER BY created_at DESC 
LIMIT 20;

-- 인덱스 사용 통계
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- 누락된 인덱스 찾기
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.1
ORDER BY n_distinct DESC;
```

### 2. 쿼리 최적화

#### N+1 문제 해결
```typescript
// ❌ Bad: N+1 queries
const orders = await db.orders.findMany()
for (const order of orders) {
  order.items = await db.orderItems.findMany({
    where: { orderId: order.id }
  })
}

// ✅ Good: Single query with join
const orders = await supabase
  .from('orders')
  .select(`
    *,
    order_items (*)
  `)
```

#### 집계 쿼리 최적화
```sql
-- Materialized View 활용
CREATE MATERIALIZED VIEW daily_sales_summary AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as order_count,
  SUM(total_amount) as total_sales,
  AVG(total_amount) as avg_order_value,
  COUNT(DISTINCT customer_phone) as unique_customers
FROM orders
GROUP BY DATE(created_at)
WITH DATA;

-- 인덱스 추가
CREATE UNIQUE INDEX ON daily_sales_summary(date);

-- 자동 새로고침 설정
CREATE OR REPLACE FUNCTION refresh_daily_sales()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_summary;
END;
$$ LANGUAGE plpgsql;

-- CRON 작업 설정 (Supabase)
SELECT cron.schedule(
  'refresh-daily-sales',
  '0 0 * * *', -- 매일 자정
  'SELECT refresh_daily_sales()'
);
```

### 3. Connection Pooling

```javascript
// lib/supabase/connection-pool.ts
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // 최대 연결 수
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  statement_timeout: 30000,
  query_timeout: 30000,
  
  // Connection pooling 설정
  poolSize: 10,
  poolIdleTimeout: 30000,
  poolReapIntervalMillis: 1000,
  
  // SSL 설정
  ssl: {
    rejectUnauthorized: false
  }
})

// Health check
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err)
})

export default pool
```

---

## 🌐 네트워크 최적화

### 1. CDN 및 캐싱

#### Vercel Edge Config
```javascript
// vercel.json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=60, stale-while-revalidate"
        }
      ]
    },
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ]
}
```

### 2. 압축 설정

```javascript
// next.config.js
module.exports = {
  compress: true,
  poweredByHeader: false,
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Encoding',
            value: 'gzip'
          }
        ]
      }
    ]
  }
}
```

### 3. Prefetching 전략

```typescript
// 링크 프리페칭
import Link from 'next/link'

<Link href="/orders" prefetch={true}>
  Orders
</Link>

// 데이터 프리페칭
const prefetchOrders = async () => {
  await queryClient.prefetchQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
    staleTime: 10 * 60 * 1000
  })
}

// 라우트 변경 시 프리페칭
useEffect(() => {
  router.prefetch('/dashboard')
  router.prefetch('/orders')
}, [router])
```

---

## 📊 모니터링 및 프로파일링

### 1. 성능 모니터링 설정

#### Web Vitals 추적
```typescript
// pages/_app.tsx
export function reportWebVitals(metric: NextWebVitalsMetric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    id: metric.id,
    label: metric.label,
    startTime: metric.startTime
  })
  
  // Analytics로 전송
  if (window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.value),
      metric_id: metric.id,
      metric_value: metric.value,
      metric_delta: metric.delta,
    })
  }
  
  // 커스텀 모니터링 서버로 전송
  fetch('/api/analytics', {
    method: 'POST',
    body,
    keepalive: true
  })
}
```

### 2. 성능 프로파일링 도구

#### Chrome DevTools Performance
```javascript
// 성능 마킹
performance.mark('myComponent-start')
// ... component logic
performance.mark('myComponent-end')
performance.measure('myComponent', 'myComponent-start', 'myComponent-end')

// 결과 로깅
const measure = performance.getEntriesByName('myComponent')[0]
console.log(`Component took ${measure.duration}ms`)
```

#### React DevTools Profiler
```typescript
import { Profiler } from 'react'

function onRenderCallback(id, phase, actualDuration) {
  console.log(`${id} (${phase}) took ${actualDuration}ms`)
}

<Profiler id="OrderList" onRender={onRenderCallback}>
  <OrderList />
</Profiler>
```

### 3. 자동화된 성능 테스트

```javascript
// test/performance/lighthouse.js
const lighthouse = require('lighthouse')
const chromeLauncher = require('chrome-launcher')

async function runLighthouse(url) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] })
  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance'],
    port: chrome.port
  }
  
  const runnerResult = await lighthouse(url, options)
  
  // 성능 점수 확인
  const performanceScore = runnerResult.lhr.categories.performance.score * 100
  
  if (performanceScore < 90) {
    throw new Error(`Performance score too low: ${performanceScore}`)
  }
  
  await chrome.kill()
  return runnerResult.lhr
}
```

---

## 📈 성능 체크리스트

### 초기 로드 최적화
- [ ] 번들 크기 < 500KB
- [ ] 코드 분할 구현
- [ ] Critical CSS 인라인
- [ ] 폰트 프리로드
- [ ] 이미지 최적화 (WebP/AVIF)
- [ ] Lazy Loading 구현

### 런타임 최적화
- [ ] React 컴포넌트 메모이제이션
- [ ] Virtual Scrolling 구현
- [ ] Debounce/Throttle 적용
- [ ] Web Workers 활용
- [ ] Service Worker 캐싱

### 백엔드 최적화
- [ ] API 응답 캐싱
- [ ] 데이터베이스 인덱스
- [ ] Connection Pooling
- [ ] Query 최적화
- [ ] Edge Functions 활용

### 네트워크 최적화
- [ ] CDN 설정
- [ ] Gzip 압축
- [ ] HTTP/2 Push
- [ ] Resource Hints
- [ ] 캐시 정책 설정

---

## 🎯 성능 목표 달성 전략

### Phase 1: Quick Wins (1주)
1. 이미지 최적화
2. 번들 크기 감소
3. 캐싱 헤더 설정
4. 데이터베이스 인덱스

### Phase 2: Core Optimization (2주)
1. 코드 분할 구현
2. API 응답 캐싱
3. React 컴포넌트 최적화
4. Query 최적화

### Phase 3: Advanced (1개월)
1. Service Worker 구현
2. Edge Functions 마이그레이션
3. Materialized Views
4. 실시간 모니터링

---

최종 업데이트: 2024년 8월