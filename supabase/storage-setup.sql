-- ============================================================================
-- YUANDI ERP Storage Bucket Setup
-- Description: Creates storage buckets and policies for image uploads
-- ============================================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    (
        'images',
        'images',
        true, -- Public bucket for product/shipment images
        5242880, -- 5MB limit
        ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
    ),
    (
        'documents',
        'documents',
        false, -- Private bucket for sensitive documents
        10485760, -- 10MB limit
        ARRAY['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']::text[]
    )
ON CONFLICT (id) DO UPDATE
SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- Storage Policies for 'images' bucket
-- ============================================================================

-- Allow authenticated users to view all images
CREATE POLICY "Public images are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

-- Allow authenticated users to upload images to their own folder
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'images' 
    AND auth.uid() IS NOT NULL
    AND (
        -- Allow uploads to product/ folder for Admin and OrderManager
        (
            storage.foldername(name)[1] = 'product'
            AND EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND role IN ('Admin', 'OrderManager')
            )
        )
        OR
        -- Allow uploads to shipment/ folder for Admin and ShipManager
        (
            storage.foldername(name)[1] = 'shipment'
            AND EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND role IN ('Admin', 'ShipManager')
            )
        )
    )
);

-- Allow users to update their own images
CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'images'
    AND auth.uid() IS NOT NULL
    AND (
        -- Check if user uploaded this image (path contains their user ID)
        storage.foldername(name)[2] = auth.uid()::text
        OR
        -- Admin can update any image
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'Admin'
        )
    )
);

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'images'
    AND auth.uid() IS NOT NULL
    AND (
        -- Check if user uploaded this image (path contains their user ID)
        storage.foldername(name)[2] = auth.uid()::text
        OR
        -- Admin can delete any image
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'Admin'
        )
    )
);

-- ============================================================================
-- Storage Policies for 'documents' bucket
-- ============================================================================

-- Only Admin can view documents
CREATE POLICY "Admin can view all documents"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'documents'
    AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'Admin'
    )
);

-- Only Admin can upload documents
CREATE POLICY "Admin can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'documents'
    AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'Admin'
    )
);

-- Only Admin can update documents
CREATE POLICY "Admin can update documents"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'documents'
    AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'Admin'
    )
);

-- Only Admin can delete documents
CREATE POLICY "Admin can delete documents"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'documents'
    AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'Admin'
    )
);

-- ============================================================================
-- Helper Functions for Storage
-- ============================================================================

-- Function to get image URL
CREATE OR REPLACE FUNCTION get_image_url(path TEXT)
RETURNS TEXT AS $$
BEGIN
    IF path IS NULL OR path = '' THEN
        RETURN NULL;
    END IF;
    
    -- Return the public URL for the image
    RETURN 'https://' || current_setting('app.settings.supabase_url', true) || 
           '/storage/v1/object/public/images/' || path;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up orphaned images (images not referenced in products or shipments)
CREATE OR REPLACE FUNCTION cleanup_orphaned_images()
RETURNS TABLE(deleted_path TEXT) AS $$
DECLARE
    image_path TEXT;
BEGIN
    -- Find orphaned product images
    FOR image_path IN
        SELECT DISTINCT unnest(storage.foldername(name)) as path
        FROM storage.objects
        WHERE bucket_id = 'images'
        AND storage.foldername(name)[1] = 'product'
        AND name NOT IN (
            SELECT image_url FROM products WHERE image_url IS NOT NULL
        )
        AND created_at < NOW() - INTERVAL '7 days' -- Only delete if older than 7 days
    LOOP
        -- Delete the orphaned image
        DELETE FROM storage.objects WHERE name = image_path;
        deleted_path := image_path;
        RETURN NEXT;
    END LOOP;
    
    -- Find orphaned shipment images
    FOR image_path IN
        SELECT DISTINCT unnest(storage.foldername(name)) as path
        FROM storage.objects
        WHERE bucket_id = 'images'
        AND storage.foldername(name)[1] = 'shipment'
        AND name NOT IN (
            SELECT shipment_photo_url FROM shipments WHERE shipment_photo_url IS NOT NULL
            UNION
            SELECT receipt_photo_url FROM shipments WHERE receipt_photo_url IS NOT NULL
        )
        AND created_at < NOW() - INTERVAL '7 days'
    LOOP
        -- Delete the orphaned image
        DELETE FROM storage.objects WHERE name = image_path;
        deleted_path := image_path;
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Usage Instructions
-- ============================================================================

-- 1. Run this script in Supabase SQL Editor after creating your project
-- 2. The storage structure will be:
--    images/
--      product/{user_id}/{timestamp}.{ext}  -- Product images
--      shipment/{user_id}/{timestamp}.{ext} -- Shipment photos
--    documents/
--      exports/{date}/{filename}.xlsx       -- Excel exports
--      reports/{date}/{filename}.pdf        -- PDF reports

-- 3. Image URLs will be publicly accessible at:
--    https://YOUR_PROJECT.supabase.co/storage/v1/object/public/images/...

-- 4. To clean up orphaned images periodically, you can run:
--    SELECT * FROM cleanup_orphaned_images();
--    (Consider setting this up as a scheduled job)