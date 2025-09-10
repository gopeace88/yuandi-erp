# YUANDI ERP - Collection Management System

## 프로젝트 개요

YUANDI ERP는 1인 해외물건 구매대행 사업자를 위한 경량화된 재고 및 주문 관리 시스템입니다.

### 주요 기능
- 📦 **재고 관리**: 실시간 재고 추적 및 입출고 관리
- 🛒 **주문 관리**: 주문 생성부터 배송완료까지 전체 프로세스
- 🚚 **이중 배송 시스템**: 한국/중국 분리 배송 관리
- 💰 **출납장부**: 수입/지출 자동 기록 및 추적
- 📊 **대시보드**: 실시간 매출 및 재고 현황
- 🌏 **다국어 지원**: 한국어/중국어

## 기술 스택

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Deployment**: Vercel
- **Architecture**: Serverless

## 빠른 시작

### 1. 환경 설정

```bash
# 저장소 클론
git clone https://github.com/yourusername/yuandi-erp.git
cd yuandi-erp

# 의존성 설치
pnpm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일을 편집하여 Supabase 정보 입력
```

### 2. 개발 서버 실행

```bash
# 기본 포트 (3000)
pnpm dev

# WSL 환경에서 포트 지정
PORT=8081 pnpm dev
```

### 3. 테스트 데이터 생성

```bash
# PRD 비즈니스 워크플로우 기반 테스트 데이터 생성
node scripts/generate-business-flow-data.js

# 생성되는 데이터:
# - 상품: 500개
# - 주문: 500개 (paid:200, shipped:150, done:100, refunded:50)
# - 재고: 각 상품별 초기 재고
# - 출납장부: 자동 생성
```

## 프로젝트 구조

```
yuandi-erp/
├── app/                   # Next.js App Router
│   ├── [locale]/         # 다국어 라우팅 (ko, zh-CN)
│   ├── api/              # API 엔드포인트
│   └── components/       # 페이지별 컴포넌트
├── components/           # 전역 공유 컴포넌트
│   ├── layout/          # 레이아웃 컴포넌트
│   └── ui/              # UI 기본 컴포넌트
├── lib/                  # 유틸리티 및 비즈니스 로직
│   ├── supabase/        # Supabase 클라이언트
│   ├── domain/          # 도메인 모델
│   ├── core/            # 핵심 비즈니스 로직
│   ├── i18n/            # 다국어 처리
│   └── security/        # 보안 관련 유틸리티
├── messages/            # 다국어 메시지 파일
├── types/               # TypeScript 타입 정의
├── styles/              # 전역 스타일
├── public/              # 정적 파일
├── scripts/             # 유틸리티 스크립트
│   ├── generate-business-flow-data.js  # 테스트 데이터 생성
│   └── 01.working_schema_reset.sql     # DB 스키마 초기화
├── docs/                # 프로젝트 문서
│   ├── (250907-v2.0)PRD.md            # 제품 요구사항
│   ├── (250907-v1.1)DATABASE_ERD.md   # DB 스키마
│   └── SCHEMA_CHANGE_PROCESS.md       # 스키마 변경 프로세스
├── supabase/            # Supabase 마이그레이션
│   └── migrations/      # SQL 마이그레이션 파일
├── __tests__/           # 단위 테스트
└── e2e/                 # E2E 테스트 (Playwright)
```

## 주요 명령어

```bash
pnpm dev        # 개발 서버 실행
pnpm build      # 프로덕션 빌드
pnpm test       # 테스트 실행
pnpm typecheck  # 타입 체크
pnpm lint       # 린트 검사
```

## 데이터베이스 스키마

주요 테이블:
- `user_profiles` - 사용자 관리
- `products` - 상품 카탈로그
- `orders` - 주문 관리
- `inventory` - 재고 관리
- `shipments` - 배송 정보
- `cashbook_transactions` - 출납장부

자세한 스키마는 [DATABASE_ERD.md](./docs/(250907-v1.1)DATABASE_ERD.md) 참조

## 비즈니스 워크플로우

1. **재고 입고**: 상품 등록 → 재고 설정 → 출납장부 지출 기록
2. **주문 생성**: 주문 접수(PAID) → 재고 차감 → 출납장부 수입 기록
3. **배송 처리**: PAID → SHIPPED(송장등록) → DONE(배송완료)
4. **환불 처리**: REFUNDED → 출납장부 환불 기록 (재고 복구 없음)

자세한 내용은 [PRD.md](./docs/(250907-v2.0)PRD.md) 참조

## 문서

- [CLAUDE.md](./CLAUDE.md) - AI 개발 가이드
- [PRD.md](./docs/(250907-v2.0)PRD.md) - 제품 요구사항
- [DATABASE_ERD.md](./docs/(250907-v1.1)DATABASE_ERD.md) - DB 스키마
- [TEST_DATA_GUIDE.md](./docs/TEST_DATA_GUIDE.md) - 테스트 데이터 가이드
- [SETUP_GUIDE.md](./docs/(250907-v1.0)SETUP_GUIDE.md) - 설치 가이드
- [DEPLOYMENT_GUIDE.md](./docs/(250907-v1.0)DEPLOYMENT_GUIDE.md) - 배포 가이드

## 라이선스

Private Repository - All Rights Reserved

---

© 2025 YUANDI ERP. 개발: [Your Team]