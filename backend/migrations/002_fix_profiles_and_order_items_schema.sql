-- Migration 002: Fix profiles table and order_items relationships
-- Resolves: "Could not find a relationship between 'order_items' and 'profiles' in the schema cache"
-- Resolves: "profiles_2.phone does not exist"

-- =====================================================
-- PART 1: Ensure profiles table has required columns
-- =====================================================

-- Add phone column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'phone'
    ) THEN
        ALTER TABLE profiles
        ADD COLUMN phone TEXT;
        
        RAISE NOTICE 'Added column phone to profiles';
    ELSE
        RAISE NOTICE 'Column phone already exists in profiles';
    END IF;
END $$;

-- Add store_name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'store_name'
    ) THEN
        ALTER TABLE profiles
        ADD COLUMN store_name TEXT;
        
        RAISE NOTICE 'Added column store_name to profiles';
    ELSE
        RAISE NOTICE 'Column store_name already exists in profiles';
    END IF;
END $$;

-- Add full_name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'full_name'
    ) THEN
        ALTER TABLE profiles
        ADD COLUMN full_name TEXT;
        
        RAISE NOTICE 'Added column full_name to profiles';
    ELSE
        RAISE NOTICE 'Column full_name already exists in profiles';
    END IF;
END $$;

-- Add role column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE profiles
        ADD COLUMN role TEXT DEFAULT 'customer';
        
        RAISE NOTICE 'Added column role to profiles';
    ELSE
        RAISE NOTICE 'Column role already exists in profiles';
    END IF;
END $$;

-- =====================================================
-- PART 2: Ensure order_items has seller_id column
-- =====================================================

-- Add seller_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'seller_id'
    ) THEN
        ALTER TABLE order_items
        ADD COLUMN seller_id UUID;
        
        RAISE NOTICE 'Added column seller_id to order_items';
    ELSE
        RAISE NOTICE 'Column seller_id already exists in order_items';
    END IF;
END $$;

-- =====================================================
-- PART 3: Add foreign key constraints
-- =====================================================

-- Add foreign key from order_items.seller_id to profiles.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        WHERE tc.table_name = 'order_items'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'seller_id'
    ) THEN
        ALTER TABLE order_items
        ADD CONSTRAINT order_items_seller_id_fkey
        FOREIGN KEY (seller_id)
        REFERENCES profiles(id)
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Added foreign key: order_items.seller_id -> profiles.id';
    ELSE
        RAISE NOTICE 'Foreign key order_items.seller_id -> profiles.id already exists';
    END IF;
END $$;

-- Add foreign key from order_items.product_id to products.id (if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        WHERE tc.table_name = 'order_items'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'product_id'
    ) THEN
        ALTER TABLE order_items
        ADD CONSTRAINT order_items_product_id_fkey
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE RESTRICT;
        
        RAISE NOTICE 'Added foreign key: order_items.product_id -> products.id';
    ELSE
        RAISE NOTICE 'Foreign key order_items.product_id -> products.id already exists';
    END IF;
END $$;

-- Add foreign key from order_items.order_id to orders.id (if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        WHERE tc.table_name = 'order_items'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'order_id'
    ) THEN
        ALTER TABLE order_items
        ADD CONSTRAINT order_items_order_id_fkey
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key: order_items.order_id -> orders.id';
    ELSE
        RAISE NOTICE 'Foreign key order_items.order_id -> orders.id already exists';
    END IF;
END $$;

-- =====================================================
-- PART 4: Ensure products.seller_id foreign key exists
-- =====================================================

-- Add foreign key from products.seller_id to profiles.id (if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        WHERE tc.table_name = 'products'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'seller_id'
    ) THEN
        -- First ensure seller_id column exists
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'products' AND column_name = 'seller_id'
        ) THEN
            ALTER TABLE products
            ADD COLUMN seller_id UUID;
            
            RAISE NOTICE 'Added column seller_id to products';
        END IF;
        
        -- Now add the foreign key
        ALTER TABLE products
        ADD CONSTRAINT products_seller_id_fkey
        FOREIGN KEY (seller_id)
        REFERENCES profiles(id)
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Added foreign key: products.seller_id -> profiles.id';
    ELSE
        RAISE NOTICE 'Foreign key products.seller_id -> profiles.id already exists';
    END IF;
END $$;

-- =====================================================
-- PART 5: Create performance indexes
-- =====================================================

-- Index on order_items.seller_id for faster joins
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'order_items' AND indexname = 'idx_order_items_seller_id'
    ) THEN
        CREATE INDEX idx_order_items_seller_id ON order_items(seller_id);
        
        RAISE NOTICE 'Created index: idx_order_items_seller_id';
    END IF;
END $$;

-- Index on products.seller_id for faster joins
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'products' AND indexname = 'idx_products_seller_id'
    ) THEN
        CREATE INDEX idx_products_seller_id ON products(seller_id);
        
        RAISE NOTICE 'Created index: idx_products_seller_id';
    END IF;
END $$;

-- =====================================================
-- Summary
-- =====================================================
-- This migration ensures:
-- 1. profiles table has: id, full_name, phone, store_name, role, username
-- 2. order_items has seller_id column with FK to profiles.id
-- 3. products has seller_id column with FK to profiles.id
-- 4. All necessary indexes for performance
-- 
-- After applying, the following queries will work:
-- - order_items -> profiles (for seller info)
-- - products -> profiles (for seller info)
-- - Nested joins like: order_items -> products -> profiles
-- =====================================================