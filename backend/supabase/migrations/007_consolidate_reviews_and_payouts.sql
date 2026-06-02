-- ============================================================
-- Migration 007: Consolidate reviews + add seller_payouts
-- Run manually in Supabase SQL editor
-- ============================================================

-- 1. Create the canonical reviews table (if it doesn't already exist)
CREATE TABLE IF NOT EXISTS reviews (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_name  TEXT,
    user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name     TEXT NOT NULL DEFAULT 'Customer',
    user_email    TEXT,
    rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title         TEXT,
    message       TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. If product_reviews exists, migrate its data into reviews (de-duplicate by product_id + user_email)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'product_reviews'
    ) THEN
        INSERT INTO reviews (product_id, user_name, user_email, rating, title, message, created_at)
        SELECT
            pr.product_id,
            COALESCE(pr.user_name, pr.reviewer_name, 'Customer'),
            COALESCE(pr.user_email, pr.email),
            COALESCE(pr.rating, 5),
            COALESCE(pr.title, pr.subject),
            COALESCE(pr.message, pr.body, pr.comment, ''),
            COALESCE(pr.created_at, NOW())
        FROM product_reviews pr
        WHERE NOT EXISTS (
            SELECT 1 FROM reviews r
            WHERE r.product_id = pr.product_id
              AND r.user_email  = COALESCE(pr.user_email, pr.email)
        )
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 3. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating     ON reviews(rating);

-- ============================================================
-- 4. Seller payouts table
-- ============================================================
CREATE TABLE IF NOT EXISTS seller_payouts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    -- status: pending (requested, awaiting admin) | approved (admin OK'd) | paid (money sent) | rejected
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','paid','rejected')),
    payment_method  TEXT NOT NULL DEFAULT 'bank_transfer'
                        CHECK (payment_method IN ('bank_transfer','mobile_money','other')),
    -- Seller-provided bank details (JSON: { bankName, accountName, accountNumber })
    payment_details JSONB,
    admin_notes     TEXT,
    requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at    TIMESTAMPTZ,
    processed_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_payouts_seller_id ON seller_payouts(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_payouts_status    ON seller_payouts(status);

-- ============================================================
-- 5. Enable Row Level Security (recommended)
-- ============================================================
ALTER TABLE reviews       ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_payouts ENABLE ROW LEVEL SECURITY;

-- Reviews: anyone can read; only authenticated users can insert their own
DROP POLICY IF EXISTS "reviews_select" ON reviews;
CREATE POLICY "reviews_select" ON reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "reviews_insert" ON reviews;
CREATE POLICY "reviews_insert" ON reviews FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Seller payouts: seller sees their own; service role used by backend sees all
DROP POLICY IF EXISTS "payouts_seller_select" ON seller_payouts;
CREATE POLICY "payouts_seller_select" ON seller_payouts FOR SELECT
    USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "payouts_seller_insert" ON seller_payouts;
CREATE POLICY "payouts_seller_insert" ON seller_payouts FOR INSERT
    WITH CHECK (auth.uid() = seller_id);
