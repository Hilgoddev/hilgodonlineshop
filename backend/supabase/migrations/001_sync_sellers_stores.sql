-- ==========================================
-- Migration: Sync Sellers with Stores
-- ==========================================
-- This migration ensures all approved sellers have a corresponding store
-- and fixes any data inconsistencies between seller_applications and stores

-- Step 1: Ensure stores table has proper status column
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Update existing stores that may have is_approved but no status
UPDATE public.stores 
SET status = CASE 
    WHEN is_approved = true THEN 'approved'
    WHEN is_approved = false THEN 'rejected'
    ELSE 'pending'
END
WHERE status = 'pending' AND is_approved IS NOT NULL;

-- Step 2: Create stores for approved seller_applications that don't have stores yet
INSERT INTO public.stores (owner_id, name, slug, description, status, created_at, updated_at)
SELECT 
    sa.user_id as owner_id,
    sa.business_name as name,
    LOWER(REGEXP_REPLACE(sa.business_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTRING(sa.user_id::text, 1, 6) as slug,
    COALESCE(sa.business_category, 'General Store') as description,
    sa.status as status,
    sa.created_at as created_at,
    NOW() as updated_at
FROM public.seller_applications sa
LEFT JOIN public.stores s ON s.owner_id = sa.user_id
WHERE sa.status = 'approved' 
  AND s.id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.stores WHERE owner_id = sa.user_id
  )
ON CONFLICT DO NOTHING;

-- Step 3: Update profiles role for approved sellers
UPDATE public.profiles p
SET role = 'seller'
WHERE p.id IN (
    SELECT sa.user_id 
    FROM public.seller_applications sa 
    WHERE sa.status = 'approved'
)
AND p.role = 'customer';

-- Step 4: Create index for faster store lookups by owner
CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON public.stores(owner_id);

-- Step 5: Create index for faster store lookups by status
CREATE INDEX IF NOT EXISTS idx_stores_status ON public.stores(status);

-- Step 6: Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_slug ON public.stores(slug);

-- Step 7: Log the results
DO $$
DECLARE
    seller_count INTEGER;
    store_count INTEGER;
    approved_sellers INTEGER;
    stores_created INTEGER;
BEGIN
    SELECT COUNT(*) INTO seller_count FROM public.profiles WHERE role = 'seller';
    SELECT COUNT(*) INTO store_count FROM public.stores;
    SELECT COUNT(*) INTO approved_sellers FROM public.seller_applications WHERE status = 'approved';
    
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '  - Total sellers: %', seller_count;
    RAISE NOTICE '  - Total stores: %', store_count;
    RAISE NOTICE '  - Approved seller applications: %', approved_sellers;
    
    -- Check for sellers without stores
    SELECT COUNT(*) INTO stores_created
    FROM public.seller_applications sa
    LEFT JOIN public.stores s ON s.owner_id = sa.user_id
    WHERE sa.status = 'approved' AND s.id IS NULL;
    
    IF stores_created > 0 THEN
        RAISE NOTICE '  - WARNING: % approved sellers still without stores', stores_created;
    ELSE
        RAISE NOTICE '  - All approved sellers have stores';
    END IF;
END $$;