-- 018_fix_product_category_mismatches.sql
-- One-off data correction so every product sits under the right category page.
-- Target rows were identified by product name and individually reviewed.
-- Safe to re-run: every statement is idempotent.

BEGIN;

-- (1) Canonicalise category case/whitespace (fixes "Electronics" -> "electronics",
--     which the app filters as lowercase and would otherwise hide those products).
UPDATE products SET category = lower(trim(category))
 WHERE category <> lower(trim(category));

-- (2) Standalone bags (crossbody/tote/handbag sets) miscategorised under clothing/shoes (16)
UPDATE products SET category = 'accessories'
 WHERE id IN (
  '1318e581-e752-42aa-8fe3-ffdccc9d48d4',
  'dd63b3f4-43e7-474c-ba6d-f0d7236a76a1',
  '3916c74d-5523-44da-8cab-400fc06a69f3',
  '1f12d75f-f40d-4dcb-b020-a1c3d2825de3',
  'd640b3f4-a640-4760-89e0-c871efd76095',
  '192b7815-d9ce-4fe2-a7fc-1029fdd3112e',
  '6d0a74c6-10d6-4d67-af45-5c8075fca066',
  'a591d639-1e42-4f61-bf5f-ffdaf398c434',
  'adfeb333-a60b-4b7a-8646-19457ac79848',
  '84c712e3-561f-4712-b664-3cd218cbead1',
  '7714ed35-536e-43d9-a80e-39b26dbd0298',
  'a9553c8f-d124-4273-a040-cbeb770a0db3',
  'd477bf28-30e2-4633-9647-a199348cc484',
  '4081f5bc-bc98-479c-8f36-e2453eb97d33',
  '25ef61a9-c2e1-402d-85c0-dfc95588b43f',
  '6f1c29b4-a705-4d44-ae3b-ccf89adddbcd'
);

-- (3) Footwear (clogs / mule slippers) miscategorised under clothing (9)
UPDATE products SET category = 'shoes'
 WHERE id IN (
  'b5f9afb9-3674-44cc-80b8-8341dc4a88a5',
  'c07298d0-ea12-40ce-92e0-7f87d69730f8',
  '2a5dcfed-1dc7-440c-a46f-237d96e1e1de',
  '9a5c5509-2df7-4f3b-98c6-57cb91fa5215',
  'b34da2e1-a06c-43f2-8207-c5e73c8e13f2',
  'c059568c-ffee-419a-8d1c-f38b4278b92f',
  'af2e726c-156f-4a31-90bc-c37135be3703',
  '02190217-e71e-4ef9-80b6-6d2ac5950f88',
  'e157d461-85f8-46fc-9ba4-66d1201cab85'
);

-- (4) Men's garments miscategorised under womenswear (2)
UPDATE products SET category = 'menswear'
 WHERE id IN (
  '31920c69-7a0d-4cbd-8326-f9b0955e5073',
  '8d1b1388-3743-45ad-a6e4-b044e6ae63e2'
);

COMMIT;
