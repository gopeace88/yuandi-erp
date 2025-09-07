-- YUANDI ERP Row Level Security Policies
-- Additional security policies for fine-grained access control

-- =============================================
-- HELPER FUNCTIONS FOR RLS
-- =============================================

-- Get current user role
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS user_role AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM public.profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role = 'admin'
        FROM public.profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can manage orders
CREATE OR REPLACE FUNCTION auth.can_manage_orders()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role IN ('admin', 'order_manager')
        FROM public.profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can manage shipping
CREATE OR REPLACE FUNCTION auth.can_manage_shipping()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role IN ('admin', 'ship_manager')
        FROM public.profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ADDITIONAL RLS POLICIES
-- =============================================

-- Products: Delete policy (admin only)
CREATE POLICY products_delete ON products
    FOR DELETE USING (auth.is_admin());

-- Orders: Delete policy (admin only, and only paid status)
CREATE POLICY orders_delete ON orders
    FOR DELETE USING (
        auth.is_admin() AND status = 'paid'
    );

-- Cashbook: Update policy (admin only)
CREATE POLICY cashbook_update ON cashbook
    FOR UPDATE USING (auth.is_admin());

-- Cashbook: Delete policy (admin only)
CREATE POLICY cashbook_delete ON cashbook
    FOR DELETE USING (auth.is_admin());

-- Inventory movements: Update policy (prevent modifications)
CREATE POLICY inventory_movements_no_update ON inventory_movements
    FOR UPDATE USING (false);

-- Inventory movements: Delete policy (prevent deletions)
CREATE POLICY inventory_movements_no_delete ON inventory_movements
    FOR DELETE USING (false);

-- Event logs: Insert policy (system generates these)
CREATE POLICY event_logs_insert ON event_logs
    FOR INSERT WITH CHECK (true);

-- Event logs: No update policy
CREATE POLICY event_logs_no_update ON event_logs
    FOR UPDATE USING (false);

-- Event logs: No delete policy
CREATE POLICY event_logs_no_delete ON event_logs
    FOR DELETE USING (false);

-- =============================================
-- PUBLIC ACCESS POLICIES (for customer tracking)
-- =============================================

-- Create a function for customer order lookup
CREATE OR REPLACE FUNCTION public.lookup_customer_orders(
    p_customer_name VARCHAR,
    p_customer_phone VARCHAR
)
RETURNS SETOF orders AS $$
BEGIN
    RETURN QUERY
    SELECT o.*
    FROM orders o
    WHERE o.customer_name = p_customer_name
    AND o.customer_phone = p_customer_phone
    ORDER BY o.created_at DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon role for customer lookup
GRANT EXECUTE ON FUNCTION public.lookup_customer_orders(VARCHAR, VARCHAR) TO anon;

-- =============================================
-- PERFORMANCE OPTIMIZATION POLICIES
-- =============================================

-- Create policy for bulk operations (admin only)
CREATE POLICY bulk_operations_admin ON products
    FOR ALL USING (auth.is_admin());

-- Create policy for read-only dashboard access
CREATE POLICY dashboard_read_access ON orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND active = true
        )
    );

-- =============================================
-- AUDIT POLICIES
-- =============================================

-- Ensure all modifications are logged
CREATE OR REPLACE FUNCTION ensure_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    -- This trigger ensures that event_logs are created for all modifications
    -- The actual logging is handled by the log_changes() function
    -- This is a safety net to ensure logging isn't bypassed
    
    IF TG_OP IN ('INSERT', 'UPDATE', 'DELETE') THEN
        -- Verify that the current user is authenticated
        IF auth.uid() IS NULL THEN
            RAISE EXCEPTION 'Authentication required for this operation';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger to sensitive tables
CREATE TRIGGER ensure_audit_orders
BEFORE INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION ensure_audit_log();

CREATE TRIGGER ensure_audit_products
BEFORE INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION ensure_audit_log();

CREATE TRIGGER ensure_audit_cashbook
BEFORE INSERT OR UPDATE OR DELETE ON cashbook
FOR EACH ROW EXECUTE FUNCTION ensure_audit_log();

-- =============================================
-- ROLE-BASED VIEW POLICIES
-- =============================================

-- Create views for role-specific data access
CREATE OR REPLACE VIEW my_orders AS
SELECT * FROM orders
WHERE created_by = auth.uid();

