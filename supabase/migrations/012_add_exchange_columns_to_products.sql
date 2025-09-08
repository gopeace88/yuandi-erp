-- Migration: 012_add_exchange_columns_to_products
-- Purpose: Add exchange rate conversion columns to products table
-- Created: 2025-01-07

-- Add exchange rate columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS cost_krw DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS price_cny DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS exchange_date DATE;

-- Add comments for documentation
COMMENT ON COLUMN products.cost_krw IS 'Cost in KRW (auto-calculated from cost_cny)';
COMMENT ON COLUMN products.price_cny IS 'Price in CNY (auto-calculated from price_krw)';
COMMENT ON COLUMN products.exchange_rate IS 'Exchange rate used for conversion (CNY to KRW)';
COMMENT ON COLUMN products.exchange_date IS 'Date of exchange rate used';

-- Create trigger function to auto-calculate exchange rates on insert/update
CREATE OR REPLACE FUNCTION calculate_product_exchange_rates()
RETURNS TRIGGER AS $$
DECLARE
  current_rate DECIMAL(10,4);
  rate_date DATE;
BEGIN
  -- Get current exchange rate
  SELECT rate, effective_date INTO current_rate, rate_date
  FROM exchange_rates
  WHERE base_currency = 'CNY' 
    AND target_currency = 'KRW'
  ORDER BY effective_date DESC
  LIMIT 1;
  
  -- Use default rate if not found
  IF current_rate IS NULL THEN
    current_rate := 178.50;
    rate_date := CURRENT_DATE;
  END IF;
  
  -- Calculate conversions
  IF NEW.cost_cny IS NOT NULL THEN
    NEW.cost_krw := NEW.cost_cny * current_rate;
  END IF;
  
  IF NEW.price_krw IS NOT NULL THEN
    NEW.price_cny := NEW.price_krw / current_rate;
  END IF;
  
  -- Store the exchange rate used
  NEW.exchange_rate := current_rate;
  NEW.exchange_date := rate_date;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic calculation
DROP TRIGGER IF EXISTS trigger_calculate_product_exchange_rates ON products;
CREATE TRIGGER trigger_calculate_product_exchange_rates
  BEFORE INSERT OR UPDATE OF cost_cny, price_krw
  ON products
  FOR EACH ROW
  EXECUTE FUNCTION calculate_product_exchange_rates();

-- Update existing products with exchange rates
UPDATE products p
SET 
  cost_krw = p.cost_cny * COALESCE(
    (SELECT rate FROM exchange_rates 
     WHERE base_currency = 'CNY' AND target_currency = 'KRW' 
     ORDER BY effective_date DESC LIMIT 1), 
    178.50
  ),
  price_cny = p.price_krw / COALESCE(
    (SELECT rate FROM exchange_rates 
     WHERE base_currency = 'CNY' AND target_currency = 'KRW' 
     ORDER BY effective_date DESC LIMIT 1), 
    178.50
  ),
  exchange_rate = COALESCE(
    (SELECT rate FROM exchange_rates 
     WHERE base_currency = 'CNY' AND target_currency = 'KRW' 
     ORDER BY effective_date DESC LIMIT 1), 
    178.50
  ),
  exchange_date = COALESCE(
    (SELECT effective_date FROM exchange_rates 
     WHERE base_currency = 'CNY' AND target_currency = 'KRW' 
     ORDER BY effective_date DESC LIMIT 1), 
    CURRENT_DATE
  )
WHERE cost_krw IS NULL OR price_cny IS NULL;