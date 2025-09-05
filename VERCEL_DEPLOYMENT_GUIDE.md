# 🚀 YUANDI ERP Vercel 배포 가이드

## ✅ GitHub 푸시 완료!
- Repository: https://github.com/gopeace88/yuandi-erp
- Branch: main
- 최신 커밋: 워크플로우 파일 제거 및 모든 기능 구현 완료

## 📦 구현된 주요 기능
1. ✅ 완전한 주문 관리 시스템
2. ✅ 재고 관리 시스템  
3. ✅ 배송 추적 시스템
4. ✅ 대시보드 및 분석
5. ✅ 다국어 지원 (한국어, 중국어, 영어)
6. ✅ 관리자 설정 패널
7. ✅ 자동 백업 시스템
8. ✅ 고객 주문 조회 포털

## 🔧 Vercel 배포 단계

### 1. Vercel Import 페이지 방문
https://vercel.com/import/git?repository-url=https://github.com/gopeace88/yuandi-erp

### 2. 프로젝트 설정
- **Framework**: Next.js (자동 감지됨)
- **Root Directory**: ./
- **Build Command**: npm run build
- **Output Directory**: .next

### 3. 환경 변수 설정 (필수!)

아래 환경 변수를 Vercel Dashboard에서 설정하세요:

\`\`\`
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 앱 설정 (필수)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
CRON_SECRET=your-random-secret-32-chars
SESSION_SECRET=your-session-secret-32-chars

# 이메일 (선택)
RESEND_API_KEY=your-resend-api-key

# SMS (선택)  
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890
\`\`\`

### 4. Supabase 데이터베이스 설정

Supabase Dashboard에서:

1. **SQL Editor**에서 다음 파일의 SQL 실행:
   - \`docs/database/schema.sql\`
   - \`docs/database/rls.sql\`
   - \`docs/database/functions.sql\`

2. **Authentication** 설정:
   - Email/Password 인증 활성화
   - 사용자 등록 활성화

3. **Storage** 버킷 생성:
   - \`invoices\` (송장 사진용)
   - \`products\` (상품 이미지용)
   - \`backups\` (백업 파일용)

### 5. 배포 확인

배포가 완료되면:

1. **대시보드 접속**: https://your-app.vercel.app/dashboard
2. **관리자 설정**: https://your-app.vercel.app/admin/settings
3. **고객 포털**: https://your-app.vercel.app/track

## 🎯 테스트 체크리스트

### 기본 기능
- [ ] 대시보드 로딩 확인
- [ ] 언어 전환 (한국어/중국어/영어)
- [ ] 반응형 디자인 (모바일/PC)

### 주문 관리
- [ ] 주문 생성
- [ ] 재고 실시간 확인
- [ ] 주문 상태 변경
- [ ] 주문 검색 및 필터링

### 재고 관리
- [ ] 상품 등록
- [ ] 재고 입고
- [ ] 재고 조정
- [ ] 재고 부족 알림

### 배송 관리
- [ ] 송장 등록
- [ ] 배송 추적
- [ ] 배송 완료 처리

### 고객 서비스
- [ ] 고객 주문 조회 (이름+전화번호)
- [ ] 주문 상태 확인
- [ ] 배송 추적 링크

### 관리자 기능
- [ ] 사용자 관리
- [ ] 시스템 설정
- [ ] 백업/복구
- [ ] 데이터 내보내기

## 📝 중요 참고사항

1. **첫 배포 후 도메인 설정**
   - Vercel Dashboard > Settings > Domains
   - 커스텀 도메인 추가 가능

2. **자동 백업 확인**
   - 매일 새벽 2시 자동 백업
   - 관리자 이메일로 알림

3. **성능 모니터링**
   - Vercel Analytics 자동 활성화
   - 실시간 성능 지표 확인

## 🆘 문제 해결

### 빌드 실패 시
1. 환경 변수 확인
2. Node.js 버전 확인 (18.x 이상)
3. 빌드 로그 확인

### 데이터베이스 연결 실패
1. Supabase URL 확인
2. API 키 확인
3. RLS 정책 확인

### 페이지 로딩 실패
1. 환경 변수 확인
2. API 라우트 확인
3. 콘솔 에러 확인

## 🎉 배포 완료!

모든 준비가 완료되었습니다. Vercel에서 Import하여 배포를 시작하세요!

배포 링크: https://vercel.com/import/git?repository-url=https://github.com/gopeace88/yuandi-erp
