-- Phase 1 vision tables, RLS, and realtime publication.
-- Tables follow database-schema.md 3.16–3.28. Policies follow section 5.3 items 7–15.
-- Not applied in this change. ROLLBACK: drop the new tables in reverse dependency order.

CREATE EXTENSION IF NOT EXISTS vector;

-- 1. user_behavior_events
CREATE TABLE IF NOT EXISTS public.user_behavior_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_behavior_events_user_time ON public.user_behavior_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_events_session ON public.user_behavior_events(session_id);
CREATE INDEX IF NOT EXISTS idx_behavior_events_entity ON public.user_behavior_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_behavior_events_type_time ON public.user_behavior_events(event_type, created_at DESC);

-- 2. friend_relationships
CREATE TABLE IF NOT EXISTS public.friend_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  initiated_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, friend_id)
);
CREATE INDEX IF NOT EXISTS idx_friends_user ON public.friend_relationships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_friends_friend ON public.friend_relationships(friend_id, status);

-- 3. gift_wrapping_options
CREATE TABLE IF NOT EXISTS public.gift_wrapping_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  preview_image_url TEXT,
  animation_url TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. gifts
CREATE TABLE IF NOT EXISTS public.gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  reveal_trigger TEXT NOT NULL DEFAULT 'date',
  reveal_date TIMESTAMPTZ,
  message TEXT,
  wrapping_option_id UUID REFERENCES public.gift_wrapping_options(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  revealed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gifts_sender ON public.gifts(sender_id, status);
CREATE INDEX IF NOT EXISTS idx_gifts_recipient ON public.gifts(recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_gifts_reveal ON public.gifts(reveal_date) WHERE reveal_trigger = 'date' AND status = 'pending';

-- 5. gift_notifications
CREATE TABLE IF NOT EXISTS public.gift_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id UUID NOT NULL REFERENCES public.gifts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app',
  payload JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_gift_notif_user ON public.gift_notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_gift_notif_gift ON public.gift_notifications(gift_id);

-- 6. group_gifts
CREATE TABLE IF NOT EXISTS public.group_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_amount NUMERIC(10, 2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'INR',
  deadline TIMESTAMPTZ NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'collecting',
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_group_gifts_organizer ON public.group_gifts(organizer_id, status);
CREATE INDEX IF NOT EXISTS idx_group_gifts_deadline ON public.group_gifts(deadline) WHERE status = 'collecting';

-- 7. group_gift_contributions
CREATE TABLE IF NOT EXISTS public.group_gift_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_gift_id UUID NOT NULL REFERENCES public.group_gifts(id) ON DELETE CASCADE,
  contributor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  message TEXT,
  payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_group_contrib_gift ON public.group_gift_contributions(group_gift_id);

-- 8. shared_products
CREATE TABLE IF NOT EXISTS public.shared_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sharer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  share_message TEXT,
  share_channel TEXT NOT NULL,
  deep_link_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'sent',
  viewed_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shares_sharer ON public.shared_products(sharer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shares_recipient ON public.shared_products(recipient_id);
CREATE INDEX IF NOT EXISTS idx_shares_token ON public.shared_products(deep_link_token);
CREATE INDEX IF NOT EXISTS idx_shares_product ON public.shared_products(product_id);

-- 9. ai_agent_memory
CREATE TABLE IF NOT EXISTS public.ai_agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_memory_user ON public.ai_agent_memory(user_id, created_at DESC);
-- ivfflat needs a populated table. Skip creation while the table is empty so db reset does not fail.
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.ai_agent_memory) >= 100
     AND NOT EXISTS (
       SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_ai_memory_embedding'
     ) THEN
    EXECUTE 'CREATE INDEX idx_ai_memory_embedding ON public.ai_agent_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)';
  END IF;
END $$;

-- 10. ai_agent_sessions
CREATE TABLE IF NOT EXISTS public.ai_agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  persona TEXT NOT NULL DEFAULT 'everyday',
  status TEXT NOT NULL DEFAULT 'active',
  tool_calls JSONB DEFAULT '[]'::jsonb,
  context_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user ON public.ai_agent_sessions(user_id, status);

-- 11. audio_descriptions
CREATE TABLE IF NOT EXISTS public.audio_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'en-IN',
  script TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  generated_by TEXT NOT NULL DEFAULT 'ai-gemini',
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, language, version)
);
CREATE INDEX IF NOT EXISTS idx_audio_desc_product ON public.audio_descriptions(product_id, is_active);

-- 12. accessibility_usage_metrics
CREATE TABLE IF NOT EXISTS public.accessibility_usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_a11y_metrics_user ON public.accessibility_usage_metrics(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_a11y_metrics_feature ON public.accessibility_usage_metrics(feature, action);

-- 13. user_features
CREATE TABLE IF NOT EXISTS public.user_features (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_version TEXT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_features_computed ON public.user_features(computed_at DESC);

-- 14. ml_models
CREATE TABLE IF NOT EXISTS public.ml_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  version TEXT NOT NULL,
  artifact_uri TEXT NOT NULL,
  framework TEXT,
  metrics JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  training_data_snapshot TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ
);

-- Helpers used by gift and friend policies.
CREATE OR REPLACE FUNCTION public.are_friends(left_id UUID, right_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.friend_relationships
    WHERE status = 'accepted'
      AND (
        (user_id = left_id AND friend_id = right_id)
        OR (user_id = right_id AND friend_id = left_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_gift_participant(target_gift_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.gifts
    WHERE id = target_gift_id
      AND (sender_id = auth.uid() OR recipient_id = auth.uid())
  );
$$;

ALTER TABLE public.user_behavior_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_wrapping_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_gift_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accessibility_usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_models ENABLE ROW LEVEL SECURITY;

-- 7. user_behavior_events: insert/select own, no update/delete
DROP POLICY IF EXISTS "behavior_insert_policy" ON public.user_behavior_events;
CREATE POLICY "behavior_insert_policy" ON public.user_behavior_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "behavior_select_policy" ON public.user_behavior_events;
CREATE POLICY "behavior_select_policy" ON public.user_behavior_events
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

-- 8. friend_relationships
DROP POLICY IF EXISTS "friends_select_policy" ON public.friend_relationships;
CREATE POLICY "friends_select_policy" ON public.friend_relationships
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IN (user_id, friend_id) OR public.is_admin());

DROP POLICY IF EXISTS "friends_insert_policy" ON public.friend_relationships;
CREATE POLICY "friends_insert_policy" ON public.friend_relationships
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "friends_update_policy" ON public.friend_relationships;
CREATE POLICY "friends_update_policy" ON public.friend_relationships
  FOR UPDATE TO authenticated
  USING (friend_id = (SELECT auth.uid()) OR public.is_admin())
  WITH CHECK (friend_id = (SELECT auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "friends_delete_policy" ON public.friend_relationships;
CREATE POLICY "friends_delete_policy" ON public.friend_relationships
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) IN (user_id, friend_id) OR public.is_admin());

-- wrapping catalog is public to read; admins maintain it
DROP POLICY IF EXISTS "wrapping_select_policy" ON public.gift_wrapping_options;
CREATE POLICY "wrapping_select_policy" ON public.gift_wrapping_options
  FOR SELECT TO public
  USING (is_active = TRUE OR public.is_admin());

DROP POLICY IF EXISTS "wrapping_admin_policy" ON public.gift_wrapping_options;
CREATE POLICY "wrapping_admin_policy" ON public.gift_wrapping_options
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 9. gifts
DROP POLICY IF EXISTS "gifts_select_policy" ON public.gifts;
CREATE POLICY "gifts_select_policy" ON public.gifts
  FOR SELECT TO authenticated
  USING (
    sender_id = (SELECT auth.uid())
    OR recipient_id = (SELECT auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "gifts_insert_policy" ON public.gifts;
CREATE POLICY "gifts_insert_policy" ON public.gifts
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "gifts_update_policy" ON public.gifts;
CREATE POLICY "gifts_update_policy" ON public.gifts
  FOR UPDATE TO authenticated
  USING (
    (sender_id = (SELECT auth.uid()) AND revealed_at IS NULL)
    OR (recipient_id = (SELECT auth.uid()) AND revealed_at IS NOT NULL)
    OR public.is_admin()
  )
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    OR recipient_id = (SELECT auth.uid())
    OR public.is_admin()
  );

-- 10. gift_notifications: owners read; inserts are service-role only
DROP POLICY IF EXISTS "gift_notif_select_policy" ON public.gift_notifications;
CREATE POLICY "gift_notif_select_policy" ON public.gift_notifications
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

-- group gifts: organizer manages, contributors can read and add their own row
DROP POLICY IF EXISTS "group_gifts_select_policy" ON public.group_gifts;
CREATE POLICY "group_gifts_select_policy" ON public.group_gifts
  FOR SELECT TO authenticated
  USING (
    organizer_id = (SELECT auth.uid())
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.group_gift_contributions c
      WHERE c.group_gift_id = id AND c.contributor_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "group_gifts_write_policy" ON public.group_gifts;
CREATE POLICY "group_gifts_write_policy" ON public.group_gifts
  FOR ALL TO authenticated
  USING (organizer_id = (SELECT auth.uid()) OR public.is_admin())
  WITH CHECK (organizer_id = (SELECT auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "group_contrib_select_policy" ON public.group_gift_contributions;
CREATE POLICY "group_contrib_select_policy" ON public.group_gift_contributions
  FOR SELECT TO authenticated
  USING (
    contributor_id = (SELECT auth.uid())
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.group_gifts g
      WHERE g.id = group_gift_id AND g.organizer_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "group_contrib_insert_policy" ON public.group_gift_contributions;
CREATE POLICY "group_contrib_insert_policy" ON public.group_gift_contributions
  FOR INSERT TO authenticated
  WITH CHECK (contributor_id = (SELECT auth.uid()));

-- 11. shared_products
DROP POLICY IF EXISTS "shares_select_policy" ON public.shared_products;
CREATE POLICY "shares_select_policy" ON public.shared_products
  FOR SELECT TO authenticated
  USING (
    sharer_id = (SELECT auth.uid())
    OR recipient_id = (SELECT auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "shares_insert_policy" ON public.shared_products;
CREATE POLICY "shares_insert_policy" ON public.shared_products
  FOR INSERT TO authenticated
  WITH CHECK (sharer_id = (SELECT auth.uid()));

-- 12. ai agent memory and sessions
DROP POLICY IF EXISTS "ai_memory_policy" ON public.ai_agent_memory;
CREATE POLICY "ai_memory_policy" ON public.ai_agent_memory
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin())
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "ai_sessions_policy" ON public.ai_agent_sessions;
CREATE POLICY "ai_sessions_policy" ON public.ai_agent_sessions
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin())
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

-- 13. audio_descriptions: public read of active rows on approved products
DROP POLICY IF EXISTS "audio_select_policy" ON public.audio_descriptions;
CREATE POLICY "audio_select_policy" ON public.audio_descriptions
  FOR SELECT TO public
  USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND p.approval_status = 'approved'
    )
  );

DROP POLICY IF EXISTS "audio_admin_policy" ON public.audio_descriptions;
CREATE POLICY "audio_admin_policy" ON public.audio_descriptions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 14. accessibility_usage_metrics
DROP POLICY IF EXISTS "a11y_metrics_insert_policy" ON public.accessibility_usage_metrics;
CREATE POLICY "a11y_metrics_insert_policy" ON public.accessibility_usage_metrics
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "a11y_metrics_select_policy" ON public.accessibility_usage_metrics;
CREATE POLICY "a11y_metrics_select_policy" ON public.accessibility_usage_metrics
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

-- 15. user_features and ml_models: reads as specified; writes stay service-role
DROP POLICY IF EXISTS "user_features_select_policy" ON public.user_features;
CREATE POLICY "user_features_select_policy" ON public.user_features
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "ml_models_select_policy" ON public.ml_models;
CREATE POLICY "ml_models_select_policy" ON public.ml_models
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Realtime replication for the tables named in Phase 1.3.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'order_tracking_events'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.order_tracking_events;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ai_user_profiles'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_user_profiles;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'gifts'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.gifts;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'friend_relationships'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_relationships;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_behavior_events'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.user_behavior_events;
    END IF;
  END IF;
END $$;
