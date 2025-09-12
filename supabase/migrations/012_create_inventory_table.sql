-- Create inventory table for tracking product stock
-- This table complements products.on_hand with additional allocation tracking

CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  on_hand INTEGER DEFAULT 0 CHECK (on_hand >= 0),
  allocated INTEGER DEFAULT 0 CHECK (allocated >= 0),
  available INTEGER GENERATED ALWAYS AS (on_hand - allocated) STORED,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_updated_at();

-- Initialize inventory records for existing products
INSERT INTO inventory (product_id, on_hand, allocated)
SELECT 
  id AS product_id,
  on_hand,
  0 AS allocated
FROM products
ON CONFLICT (product_id) DO NOTHING;

-- Add comment
COMMENT ON TABLE inventory IS 'Inventory tracking table with allocation management';
COMMENT ON COLUMN inventory.on_hand IS 'Current stock quantity';
COMMENT ON COLUMN inventory.allocated IS 'Quantity allocated to pending orders';
COMMENT ON COLUMN inventory.available IS 'Available quantity (on_hand - allocated)';