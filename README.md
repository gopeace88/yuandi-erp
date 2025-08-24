# YUANDI Collection Management System

<div align="center">
  <img src="public/logo.png" alt="YUANDI Logo" width="200"/>
  
  **🌏 YUANDI Collection 주문/재고/배송 관리 시스템**
  
  [![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-2.39-green)](https://supabase.com/)
  [![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)
</div>

---

## 📋 목차

- [소개](#-소개)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [설치 가이드](#-설치-가이드)
- [환경 설정](#-환경-설정)
- [실행 방법](#-실행-방법)
- [사용자 역할](#-사용자-역할)
- [API 문서](#-api-문서)
- [프로젝트 구조](#-프로젝트-구조)
- [테스트](#-테스트)
- [배포](#-배포)
- [기여 방법](#-기여-방법)

---

## 🎯 소개

YUANDI Collection은 주문/재고/배송을 효율적으로 관리하는 통합 관리 시스템입니다. 
주문 접수부터 재고 관리, 배송 추적까지 모든 업무 프로세스를 효율적으로 관리할 수 있습니다.

### 핵심 가치
- 🚀 **간편한 주문 관리**: 입금 확인 후 즉시 주문 생성 및 처리
- 📦 **실시간 재고 추적**: 재고 부족 경고 및 자동 차감
- 🚚 **배송 관리 자동화**: 송장 등록 및 추적 URL 자동 생성
- 💰 **출납장부 관리**: 매출/비용 자동 기록 및 집계
- 🌐 **다국어 지원**: 한국어/중국어 완벽 지원

---

## ✨ 주요 기능

### 1. 대시보드
- 📊 매출 현황 (일/주/월별 통계)
- 📈 매출 트렌드 차트
- 🍩 주문 상태 분포
- ⚠️ 재고 부족 알림
- 🏆 인기 상품 TOP 5
- 📝 최근 주문 내역

### 2. 주문 관리
- ✅ 주문 생성/수정/취소
- 🔍 실시간 재고 검증
- 🏷️ 주문 번호 자동 생성 (ORD-YYMMDD-###)
- 📱 고객 정보 관리
- 🔄 주문 상태 추적 (PAID → SHIPPED → DONE/REFUNDED)

### 3. 재고 관리
- 📥 입고 등록
- 📊 재고 수량 조정
- 🔔 재고 부족 경고
- 🏷️ SKU 자동 생성
- 📈 재고 가치 계산

### 4. 배송 관리
- 📮 송장 번호 등록
- 📸 송장 사진 업로드
- 🔗 배송 추적 URL 자동 생성
- ✅ 배송 완료 처리
- 💸 환불 처리

### 5. 고객 서비스
- 🔍 비로그인 주문 조회 (/track)
- 📱 모바일 최적화 UI
- 🌐 자동 언어 감지

### 6. 보안 기능
- 🔐 역할 기반 접근 제어 (RBAC)
- 🛡️ API Rate Limiting
- 🔒 XSS/CSRF/SQL Injection 방지
- 🔑 환경 변수 암호화
- 📝 감사 로그

---

## 🛠 기술 스택

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.0
- **Styling**: Tailwind CSS 3.4
- **UI Components**: Custom Components + Lucide Icons
- **Charts**: Recharts 3.1
- **i18n**: Custom implementation (KR/CN)

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **API**: Next.js API Routes
- **File Storage**: Supabase Storage

### DevOps & Monitoring
- **Deployment**: Vercel
- **Error Tracking**: Sentry
- **Analytics**: Vercel Analytics
- **Performance**: Vercel Speed Insights

### Security
- **Input Validation**: Zod
- **Sanitization**: DOMPurify
- **Image Processing**: Sharp
- **Encryption**: Native Crypto

---

## 📦 설치 가이드

### 사전 요구사항
- Node.js 18.0.0 이상
- npm 8.0.0 이상
- Supabase 계정
- Vercel 계정 (배포용)

### 1. 저장소 클론
```bash
git clone https://github.com/yourusername/yuandi.git
cd yuandi
```

### 2. 의존성 설치
```bash
npm install
```

### 3. Supabase 설정
1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 데이터베이스 스키마 실행:
```bash
# docs/DATABASE_SCHEMA.md 파일의 SQL 실행
```

### 4. 환경 변수 설정
`.env.local` 파일 생성:
```bash
cp .env.example .env.local
```

필수 환경 변수 입력:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_API_KEY=your-anon-key
SUPABASE_API_KEY=your-service-role-key

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Security
CSRF_SECRET=generate-32-char-random-string
ENCRYPTION_KEY=generate-64-char-hex-string
```

---

## 🚀 실행 방법

### 개발 서버 실행
```bash
npm run dev
```
http://localhost:3000 접속

### 프로덕션 빌드
```bash
npm run build
npm run start
```

### 테스트 실행
```bash
# 단위 테스트
npm run test

# E2E 테스트
npm run test:e2e
```

### 코드 품질 검사
```bash
# TypeScript 체크
npm run typecheck

# ESLint
npm run lint

# 번들 크기 분석
npm run analyze
```

---

## 👥 사용자 역할

| 역할 | 권한 | 주요 기능 |
|------|------|-----------|
| **Admin** | 전체 권한 | 사용자 관리, 모든 기능 접근, 데이터 내보내기 |
| **OrderManager** | 주문/재고 관리 | 주문 생성/수정, 재고 관리, 출납장부 조회 |
| **ShipManager** | 배송 관리 | 송장 등록, 배송 완료 처리, 출납장부 조회 |
| **Customer** | 조회만 | 이름+전화번호로 본인 주문 조회 |

---

## 📚 API 문서

### 인증
모든 API 요청은 Supabase Auth 토큰이 필요합니다.

```typescript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### 주요 엔드포인트

#### Dashboard APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | 대시보드 요약 데이터 |
| GET | `/api/dashboard/sales-trend` | 7일 매출 트렌드 |
| GET | `/api/dashboard/order-status` | 주문 상태 분포 |
| GET | `/api/dashboard/low-stock` | 재고 부족 상품 |
| GET | `/api/dashboard/popular-products` | 인기 상품 TOP 5 |
| GET | `/api/dashboard/recent-orders` | 최근 주문 목록 |

#### Order APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | 주문 목록 조회 |
| POST | `/api/orders` | 새 주문 생성 |
| PATCH | `/api/orders/:id` | 주문 정보 수정 |
| PATCH | `/api/orders/:id/ship` | 송장 등록 |
| PATCH | `/api/orders/:id/complete` | 주문 완료 처리 |
| PATCH | `/api/orders/:id/refund` | 환불 처리 |

#### Inventory APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | 상품 목록 조회 |
| POST | `/api/products` | 새 상품 등록 |
| POST | `/api/inventory/inbound` | 재고 입고 |
| PATCH | `/api/inventory/adjust` | 재고 조정 |

#### Export APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/export/orders/xlsx` | 주문 엑셀 다운로드 |
| GET | `/api/export/inventory/xlsx` | 재고 엑셀 다운로드 |
| GET | `/api/export/cashbook/xlsx` | 출납장부 엑셀 다운로드 |

#### Customer API
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/track` | 고객 주문 조회 |

### 요청/응답 예시

#### 주문 생성
```typescript
// Request
POST /api/orders
{
  "customer_name": "홍길동",
  "customer_phone": "010-1234-5678",
  "customer_pccc": "P123456789012",
  "shipping_address": {
    "postalCode": "12345",
    "roadAddress": "서울시 강남구 테헤란로 123",
    "detailAddress": "4층"
  },
  "items": [
    {
      "product_id": "uuid",
      "quantity": 2,
      "unit_price": 50000
    }
  ]
}

// Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "order_number": "ORD-241225-001",
    "status": "PAID",
    "total_amount": 100000,
    "created_at": "2024-12-25T00:00:00Z"
  }
}
```

---

## 📁 프로젝트 구조

```
yuandi/
├── app/                      # Next.js App Router
│   ├── api/                  # API 라우트
│   ├── dashboard/            # 대시보드 페이지
│   ├── track/                # 고객 조회 페이지
│   └── components/           # React 컴포넌트
│       ├── charts/           # 차트 컴포넌트
│       ├── forms/            # 폼 컴포넌트
│       ├── layout/           # 레이아웃 컴포넌트
│       └── ui/               # UI 컴포넌트
├── lib/                      # 유틸리티 및 설정
│   ├── supabase/            # Supabase 클라이언트
│   ├── auth/                # 인증 관련
│   ├── security/            # 보안 모듈
│   ├── performance/         # 성능 최적화
│   └── monitoring/          # 모니터링
├── messages/                # i18n 번역 파일
│   ├── ko/                  # 한국어
│   └── zh-CN/               # 중국어
├── public/                  # 정적 파일
├── styles/                  # 글로벌 스타일
├── types/                   # TypeScript 타입
└── docs/                    # 문서
    ├── PRD.md              # 제품 요구사항
    ├── ARCHITECTURE.md     # 아키텍처 설계
    ├── DATABASE_SCHEMA.md  # DB 스키마
    └── API_DESIGN.md       # API 설계
```

---

## 🧪 테스트

프로젝트는 TDD(Test-Driven Development) 방식으로 개발되었습니다.

### 단위 테스트
```bash
# 모든 테스트 실행
npm test

# 특정 파일 테스트
npm test -- product.test.ts

# 테스트 커버리지 확인
npm test -- --coverage

# 테스트 감시 모드
npm run test:watch
```

### E2E 테스트
```bash
# Playwright E2E 테스트
npm run test:e2e

# 특정 브라우저 테스트
npm run test:e2e -- --project=chromium
```

### 타입 체크
```bash
# TypeScript 타입 검증
npm run typecheck
```

### 코드 품질
```bash
# ESLint 실행
npm run lint

# Prettier 포맷팅
npm run format
```

---

## 🚀 배포

### Vercel 배포

상세한 배포 가이드는 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)를 참조하세요.

#### 빠른 배포
1. **환경 변수 설정**
```bash
npm run env:setup
```

2. **배포 실행**
```bash
# 프리뷰 배포
npm run deploy

# 프로덕션 배포
npm run deploy:prod
```

#### 주요 체크포인트
- ✅ Supabase 프로젝트 생성 및 설정
- ✅ 환경 변수 설정 (.env.example 참조)
- ✅ 타입 체크 통과
- ✅ 모든 테스트 통과
- ✅ Vercel 도메인 설정

3. **도메인 설정**
Vercel Dashboard에서 커스텀 도메인 연결

### 환경별 설정

| 환경 | URL | 용도 |
|------|-----|------|
| Development | http://localhost:3000 | 로컬 개발 |
| Preview | https://yuandi-preview.vercel.app | PR 테스트 |
| Production | https://yuandi.com | 실제 서비스 |

---

## 🔒 보안

### 구현된 보안 기능
- ✅ HTTPS 강제
- ✅ 보안 헤더 (CSP, HSTS, X-Frame-Options)
- ✅ Rate Limiting
- ✅ Input Validation (Zod)
- ✅ SQL Injection 방지
- ✅ XSS 방지 (DOMPurify)
- ✅ CSRF 토큰
- ✅ 파일 업로드 검증

### 보안 체크리스트
```bash
# 보안 감사 실행
npm audit

# 의존성 업데이트
npm update

# 환경 변수 검증
node scripts/validate-env.js
```

---

## 📊 성능 모니터링

### Web Vitals 목표
- **FCP**: < 1.8s
- **LCP**: < 2.5s
- **FID**: < 100ms
- **CLS**: < 0.1

### 모니터링 도구
- **Vercel Analytics**: 실시간 트래픽 분석
- **Sentry**: 에러 추적 및 성능 모니터링
- **Custom Metrics**: 비즈니스 KPI 추적

---

## 🤝 기여 방법

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 코딩 컨벤션
- TypeScript 엄격 모드 사용
- ESLint/Prettier 규칙 준수
- 컴포넌트는 함수형으로 작성
- 커밋 메시지는 [Conventional Commits](https://www.conventionalcommits.org/) 따르기

---

## 📝 라이센스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일 참조

---

## 📞 지원

- 📧 Email: support@yuandi.com
- 📖 Documentation: [docs.yuandi.com](https://docs.yuandi.com)
- 🐛 Bug Reports: [GitHub Issues](https://github.com/yourusername/yuandi/issues)

---

<div align="center">
  Made with ❤️ by YUANDI Team
</div>