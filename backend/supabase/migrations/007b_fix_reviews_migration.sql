-- ============================================================
-- Migration 007b: Fix reviews + create seller_payouts
-- Run this in Supabase SQL editor (replaces / fixes 007)
-- ============================================================

-- 1. Ensure reviews table exists (idempotent)
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

-- 2. Migrate product_reviews data safely — only copy columns that actually exist
DO $$
DECLARE
    col_name      TEXT;
    name_col      TEXT := NULL;
    email_col     TEXT := NULL;
    rating_col    TEXT := NULL;
    title_col     TEXT := NULL;
    message_col   TEXT := NULL;
    created_col   TEXT := NULL;
    product_col   TEXT := NULL;
    sql           TEXT;
BEGIN
    -- Only proceed if product_reviews exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'product_reviews'
    ) THEN
        RAISE NOTICE 'product_reviews does not exist — skipping migration';
        RETURN;
    END IF;

    -- Detect actual column names
    FOR col_name IN
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'product_reviews'
    LOOP
        CASE col_name
            WHEN 'user_name', 'reviewer_name', 'name', 'author' THEN name_col    := col_name;
            WHEN 'user_email', 'email', 'reviewer_email'        THEN email_col   := col_name;
            WHEN 'rating', 'score', 'stars'                     THEN rating_col  := col_name;
            WHEN 'title', 'subject', 'headline'                 THEN title_col   := col_name;
            WHEN 'message', 'body', 'comment', 'review', 'content' THEN message_col := col_name;
            WHEN 'created_at', 'created', 'date', 'submitted_at'    THEN created_col := col_name;
            WHEN 'product_id'                                    THEN product_col := col_name;
            ELSE NULL;
        END CASE;
    END LOOP;

    IF product_col IS NULL THEN
        RAISE NOTICE 'product_reviews has no product_id column — skipping migration';
        RETURN;
    END IF;

    -- Build dynamic INSERT
    sql := format(
        'INSERT INTO reviews (product_id, user_name, user_email, rating, title, message, created_at)
         SELECT
             pr.%I,
             %s,
             %s,
             %s,
             %s,
             %s,
             %s
         FROM product_reviews pr
         WHERE NOT EXISTS (
             SELECT 1 FROM reviews r
             WHERE r.product_id = pr.%I
         )
         ON CONFLICT DO NOTHING',
        -- product_id
        product_col,
        -- user_name
        CASE WHEN name_col    IS NOT NULL THEN format('COALESCE(pr.%I, ''Customer'')', name_col)    ELSE '''Customer''' END,
        -- user_email
        CASE WHEN email_col   IS NOT NULL THEN format('pr.%I', email_col)   ELSE 'NULL' END,
        -- rating
        CASE WHEN rating_col  IS NOT NULL THEN format('COALESCE(pr.%I, 5)', rating_col)  ELSE '5' END,
        -- title
        CASE WHEN title_col   IS NOT NULL THEN format('pr.%I', title_col)   ELSE 'NULL' END,
        -- message
        CASE WHEN message_col IS NOT NULL THEN format('COALESCE(pr.%I, '''')', message_col) ELSE '''(no content)''' END,
        -- created_at
        CASE WHEN created_col IS NOT NULL THEN format('COALESCE(pr.%I, NOW())', created_col) ELSE 'NOW()' END,
        -- WHERE NOT EXISTS product_id
        product_col
    );

    EXECUTE sql;
    RAISE NOTICE 'Migrated product_reviews → reviews successfully';
END $$;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating     ON reviews(rating);

-- ============================================================
-- 4. Seller payouts table
-- ============================================================
CREATE TABLE IF NOT EXISTS seller_payouts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','paid','rejected')),
    payment_method  TEXT NOT NULL DEFAULT 'bank_transfer'
                        CHECK (payment_method IN ('bank_transfer','mobile_money','other')),
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
-- 5. Row Level Security
-- ============================================================
ALTER TABLE reviews        ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select" ON reviews;
CREATE POLICY "reviews_select" ON reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "reviews_insert" ON reviews;
CREATE POLICY "reviews_insert" ON reviews FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "payouts_seller_select" ON seller_payouts;
CREATE POLICY "payouts_seller_select" ON seller_payouts FOR SELECT
    USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "payouts_seller_insert" ON seller_payouts;
CREATE POLICY "payouts_seller_insert" ON seller_payouts FOR INSERT
    WITH CHECK (auth.uid() = seller_id);

-- Done
SELECT 'Migration 007b complete' AS result;
