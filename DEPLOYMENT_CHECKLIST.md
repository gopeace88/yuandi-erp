# YUANDI ERP 배포 체크리스트 🚀

## 🔍 시스템 진단 결과

### ✅ 성공적으로 확인된 항목
- [x] Next.js 빌드 성공 (51개 라우트 생성)
- [x] TypeScript 및 ESLint 설정 완료
- [x] 모든 정적 페이지 생성 성공
- [x] 국제화 (한국어/중국어) 설정 완료
- [x] Mock 인증 시스템 구현
- [x] API 엔드포인트 구조 완료 (45개 API 라우트)

### ⚠️ 해결 필요한 문제점
- [ ] **Supabase 데이터베이스 연결 오류** (Invalid API key)
- [ ] **로그인 API JSON 파싱 오류** (위치 54의 이스케이프 문자 문제)
- [ ] **standalone 모드 설정** (배포용으로 활성화 필요)

## 🛠️ 배포 전 필수 수정사항

### 1. 환경 변수 설정 (필수)

#### Vercel 환경 변수에 설정해야 할 항목들:

```bash
# Supabase 설정 (실제 값으로 교체 필요)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_API_KEY=your-anon-key
SUPABASE_API_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# 애플리케이션 설정
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_APP_NAME=YUANDI Collection Management
NEXT_PUBLIC_APP_VERSION=1.0.0
NODE_ENV=production

# 보안 설정
CRON_SECRET=generate-32-char-random-string
SESSION_SECRET=generate-another-32-char-random-string

# 옵션: 모니터링 및 분석
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=auto-generated-by-vercel

# 데이터베이스 직접 연결 (백업용)
DATABASE_URL=your-postgres-connection-string
```

#### 현재 .env.local 파일에 있는 문제점:
- Supabase API 키가 유효하지 않음
- 실제 프로젝트 URL이 placeholder임

### 2. 코드 수정사항

#### A. next.config.js 수정
```javascript
// 배포용으로 standalone 모드 활성화
output: 'standalone', // 현재 주석 처리됨, 활성화 필요
```

#### B. Supabase 설정 수정
현재 mock 데이터로 되어 있는 로그인 API를 실제 Supabase 연동으로 복구:

1. 유효한 Supabase 프로젝트 생성
2. profiles 테이블 생성
3. 관리자 사용자 데이터 삽입
4. API 키 업데이트

#### C. 데이터베이스 스키마 설정
```sql
-- profiles 테이블 생성 (필수)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  role VARCHAR DEFAULT 'customer',
  locale VARCHAR DEFAULT 'ko',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- 관리자 계정 생성
INSERT INTO profiles (email, password, name, role, locale, active)
VALUES (
  'yuandi1020@gmail.com',
  'eXVhbmRpMTIzIQ==', -- base64 encoded 'yuandi123!'
  'YUANDI Admin',
  'admin',
  'ko',
  true
);
```

## 📋 배포 단계별 체크리스트

### Phase 1: 환경 설정 ✅ 완료 전 배포 금지
- [ ] 1.1 Supabase 프로젝트 생성
- [ ] 1.2 데이터베이스 테이블 생성 (profiles, products, orders, shipments 등)
- [ ] 1.3 Vercel 프로젝트와 GitHub 연동
- [ ] 1.4 모든 환경 변수 Vercel에 설정
- [ ] 1.5 도메인 설정 (선택사항)

### Phase 2: 코드 준비
- [ ] 2.1 `next.config.js`에서 standalone 모드 활성화
- [ ] 2.2 로그인 API를 Supabase 연동으로 복구
- [ ] 2.3 `.env.local` 파일의 올바른 API 키로 업데이트
- [ ] 2.4 빌드 테스트: `npm run build` 성공 확인
- [ ] 2.5 타입 체크: `npm run typecheck` 성공 확인

### Phase 3: 테스트 및 검증
- [ ] 3.1 배포 테스트 스크립트 실행: `node deployment-test-script.js`
- [ ] 3.2 로컬 환경에서 모든 기능 테스트
- [ ] 3.3 한국어/중국어 국제화 테스트
- [ ] 3.4 모바일 반응형 테스트
- [ ] 3.5 보안 헤더 확인

