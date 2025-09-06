# YUANDI ERP 시스템 설치 가이드

## 📋 시스템 요구사항

- Node.js 18.0 이상
- npm 또는 yarn
- Supabase 계정
- Git

## 🚀 빠른 시작

### 1. 프로젝트 클론 및 의존성 설치

```bash
# 프로젝트 클론
git clone https://github.com/your-username/yuandi-erp.git
cd yuandi-erp

# 의존성 설치
npm install
```

### 2. Supabase 프로젝트 설정

#### 2.1 Supabase 프로젝트 생성

1. [Supabase Dashboard](https://app.supabase.com)에 로그인
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - Name: `yuandi-erp`
   - Database Password: 강력한 비밀번호 설정
   - Region: 가장 가까운 지역 선택 (Seoul 권장)

#### 2.2 데이터베이스 스키마 설정

1. Supabase Dashboard에서 SQL Editor 열기
2. 다음 파일들을 순서대로 실행:
   ```sql
   -- 1. 초기 스키마 실행
   supabase/migrations/001_initial_schema.sql
   
   -- 2. Storage 설정 실행
   supabase/storage-setup.sql
   ```

#### 2.3 Authentication 설정

1. Dashboard > Authentication > Providers
2. Email Provider 활성화
3. Site URL 설정: `http://localhost:3000`
4. Redirect URLs에 추가:
   - `http://localhost:3000/**`
   - `https://your-domain.com/**` (프로덕션 도메인)

#### 2.4 Storage 버킷 확인

1. Dashboard > Storage
2. `images` 버킷이 생성되었는지 확인
3. `documents` 버킷이 생성되었는지 확인

### 3. 환경변수 설정

```bash
# .env.local.example을 복사하여 .env.local 생성
cp .env.local.example .env.local
```

`.env.local` 파일 편집:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Supabase 키 찾기:**
1. Dashboard > Settings > API
2. `Project URL` 복사 → `NEXT_PUBLIC_SUPABASE_URL`
3. `anon public` 키 복사 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. `service_role` 키 복사 → `SUPABASE_SERVICE_ROLE_KEY` (비밀로 유지!)

### 4. 초기 관리자 계정 생성

#### 방법 1: Supabase Dashboard 사용
1. Authentication > Users > Invite User
2. 이메일 입력: `admin@yuandi.com`
3. 비밀번호 설정

#### 방법 2: SQL로 직접 생성
```sql
-- SQL Editor에서 실행
-- 먼저 Auth 사용자 생성 후 아래 실행
INSERT INTO public.profiles (
  id, 
  name, 
  email, 
  role, 
  locale, 
  active
) VALUES (
  'YOUR_USER_ID_FROM_AUTH', -- Auth에서 생성된 사용자 ID
  'YUANDI Admin',
  'admin@yuandi.com',
  'Admin',
  'ko',
  true
);
```

### 5. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

## 📁 프로젝트 구조

```
yuandi-erp/
├── app/                    # Next.js App Router
│   ├── [locale]/          # 다국어 라우팅
│   │   ├── dashboard/     # 대시보드
│   │   ├── orders/        # 주문 관리
│   │   ├── inventory/     # 재고 관리
│   │   ├── shipments/     # 배송 관리
│   │   └── ...
│   └── api/               # API 엔드포인트
├── components/            # 재사용 컴포넌트
├── lib/                   # 유틸리티 및 설정
│   ├── api/              # API 클라이언트
│   └── supabase/         # Supabase 클라이언트
├── supabase/             # 데이터베이스 관련
│   └── migrations/       # DB 마이그레이션
└── public/               # 정적 파일
```

## 🔐 보안 설정

### Row Level Security (RLS) 정책

모든 테이블에 RLS가 활성화되어 있습니다:

- **Admin**: 모든 데이터 접근 가능
- **OrderManager**: 주문, 재고, 출납장 관리
- **ShipManager**: 배송 관련 데이터만 접근
- **Customer**: 본인 주문 조회만 가능

### API 보안

- JWT 기반 인증
- 미들웨어를 통한 경로 보호
- 역할 기반 접근 제어 (RBAC)

## 🌏 다국어 지원

현재 지원 언어:
- 한국어 (ko)
- 중국어 (zh-CN)

언어 파일 위치: `/messages/[locale]/`

## 📝 테스트 계정

개발 환경용 테스트 계정:

| 역할 | 이메일 | 비밀번호 | 권한 |
|------|--------|----------|------|
| Admin | admin@yuandi.com | yuandi123! | 전체 관리 |
| Order Manager | order@yuandi.com | order123! | 주문/재고 관리 |
| Ship Manager | ship@yuandi.com | ship123! | 배송 관리 |

## 🚨 문제 해결

### 1. Supabase 연결 오류

```bash
# 환경변수 확인
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# .env.local 파일이 제대로 로드되는지 확인
```

### 2. 인증 오류

- Supabase Dashboard에서 사용자가 생성되었는지 확인
- profiles 테이블에 해당 사용자 레코드가 있는지 확인
- RLS 정책이 올바르게 설정되었는지 확인

### 3. Storage 업로드 오류

- Storage 버킷이 생성되었는지 확인
- RLS 정책이 올바르게 설정되었는지 확인
- 파일 크기가 5MB 이하인지 확인

## 📦 프로덕션 배포

### Vercel 배포 (권장)

1. [Vercel](https://vercel.com)에 GitHub 리포지토리 연결
2. 환경변수 설정:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Deploy 클릭

### 수동 배포

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm start
```

## 📊 모니터링

- Supabase Dashboard: 데이터베이스 메트릭 모니터링
- Vercel Analytics: 웹 성능 모니터링
- Error Tracking: Sentry 연동 가능

## 📄 라이선스

이 프로젝트는 비공개 상업용 소프트웨어입니다.

## 🤝 지원

문제가 있으시면 다음으로 연락주세요:
- Email: support@yuandi.com
- GitHub Issues: [프로젝트 이슈](https://github.com/your-username/yuandi-erp/issues)