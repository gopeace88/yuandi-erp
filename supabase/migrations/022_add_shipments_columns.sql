-- Migration: Add missing columns to shipments table
-- Description: Add courier, tracking_number, tracking_url and other columns for simplified shipping system

-- Add courier column (택배사 코드)
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS courier VARCHAR(50);

-- Add tracking_number column (운송장 번호 - 한국/중국 공통)
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS tracking_number TEXT;

-- Add tracking_url column (추적 URL)
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS tracking_url TEXT;

-- Add shipping cost columns
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS shipping_cost_cny DECIMAL(10,2);

ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS shipping_cost_krw DECIMAL(12,0);

-- Add weight column
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS weight_g INTEGER;

-- Add package images column
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS package_images TEXT[];

-- Add status column
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'in_transit';

-- Add delivery notes column  
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

-- Add estimated delivery date
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE;

-- Add actual delivery date
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS actual_delivery_date DATE;

-- Add package count
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS package_count INTEGER DEFAULT 1;

-- Add missing address columns
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS shipping_address_line1 TEXT;

ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS shipping_address_line2 TEXT;

ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS shipping_postal_code VARCHAR(10);

-- Add comment
COMMENT ON COLUMN shipments.courier IS '택배사 코드 (cj, hanjin, lotte 등)';
COMMENT ON COLUMN shipments.tracking_number IS '운송장 번호 (한국/중국 공통)';
COMMENT ON COLUMN shipments.tracking_url IS '배송 추적 URL';
COMMENT ON COLUMN shipments.shipping_cost_cny IS '배송비 (CNY)';
COMMENT ON COLUMN shipments.shipping_cost_krw IS '배송비 (KRW)';
COMMENT ON COLUMN shipments.weight_g IS '무게 (그램)';
COMMENT ON COLUMN shipments.package_images IS '패키지 이미지 URL 배열';
COMMENT ON COLUMN shipments.status IS '배송 상태 (in_transit, delivered 등)';
COMMENT ON COLUMN shipments.delivery_notes IS '배송 메모';
COMMENT ON COLUMN shipments.estimated_delivery_date IS '예상 배송일';
COMMENT ON COLUMN shipments.actual_delivery_date IS '실제 배송일';
COMMENT ON COLUMN shipments.package_count IS '패키지 수량';