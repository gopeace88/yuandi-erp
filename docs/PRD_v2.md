# PRD v2.0 — YUANDI Collection Management System
## 1인 해외구매대행업 통합 관리 시스템

> **Version**: 2.1.0  
> **Last Updated**: 2025-01-06  
> **Status**: Active Development (Iterative Refinement)  
> **Reference**: [DATABASE_ERD.md](./DATABASE_ERD.md)

## 📌 핵심 변경사항 (v2.1)

### 🆕 New Features in v2.1
1. **자동 언어 감지**: 브라우저 언어 설정에 따른 자동 리다이렉트
2. **아이디 필드 추가**: 주문 생성 시 고객 아이디(카카오톡 등) 입력 필드
3. **주소 검색 기능**: Daum 우편번호 API 통합으로 주소 자동 입력
4. **모바일 UI 최적화**: 
   - 반응형 네비게이션 (햄버거 메뉴)
   - 모바일 전용 카드 레이아웃
   - 하단 네비게이션 바 표준화
5. **대시보드 간소화**: 빠른 메뉴 제거, 핵심 지표 중심 표시

### 🆕 Previous Features (v2.0)
1. **이중 택배 시스템**: 한국 + 중국 택배사 동시 지원
2. **상품 이미지 관리**: 상품별 이미지 업로드 및 표시
3. **향상된 배송 관리**: 바코드, 배송비, 무게, 영수증 사진 등 상세 정보
4. **Shipments 테이블 분리**: 배송 정보 독립 관리

### 🔄 Changes from v1.0
- orders 테이블에서 배송 정보를 shipments 테이블로 이관
- 상품 이미지 URL 필드 추가 (products.image_url)
- 송장 바코드 및 영수증 사진 지원
- 모바일 최적화 강화 (v2.1)

---

## 0. 목적 및 배경

**사업 형태**: 1인이 운영하는 해외물건 구매대행 사업자용 시스템

**핵심 기능**: 
- 주문 입력 및 관리 (입금 확인 후)
- 이중 택배 시스템 (한국 + 중국) 관리
- 상품 이미지 관리 및 표시
- 출납장부 모니터링, 데이터 내보내기
- 고객 비로그인 주문 조회

**설계 원칙**: 
- 복잡한 WMS/회계 제외
- 재고는 단일 수량(onHand)으로만 관리
- PC/모바일 직관적 UI
- 반복적 개선 프로세스 (Iterative Development)

## 1. 사용자 및 권한

| 역할 | 접근 권한 | 주요 업무 |
|------|-----------|-----------|
| **Admin** | 전체 기능 | 사용자 관리, 모든 주문/재고/배송 처리, 출납장부, 엑셀 다운로드 |
| **OrderManager** | 주문 관리만 | 주문 생성/수정, 재고 관리, 출납장부 조회 |
| **ShipManager** | 배송 관리만 | 송장 등록, 출고 처리, 출납장부 조회 |
| **Customer** | 조회만 | 이름 + 전화번호로 본인 주문 조회 |

**공통 권한**: 모든 로그인 사용자는 출납장부 조회 가능
**언어 설정**: 
- 🆕 브라우저 언어 자동 감지 (중국어 → /zh-CN, 기타 → /ko)
- 화면 상단에서 KR/CN 토글을 통해 UI 언어 전환 (사용자별 기본 언어 저장)

## 2. 비즈니스 플로우

### 2.1 재고 입고 플로우 (상품 등록 통합)
```
재고 입고 화면:
1. 상품명 입력 → 동일 이름 있으면 드롭다운 표시
2. 모델명 입력 → 동일 모델명 있으면 드롭다운 표시
3-A. 기존 상품 선택 시:
    → 기존 상품 정보 자동 로드
    → 수량과 입고단가(CNY)만 입력
    
3-B. 신규 상품인 경우:
    → 카테고리, 색상, 브랜드 추가 입력
    → 🆕 상품 이미지 업로드 (선택)
    → products 테이블에 신규 생성
    → SKU 자동생성: [카테고리]-[모델]-[색상]-[브랜드]-[HASH5]

4. 공통 처리:
    → products.onHand 증가
    → inventory_movements 기록 (입고 이력)
    → cashbook 기록 (type: 'inbound', 매입 지출)
    → event_logs 기록
```

