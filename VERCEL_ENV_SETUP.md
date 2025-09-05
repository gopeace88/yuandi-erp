# Vercel 환경 변수 설정 가이드

## 1. Vercel 대시보드 접속
1. https://vercel.com 로그인
2. `yuandi-erp` 프로젝트 선택
3. Settings 탭 클릭
4. 왼쪽 메뉴에서 Environment Variables 선택

## 2. 필수 환경 변수 추가

아래 환경 변수를 하나씩 추가하세요:

### Supabase 설정 (현재 값 사용)
```
NEXT_PUBLIC_SUPABASE_URL=https://eikwfesvmohfpokgeqtv.supabase.co
NEXT_PUBLIC_SUPABASE_API_KEY=sb_publishable_iShAanisCnIMsompzbf7hQ_qGUf4goa
SUPABASE_API_KEY=sb_secret_Iw0xUDRxQ9mKL8Rm7D4i9w_Yv57DBOr
SUPABASE_SERVICE_ROLE_KEY=sb_secret_Iw0xUDRxQ9mKL8Rm7D4i9w_Yv57DBOr
```

### 데이터베이스 연결
```
DATABASE_URL=postgresql://postgres.jbuftmndbjlwmvomvuuk:DHZoTEy01ALwlnVZ@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.jbuftmndbjlwmvomvuuk:DHZoTEy01ALwlnVZ@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres
```

### 보안 설정 (새로 생성 필요)
```
CRON_SECRET=yuandi-cron-secret-2024
SESSION_SECRET=yuandi-session-secret-minimum-32-characters-long
CSRF_SECRET=yuandi-csrf-secret-32-characters
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
NEXTAUTH_SECRET=yuandi-nextauth-secret-32-characters
```

### 앱 설정
```
NEXT_PUBLIC_APP_URL=https://yuandi-erp-gpsc-78h3uc3ay-gopeace88-gmailcoms-projects.vercel.app
NEXT_PUBLIC_APP_NAME=YUANDI Collection Management
NEXT_PUBLIC_APP_VERSION=1.0.0
NODE_ENV=production
```

## 3. 환경 변수 적용 범위
각 변수를 추가할 때:
- Environment: Production ✅, Preview ✅, Development ✅ 모두 체크

## 4. 재배포
1. 모든 환경 변수 추가 완료 후
2. Deployments 탭으로 이동
3. 최신 배포의 ... 메뉴 클릭
4. "Redeploy" 선택
5. "Use existing Build Cache" 체크 해제
6. "Redeploy" 버튼 클릭

## 5. 배포 확인
배포 완료 후 확인 사항:
- 메인 페이지 접속: 한국어로 리다이렉트 확인
- 로그인 페이지 접속: /ko/auth/signin
- 로그인 테스트:
  - 이메일: yuandi1020@gmail.com
  - 비밀번호: yuandi123!

## 6. 문제 해결
배포 후 문제 발생 시:
1. Vercel Functions 로그 확인 (Functions 탭)
2. 브라우저 개발자 도구 콘솔 확인
3. 네트워크 탭에서 API 호출 상태 확인

## 7. Supabase 데이터베이스 설정
1. https://app.supabase.com 접속
2. SQL Editor 메뉴 선택
3. `database/schema.sql` 파일 내용 실행
4. Authentication → Settings → Email Auth 비활성화 (개발용)