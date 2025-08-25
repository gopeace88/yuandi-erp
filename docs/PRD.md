# PRD.md — 초미니 ERP (1인 해외구매대행업)

## 0. 목적 및 배경

**사업 형태**: 1인이 운영하는 해외물건 구매대행 사업자용 시스템

**핵심 기능**: 
- 주문 입력 및 관리 (입금 확인 후)
- 물류업체 수거 및 송장 관리  
- 출납장부 모니터링, 데이터 내보내기
- 고객 비로그인 주문 조회

**설계 원칙**: 복잡한 WMS/회계 제외, 재고는 단일 수량(onHand)으로만 관리, PC/모바일 직관적 UI

## 1. 사용자 및 권한

| 역할 | 접근 권한 | 주요 업무 |
|------|-----------|-----------|
| **Admin** | 전체 기능 | 사용자 관리, 모든 주문/재고/배송 처리, 출납장부, 엑셀 다운로드 |
| **OrderManager** | 주문 관리만 | 주문 생성/수정, 재고 관리, 출납장부 조회 |
| **ShipManager** | 배송 관리만 | 송장 등록, 출고 처리, 출납장부 조회 |
| **Customer** | 조회만 | 이름 + 전화번호로 본인 주문 조회 |

**공통 권한**: 모든 로그인 사용자는 출납장부 조회 가능
**언어 설정**: 화면 상단에서 KR/CN 토글을 통해 UI 언어 전환 (사용자별 기본 언어 저장)

## 2. 업무 프로세스 및 상태 흐름

```
입금 확인 → 주문입력(PAID) → 물류업체 수거(SHIPPED) → 완료(DONE) 또는 환불(REFUNDED)
```

**상태 정의**:
- **PAID**: 입금 확인 후 주문 생성 완료
- **SHIPPED**: 물류업체 수거 완료, 송장번호 등록  
- **DONE**: 정상 완료 (수동 처리)
- **REFUNDED**: 물건 회수 없이 환불 처리 (수동 처리)

## 3. 기능 요구사항

### 3.1 상품 및 재고 관리

**상품 정보 (필수 항목)**:
- 카테고리, 상품명, 모델명, 색상, 제조사/브랜드, 입고가격(CNY)
- SKU 자동생성: `[카테고리]-[모델]-[색상]-[브랜드]-[HASH5]`
  - 예: `ELEC-iPhone15-Black-Apple-A1B2C`

**재고 관리**:
- `onHand`: 현재 보유 수량 (단일 수량 관리)
- 입고등록: 상품 선택 → 수량 추가 → 메모 → onHand 증가 + 로그 기록 + Cashbook 기록
- 재고차감: 주문 생성 시 자동 차감 (부족 시 주문 생성 불가)
- 재고보정: ±1 버튼 또는 직접입력, 사유 선택 (입고, 보정, 폐기 등)

### 3.2 주문 처리

**주문 생성**:
- 필수 정보: 고객명, 전화번호, 해외통관부호(PCCC), 배송주소, 상품/수량
- 주소 입력: Daum 우편번호 API 연동
- **실시간 재고 표시**: 상품 선택 시 현재 재고수량 표시, 부족 시 빨간색 경고
- **재고 검증**: 주문 수량이 재고를 초과하면 주문 생성 불가 (실시간 검증)
- 주문번호 자동생성: `ORD-YYMMDD-###` (예: `ORD-240823-001`)
- 주문 생성 시 자동으로 PAID 상태로 시작
- Cashbook에 sale 기록 자동 생성

**주문 상태 변경**:
- PAID → SHIPPED: 송장번호 입력 + 송장 사진 업로드 (선택사항)
- SHIPPED → DONE: 수동 처리
- SHIPPED → REFUNDED: 수동 처리 + Cashbook 환불 기록

### 3.3 출고 및 배송 관리

**송장 등록**:
- 택배사, 송장번호 입력
- 송장 사진 업로드 (선택사항)
- tracking_url 자동 생성 (택배사별 URL 패턴)
- 상태를 SHIPPED로 변경

### 3.4 고객 주문 조회 (/track)

**조회 방법**: 이름 + 전화번호 전체 입력
**결과 표시**: 최근 5건을 카드 형태로 표시 (주문상태, 송장번호, 추적링크)
**언어 지원**: 브라우저 언어 자동 감지 + 수동 토글 가능