### Phase 4: 배포 실행
- [ ] 4.1 Git에 최종 변경사항 커밋
- [ ] 4.2 Vercel에 배포: `vercel --prod`
- [ ] 4.3 배포 URL에서 테스트 스크립트 실행
- [ ] 4.4 프로덕션 환경 기능 검증
- [ ] 4.5 SSL 인증서 및 보안 설정 확인

### Phase 5: 후속 작업
- [ ] 5.1 모니터링 설정 (Sentry, Vercel Analytics)
- [ ] 5.2 백업 스케줄링 설정
- [ ] 5.3 도메인 DNS 설정 (사용자 도메인 사용 시)
- [ ] 5.4 성능 최적화 확인
- [ ] 5.5 사용자 매뉴얼 업데이트

## 🧪 테스트 명령어

### 로컬 테스트
```bash
# 개발 서버 시작
npm run dev

# 프로덕션 빌드 테스트
npm run build
npm start

# 배포 검증 테스트 실행
node deployment-test-script.js

# 타입 검사
npm run typecheck

# 린팅
npm run lint
```

### 배포 후 테스트
```bash
# 배포된 사이트에서 테스트 (URL 수정 필요)
# deployment-test-script.js의 baseUrl을 실제 배포 URL로 변경 후 실행
node deployment-test-script.js
```

## 📊 현재 시스템 상태

### 빌드 상태: ✅ 성공
- 총 51개 라우트 생성됨
- 정적 페이지 빌드 완료
- 미들웨어 및 API 라우트 컴파일 성공

### 인증 시스템: ⚠️ 부분 완료
- Mock 사용자 데이터베이스 구현됨
- 실제 Supabase 연동 필요
- 쿠키 기반 세션 관리 구현됨

### API 엔드포인트: ✅ 구조 완료
- 45개 API 엔드포인트 정의
- 대시보드, 주문, 재고, 사용자 관리 API 포함
- 에러 핸들링 및 응답 구조 표준화

### 국제화: ✅ 완료
- 한국어 (ko) 및 중국어 (zh-CN) 지원
- 동적 라우팅으로 언어별 페이지 구현
- 미들웨어 기반 언어 감지

## 🚨 보안 고려사항

### 현재 보안 상태
- [x] CORS 설정 완료
- [x] 보안 헤더 설정 (CSP, XSS Protection 등)
- [x] HttpOnly 쿠키 사용
- [x] API 라우트 인증 체크
- [ ] **암호 해싱 강화 필요** (현재 단순 base64 인코딩)
- [ ] **실제 JWT 토큰 구현 필요**
- [ ] **Rate limiting 구현 필요**

### 권장 보안 강화사항
1. 암호 해싱을 bcrypt나 Argon2로 변경
2. JWT 토큰 만료 및 갱신 로직 구현
3. API Rate limiting 미들웨어 추가
4. 입력 데이터 검증 강화 (Zod 스키마 활용)

## 📞 배포 시 문제 발생 시 대응

### 일반적인 문제들
1. **빌드 실패**: TypeScript 오류나 missing 의존성
2. **환경 변수 누락**: Vercel 대시보드에서 확인
3. **API 연결 실패**: Supabase 설정 및 네트워크 확인
4. **CORS 오류**: `next.config.js` 헤더 설정 확인

### 긴급 롤백 절차
```bash
# 이전 배포로 롤백
vercel rollback

# 또는 특정 버전으로 롤백
vercel rollback [deployment-url]
```

## 📈 성능 최적화 상태

### 현재 구현된 최적화
- [x] 이미지 최적화 설정 (Next.js Image component)
- [x] 정적 자산 캐싱 (1년)
- [x] ISR (Incremental Static Regeneration) 설정
- [x] 코드 스플리팅 자동 적용
- [x] 컴프레션 활성화

### 추가 최적화 권장사항
1. CDN 설정 (Vercel 자동 제공)
2. 데이터베이스 인덱스 최적화
3. API 응답 캐싱 구현
4. 웹 폰트 최적화

---

## 🎯 배포 준비도: 75% ⚠️

**주요 블로커:**
- Supabase 데이터베이스 설정 미완료
- 환경 변수 실제 값으로 업데이트 필요
- 로그인 API 오류 해결 필요

**추정 배포 준비 시간:** 2-4시간 (Supabase 설정 및 테스트 포함)