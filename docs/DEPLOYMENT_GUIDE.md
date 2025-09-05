# YUANDI ERP - Vercel 배포 가이드

## 📋 사전 준비사항

### 1. 필수 계정
- [ ] Vercel 계정 (https://vercel.com)
- [ ] Supabase 계정 (https://supabase.com)
- [ ] GitHub 계정 (코드 저장소)

### 2. Supabase 프로젝트 설정
1. Supabase에서 새 프로젝트 생성
2. 데이터베이스 스키마 적용:
   ```bash
   # Supabase SQL Editor에서 실행
   # /supabase/migrations/ 폴더의 SQL 파일들을 순서대로 실행
   ```
3. 환경 변수 확인:
   - Project URL
   - Anon Key (Public)
   - Service Role Key (Private)

## 🚀 Vercel 배포 단계

### Step 1: GitHub 저장소 연결

1. GitHub에 프로젝트 push
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/yuandi-erp.git
git push -u origin main
```

### Step 2: Vercel 프로젝트 생성

1. [Vercel Dashboard](https://vercel.com/dashboard)에 로그인
2. "New Project" 클릭
3. GitHub 저장소 선택
4. Framework Preset: Next.js 자동 감지
5. Root Directory: `.` (루트)

### Step 3: 환경 변수 설정

Vercel 대시보드 > Settings > Environment Variables에서 추가:

#### 필수 환경 변수
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[프로젝트ID].supabase.co
NEXT_PUBLIC_SUPABASE_API_KEY=[Public Anon Key]
SUPABASE_API_KEY=[Service Role Key]

# App Configuration
NEXT_PUBLIC_APP_URL=https://[your-domain].vercel.app
NEXT_PUBLIC_APP_NAME=YUANDI Collection Management
NEXT_PUBLIC_APP_VERSION=1.0.0

# Session
SESSION_SECRET=[32자 이상의 랜덤 문자열]

# CRON Jobs
CRON_SECRET=[랜덤 보안 키]
```

#### 선택 환경 변수 (권장)
```
# Sentry (에러 트래킹)
NEXT_PUBLIC_SENTRY_DSN=[Sentry DSN]
SENTRY_AUTH_TOKEN=[Sentry Auth Token]
SENTRY_PROJECT=yuandi-erp
SENTRY_ORG=[Your Org]

# Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=[자동 생성됨]
```

### Step 4: 빌드 설정

Vercel은 자동으로 빌드 설정을 감지하지만, 필요시 수동 설정:

- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`
- Development Command: `npm run dev`

### Step 5: 도메인 설정 (선택사항)

1. Settings > Domains
2. 커스텀 도메인 추가
3. DNS 설정:
   - A Record: 76.76.21.21
   - CNAME: cname.vercel-dns.com

## 🔧 배포 후 설정

### 1. Supabase RLS (Row Level Security) 활성화

```sql
-- users 테이블 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 정책 생성 (예시)
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid() = id);
```

### 2. CRON Jobs 설정

vercel.json에 정의된 크론 작업이 자동 실행:
- 일일 정리: 매일 오전 3시
- 백업: 매일 오전 4시
- 주간 리포트: 매주 월요일 오전 9시

### 3. 모니터링 설정

1. Vercel Analytics 활성화
2. Speed Insights 활성화
3. Sentry 에러 트래킹 설정

## 📝 배포 체크리스트

### 배포 전
- [ ] 모든 테스트 통과 (`npm test`)
- [ ] 타입 체크 통과 (`npm run typecheck`)
- [ ] 린트 체크 통과 (`npm run lint`)
- [ ] 로컬 빌드 성공 (`npm run build`)
- [ ] 환경 변수 준비

### 배포 중
- [ ] GitHub에 코드 push
- [ ] Vercel에서 자동 배포 시작
- [ ] 빌드 로그 모니터링
- [ ] 환경 변수 설정

### 배포 후
- [ ] 프로덕션 URL 접속 테스트
- [ ] 로그인 기능 테스트
- [ ] 주요 기능 동작 확인
- [ ] 에러 모니터링 확인
- [ ] 성능 메트릭 확인

## 🚨 문제 해결

### 빌드 실패 시

1. **타입 에러**
   ```bash
   npm run typecheck
   # 에러 수정 후 재배포
   ```

2. **메모리 부족**
   - vercel.json에서 함수 메모리 증가
   ```json
   "functions": {
     "app/api/*/route.ts": {
       "memory": 3008
     }
   }
   ```

3. **환경 변수 누락**
   - Vercel 대시보드에서 확인
   - Preview와 Production 환경 구분

### 런타임 에러

1. **Supabase 연결 실패**
   - API 키 확인
   - RLS 정책 확인
   - CORS 설정 확인

2. **인증 실패**
   - SESSION_SECRET 설정 확인
   - 쿠키 정책 확인

## 📊 성능 최적화

### 1. Edge Functions 활용
```typescript
export const runtime = 'edge'; // API 라우트에 추가
```

### 2. ISR (Incremental Static Regeneration)
```typescript
export const revalidate = 60; // 60초마다 재생성
```

### 3. 이미지 최적화
- next/image 컴포넌트 사용
- WebP/AVIF 포맷 자동 변환

## 🔄 CI/CD 설정

### GitHub Actions (선택사항)
`.github/workflows/deploy.yml`:
```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm test
      - run: npm run build
```

## 📚 참고 문서

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Guide](https://supabase.com/docs)
- [프로젝트 README](./README.md)

## 💡 팁

1. **Preview 배포 활용**: PR마다 자동 preview 배포
2. **환경 변수 분리**: Development/Preview/Production
3. **모니터링 대시보드**: Vercel Analytics 활용
4. **롤백 기능**: 이전 배포로 즉시 롤백 가능
5. **팀 협업**: Vercel Teams 기능 활용

---

## 지원 및 문의

- 기술 지원: [GitHub Issues](https://github.com/yuandi/collection-management/issues)
- 이메일: contact@yuandi.com
- 문서: [프로젝트 Wiki](https://github.com/yuandi/collection-management/wiki)