### 3.5 관리 기능

**출납장부 (Cashbook)**:
- 거래 유형: sale(판매), inbound(입고), shipping(배송비), adjustment(조정), refund(환불)
- 일/주/월별 합계 및 순익 계산
- 통화: CNY/KRW, 환율 적용

**엑셀 내보내기**:
- 주문 목록, 재고 현황, 출납장부를 .xlsx 형식으로 다운로드
- UTF-8 인코딩, 통화/날짜 포맷 유지
- 현재 필터 조건 반영하여 내보내기

### 3.6 대시보드

**매출 현황** (전체 사용자):
- 오늘/이번주/이번달 매출액 (KRW 기준)
- 전일/전주/전월 대비 증감률
- 주문 건수 및 평균 주문 금액

**재고 현황** (Admin, OrderManager):
- 전체 상품 수량
- 재고 부족 상품 (설정 임계값 이하)
- 재고 가치 (CNY/KRW 기준)

**주문 현황** (전체 사용자):
- 상태별 주문 건수 (PAID/SHIPPED/DONE/REFUNDED)
- 처리 대기 주문 (각 역할별 할 일)
- 최근 주문 5건 (간단 정보)

**주문 검색**: 고객명, 전화번호, 주문번호, 송장번호
**주문 필터**: 상태별(PAID/SHIPPED/DONE/REFUNDED), 기간별
**재고 검색**: 상품명, 모델명, 색상, 브랜드
**기간별 조회**: 주문일자, 출고일자, 입고일자 기준

## 4. UI/UX 설계

### 4.1 상단 네비게이션 (역할별 차등 노출)

**Admin**: 대시보드 | 주문 관리 | 재고 관리 | 배송 관리 | 고객 조회(/track) | 출납장부 | 작업 로그 | 사용자 관리
**OrderManager**: 대시보드 | 주문 관리 | 재고 관리 | 출납장부 | 작업 로그
**ShipManager**: 대시보드 | 배송 관리 | 출납장부 | 작업 로그

**공통**: 언어 토글 (한국어/中文) + 사용자 프로필

### 4.2 대시보드 화면 (전체 사용자)

**상단 요약 카드**:
- 오늘 매출 / 이번주 매출 / 이번달 매출 (전 기간 대비 증감률 표시)
- 처리 대기 주문 (역할별: OrderManager-신규주문, ShipManager-배송대기)

**중단 차트**:
- 최근 7일 매출 트렌드 (선형 차트)
- 상태별 주문 분포 (도넛 차트)

**하단 위젯**:
- 재고 부족 상품 (Admin/OrderManager만 표시)
- 최근 주문 5건 (간단 정보)
- 인기 상품 TOP 5 (주문량 기준)
**상단**: 주문 생성 폼 (고객정보 + 품목 선택)
**하단**: 주문 목록 (검색/필터/정렬)
- 각 행: 주문번호, 고객명, 상태, 주문금액, 최근 업데이트
- OrderManager 빠른 액션: [주문수정] (PAID 상태만)
- Admin 빠른 액션: [주문수정] [송장등록] [출고완료] [환불처리]

### 4.3 주문 관리 화면 (Admin, OrderManager)
**상단**: 주문 생성 폼 (고객정보 + 품목 선택)
- **실시간 재고 표시**: 상품 선택 드롭다운에 재고수량 함께 표시
- **재고 부족 경고**: 주문 수량 > 재고 시 빨간색 경고 메시지 및 주문 버튼 비활성화
- **자동 계산**: 수량 변경 시 실시간 금액 계산

**하단**: 주문 목록 (검색/필터/정렬)
- 각 행: 주문번호, 고객명, 상태, 주문금액, 최근 업데이트
- OrderManager 빠른 액션: [주문수정] (PAID 상태만)
- Admin 빠른 액션: [주문수정] [송장등록] [출고완료] [환불처리]

### 4.4 재고 관리 화면 (Admin, OrderManager)
**재고 목록**: 상품정보, 현재수량, 입고/보정 버튼
**입고 등록**: 상품 선택 + 수량 + 메모 입력

### 4.5 배송 관리 화면 (Admin, ShipManager)
**대기 주문**: PAID 상태 주문 목록 (송장 등록 대기)
**배송 중 주문**: SHIPPED 상태 주문 목록 (완료 처리 대기)
- 빠른 액션: [송장등록] [출고완료] [환불처리]
- 송장 사진 업로드 기능

