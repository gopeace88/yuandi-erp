# YUANDI ERP - 모니터링 및 유지보수 가이드

## 📋 목차
1. [모니터링 체계](#모니터링-체계)
2. [정기 유지보수](#정기-유지보수)
3. [성능 최적화](#성능-최적화)
4. [보안 관리](#보안-관리)
5. [백업 및 복구](#백업-및-복구)
6. [트러블슈팅](#트러블슈팅)

---

## 📊 모니터링 체계

### 1. 실시간 모니터링 대시보드

#### Vercel Analytics
```javascript
// 설정 위치: Vercel Dashboard > Analytics
{
  "metrics": [
    "Page Views",
    "Unique Visitors",
    "Average Visit Duration",
    "Bounce Rate",
    "Top Pages",
    "Top Referrers"
  ],
  "alerts": {
    "errorRate": "> 1%",
    "responseTime": "> 3s",
    "availability": "< 99.9%"
  }
}
```

#### Supabase Dashboard
- **Database Metrics**: 쿼리 성능, 연결 수, 스토리지 사용량
- **Auth Metrics**: 로그인 시도, 실패율, 활성 세션
- **Storage Metrics**: 용량 사용률, 대역폭, 요청 수

### 2. 핵심 성과 지표 (KPI)

#### 시스템 성능
| 지표 | 목표값 | 경고 임계값 | 측정 방법 |
|------|--------|------------|-----------|
| 응답 시간 | < 200ms | > 500ms | API 평균 응답 |
| 페이지 로드 | < 3s | > 5s | Core Web Vitals |
| 가용성 | 99.9% | < 99.5% | Uptime 모니터링 |
| 에러율 | < 0.1% | > 1% | 4xx/5xx 응답 |

#### 비즈니스 지표
| 지표 | 측정 주기 | 담당자 | 보고 대상 |
|------|----------|--------|----------|
| 일일 주문 수 | 매일 | 운영팀 | 경영진 |
| 재고 회전율 | 주간 | 재고팀 | 운영팀장 |
| 시스템 사용률 | 월간 | IT팀 | CTO |
| 데이터 정합성 | 일간 | DBA | IT팀장 |

### 3. 로그 관리

#### 로그 수집 설정
```typescript
// lib/logger.ts
import winston from 'winston'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
})

// 사용 예시
logger.error('Critical error', { 
  userId, 
  action, 
  error: err.message 
})
```

#### 로그 분석 체크리스트
- [ ] 일일 에러 로그 검토
- [ ] 비정상 패턴 감지
- [ ] 보안 이벤트 확인
- [ ] 성능 저하 징후 파악

---

## 🔧 정기 유지보수

### 일간 작업 (Daily)
```bash
# 1. 시스템 상태 확인
npm run health:check

# 2. 백업 확인
./scripts/verify-backup.sh

# 3. 로그 검토
tail -f logs/error.log

# 4. 대시보드 모니터링
# - Vercel Analytics
# - Supabase Dashboard
# - 비즈니스 대시보드
```

### 주간 작업 (Weekly)
```bash
# 1. 보안 업데이트 확인
npm audit
npm update --save

# 2. 데이터베이스 최적화
npm run db:optimize

# 3. 성능 리포트 생성
npm run performance:report

# 4. 백업 테스트
npm run backup:test
```

### 월간 작업 (Monthly)
```bash
# 1. 전체 시스템 감사
npm run system:audit

# 2. 용량 계획 검토
npm run capacity:planning

# 3. 보안 스캔
npm run security:scan

# 4. 문서 업데이트
npm run docs:update
```

### 분기별 작업 (Quarterly)
- [ ] 재해 복구 훈련
- [ ] 성능 벤치마크
- [ ] 보안 감사
- [ ] 아키텍처 리뷰

---

## ⚡ 성능 최적화

### 1. 데이터베이스 최적화

#### 인덱스 관리
```sql
-- 성능 저하 쿼리 확인
SELECT 
  query,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 누락된 인덱스 추가
CREATE INDEX CONCURRENTLY idx_orders_customer_phone 
ON orders(customer_phone);

CREATE INDEX CONCURRENTLY idx_products_sku 
ON products(sku);

-- 인덱스 사용률 확인
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan;
```

#### 테이블 유지보수
```sql
-- VACUUM 실행
VACUUM ANALYZE orders;
VACUUM ANALYZE products;
VACUUM ANALYZE inventory_movements;

-- 테이블 크기 확인
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::regclass) DESC;
```

### 2. 애플리케이션 최적화

#### 캐싱 전략
```typescript
// Redis 캐싱 구현
import { redis } from '@/lib/redis'

const CACHE_TTL = 60 * 5 // 5분

export async function getCachedData(key: string) {
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached)
  
  const data = await fetchFromDatabase()
  await redis.setex(key, CACHE_TTL, JSON.stringify(data))
  
  return data
}
```

#### 이미지 최적화
```javascript
// next.config.js
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30일
  }
}
```

### 3. 프론트엔드 최적화

#### 번들 크기 분석
```bash
# 번들 분석
npm run analyze

# 사용하지 않는 의존성 제거
npm prune

# Tree shaking 확인
npm run build -- --analyze
```

#### 코드 분할
```typescript
// 동적 임포트 사용
const HeavyComponent = dynamic(
  () => import('@/components/HeavyComponent'),
  { 
    loading: () => <Skeleton />,
    ssr: false 
  }
)
```

---

## 🔒 보안 관리

### 1. 보안 체크리스트

#### 일일 점검
- [ ] 로그인 실패 모니터링
- [ ] 비정상 접근 패턴 확인
- [ ] API 요청 제한 확인
- [ ] 에러 로그 내 민감정보 노출 확인

#### 주간 점검
- [ ] 보안 패치 업데이트
- [ ] 접근 권한 검토
- [ ] SSL 인증서 상태
- [ ] 의존성 취약점 스캔

#### 월간 점검
- [ ] 전체 보안 감사
- [ ] 침투 테스트
- [ ] 백업 암호화 확인
- [ ] 접근 로그 분석

### 2. 보안 정책

#### 패스워드 정책
```typescript
const passwordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAge: 90, // days
  history: 5, // 이전 패스워드 재사용 금지
}
```

#### API 보안
```typescript
// Rate limiting
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 요청 수
  message: 'Too many requests'
})

// CORS 설정
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true,
  optionsSuccessStatus: 200
}
```

### 3. 보안 사고 대응

#### 사고 대응 절차
1. **탐지**: 보안 이벤트 감지
2. **격리**: 영향받은 시스템 격리
3. **조사**: 원인 및 영향 범위 파악
4. **복구**: 시스템 복구 및 패치
5. **보고**: 사고 보고서 작성
6. **개선**: 재발 방지 대책 수립

---

## 💾 백업 및 복구

### 1. 백업 전략

#### 백업 스케줄
| 유형 | 주기 | 보관 기간 | 저장 위치 |
|------|------|----------|----------|
| 전체 백업 | 일간 | 30일 | AWS S3 |
| 증분 백업 | 시간별 | 7일 | Supabase |
| 트랜잭션 로그 | 실시간 | 14일 | 로컬+원격 |
| 스냅샷 | 주간 | 90일 | 별도 리전 |

#### 자동 백업 스크립트
```bash
#!/bin/bash
# scripts/backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# 데이터베이스 백업
pg_dump $DATABASE_URL > "$BACKUP_DIR/db_$DATE.sql"

# 파일 백업
tar -czf "$BACKUP_DIR/files_$DATE.tar.gz" ./public/uploads

# S3 업로드
aws s3 cp "$BACKUP_DIR/db_$DATE.sql" s3://yuandi-backups/
aws s3 cp "$BACKUP_DIR/files_$DATE.tar.gz" s3://yuandi-backups/

# 오래된 백업 삭제
find $BACKUP_DIR -type f -mtime +30 -delete
```

### 2. 복구 절차

#### 복구 시나리오별 RTO/RPO
| 시나리오 | RTO | RPO | 복구 방법 |
|----------|-----|-----|----------|
| 서버 장애 | 5분 | 0 | 자동 페일오버 |
| 데이터 손실 | 30분 | 1시간 | 백업 복원 |
| 리전 장애 | 1시간 | 1시간 | 리전 전환 |
| 전체 장애 | 4시간 | 24시간 | 전체 복구 |

#### 복구 테스트
```bash
# 월간 복구 테스트
npm run recovery:test

# 테스트 항목
- [ ] 백업 파일 무결성
- [ ] 복원 시간 측정
- [ ] 데이터 정합성 확인
- [ ] 애플리케이션 동작 확인
```

---

## 🔍 트러블슈팅

### 자주 발생하는 문제

#### 1. 메모리 누수
**증상**: 메모리 사용량 지속 증가
```bash
# 메모리 프로파일링
node --inspect npm run dev
# Chrome DevTools > Memory 탭에서 분석
```

**해결책**:
- Event listener 정리
- Timer 정리
- 큰 객체 참조 해제

#### 2. 느린 쿼리
**증상**: API 응답 지연
```sql
-- 느린 쿼리 확인
SELECT * FROM pg_stat_activity
WHERE state = 'active'
AND query_start < now() - interval '5 seconds';
```

**해결책**:
- 인덱스 추가
- 쿼리 최적화
- 캐싱 적용

#### 3. 높은 CPU 사용률
**증상**: CPU 사용률 80% 초과
```bash
# 프로세스별 CPU 사용량
top -p $(pgrep node)
```

**해결책**:
- 무한 루프 확인
- 동기 작업 비동기화
- 워커 프로세스 활용

### 긴급 대응 연락처

| 역할 | 담당자 | 연락처 | 우선순위 |
|------|--------|--------|----------|
| 시스템 관리자 | 홍길동 | 010-1234-5678 | 1 |
| DBA | 김철수 | 010-2345-6789 | 2 |
| 보안 담당자 | 이영희 | 010-3456-7890 | 3 |
| Vercel 지원 | - | support@vercel.com | - |
| Supabase 지원 | - | support@supabase.io | - |

---

## 📚 참고 자료

- [Vercel Monitoring Guide](https://vercel.com/docs/analytics)
- [Supabase Monitoring](https://supabase.com/docs/guides/platform/metrics)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)

---

최종 업데이트: 2024년 8월