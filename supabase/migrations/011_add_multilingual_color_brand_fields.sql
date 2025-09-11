-- =====================================================
-- Migration: Add multilingual fields for color and brand
-- Description: 색상/브랜드에 한글/중문 필드 추가
-- =====================================================

-- 1. products 테이블에 다국어 필드 추가
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS color_ko VARCHAR(100),
ADD COLUMN IF NOT EXISTS color_zh VARCHAR(100),
ADD COLUMN IF NOT EXISTS brand_ko VARCHAR(100),
ADD COLUMN IF NOT EXISTS brand_zh VARCHAR(100);

-- 2. 기존 데이터 마이그레이션 (기존 color, brand 값을 다국어 필드로 복사)
UPDATE products 
SET 
    color_ko = COALESCE(color_ko, color),
    color_zh = COALESCE(color_zh, color),
    brand_ko = COALESCE(brand_ko, brand),
    brand_zh = COALESCE(brand_zh, brand)
WHERE color_ko IS NULL OR color_zh IS NULL OR brand_ko IS NULL OR brand_zh IS NULL;

-- 3. 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_products_color_ko ON products(color_ko);
CREATE INDEX IF NOT EXISTS idx_products_color_zh ON products(color_zh);
CREATE INDEX IF NOT EXISTS idx_products_brand_ko ON products(brand_ko);
CREATE INDEX IF NOT EXISTS idx_products_brand_zh ON products(brand_zh);

-- 4. 코멘트 추가
COMMENT ON COLUMN products.color_ko IS '색상 (한국어)';
COMMENT ON COLUMN products.color_zh IS '색상 (중국어)';
COMMENT ON COLUMN products.brand_ko IS '브랜드 (한국어)';
COMMENT ON COLUMN products.brand_zh IS '브랜드 (중국어)';