### 2.2 주문 생성 플로우 (PAID)
```
주문 생성 (단일 상품):
→ 상품 1개 선택 (🆕 이미지 미리보기 포함)
→ 재고 확인 (products.onHand >= 1)
→ orders 생성 (status: 'PAID', 단일 상품)
→ products.onHand 감소 (-1)
→ inventory_movements 기록 (판매 이력)
→ cashbook 기록 (type: 'sale', 판매 수입)
→ event_logs 기록
```

### 2.3 배송 처리 플로우 (PAID → SHIPPED) 🔄 Updated
```
송장 등록 (Enhanced):
→ shipments 테이블에 데이터 저장:
  - 한국 택배: courier, tracking_no, tracking_barcode, courier_code
  - 중국 택배: courier_cn, tracking_no_cn
  - 배송 상세: shipping_fee, actual_weight, volume_weight
  - 사진: shipment_photo_url, receipt_photo_url
→ orders.status = 'SHIPPED' (상태만 변경)
→ tracking_url 자동 생성 (택배사별)
→ event_logs 기록
```

### 2.4 주문 완료 플로우 (SHIPPED → DONE)
```
완료 처리:
→ orders.status = 'DONE'
→ shipments.delivered_at 업데이트
→ event_logs 기록
```

### 2.5 취소 플로우 (PAID → CANCELLED)
```
배송 전 취소:
→ orders.status = 'CANCELLED'
→ products.onHand 복구 (+1)
→ inventory_movements 기록 (취소 이력)
→ cashbook 기록 (type: 'refund', 환불)
→ event_logs 기록
```

### 2.6 환불 플로우 (SHIPPED/DONE → REFUNDED)
```
배송 후 환불:
→ orders.status = 'REFUNDED'
→ cashbook 기록 (type: 'refund', 환불)
→ ❌ 재고 복구 없음 (물건 회수 없음)
→ event_logs 기록
```

### 2.7 재고 조정 플로우
```
재고 조정 (분실/불량):
→ products.onHand 감소
→ inventory_movements 기록 (조정 이력)
→ cashbook 기록 (type: 'adjustment', 손실)
→ event_logs 기록
```

**주문 상태 정의**:
- **PAID**: 입금 확인 후 주문 생성 완료
- **SHIPPED**: 물류업체 수거 완료, 송장번호 등록
- **DONE**: 정상 완료 (수동 처리)
- **CANCELLED**: 배송 전 취소 (재고 복구)
- **REFUNDED**: 배송 후 환불 (재고 복구 없음)

## 3. 기능 요구사항

### 3.1 재고 관리 (상품 관리 통합)

**재고 입고 (상품 등록 포함)**:
- 상품명/모델명 입력 시 기존 상품 자동완성
- 신규 상품: 카테고리, 색상, 브랜드 추가 입력
- 🆕 상품 이미지 업로드 (Base64 → Supabase Storage)
- 기존 상품: 수량과 입고단가만 입력
- SKU 자동생성: `[카테고리]-[모델]-[색상]-[브랜드]-[HASH5]`

**재고 관리**:
- `onHand`: 현재 보유 수량 (단순 수량 관리)
- 재고차감: 주문 생성 시 자동 차감
- 재고복구: 취소 시에만 복구 (환불 시 복구 없음)
- 재고조정: 분실/불량 시 차감 처리
- 🆕 상품 이미지 표시 (목록 및 상세)

### 3.2 주문 처리

**주문 생성 (단일 상품)**:
- 필수 정보: 고객명, 전화번호, 해외통관부호(PCCC), 배송주소
- 🆕 선택 정보: 고객 아이디 (카카오톡 등 범용)
- 상품: 1개 상품만 선택 (수량 = 1 고정)
- 🆕 상품 선택 시 이미지 미리보기
- 🆕 주소 입력: Daum 우편번호 API 연동 (우편번호 + 주소 자동 입력)
- **실시간 재고 표시**: 재고 있는 상품만 선택 가능
- 주문번호 자동생성: `ORD-YYMMDD-###`
- 주문 생성 시 자동으로 PAID 상태
- Cashbook과 inventory_movements 자동 기록

**주문 상태 변경**:
- PAID → SHIPPED: 송장번호 입력 (shipments 테이블 사용)
- PAID → CANCELLED: 배송 전 취소 (재고 복구)
- SHIPPED → DONE: 배송 완료
- SHIPPED/DONE → REFUNDED: 환불 (재고 복구 없음)