### 4.6 출납장부 화면 (전체 사용자)
**요약 카드**: 일/주/월별 매출, 비용, 순익
**거래 내역**: 필터링 가능한 거래 목록
**엑셀 다운로드**: Admin만 다운로드 버튼 노출

### 4.8 작업 로그 화면 (전체 사용자)

**상단 필터**:
- 작업자 선택 (드롭다운)
- 작업 유형 (주문관리, 재고관리, 배송관리, 시스템관리)
- 기간 선택 (오늘, 어제, 최근 7일, 최근 30일, 직접 입력)
- 대상별 검색 (주문번호, 상품명, 고객명)

**로그 목록** (테이블 형태):
- 시간 | 작업자 | 작업 유형 | 대상 | 변경 내용 | IP
- 페이지네이션 (최신순 정렬)
- 각 행 클릭 시 상세 모달 (Before/After 비교)

**빠른 필터 탭**:
- 전체 | 내 작업만 | 주문 관련 | 재고 관련 | 배송 관련

### 4.9 반응형 설계
- 모바일: 1열 레이아웃, 터치 친화적 버튼 (≥44px)
- PC: 2-3열 레이아웃, 키보드 단축키 지원

## 5. 데이터 모델 (Supabase/Postgres)

```sql
-- 사용자
User {
  id: uuid,
  email: varchar,
  name: varchar,
  role: enum('Admin', 'OrderManager', 'ShipManager'),
  locale: enum('ko', 'zh'),
  active: boolean,
  createdAt: timestamp
}

-- 상품 (재고 임계값 추가)
Product {
  id: uuid,
  sku: varchar,
  category: varchar,
  name: varchar,
  model: varchar,
  color: varchar,
  brand: varchar,
  costCny: decimal,
  onHand: integer,
  lowStockThreshold: integer DEFAULT 5, -- 재고 부족 임계값
  active: boolean,
  createdAt: timestamp
}

-- 주문
Order {
  id: uuid,
  orderNo: varchar,
  customerName: varchar,
  customerPhone: varchar,
  pcccCode: varchar,
  shippingAddress: text,
  zipCode: varchar,
  memo: text,
  status: enum('PAID', 'SHIPPED', 'DONE', 'REFUNDED'),
  totalAmount: decimal,
  createdAt: timestamp,
  updatedAt: timestamp
}

-- 주문 상품
OrderItem {
  id: uuid,
  orderId: uuid,
  productId: uuid,
  sku: varchar,
  productName: varchar,
  quantity: integer,
  unitPrice: decimal,
  subtotal: decimal
}

-- 배송
Shipment {
  id: uuid,
  orderId: uuid,
  courier: varchar,
  trackingNo: varchar,
  trackingUrl: varchar,
  shipmentPhoto: varchar,
  shippedAt: timestamp
}

-- 이벤트 로그
EventLog {
  id: uuid,
  actorId: uuid,
  event: varchar,
  refType: varchar,
  refId: uuid,
  detail: jsonb,
  createdAt: timestamp
}

-- 출납장부
Cashbook {
  id: uuid,
  date: date,
  type: enum('sale', 'inbound', 'shipping', 'adjustment', 'refund'),
  amount: decimal,
  currency: enum('CNY', 'KRW'),
  fxRate: decimal,
  amountKrw: decimal,
  refType: varchar,
  refId: uuid,
  note: text,
  createdAt: timestamp
}
```

## 6. API 설계

### 6.1 대시보드 (전체 사용자)
```http
GET /api/dashboard/summary           # 매출/주문/재고 요약 정보
GET /api/dashboard/sales-trend       # 매출 트렌드 (최근 7일)
GET /api/dashboard/order-status      # 상태별 주문 분포
GET /api/dashboard/low-stock         # 재고 부족 상품 (Admin/OrderManager)
GET /api/dashboard/popular-products  # 인기 상품 TOP 5
```

### 6.2 인증 및 권한
```http
POST /api/auth/login                # 로그인
POST /api/auth/logout               # 로그아웃
GET /api/auth/me                    # 현재 사용자 정보
```

