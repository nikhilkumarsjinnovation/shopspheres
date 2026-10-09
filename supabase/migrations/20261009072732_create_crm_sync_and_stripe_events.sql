-- Assessment 3: HubSpot contact sync state and Stripe webhook idempotency.
-- Webhook inserts run as service_role (Stripe has no user session).
-- ROLLBACK:
--   drop table if exists public.stripe_webhook_events;
--   drop table if exists public.crm_sync_state;

CREATE TABLE IF NOT EXISTS public.crm_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  hubspot_contact_id TEXT,
  last_status TEXT NOT NULL DEFAULT 'pending' CHECK (last_status IN ('pending', 'synced', 'error')),
  last_error TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_crm_sync_state_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_sync_state_email ON public.crm_sync_state(email);

DROP TRIGGER IF EXISTS update_crm_sync_state_updated_at ON public.crm_sync_state;
CREATE TRIGGER update_crm_sync_state_updated_at
  BEFORE UPDATE ON public.crm_sync_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();

ALTER TABLE public.crm_sync_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_sync_state_admin_select" ON public.crm_sync_state;
CREATE POLICY "crm_sync_state_admin_select" ON public.crm_sync_state
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "crm_sync_state_admin_insert" ON public.crm_sync_state;
CREATE POLICY "crm_sync_state_admin_insert" ON public.crm_sync_state
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "crm_sync_state_admin_update" ON public.crm_sync_state;
CREATE POLICY "crm_sync_state_admin_update" ON public.crm_sync_state
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  livemode BOOLEAN NOT NULL DEFAULT FALSE,
  payload_sha256 TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_stripe_webhook_events_event UNIQUE (stripe_event_id)
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_order ON public.stripe_webhook_events(order_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_created ON public.stripe_webhook_events(created_at DESC);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stripe_webhook_events_admin_select" ON public.stripe_webhook_events;
CREATE POLICY "stripe_webhook_events_admin_select" ON public.stripe_webhook_events
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));
