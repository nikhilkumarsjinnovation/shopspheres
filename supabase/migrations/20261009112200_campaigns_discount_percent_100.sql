-- Allow campaign discounts up to 100% (remove the old 15% check).
-- ROLLBACK:
--   alter table public.campaigns drop constraint if exists campaigns_discount_percent_check;
--   alter table public.campaigns add constraint campaigns_discount_percent_check
--     check (discount_percent >= 1 and discount_percent <= 15);

ALTER TABLE public.campaigns
  DROP CONSTRAINT IF EXISTS campaigns_discount_percent_check;

ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_discount_percent_check
  CHECK (discount_percent >= 1 AND discount_percent <= 100);