### 6.3 주문 관리 (Admin, OrderManager)
```http
POST /api/orders                    # 주문 생성
GET /api/orders                     # 주문 목록 조회
GET /api/orders/:id                 # 주문 상세 조회
PATCH /api/orders/:id               # 주문 수정 (OrderManager: PAID만, Admin: 전체)
DELETE /api/orders/:id              # 주문 삭제 (Admin만)
GET /api/products/stock/:id         # 상품별 실시간 재고 조회
POST /api/orders/validate-stock     # 주문 전 재고 검증
```

### 6.4 배송 관리 (Admin, ShipManager)
```http
GET /api/orders?status=PAID         # 배송 대기 주문 조회
PATCH /api/orders/:id/ship          # 송장 등록 (PAID → SHIPPED)
PATCH /api/orders/:id/complete      # 주문 완료 (SHIPPED → DONE)
PATCH /api/orders/:id/refund        # 환불 처리 (SHIPPED → REFUNDED)
```

### 6.5 재고 관리 (Admin, OrderManager)
```http
POST /api/orders                    # 주문 생성
GET /api/orders                     # 주문 목록 조회
GET /api/orders/:id                 # 주문 상세 조회
PATCH /api/orders/:id/ship          # 송장 등록 (PAID → SHIPPED)
PATCH /api/orders/:id/complete      # 주문 완료 (SHIPPED → DONE)
PATCH /api/orders/:id/refund        # 환불 처리 (SHIPPED → REFUNDED)
```

### 6.2 재고 관리
```http
GET /api/products                   # 상품 목록 조회
POST /api/products                  # 상품 등록
PATCH /api/products/:id             # 상품 정보 수정
POST /api/inventory/inbound         # 입고 등록
PATCH /api/inventory/adjust         # 재고 조정
```

### 6.6 고객 조회 (공개)
```http
GET /api/track?name=김철수&phone=01012345678  # 고객 주문 조회
```

### 6.8 작업 로그 (전체 사용자)
```http
GET /api/activity-logs              # 작업 로그 목록 조회
GET /api/activity-logs/:id          # 작업 로그 상세 조회
GET /api/activity-logs/my           # 내 작업 로그만 조회
GET /api/activity-logs/order/:orderId  # 특정 주문의 전체 이력
GET /api/activity-logs/product/:productId  # 특정 상품의 전체 이력
```

### 6.9 출납장부 (전체 사용자 조회, Admin 다운로드)
```http
GET /api/cashbook?from=2024-01-01&to=2024-12-31  # 출납장부 조회 (전체)
GET /api/export/orders.xlsx                       # 주문 엑셀 다운로드 (Admin)
GET /api/export/inventory.xlsx                    # 재고 엑셀 다운로드 (Admin)  
GET /api/export/cashbook.xlsx                     # 출납장부 엑셀 다운로드 (Admin)
```

### 6.7 사용자 관리 (Admin만)
```http
GET /api/users                      # 사용자 목록 조회
POST /api/users                     # 사용자 초대
PATCH /api/users/:id                # 사용자 정보 수정
PATCH /api/users/:id/deactivate     # 사용자 비활성화
```

### 6.8 파일 업로드
```http
POST /api/upload/shipment-photo     # 송장 사진 업로드
```

## 7. 비기능 요구사항

### 7.1 성능
- 응답 시간: 3초 이내
- 동시 사용자: 5명 이하 (1인 사업자 기준)
- 데이터베이스: 주문 10,000건, 상품 1,000개 수준

