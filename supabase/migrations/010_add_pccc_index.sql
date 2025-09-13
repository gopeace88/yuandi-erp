-- =====================================================
-- PCCC 인덱스 추가
-- 고객 통계 및 단골 고객 분석을 위한 인덱싱
-- Created: 2025-01-13
-- =====================================================

-- orders 테이블에 customer_pccc 인덱스 추가
-- PCCC는 개인통관고유부호로 고객을 식별하는 유일한 키
CREATE INDEX IF NOT EXISTS idx_orders_customer_pccc 
ON orders(customer_pccc) 
WHERE customer_pccc IS NOT NULL;

-- 복합 인덱스: PCCC와 status를 함께 인덱싱 (상태별 고객 분석용)
CREATE INDEX IF NOT EXISTS idx_orders_pccc_status 
ON orders(customer_pccc, status) 
WHERE customer_pccc IS NOT NULL;

-- 복합 인덱스: PCCC와 order_date를 함께 인덱싱 (기간별 고객 분석용)
CREATE INDEX IF NOT EXISTS idx_orders_pccc_date 
ON orders(customer_pccc, order_date) 
WHERE customer_pccc IS NOT NULL;

-- 인덱스 생성 확인
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'orders'
AND indexname LIKE '%pccc%'
ORDER BY indexname;