### 3.3 출고 및 배송 관리 🔄 Enhanced

**송장 등록 (Comprehensive)**:
- **한국 택배 정보**:
  - 택배사 선택 (CJ대한통운, 한진, 롯데, 우체국, 로젠, 쿠팡)
  - 운송장 번호
  - 🆕 바코드 번호 (선택)
  - 🆕 택배사 코드 (선택)
- **중국 택배 정보** (선택):
  - 택배사 선택 (순펑, 운달, 중통, 신통, 경동)
  - 운송장 번호
- **배송 상세 정보** (선택):
  - 🆕 배송비 (원)
  - 🆕 실제 무게 (kg)
  - 🆕 부피 무게 (kg)
- **사진 업로드**:
  - 🆕 송장 사진
  - 🆕 영수증 사진
- tracking_url 자동 생성 (택배사별 URL 패턴)
- 상태를 SHIPPED로 변경

**배송 정보 관리**:
- shipments 테이블에 모든 배송 정보 저장
- orders 테이블은 상태만 관리
- 1:1 관계 (한 주문 = 한 배송)

### 3.4 고객 주문 조회 (/track)

**조회 방법**: 이름 + 전화번호 전체 입력
**결과 표시**: 
- 최근 5건을 카드 형태로 표시
- 주문상태, 송장번호, 추적링크
- 🆕 한국/중국 택배 정보 모두 표시
**언어 지원**: 브라우저 언어 자동 감지 + 수동 토글 가능

### 3.5 관리 기능

**출납장부 (Cashbook)**:
- 거래 유형: sale(판매), inbound(입고), shipping(배송), adjustment(조정), refund(환불)
- 일/주/월별 합계 및 순익 계산
- 통화: CNY/KRW, 환율 적용

**엑셀 내보내기**:
- 주문 목록, 재고 현황, 출납장부를 .xlsx 형식으로 다운로드
- UTF-8 인코딩, 통화/날짜 포맷 유지
- 현재 필터 조건 반영하여 내보내기
- 🆕 배송 상세 정보 포함

### 3.6 대시보드

**매출 현황** (전체 사용자):
- 오늘/이번주/이번달 매출액 (KRW 기준)
- 전일/전주/전월 대비 증감률
- 주문 건수 및 평균 주문 금액

**재고 현황** (Admin, OrderManager):
- 전체 상품 수량
- 재고 부족 상품 (설정 임계값 이하)
- 재고 가치 (CNY/KRW 기준)
- 🆕 상품 이미지 썸네일 표시

**주문 현황** (전체 사용자):
- 상태별 주문 건수 (PAID/SHIPPED/DONE/CANCELLED/REFUNDED)
- 처리 대기 주문 (각 역할별 할 일)
- 최근 주문 5건 (간단 정보)

**주문 검색**: 
- 고객명, 전화번호, 주문번호
- 🆕 한국/중국 송장번호
- 🆕 바코드 번호

**주문 필터**: 상태별(PAID/SHIPPED/DONE/CANCELLED/REFUNDED), 기간별
**재고 검색**: 상품명, 모델명, 색상, 브랜드
**기간별 조회**: 주문일자, 출고일자, 입고일자 기준

## 4. UI/UX 설계

### 4.1 상단 네비게이션 (역할별 차등 노출)

🆕 **표준화된 메뉴 순서**:
- **Admin**: 대시보드 | 주문 관리 | 배송 관리 | 재고 관리 | 출납장부 | 사용자 관리 | 주문 조회
- **OrderManager**: 대시보드 | 주문 관리 | 배송 관리 | 재고 관리 | 출납장부
- **ShipManager**: 대시보드 | 배송 관리 | 출납장부

🆕 **모바일 네비게이션**:
- 상단: 햄버거 메뉴 (전체 메뉴 드롭다운)
- 하단: 대시보드 | 주문 | 배송 | 재고 | 출납 (아이콘 + 짧은 레이블)

### 4.2 주요 화면 구성

**대시보드**:
- 매출 카드 (오늘/이번주/이번달)
- 주문 상태 분포 차트
- 재고 부족 알림
- 인기 상품 TOP 5
- 최근 주문 목록
- 🆕 ~~빠른 메뉴~~ (v2.1에서 제거)

**주문 관리**:
- 주문 목록 (테이블 형태)
- 상태별 필터 탭
- 검색창 (고객명, 전화번호, 주문번호)
- 주문 생성 버튼 → 모달
- 행 클릭 → 상세/수정 모달

