-- Store a seller's bank/payout details on their profile so they don't have to
-- re-enter them on every payout request. The per-request snapshot still lives in
-- seller_payouts.payment_details (JSONB); these columns are the reusable default.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
