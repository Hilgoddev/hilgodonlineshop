CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_currency TEXT NOT NULL DEFAULT 'USD',
  target_currency TEXT NOT NULL,
  rate DECIMAL(16, 6) NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_currency, target_currency)
);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exchange rates are viewable by everyone" ON public.exchange_rates FOR SELECT USING (true);

CREATE POLICY "Admins can manage exchange rates" ON public.exchange_rates FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

INSERT INTO public.exchange_rates (source_currency, target_currency, rate) VALUES
('USD', 'USD', 1.0),
('USD', 'NGN', 1550.0),
('USD', 'GBP', 0.79),
('USD', 'EUR', 0.92)
ON CONFLICT (source_currency, target_currency) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup ON public.exchange_rates(source_currency, target_currency);
