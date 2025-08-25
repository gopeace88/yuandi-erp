# YUANDI ERP 데이터베이스 스키마 문서

## 📊 테이블 구조 및 업무 플로우 매핑

### 1. profiles (사용자 프로필)
- **용도**: Supabase Auth와 연동된 사용자 정보
- **주요 필드**:
  - `id`: UUID (auth.users 참조)
  - `role`: Admin | OrderManager | ShipManager
  - `locale`: ko | zh-CN
- **업무 플로우**: 모든 작업의 권한 관리 기준

### 2. products (상품)
- **용도**: 판매 상품 마스터 데이터
- **주요 필드**:
  - `sku`: 자동 생성 (카테고리-모델-색상-브랜드-해시)
  - `on_hand`: 현재 재고 수량
  - `low_stock_threshold`: 재고 부족 임계값
  - `image_url`: 상품 이미지 URL (추가 필요)
- **업무 플로우**: 
  - 주문 생성 시 재고 확인
  - 재고 부족 알림 기준

### 3. orders (주문)
- **용도**: 고객 주문 정보
- **주요 필드**:
  - `order_no`: ORD-YYMMDD-### 형식 자동 생성
  - `status`: PAID → SHIPPED → DONE | REFUNDED
  - `pccc_code`: 개인통관고유부호 (P+12자리)
- **업무 플로우**:
  - PAID: 결제 완료 (초기 상태)
  - SHIPPED: 송장 등록 완료
  - DONE: 배송 완료
  - REFUNDED: 환불 처리

### 4. order_items (주문 상품)
- **용도**: 주문별 상품 내역
- **관계**: orders ↔ products 다대다 관계
- **업무 플로우**: 주문 생성 시 자동 생성

### 5. shipments (배송)
- **용도**: 배송 정보 관리
- **주요 필드**:
  - `tracking_no`: 운송장 번호
  - `courier`: 택배사
  - `tracking_url`: 추적 URL
- **업무 플로우**: 
  - 주문 상태 PAID → SHIPPED 전환 시 생성
  - 고객 조회 페이지에서 추적 링크 제공

### 6. inventory_movements (재고 이동)
- **용도**: 모든 재고 변동 이력
- **movement_type**: 
  - `inbound`: 입고
  - `sale`: 판매 (주문)
  - `adjustment`: 조정
  - `disposal`: 폐기
- **업무 플로우**: 주문/입고/조정 시 자동 기록

### 7. cashbook (출납장부)
- **용도**: 모든 금전 거래 기록
- **type**:
  - `sale`: 매출
  - `inbound`: 매입
  - `shipping`: 배송비
  - `adjustment`: 조정
  - `refund`: 환불
- **업무 플로우**: 주문/환불 시 자동 기록

### 8. event_logs (이벤트 로그)
- **용도**: 감사 추적 (Audit Trail)
- **자동 기록 대상**: orders, products, shipments
- **업무 플로우**: 중요 작업 자동 로깅

## 🔄 주요 업무 플로우와 데이터베이스 연관성

### 1. 주문 생성 플로우
```sql
1. products 테이블에서 재고 확인 (on_hand > 수량)
2. orders 테이블에 주문 생성 (status = 'PAID')
3. order_items 테이블에 상품 내역 추가
4. products.on_hand 차감 (재고 감소)
5. inventory_movements 기록 (movement_type = 'sale')
6. cashbook 기록 (type = 'sale')
7. event_logs 자동 기록
```

### 2. 배송 등록 플로우
```sql
1. shipments 테이블에 송장 정보 등록
2. orders.status 업데이트 ('PAID' → 'SHIPPED')
3. event_logs 자동 기록
```

### 3. 배송 완료 플로우
```sql
1. orders.status 업데이트 ('SHIPPED' → 'DONE')
2. shipments.delivered_at 업데이트
3. event_logs 자동 기록
```

### 4. 환불 처리 플로우
```sql
1. orders.status 업데이트 ('DONE' → 'REFUNDED')
2. products.on_hand 증가 (재고 복구)
3. inventory_movements 기록 (movement_type = 'adjustment')
4. cashbook 기록 (type = 'refund', 음수 금액)
5. event_logs 자동 기록
```

### 5. 재고 입고 플로우
```sql
1. products.on_hand 증가
2. inventory_movements 기록 (movement_type = 'inbound')
3. cashbook 기록 (type = 'inbound', 매입 비용)
4. event_logs 자동 기록
```

## 🔐 Row Level Security (RLS) 정책

### 역할별 권한
| 테이블 | Admin | OrderManager | ShipManager |
|--------|-------|--------------|-------------|
| profiles | 모두 조회/수정 | 본인만 조회 | 본인만 조회 |
| products | 모든 작업 | 모든 작업 | 조회만 |
| orders | 모든 작업 | PAID 상태만 수정 | 배송 관련만 수정 |
| shipments | 모든 작업 | 조회만 | 모든 작업 |
| cashbook | 모든 작업 | 조회/생성 | 조회만 |
| event_logs | 조회만 | 조회만 | 조회만 |

## 🔧 자동화 트리거

### 1. 주문번호 자동 생성
- 형식: `ORD-YYMMDD-###`
- 매일 001부터 시작
- 시간대: Asia/Seoul (UTC+9)

### 2. SKU 자동 생성
- 형식: `카테고리-모델-색상-브랜드-해시5`
- 중복 방지 해시 포함

### 3. 타임스탬프 자동 업데이트
- `updated_at` 필드 자동 갱신

### 4. 이벤트 로깅
- orders, products, shipments 변경 시 자동 기록

## 📝 검증 체크리스트

### 데이터 무결성
- [ ] 주문 총액 = 주문 아이템 합계
- [ ] 재고 수량 >= 0 (음수 방지)
- [ ] 필수 필드 NOT NULL
- [ ] PCCC 코드 형식 검증 (P+12자리)
- [ ] 전화번호 형식 검증 (01X-XXXX-XXXX)

### 업무 규칙
- [ ] PAID 상태에서만 SHIPPED로 전환 가능
- [ ] SHIPPED 상태에서만 DONE으로 전환 가능
- [ ] 재고 부족 시 주문 생성 불가
- [ ] OrderManager는 PAID 상태만 수정 가능
- [ ] ShipManager는 배송 정보만 수정 가능

### 자동화 검증
- [ ] 주문 생성 시 재고 자동 차감
- [ ] 주문 생성 시 출납장부 자동 기록
- [ ] 환불 시 재고 자동 복구
- [ ] 모든 변경 사항 event_logs 기록

## 🚀 현재 구현 상태

### ✅ 구현 완료
- 기본 테이블 구조
- RLS 정책
- 자동화 트리거
- 주문번호/SKU 생성 함수

### ⚠️ 추가 필요
- `products.image_url` 필드 (상품 이미지)
- 다국어 지원 테이블 (옵션)
- 배송비 계산 로직
- 환율 관리 테이블 (CNY ↔ KRW)

### 🔄 개선 사항
- SKU 생성 패턴 단순화 (현재: 해시 → 개선: 일련번호)
- 배송 추적 URL 자동 생성 함수
- 출납장부 일/월별 집계 뷰