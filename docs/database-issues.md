# 데이터베이스 구조 문제점 분석

## 🔴 현재 문제점

### 1. Products 테이블 - 이미지 URL 컬럼 누락
```sql
-- 현재: image_url 컬럼이 없음
-- 필요: 상품 이미지 저장을 위한 컬럼
ALTER TABLE products ADD COLUMN image_url VARCHAR(500);
```

### 2. Shipments vs Orders 테이블 혼란
**설계 의도 (PRD 기준)**:
- orders: 주문 기본 정보만
- shipments: 배송 관련 모든 정보 (1:1 관계)

**현재 문제**:
- API가 orders 테이블에 직접 tracking_number, courier 저장 시도
- shipments 테이블은 존재하지만 전혀 사용하지 않음
- orders 테이블에 tracking 컬럼들이 추가되어 있음 (잘못됨)

### 3. Shipments 테이블 컬럼 매핑
```sql
shipments 테이블 컬럼:
- courier: 한국 택배사
- courier_code: 택배사 코드
- tracking_no: 한국 운송장 번호  
- tracking_url: 한국 추적 URL
- courier_cn: 중국 택배사 (추가 필요)
- tracking_no_cn: 중국 운송장 번호 (추가 필요)
- tracking_url_cn: 중국 추적 URL (추가 필요)
- shipment_photo_url: 송장 사진
- receipt_photo_url: 영수증 사진
- shipping_fee: 배송비
- actual_weight: 실제 무게
- volume_weight: 부피 무게
- shipped_at: 발송일
- delivered_at: 배송 완료일
```

## ✅ 올바른 구조

### 1. 주문 생성 (PAID)
```sql
INSERT INTO orders (기본 주문 정보)
-- shipments 테이블 생성 안함
```

### 2. 송장 등록 (PAID → SHIPPED)
```sql
-- 1. shipments 테이블에 배송 정보 저장
INSERT INTO shipments (
    order_id,
    courier, tracking_no, tracking_url,
    courier_cn, tracking_no_cn, tracking_url_cn,
    shipment_photo_url, shipped_at
)

-- 2. orders 상태만 업데이트
UPDATE orders SET status = 'SHIPPED'
```

### 3. 배송 완료 (SHIPPED → DONE)
```sql
-- 1. shipments 업데이트
UPDATE shipments SET delivered_at = NOW()

-- 2. orders 상태 업데이트
UPDATE orders SET status = 'DONE'
```

## 🛠️ 수정 필요 사항

### 1. 데이터베이스 마이그레이션
```sql
-- products 테이블에 이미지 URL 추가
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

-- orders 테이블에서 잘못 추가된 컬럼 제거 (선택사항)
-- ALTER TABLE orders DROP COLUMN IF EXISTS tracking_number;
-- ALTER TABLE orders DROP COLUMN IF EXISTS courier;
-- ALTER TABLE orders DROP COLUMN IF EXISTS tracking_url;

-- shipments 테이블에 중국 택배 정보 추가
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS courier_cn VARCHAR(50),
ADD COLUMN IF NOT EXISTS tracking_no_cn VARCHAR(100),
ADD COLUMN IF NOT EXISTS tracking_url_cn VARCHAR(500);
```

### 2. API 수정
- `/api/orders/[id]/ship`: shipments 테이블에 INSERT
- `/api/orders/[id]/complete`: shipments 테이블 UPDATE
- 모든 배송 정보 조회시 shipments JOIN

### 3. UI 수정
- OrderEditModal: shipments 테이블 사용
- 주문 상세 보기: shipments 정보 표시
- 상품 추가: image_url 저장 로직

## 📋 구현 우선순위

1. **긴급**: products.image_url 컬럼 추가
2. **중요**: shipments 테이블 제대로 사용하도록 API 수정
3. **선택**: orders 테이블의 중복 컬럼 정리