**재고 관리**:
- 상품 목록 (그리드/리스트 뷰)
- 🆕 상품 이미지 표시
- 재고 부족 하이라이트
- 재고 입고 버튼 → 모달
- 재고 조정 버튼 → 모달

**배송 관리**:
- PAID 상태 주문 목록
- 송장 등록 버튼 → 🆕 향상된 모달
- 🆕 한국/중국 택배 정보 표시
- 🆕 배송비, 무게 정보 표시
- 일괄 송장 등록 (CSV 업로드)

**고객 조회 (/track)**:
- 이름 + 전화번호 입력 폼
- 검색 결과 카드 (최근 5건)
- 주문 상태 뱃지
- 🆕 한국/중국 송장 추적 링크
- 언어 전환 토글 (KR/CN)

### 4.3 모달 다이얼로그

**주문 생성 모달**:
- 고객 정보 입력
- 🆕 고객 아이디 입력 (선택사항)
- 🆕 상품 선택 (이미지 포함)
- 🆕 주소 검색 (Daum API) - 우편번호 입력창 크기 최적화
- 메모 입력
- 실시간 재고 확인

**주문 수정 모달**:
- 상태 변경 옵션
- 송장 등록 (PAID → SHIPPED)
- 🆕 배송 상세 정보 입력
- 취소/환불 사유 입력

**재고 입고 모달**:
- 상품 검색/선택
- 신규 상품 등록
- 🆕 상품 이미지 업로드
- 수량 및 단가 입력

**송장 등록 모달** 🆕 Enhanced:
- 한국 택배 정보 섹션
- 중국 택배 정보 섹션
- 배송 상세 정보 섹션
- 사진 업로드 섹션

### 4.4 반응형 디자인

**Desktop (1280px+)**:
- 3컬럼 대시보드
- 테이블 전체 컬럼 표시
- 상단 네비게이션 바

**Tablet (768px-1279px)**:
- 2컬럼 대시보드
- 테이블 주요 컬럼만
- 상단 네비게이션 바

**Mobile (< 768px)** 🆕 Enhanced:
- 1컬럼 대시보드
- 카드 형태 목록 (일관된 카드 뷰)
- 상단: 햄버거 메뉴 버튼
- 하단: 5개 탭 네비게이션
- 페이지별 모바일 전용 컴포넌트
- 하단 네비게이션 여백 확보 (pb-20)

## 5. 기술 스택

### 5.1 Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: React Hooks + Context API
- **Forms**: React Hook Form
- **Tables**: Tanstack Table
- **Charts**: Recharts
- **API Client**: Fetch API + SWR
- **i18n**: next-intl
- **Image Upload**: Base64 → Supabase Storage

### 5.2 Backend
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Realtime**: Supabase Realtime
- **Functions**: Next.js API Routes
- **Cron**: Vercel Cron Jobs

### 5.3 Infrastructure
- **Hosting**: Vercel
- **CDN**: Vercel Edge Network
- **Analytics**: Vercel Analytics
- **Monitoring**: Sentry
- **CI/CD**: GitHub Actions

## 6. 데이터베이스 설계

> **참조**: [DATABASE_ERD.md](./DATABASE_ERD.md)

### 주요 테이블
1. **profiles** - 사용자 프로필
2. **products** - 상품 (image_url 포함)
3. **orders** - 주문
4. **order_items** - 주문 상품
5. **shipments** - 배송 정보 (분리됨)
6. **inventory_movements** - 재고 이동
7. **cashbook** - 출납장부
8. **event_logs** - 이벤트 로그

### 핵심 설계 원칙
- shipments 테이블로 배송 정보 분리
- 이중 택배 시스템 지원
- 상품 이미지 관리
- 실시간 재고 추적

## 7. API 엔드포인트

### Dashboard
- `GET /api/dashboard/summary`
- `GET /api/dashboard/sales-trend`
- `GET /api/dashboard/order-status`
- `GET /api/dashboard/low-stock`
- `GET /api/dashboard/popular-products`

### Orders
- `POST /api/orders` - 주문 생성
- `GET /api/orders` - 주문 목록
- `PATCH /api/orders/:id` - 주문 수정
- `PATCH /api/orders/:id/ship` - 🔄 송장 등록 (shipments 테이블 사용)
- `PATCH /api/orders/:id/complete` - 완료 처리
- `PATCH /api/orders/:id/refund` - 환불 처리