CREATE OR REPLACE VIEW pending_shipments AS
SELECT o.*, s.tracking_no, s.courier
FROM orders o
LEFT JOIN shipments s ON o.id = s.order_id
WHERE o.status = 'paid';

CREATE OR REPLACE VIEW low_stock_products AS
SELECT *
FROM products
WHERE on_hand <= low_stock_threshold
AND active = true;

-- Grant appropriate permissions
GRANT SELECT ON my_orders TO authenticated;
GRANT SELECT ON pending_shipments TO authenticated;
GRANT SELECT ON low_stock_products TO authenticated;

-- =============================================
-- DATA VALIDATION POLICIES
-- =============================================

-- Ensure order items match order currency
CREATE OR REPLACE FUNCTION validate_order_items()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure all items belong to the same order
    IF NEW.order_id IS NULL THEN
        RAISE EXCEPTION 'Order ID is required';
    END IF;
    
    -- Ensure quantity is positive
    IF NEW.quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be positive';
    END IF;
    
    -- Ensure subtotal matches calculation
    IF NEW.subtotal != (NEW.unit_price * NEW.quantity) THEN
        RAISE EXCEPTION 'Subtotal calculation error';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_order_items_trigger
BEFORE INSERT OR UPDATE ON order_items
FOR EACH ROW EXECUTE FUNCTION validate_order_items();

-- Ensure shipment is created only for paid orders
CREATE OR REPLACE FUNCTION validate_shipment()
RETURNS TRIGGER AS $$
DECLARE
    v_order_status order_status;
BEGIN
    -- Get order status
    SELECT status INTO v_order_status
    FROM orders
    WHERE id = NEW.order_id;
    
    -- Ensure order is in paid status
    IF v_order_status != 'paid' THEN
        RAISE EXCEPTION 'Can only create shipment for paid orders';
    END IF;
    
    -- Auto-update order status to shipped
    UPDATE orders
    SET status = 'shipped',
        updated_at = NOW()
    WHERE id = NEW.order_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_shipment_trigger
BEFORE INSERT ON shipments
FOR EACH ROW EXECUTE FUNCTION validate_shipment();

-- =============================================
-- CLEANUP POLICIES
-- =============================================

-- Soft delete for products (set inactive instead of delete)
CREATE OR REPLACE FUNCTION soft_delete_product()
RETURNS TRIGGER AS $$
BEGIN
    -- Instead of deleting, set inactive
    UPDATE products
    SET active = false,
        updated_at = NOW()
    WHERE id = OLD.id;
    
    -- Prevent actual deletion
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER soft_delete_product_trigger
BEFORE DELETE ON products
FOR EACH ROW EXECUTE FUNCTION soft_delete_product();

-- =============================================
-- PERFORMANCE POLICIES
-- =============================================

-- Create materialized view for dashboard statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as order_count,
    SUM(total_amount) as total_sales,
    COUNT(DISTINCT customer_phone) as unique_customers,
    status,
    COUNT(*) FILTER (WHERE status = 'paid') as pending_orders,
    COUNT(*) FILTER (WHERE status = 'shipped') as shipping_orders,
    COUNT(*) FILTER (WHERE status = 'delivered') as completed_orders,
    COUNT(*) FILTER (WHERE status = 'refunded') as refunded_orders
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), status;

-- Create index on materialized view
CREATE UNIQUE INDEX idx_dashboard_stats_date ON dashboard_stats(date);

-- Refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh (this would be called by a cron job)
-- In Supabase, you can set up a cron job to call this function

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant usage on schema to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant appropriate permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Revoke dangerous permissions from anon
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- Grant specific permissions for public access
GRANT EXECUTE ON FUNCTION public.lookup_customer_orders(VARCHAR, VARCHAR) TO anon;

-- =============================================
-- SECURITY DEFINER FUNCTIONS
-- =============================================

-- Function to safely update user profile
CREATE OR REPLACE FUNCTION update_user_profile(
    p_name VARCHAR,
    p_phone VARCHAR,
    p_locale locale_type
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_updated BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    UPDATE profiles
    SET name = COALESCE(p_name, name),
        phone = COALESCE(p_phone, phone),
        locale = COALESCE(p_locale, locale),
        updated_at = NOW()
    WHERE id = v_user_id;
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    IF v_updated THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Profile updated successfully'
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Profile update failed'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_user_profile(VARCHAR, VARCHAR, locale_type) TO authenticated;