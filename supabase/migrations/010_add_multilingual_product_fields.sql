-- =====================================================
-- Migration: Add multilingual fields to products table
-- Description: 한글/중문 상품명 필드 추가
-- =====================================================

-- 1. products 테이블에 다국어 필드 추가
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS name_ko VARCHAR(255),
ADD COLUMN IF NOT EXISTS name_zh VARCHAR(255);

-- 2. 기존 name 필드 데이터를 name_ko로 복사 (기존 데이터 마이그레이션)
UPDATE products 
SET name_ko = name,
    name_zh = name
WHERE name_ko IS NULL OR name_zh IS NULL;

-- 3. categories 테이블에 누락된 필드 확인 및 추가 (이미 있을 수 있음)
-- categories 테이블은 이미 name_ko, name_zh 필드가 있음

-- 4. 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_products_name_ko ON products(name_ko);
CREATE INDEX IF NOT EXISTS idx_products_name_zh ON products(name_zh);

-- 5. 코멘트 추가
COMMENT ON COLUMN products.name_ko IS '상품명 (한국어)';
COMMENT ON COLUMN products.name_zh IS '상품명 (중국어)';