### 7.2 보안
- JWT 기반 인증
- HTTPS 통신 (Let's Encrypt)
- SQL Injection 방지
- XSS 방지

### 7.3 백업 및 복구
- 일일 자동 백업 (Supabase 기본 제공)
- 중요 데이터 주간 로컬 백업

### 7.4 국제화 (i18n)
- 지원 언어: 한국어, 중국어 간체
- 사용자별 기본 언어 설정 저장
- 날짜/통화 포맷 현지화

### 7.5 모니터링
- 에러 로깅 (Sentry 또는 유사 서비스)
- 기본적인 사용량 추적

## 8. 수용 기준

### 8.1 상품 관리
- [ ] 상품 등록 시 필수 6항목 검증
- [ ] SKU 자동 생성 및 중복 방지
- [ ] 재고 부족 시 주문 생성 차단

### 8.2 주문 처리  
- [ ] 주문번호 자동 생성 (ORD-YYMMDD-###)
- [ ] 상태 변경 시 이벤트 로그 기록
- [ ] Daum 우편번호 API 연동

### 8.3 고객 조회
- [ ] 이름 + 전화번호 전체 일치 시에만 조회 가능
- [ ] 최근 5건 주문 카드 형태 표시
- [ ] 송장 추적 링크 자동 생성

### 8.4 출납장부
- [ ] 모든 거래 자동 기록
- [ ] 일/주/월별 합계 계산
- [ ] 엑셀 다운로드 정상 동작

### 8.8 작업 추적
- [ ] 모든 중요 작업 자동 로깅
- [ ] 작업자, 시간, 변경 내용 정확히 기록
- [ ] 특정 주문/상품의 전체 이력 조회 가능
- [ ] 실시간 작업 로그 조회 및 필터링
- [ ] IP 주소 및 User-Agent 기록

### 8.9 다국어
- [ ] 역할별 메뉴 노출 제어
- [ ] API 엔드포인트 권한 검증
- [ ] OrderManager는 PAID 상태 주문만 수정 가능
- [ ] 출납장부는 모든 사용자 조회 가능, 다운로드는 Admin만
- [ ] 언어 토글 동작
- [ ] 사용자별 기본 언어 저장
- [ ] /track 페이지 브라우저 언어 감지

## 9. 향후 확장 계획

### Phase 2 (선택사항)
- SMS/이메일 알림 기능
- 고객 등급별 할인 관리
- 간단한 매출 대시보드
- 모바일 앱 (PWA)

### Phase 3 (선택사항)  
- 공급업체 관리
- 다중 창고 지원
- API 연동 (택배 추적, 환율)

---

**개발 예상 기간**: 4-6주
**기술 스택**: Next.js + Supabase + Tailwind CSS
**배포 환경**: Vercel + Supabase Cloud (또는 Docker/NAS)

## 10. Vercel 배포 최적화 가이드

> **"안 깨지는 최소 Next.js + Supabase 블루프린트"**
> 
> 이 가이드를 따르면 대부분의 Vercel 빌드 이슈가 사라집니다.

### 10.1 검증된 Vercel 설정

| 항목 | 설정값 | 이유 |
|------|--------|------|
| **Node.js** | `20.x` 고정 | 최신 LTS, 안정성 |
| **패키지 매니저** | `pnpm` | 더 빠르고 효율적 |
| **Build Command** | `pnpm build` | pnpm 사용 |
| **Install Command** | `pnpm i --frozen-lockfile` | 정확한 버전 설치 |
| **Output Directory** | `.next` (기본값) | Next.js 기본 |

### 10.2 네이티브 모듈 회피

#### ❌ 사용 금지 패키지
- `bcrypt` → `bcryptjs`로 교체
- `sharp` → Next/Image 클라우드 최적화 사용
- `canvas` → 서버리스 환경 비호환
- `node-sass` → `sass`로 교체

#### ✅ 최적화된 Next.js 설정
```javascript
// next.config.js
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['recharts'],
  experimental: {
    serverActions: { 
      allowedOrigins: ['*'],
      bodySizeLimit: '2mb'
    }
  }
};
```

### 10.3 필수 파일 구조
```
프로젝트/
├── .npmrc              # shamefully-hoist=true
├── pnpm-lock.yaml     # pnpm 락파일 (필수!)
├── package.json       # node >=20.0.0
├── next.config.js     # 최적화 설정
└── vercel.json       # 최소 설정
```

### 10.4 빌드 에러 해결

| 에러 | 해결책 |
|------|--------|
| "Module not found" | `pnpm install` 재실행 |
| "self is not defined" | Dynamic import with `ssr: false` |
| "Out of memory" | `swcMinify: true` 설정 |
| Sharp 관련 | Next/Image 사용 |

### 10.5 성과 지표

| 항목 | Before | After |
|------|--------|-------|
| **빌드 성공률** | ~60% | ~95% |
| **빌드 시간** | 3-5분 | 1-2분 |
| **번들 크기** | 크다 | 작다 |

### 10.6 대안: Docker/NAS 배포

Vercel 빌드 에러가 지속되는 경우, **Synology NAS + Portainer** 조합 추천:
- 빌드 에러 없음
- 완전한 제어권
- 비용 절감 (호스팅 무료)
- 제한 없음 (Cron, 메모리 등)
