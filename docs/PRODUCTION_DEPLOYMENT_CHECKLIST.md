# 프로덕션 배포 체크리스트

## 🚀 배포 전 필수 확인 사항

### 1. 코드 품질 확인
- [ ] 모든 테스트 통과
  ```bash
  npm test
  npm run test:e2e
  ```
- [ ] TypeScript 타입 체크 통과
  ```bash
  npm run typecheck
  ```
- [ ] ESLint 검사 통과
  ```bash
  npm run lint
  ```
- [ ] 빌드 성공
  ```bash
  npm run build
  ```

### 2. 환경 변수 설정
- [ ] `.env.production` 파일 준비
- [ ] Vercel 환경 변수 설정
  ```
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_API_KEY
  SUPABASE_API_KEY (서버 사이드용 - Secret)
  CRON_SECRET (Cron Job용 - Secret)
  ```
- [ ] 프로덕션 도메인 설정

### 3. Supabase 설정
- [ ] 프로덕션 프로젝트 생성
- [ ] 데이터베이스 스키마 마이그레이션
- [ ] RLS (Row Level Security) 정책 설정
- [ ] 인덱스 생성
  ```sql
  -- 성능 최적화를 위한 인덱스
  CREATE INDEX idx_orders_status ON orders(status);
  CREATE INDEX idx_orders_customer ON orders(customer_name, customer_phone);
  CREATE INDEX idx_orders_date ON orders(order_date);
  CREATE INDEX idx_products_sku ON products(sku);
  CREATE INDEX idx_order_items_order ON order_items(order_id);
  ```
- [ ] Realtime 구독 설정
- [ ] Storage 버킷 설정 (shipment_photos)
- [ ] 백업 정책 설정

### 4. 보안 검토
- [ ] API 키 노출 여부 확인
- [ ] CORS 정책 설정
- [ ] Rate Limiting 설정
- [ ] SQL Injection 방어 확인
- [ ] XSS 방어 확인
- [ ] PCCC 데이터 암호화 확인

### 5. 성능 최적화
- [ ] 이미지 최적화
- [ ] 번들 크기 확인 (< 2MB)
- [ ] Lighthouse 점수 확인 (목표: 80+)
- [ ] Core Web Vitals 확인
  - LCP < 2.5s
  - FID < 100ms
  - CLS < 0.1

### 6. 국제화 (i18n)
- [ ] 한국어 메시지 파일 완성도
- [ ] 중국어 메시지 파일 완성도
- [ ] 날짜/시간 형식 확인
- [ ] 통화 형식 확인

## 📋 Vercel 배포 설정

### 1. 프로젝트 설정
```bash
# Vercel CLI 설치
npm i -g vercel

# 프로젝트 연결
vercel link

# 프로덕션 배포
vercel --prod
```

### 2. vercel.json 설정
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "regions": ["icn1"],
  "functions": {
    "app/api/export/*.ts": {
      "maxDuration": 30
    }
  },
  "crons": [
    {
      "path": "/api/cron/backup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### 3. 도메인 설정
- [ ] 커스텀 도메인 연결
- [ ] SSL 인증서 확인
- [ ] DNS 설정
- [ ] www 리다이렉션 설정

## 🔍 배포 후 검증

### 1. 기능 테스트
- [ ] 로그인/로그아웃
- [ ] 상품 등록/수정/삭제
- [ ] 주문 생성/수정
- [ ] 배송 정보 등록
- [ ] 고객 주문 조회 (/track)
- [ ] 대시보드 데이터 확인
- [ ] 엑셀 다운로드
- [ ] 다국어 전환

### 2. 성능 모니터링
- [ ] Vercel Analytics 설정
- [ ] Error tracking (Sentry) 설정
- [ ] 응답 시간 모니터링
- [ ] 에러율 모니터링

### 3. 백업 및 복구
- [ ] 데이터베이스 백업 테스트
- [ ] 복구 절차 문서화
- [ ] 롤백 계획 수립

## 🚨 비상 대응 계획

### 롤백 절차
1. Vercel Dashboard에서 이전 배포로 롤백
2. 데이터베이스 스키마 롤백 (필요시)
3. 환경 변수 복구
4. 캐시 무효화

### 긴급 연락처
- 개발팀: [연락처]
- 인프라팀: [연락처]
- 고객지원: [연락처]

## 📝 배포 로그

### 배포 정보 기록
```markdown
배포 일시: 2025-XX-XX XX:XX
배포 버전: v1.0.0
배포자: [이름]
변경 사항:
- [주요 변경사항 1]
- [주요 변경사항 2]
```

## ✅ 최종 체크리스트

### 배포 직전
- [ ] 모든 PR 머지 완료
- [ ] main 브랜치 최신화
- [ ] 태그 생성 (v1.0.0)
- [ ] 백업 완료
- [ ] 팀 공지

### 배포 직후
- [ ] 프로덕션 URL 접속 확인
- [ ] 주요 기능 작동 확인
- [ ] 모니터링 대시보드 확인
- [ ] 에러 로그 확인
- [ ] 성능 메트릭 확인

### 배포 후 24시간
- [ ] 에러율 모니터링
- [ ] 성능 저하 여부 확인
- [ ] 사용자 피드백 수집
- [ ] 개선사항 정리

## 📊 성공 기준

- 에러율 < 1%
- 응답 시간 < 200ms (P95)
- 가용성 > 99.9%
- 사용자 클레임 없음

## 🔧 유용한 명령어

```bash
# 프로덕션 빌드 테스트
npm run build && npm run start

# 환경 변수 확인
vercel env pull

# 로그 확인
vercel logs --prod

# 배포 상태 확인
vercel list

# 프로덕션 배포
vercel --prod
```

## 📚 참고 문서

- [Vercel 배포 가이드](https://vercel.com/docs)
- [Supabase 프로덕션 체크리스트](https://supabase.com/docs/guides/platform/going-into-prod)
- [Next.js 배포 체크리스트](https://nextjs.org/docs/deployment)