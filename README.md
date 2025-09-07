# YUANDI ERP System

<div align="center">
  <img src="public/logo.png" alt="YUANDI Logo" width="200"/>
  
  **🌏 YUANDI Collection 주문/재고/배송 관리 시스템**
  
  [![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-2.39-green)](https://supabase.com/)
  [![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)
</div>

---

## 🎯 프로젝트 소개

YUANDI Collection은 해외 구매대행 비즈니스를 위한 통합 관리 시스템입니다. 
주문 접수부터 재고 관리, 이중 배송 시스템(한국/중국)까지 모든 업무 프로세스를 효율적으로 관리합니다.

### 핵심 특징
- 🚀 **간편한 주문 관리**: 실시간 재고 연동 및 자동 차감
- 📦 **이중 배송 시스템**: 한국/중국 택배 동시 관리
- 💰 **자동 출납장부**: 모든 거래 자동 기록
- 🌐 **다국어 지원**: 한국어/중국어 완벽 지원
- 📱 **반응형 디자인**: PC/모바일 최적화

---

## 🛠 기술 스택

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Deployment**: Vercel Edge Functions
- **Testing**: Jest, Playwright

---

## 🚀 빠른 시작

### 필수 요구사항
- Node.js 20.x 이상
- pnpm 패키지 매니저
- Supabase 계정

### 설치 및 실행

```bash
# 1. 저장소 클론
git clone https://github.com/yourusername/yuandi-erp.git
cd yuandi-erp

# 2. 의존성 설치
pnpm install

# 3. 환경 변수 설정
cp .env.example .env.local
# .env.local 파일에 Supabase 키 입력

# 4. 개발 서버 실행
pnpm dev
```

http://localhost:3000 접속

---

## 📖 문서

프로젝트 관련 상세 문서는 `/docs` 폴더를 참조하세요:

| 문서 | 설명 |
|------|------|
| [PRD.md](./docs/(250907-v2.0)PRD.md) | 상세 제품 요구사항 및 기능 명세 |
| [DATABASE_ERD.md](./docs/(250907-v1.0)DATABASE_ERD.md) | 데이터베이스 스키마 및 ERD |
| [SETUP_GUIDE.md](./docs/(250907-v1.0)SETUP_GUIDE.md) | 초기 환경 구축 가이드 |
| [DEPLOYMENT_GUIDE.md](./docs/(250907-v1.0)DEPLOYMENT_GUIDE.md) | Vercel/Docker 배포 가이드 |
| [MAINTENANCE_GUIDE.md](./docs/(250907-v1.0)MAINTENANCE_GUIDE.md) | 데이터 관리 및 유지보수 |
| [ITERATIVE_DEVELOPMENT.md](./docs/(250907-v1.0)ITERATIVE_DEVELOPMENT.md) | 반복적 개발 프로세스 |

---

## 📁 프로젝트 구조

```
yuandi-erp/
├── app/                      # Next.js App Router
│   ├── api/                  # API 라우트
│   ├── (auth)/               # 인증 페이지
│   ├── dashboard/            # 대시보드
│   ├── orders/               # 주문 관리
│   ├── inventory/            # 재고 관리
│   ├── shipments/            # 배송 관리
│   └── track/                # 고객 조회
├── components/               # React 컴포넌트
├── hooks/                    # Custom Hooks
├── lib/                      # 라이브러리/유틸
├── supabase/                 # DB 마이그레이션
├── messages/                 # i18n 메시지
├── scripts/                  # 유틸리티 스크립트
├── docs/                     # 프로젝트 문서
├── __tests__/                # 단위 테스트
└── e2e/                      # E2E 테스트
```

---

## 🧪 테스트

```bash
# 단위 테스트
pnpm test

# E2E 테스트
pnpm test:e2e

# 타입 체크
pnpm typecheck

# 린트
pnpm lint
```

---

## 🚀 배포

### Vercel 배포 (권장)

```bash
# Vercel CLI 설치
pnpm add -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

자세한 배포 가이드는 [DEPLOYMENT_GUIDE.md](./docs/(250907-v1.0)DEPLOYMENT_GUIDE.md) 참조

---

## 👥 사용자 역할

- **Admin**: 전체 시스템 관리
- **OrderManager**: 주문/재고 관리
- **ShipManager**: 배송 관리
- **Customer**: 주문 조회 (비로그인)

---

## 🔐 환경 변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_API_KEY=your-anon-key
SUPABASE_API_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

전체 환경 변수 목록은 `.env.example` 참조

---

## 🤝 기여 방법

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

커밋 메시지는 [Conventional Commits](https://www.conventionalcommits.org/) 규칙을 따릅니다.

---

## 📝 라이센스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일 참조

---

## 📞 지원

- 📧 Email: support@yuandi.com
- 🐛 Bug Reports: [GitHub Issues](https://github.com/yourusername/yuandi/issues)

---

<div align="center">
  Made with ❤️ by YUANDI Team
</div>