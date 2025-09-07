-- Fix foreign key constraints to add CASCADE delete
-- This migration handles the cashbook table foreign key issue

-- First, check if cashbook table exists or if it's cashbook_transactions
-- The error suggests the table exists but doesn't have created_by column

-- Option 1: If the table is 'cashbook' without created_by column
-- We need to add the column first if it doesn't exist
DO $$ 
BEGIN
    -- Check if cashbook table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cashbook') THEN
        -- Check if created_by column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'cashbook' AND column_name = 'created_by') THEN
            -- Add created_by column if it doesn't exist
            ALTER TABLE cashbook ADD COLUMN created_by UUID REFERENCES user_profiles(id) ON DELETE CASCADE;
        ELSE
            -- If column exists, update the constraint
            ALTER TABLE cashbook DROP CONSTRAINT IF EXISTS cashbook_created_by_fkey;
            ALTER TABLE cashbook ADD CONSTRAINT cashbook_created_by_fkey 
                FOREIGN KEY (created_by) REFERENCES user_profiles(id) ON DELETE CASCADE;
        END IF;
    END IF;
    
    -- Check if cashbook_transactions table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cashbook_transactions') THEN
        -- Check if created_by column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'cashbook_transactions' AND column_name = 'created_by') THEN
            -- Add created_by column if it doesn't exist
            ALTER TABLE cashbook_transactions ADD COLUMN created_by UUID REFERENCES user_profiles(id) ON DELETE CASCADE;
        ELSE
            -- If column exists, update the constraint
            ALTER TABLE cashbook_transactions DROP CONSTRAINT IF EXISTS cashbook_transactions_created_by_fkey;
            ALTER TABLE cashbook_transactions ADD CONSTRAINT cashbook_transactions_created_by_fkey 
                FOREIGN KEY (created_by) REFERENCES user_profiles(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Fix other tables that might have similar issues
-- Fix orders table if created_by exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_name = 'orders' AND column_name = 'created_by') THEN
        ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_created_by_fkey;
        ALTER TABLE orders ADD CONSTRAINT orders_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Fix products table if created_by exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_name = 'products' AND column_name = 'created_by') THEN
        ALTER TABLE products DROP CONSTRAINT IF EXISTS products_created_by_fkey;
        ALTER TABLE products ADD CONSTRAINT products_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Fix inventory_movements table if created_by exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_name = 'inventory_movements' AND column_name = 'created_by') THEN
        ALTER TABLE inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_created_by_fkey;
        ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Fix shipments table if created_by exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_name = 'shipments' AND column_name = 'created_by') THEN
        ALTER TABLE shipments DROP CONSTRAINT IF EXISTS shipments_created_by_fkey;
        ALTER TABLE shipments ADD CONSTRAINT shipments_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Fix event_logs table if user_id exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_name = 'event_logs' AND column_name = 'user_id') THEN
        ALTER TABLE event_logs DROP CONSTRAINT IF EXISTS event_logs_user_id_fkey;
        ALTER TABLE event_logs ADD CONSTRAINT event_logs_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;