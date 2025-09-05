# 🚀 YUANDI ERP 배포 가이드

## 📋 배포 전 체크리스트
✅ 모든 기능 구현 완료
✅ Git 저장소 초기화 완료
✅ 모든 변경사항 커밋 완료
✅ Vercel 설정 파일 준비 완료

## 🎯 Option 1: Vercel에서 직접 Import (권장)

### 1단계: 프로젝트 업로드
1. 프로젝트 폴더를 ZIP으로 압축
2. Google Drive, Dropbox 등에 업로드

### 2단계: Vercel 배포
1. [Vercel](https://vercel.com) 접속
2. "Import Project" 클릭
3. "Import Git Repository" 대신 "Import Third-Party Git Repository" 선택
4. 또는 "Deploy from CLI" 옵션 사용

### 3단계: 환경 변수 설정
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_API_KEY=your-public-api-key
SUPABASE_API_KEY=your-private-api-key
```

## 🎯 Option 2: GitHub 경유 배포

### 1단계: GitHub 저장소 생성
1. [GitHub](https://github.com) 로그인
2. "New repository" 클릭
3. Repository name: `yuandi-erp`
4. Private 선택
5. "Create repository" 클릭

### 2단계: 코드 푸시
```bash
# 현재 디렉토리에서 실행
git remote add origin https://github.com/[your-username]/yuandi-erp.git
git branch -M main
git push -u origin main
```

### 3단계: Vercel 연동
1. [Vercel](https://vercel.com) 접속
2. "Import Project" → "Import Git Repository"
3. GitHub 저장소 선택
4. 환경 변수 설정
5. "Deploy" 클릭

## 🎯 Option 3: Vercel CLI 사용

### 1단계: Vercel CLI 로그인
```bash
npx vercel login
# Email로 로그인 선택
# 이메일 입력 후 인증 메일 확인
```

### 2단계: 배포
```bash
npx vercel --prod
# 프로젝트 설정 질문에 답변
# - Set up and deploy: Y
# - Which scope: 개인 계정 선택
# - Link to existing project: N
# - Project name: yuandi-erp
# - Directory: ./
```

## 📦 프로젝트 구조
```
00.YUANDI-ERP/
├── app/                    # Next.js App Router
│   ├── api/               # API 라우트
│   ├── components/        # 컴포넌트
│   ├── dashboard/         # 대시보드 페이지
│   └── page.tsx           # 홈페이지
├── lib/                   # 유틸리티
│   ├── auth/             # 인증
│   ├── core/             # 비즈니스 로직
│   ├── i18n/             # 다국어
│   └── supabase/         # DB 연결
├── messages/              # 번역 파일
├── public/               # 정적 파일
└── vercel.json           # Vercel 설정
```

## ⚙️ 주요 설정 파일

### vercel.json
- Node 18 사용
- 한국 리전 (icn1) 설정
- 보안 헤더 설정 완료
- API 라우트 최적화

### package.json
- Next.js 14.2.0
- React 18.3.0
- TypeScript 5.9.2
- Tailwind CSS 3.4.0

## 🔧 배포 후 설정

### Supabase 설정
1. [Supabase](https://supabase.com) 프로젝트 생성
2. SQL 에디터에서 `docs/DATABASE_SCHEMA.sql` 실행
3. Authentication → Settings에서 이메일 인증 활성화
4. API Keys 복사하여 Vercel 환경 변수에 추가

### 도메인 설정 (선택사항)
1. Vercel Dashboard → Settings → Domains
2. "Add Domain" 클릭
3. 도메인 입력 (예: erp.yuandi.com)
4. DNS 설정 안내 따라 진행

## 🎉 배포 완료!

배포가 완료되면:
1. `https://yuandi-erp.vercel.app` 접속
2. 관리자 계정으로 로그인
3. 시스템 사용 시작

## 📞 문제 발생 시

- Vercel 빌드 로그 확인
- 환경 변수 설정 재확인
- Node 버전 확인 (18.x 필요)
- package.json의 scripts 확인

## 📝 관리자 계정
- Email: yuandi1020@gmail.com
- Password: yuandi123!