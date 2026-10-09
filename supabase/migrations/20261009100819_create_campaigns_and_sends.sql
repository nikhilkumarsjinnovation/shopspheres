-- Assessment 3: email campaign rows and per-recipient send tracking.
-- Paid orders for segments: status NOT IN ('pending','cancelled').
-- opened_at / converted_at are columns only; no open webhook this branch.
-- ROLLBACK:
--   drop table if exists public.campaign_sends;
--   drop table if exists public.campaigns;

CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  segment TEXT NOT NULL CHECK (segment IN ('new', 'repeat', 'lapsed')),
  discount_percent INTEGER NOT NULL CHECK (discount_percent >= 1 AND discount_percent <= 100),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_campaigns_segment ON public.campaigns(segment);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON public.campaigns(created_by);

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaigns_admin_select" ON public.campaigns;
CREATE POLICY "campaigns_admin_select" ON public.campaigns
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "campaigns_admin_insert" ON public.campaigns;
CREATE POLICY "campaigns_admin_insert" ON public.campaigns
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "campaigns_admin_update" ON public.campaigns;
CREATE POLICY "campaigns_admin_update" ON public.campaigns
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE TABLE IF NOT EXISTS public.campaign_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  resend_message_id TEXT,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_campaign_sends_campaign_user UNIQUE (campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign ON public.campaign_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_user ON public.campaign_sends(user_id);

ALTER TABLE public.campaign_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_sends_admin_select" ON public.campaign_sends;
CREATE POLICY "campaign_sends_admin_select" ON public.campaign_sends
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "campaign_sends_admin_insert" ON public.campaign_sends;
CREATE POLICY "campaign_sends_admin_insert" ON public.campaign_sends
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "campaign_sends_admin_update" ON public.campaign_sends;
CREATE POLICY "campaign_sends_admin_update" ON public.campaign_sends
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));
