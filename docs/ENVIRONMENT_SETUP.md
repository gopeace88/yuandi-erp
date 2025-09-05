# YUANDI ERP - Environment Setup Guide

## 📋 목차
1. [개발 환경 설정](#개발-환경-설정)
2. [Supabase 설정](#supabase-설정)
3. [환경 변수 구성](#환경-변수-구성)
4. [Vercel 배포 설정](#vercel-배포-설정)
5. [문제 해결](#문제-해결)

---

## 🛠️ 개발 환경 설정

### 필수 요구사항
- **Node.js**: v18.17.0 이상 (v20 권장)
- **NPM**: v9.0.0 이상
- **Git**: v2.0.0 이상
- **OS**: Windows 10+, macOS 10.15+, Ubuntu 20.04+

### 1. 프로젝트 클론
```bash
# GitHub에서 프로젝트 클론
git clone https://github.com/your-org/yuandi-erp.git
cd yuandi-erp
```

### 2. 의존성 설치
```bash
# 패키지 설치
npm install

# 또는 clean install (권장)
npm ci
```

### 3. 개발 서버 실행
```bash
# 개발 서버 시작 (기본 포트: 3000)
npm run dev

# 특정 포트로 실행
PORT=8080 npm run dev
```

---

## 🗄️ Supabase 설정

### 1. Supabase 프로젝트 생성
1. [Supabase Dashboard](https://app.supabase.com) 접속
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - **Name**: yuandi-erp
   - **Database Password**: 강력한 비밀번호 설정
   - **Region**: Seoul (ap-northeast-2) 권장

### 2. 데이터베이스 스키마 설정
```sql
-- 1. SQL Editor에서 스키마 생성 스크립트 실행
-- supabase/migrations/001_initial_schema.sql 파일 내용 실행

-- 2. RLS 정책 설정
-- supabase/migrations/002_rls_policies.sql 파일 내용 실행

-- 3. 초기 데이터 삽입 (선택사항)
-- supabase/seed.sql 파일 내용 실행
```

### 3. Authentication 설정
1. Authentication > Providers 메뉴
2. Email 인증 활성화:
   - **Enable Email Signup**: ✅
   - **Confirm Email**: ✅ (프로덕션)
   - **Secure Email Change**: ✅

### 4. Storage 설정
```sql
-- Storage 버킷 생성
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('products', 'products', true),
  ('shipments', 'shipments', false),
  ('documents', 'documents', false);

-- RLS 정책 설정
CREATE POLICY "Public read for product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
USING (true);
```

### 5. API 키 획득
Settings > API 메뉴에서:
- **Project URL**: `https://[your-project].supabase.co`
- **Anon/Public Key**: `NEXT_PUBLIC_SUPABASE_API_KEY`로 사용
- **Service Role Key**: `SUPABASE_API_KEY`로 사용 (⚠️ 서버 전용)

---

## 🔐 환경 변수 구성

### 1. 개발 환경 (.env.local)
```bash
# .env.example을 복사하여 .env.local 생성
cp .env.example .env.local
```

### 2. 필수 환경 변수
```env
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_API_KEY=eyJhbGc...  # anon key
SUPABASE_API_KEY=eyJhbGc...              # service role key

# 애플리케이션 설정
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=YUANDI Collection
NEXT_PUBLIC_DEFAULT_LOCALE=ko

# 세션 관리
SESSION_SECRET=generate-32-char-random-string-here

# 데이터베이스 직접 연결 (마이그레이션용)
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
```

### 3. 선택적 환경 변수
```env
# 이메일 설정 (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=app-specific-password
EMAIL_FROM=noreply@yuandi.com

# 외부 API
EXCHANGE_RATE_API_KEY=your-api-key
DAUM_POSTCODE_KEY=your-daum-api-key

# 모니터링
SENTRY_DSN=https://[key]@sentry.io/[project]
NEXT_PUBLIC_GA_TRACKING_ID=GA-XXXXXXXXX
```

---

## 🚀 Vercel 배포 설정

### 1. Vercel 프로젝트 연결
```bash
# Vercel CLI 설치
npm i -g vercel

# 프로젝트 연결
vercel

# 프롬프트 따라 설정:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No (처음) / Yes (기존)
# - Project name? yuandi-erp
# - Directory? ./
```

### 2. 환경 변수 설정 (Vercel Dashboard)
1. [Vercel Dashboard](https://vercel.com) > 프로젝트 선택
2. Settings > Environment Variables
3. 각 환경별로 변수 추가:
   - **Production**: 프로덕션 값
   - **Preview**: 스테이징 값
   - **Development**: 개발 값

### 3. 도메인 설정
1. Settings > Domains
2. 커스텀 도메인 추가:
   ```
   yuandi.com (또는 your-domain.com)
   www.yuandi.com
   ```
3. DNS 레코드 설정:
   ```
   A     @     76.76.21.21
   CNAME www   cname.vercel-dns.com
   ```

### 4. 빌드 & 배포 설정
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "devCommand": "npm run dev",
  "installCommand": "npm ci",
  "framework": "nextjs",
  "regions": ["icn1"],  // Seoul region
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 5. 자동 배포 설정
- **Production Branch**: `main`
- **Preview Branches**: 모든 브랜치
- **Instant Rollbacks**: 활성화
- **Comments**: PR 코멘트 활성화

---

## 🔍 환경별 설정 확인

### 개발 환경
```bash
# 환경 변수 확인
npm run env:check

# 시스템 검증
npm run verify

# 테스트 실행
npm test
```

### 스테이징 환경
```bash
# Preview 배포 테스트
vercel --env preview

# 스테이징 URL로 테스트
curl https://yuandi-erp-staging.vercel.app/api/health
```

### 프로덕션 환경
```bash
# 프로덕션 배포
vercel --prod

# 배포 상태 확인
vercel ls

# 로그 확인
vercel logs
```

---

## 🐛 문제 해결

### 자주 발생하는 문제

#### 1. Supabase 연결 오류
```
Error: Failed to connect to Supabase
```
**해결책**:
- API 키 확인
- 프로젝트 URL 확인
- 네트워크 연결 확인
- Supabase 프로젝트 상태 확인

#### 2. 빌드 오류
```
Error: Build failed
```
**해결책**:
```bash
# 캐시 삭제
rm -rf .next node_modules
npm ci
npm run build
```

#### 3. TypeScript 오류
```
Type error: ...
```
**해결책**:
```bash
# 타입 체크
npm run typecheck

# 타입 정의 업데이트
npm run types:generate
```

#### 4. 환경 변수 누락
```
Error: Missing environment variable
```
**해결책**:
- `.env.local` 파일 확인
- Vercel Dashboard 환경 변수 확인
- 변수명 오타 확인

### 디버깅 도구

#### 1. 로컬 디버깅
```bash
# 상세 로그 활성화
DEBUG=* npm run dev

# Next.js 디버그 모드
NODE_OPTIONS='--inspect' npm run dev
```

#### 2. Supabase 디버깅
```sql
-- 실시간 로그 확인
SELECT * FROM auth.audit_log_entries
ORDER BY created_at DESC
LIMIT 100;

-- RLS 정책 테스트
SET LOCAL role TO 'authenticated';
SET LOCAL request.jwt.claim.sub TO 'user-uuid';
SELECT * FROM your_table;
```

#### 3. Vercel 디버깅
```bash
# 함수 로그
vercel logs --follow

# 빌드 로그
vercel logs --type build

# 환경 변수 확인
vercel env ls
```

---

## 📞 지원

### 추가 도움이 필요한 경우:
- **문서**: [docs/](./docs/)
- **이슈**: [GitHub Issues](https://github.com/your-org/yuandi-erp/issues)
- **이메일**: support@yuandi.com

### 유용한 링크:
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

---

최종 업데이트: 2024년 8월