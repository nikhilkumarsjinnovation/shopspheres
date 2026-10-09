-- Real redeemable promo codes for email campaigns (hackathon: no domain required).
-- ROLLBACK:
--   drop index if exists public.uq_campaigns_promo_code;
--   alter table public.campaigns drop column if exists promo_code;

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS promo_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_campaigns_promo_code
  ON public.campaigns (promo_code)
  WHERE promo_code IS NOT NULL;
