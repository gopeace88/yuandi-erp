# TEST_DATA_GUIDE.md - YUANDI ERP 테스트 데이터 가이드

## 개요

이 문서는 YUANDI ERP 시스템의 테스트 데이터 생성 및 관리에 대한 가이드입니다.
모든 테스트 데이터는 PRD 문서의 비즈니스 워크플로우를 엄격히 따릅니다.

## 테스트 데이터 생성 스크립트

### 1. 전체 비즈니스 플로우 데이터 생성
```bash
# PRD 비즈니스 워크플로우에 따른 전체 테스트 데이터 생성
node scripts/generate-business-flow-data.js
```

**생성되는 데이터:**
- 상품 카테고리: 10개
- 상품: 500개 (각 카테고리별 분산)
- 재고: 각 상품별 20-200개
- 주문: 500개
  - paid (결제완료/배송대기): 200개
  - shipped (배송중): 150개
  - done (배송완료): 100개
  - refunded (환불): 50개
- 주문 아이템: 주문당 1-3개 상품
- 출납장부: 수입/지출 자동 기록
- 재고 이동 이력: 입고/출고 자동 기록

### 2. 추가 주문 데이터만 생성
```bash
# 기존 상품을 사용하여 주문만 추가
node scripts/add-remaining-orders.js
```

### 3. 출납장부 데이터만 생성
```bash
# 출납장부 데이터만 추가
node scripts/add-cashbook-only.js
```

## 비즈니스 워크플로우 검증

### 1. 재고 입고 플로우
```
상품 등록 → 재고 설정 → inventory_transactions 기록 → cashbook 지출 기록
```

### 2. 주문 생성 플로우 (PAID)
```
주문 생성 → 재고 차감 (allocated 증가) → cashbook 수입 기록
```

### 3. 배송 플로우
```
PAID → SHIPPED (송장번호 등록) → DONE (배송완료)
```

### 4. 환불 플로우
```
REFUNDED 상태 변경 → cashbook 환불 기록 → 재고 복구 없음 (PRD 명시)
```

## 데이터 무결성 검증 쿼리

### 주문 상태별 통계
```sql
SELECT status, COUNT(*) as count 
FROM orders 
GROUP BY status 
ORDER BY status;
```

### 재고 검증
```sql
SELECT 
    p.name,
    i.on_hand,
    i.allocated,
    i.available
FROM products p
JOIN inventory i ON p.id = i.product_id
WHERE i.allocated > 0
ORDER BY i.allocated DESC
LIMIT 10;
```

### 출납장부 잔액 검증
```sql
SELECT 
    type,
    COUNT(*) as count,
    SUM(amount_krw) as total
FROM cashbook_transactions
GROUP BY type
ORDER BY type;
```

## 테스트 시나리오

### 시나리오 1: 페이지네이션 테스트
- 500개 주문 데이터로 페이지네이션 동작 확인
- 각 페이지 20개씩 표시 → 25페이지 테스트

### 시나리오 2: 상태별 필터링
- paid: 200개 - 배송 대기 목록
- shipped: 150개 - 배송 중 목록
- done: 100개 - 완료된 주문
- refunded: 50개 - 환불 처리

### 시나리오 3: 재고 관리
- 재고 부족 상품 확인
- 재고 이동 이력 추적
- 입고/출고 플로우 검증

### 시나리오 4: 출납장부 정합성
- 주문 수입과 출납장부 매칭
- 환불 처리와 출납장부 매칭
- 월별/일별 집계 정확성

## 주의사항

1. **운영 환경 주의**: 이 스크립트는 모든 데이터를 삭제하고 재생성합니다.
2. **사용자 계정**: admin@yuandi.com 계정이 먼저 생성되어 있어야 합니다.
3. **데이터 정합성**: PRD 문서의 비즈니스 플로우를 반드시 따라야 합니다.
4. **재고 복구**: 환불 시 재고는 복구되지 않습니다 (PRD 명시사항).

## 데이터 초기화

```bash
# Supabase 대시보드에서 직접 실행
TRUNCATE TABLE 
    cashbook_transactions,
    event_logs,
    inventory_transactions,
    order_items,
    orders,
    inventory,
    products,
    product_categories
CASCADE;
```

## 관련 문서

- [PRD.md](./docs/(250907-v2.0)PRD.md) - 제품 요구사항 및 비즈니스 플로우
- [DATABASE_ERD.md](./docs/(250907-v1.1)DATABASE_ERD.md) - 데이터베이스 스키마
- [CLAUDE.md](../CLAUDE.md) - 개발 가이드

---
마지막 업데이트: 2025-09-07