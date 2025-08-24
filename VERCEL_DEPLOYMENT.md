# Vercel 배포 가이드

## 1. Vercel 환경 변수 설정

Vercel 대시보드에서 다음 환경 변수를 설정해야 합니다:

### 필수 환경 변수 (Production)

```
NEXT_PUBLIC_SUPABASE_URL=https://eikwfesvmohfpokgeqtv.supabase.co
NEXT_PUBLIC_SUPABASE_API_KEY=sb_publishable_iShAanisCnIMsompzbf7hQ_qGUf4goa
SUPABASE_API_KEY=sb_secret_Iw0xUDRxQ9mKL8Rm7D4i9w_Yv57DBOr

NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
SESSION_SECRET=generate-32-character-random-string-here
CRON_SECRET=your-cron-secret-for-scheduled-jobs
```

### 선택적 환경 변수

```
# Sentry Error Tracking (Optional)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
SENTRY_PROJECT=yuandi-erp
SENTRY_ORG=

# Analytics (Auto-configured by Vercel)
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=
```

## 2. Vercel 프로젝트 설정

### 2.1 GitHub 리포지토리 연결
1. Vercel 대시보드에서 "New Project" 클릭
2. GitHub 리포지토리 선택
3. Framework Preset: "Next.js" 선택

### 2.2 Build & Development Settings
- Framework Preset: Next.js
- Build Command: `npm run build` (기본값)
- Output Directory: `.next` (기본값)
- Install Command: `npm install` (기본값)

### 2.3 Node.js Version
- Node.js Version: 18.x

## 3. 배포 전 체크리스트

- [x] TypeScript 타입 오류 수정
- [x] 환경 변수 설정
- [x] vercel.json 설정 파일 확인
- [x] .env.production 파일 준비
- [x] 빌드 최적화 스크립트 실행
- [ ] Supabase RLS 정책 설정
- [ ] Supabase Realtime 활성화

## 4. 배포 명령어

### 로컬에서 Vercel CLI로 배포
```bash
# Vercel CLI 설치
npm i -g vercel

# 로그인
vercel login

# 배포 (첫 배포)
vercel

# 프로덕션 배포
vercel --prod
```

### Git Push로 자동 배포
```bash
git add .
git commit -m "Deploy to Vercel"
git push origin main
```

## 5. 배포 후 확인사항

1. **기능 테스트**
   - 홈페이지 언어 감지 (한국어/중국어)
   - 주문조회 페이지 (/track)
   - 로그인 페이지 (/login)

2. **성능 확인**
   - Lighthouse Score 확인
   - Core Web Vitals 모니터링

3. **에러 모니터링**
   - Vercel Functions 로그 확인
   - Browser Console 에러 확인

## 6. 트러블슈팅

### TypeScript 빌드 오류
- `any` 타입 임시 사용으로 해결
- Supabase 타입 생성 필요

### 환경 변수 오류
- Vercel 대시보드에서 환경 변수 확인
- 재배포 필요할 수 있음

### 404 에러
- vercel.json의 rewrites 설정 확인
- Next.js App Router 경로 확인

## 7. 도메인 설정 (선택사항)

1. Vercel 프로젝트 Settings > Domains
2. Add Domain 클릭
3. 도메인 입력 및 DNS 설정 안내 따르기

## 8. 보안 권장사항

- SUPABASE_API_KEY는 절대 클라이언트에 노출하지 않기
- SESSION_SECRET은 강력한 랜덤 문자열 사용
- CORS 설정 확인
- Rate Limiting 설정 고려