### Products & Inventory
- `GET /api/products` - 상품 목록
- `POST /api/products` - 🆕 상품 추가 (이미지 포함)
- `POST /api/inventory/inbound` - 재고 입고
- `PATCH /api/inventory/adjust` - 재고 조정

### Customer Portal
- `GET /api/track` - 주문 조회

### Export
- `GET /api/export/orders.xlsx`
- `GET /api/export/inventory.xlsx`
- `GET /api/export/cashbook.xlsx`

## 8. 보안 및 성능

### 보안
- Row Level Security (RLS) 적용
- PCCC 형식 검증 (P + 12자리 숫자)
- Rate Limiting (공개 API)
- Input Sanitization
- CORS 설정

### 성능 목표
- 응답 시간: < 3초
- 동시 사용자: 5-10명
- 데이터베이스 용량: 10,000 주문, 1,000 상품
- 이미지 최적화: WebP 변환, CDN 캐싱

## 9. 테스트 전략

### E2E 테스트 시나리오
1. 고객 주문 조회 플로우
2. 주문 생성 → 배송 → 완료 플로우
3. 재고 입고 → 판매 → 재고 부족 플로우
4. 이중 택배 등록 및 추적
5. 이미지 업로드 및 표시
6. 다국어 전환

### 테스트 데이터
- 모든 역할별 테스트 계정
- 상품 이미지 샘플 데이터
- 한국/중국 택배사 테스트 데이터

## 10. 배포 체크리스트

- [ ] 환경 변수 설정 (Vercel)
- [ ] Supabase RLS 정책 적용
- [ ] Supabase Storage 버킷 생성
- [ ] Realtime 구독 설정
- [ ] CRON_SECRET 설정
- [ ] 커스텀 도메인 연결
- [ ] Analytics 활성화
- [ ] Sentry 에러 트래킹

## 11. Phase 2 계획 (Future)

- SMS/Email 알림
- 고객 등급별 할인
- PWA 모바일 앱
- 공급업체 관리
- 다중 창고 지원
- 외부 API 연동 (택배 추적, 환율)
- AI 기반 수요 예측

## 12. 구현 현황 (v2.1)

### ✅ 완료된 기능
- **인증 시스템**: 로그인/로그아웃, 역할 기반 접근 제어
- **자동 언어 감지**: 브라우저 언어에 따른 자동 리다이렉트
- **주문 관리**: 
  - 주문 생성 (고객 아이디 필드 포함)
  - Daum 우편번호 API 통합
  - 주문 목록 조회 및 필터링
  - 상태 변경 (PAID → SHIPPED → DONE)
- **재고 관리**: 
  - 상품 등록 및 재고 입고
  - 재고 목록 및 검색
  - 재고 이동 내역
- **모바일 최적화**:
  - 반응형 네비게이션 (햄버거 메뉴)
  - 모바일 전용 카드 레이아웃
  - 하단 네비게이션 바
  - 페이지별 모바일 컴포넌트
- **대시보드**: 매출 현황, 주문 상태, 재고 부족 알림

### 🚧 개발 중
- **배송 관리**: 송장 등록, 배송 추적
- **출납장부**: 거래 내역 및 집계
- **고객 조회**: /track 페이지

### ⏳ 계획됨
- **사용자 관리**: Admin 전용
- **엑셀 내보내기**: 주문, 재고, 출납장부
- **실시간 알림**: Supabase Realtime
- **상품 이미지**: 업로드 및 표시

## 13. 반복적 개선 프로세스

> **참조**: [ITERATIVE_DEVELOPMENT.md](./ITERATIVE_DEVELOPMENT.md)

### 개발 사이클
1. **구현**: 기능 개발 및 테스트
2. **검증**: 실사용 테스트 및 피드백
3. **문서화**: ERD, PRD 업데이트
4. **개선**: 발견된 이슈 해결
5. **반복**: 다음 기능으로 진행

### 문서 관리
- 모든 DB 변경사항은 ERD에 반영
- 새로운 요구사항은 PRD에 추가
- 마이그레이션 파일 버전 관리
- 버전별 변경사항 추적
- 변경 이력 추적

---

**Note**: 이 PRD는 지속적으로 업데이트되는 살아있는 문서입니다. 구현 과정에서 발견되는 새로운 요구사항과 개선사항은 즉시 반영됩니다.