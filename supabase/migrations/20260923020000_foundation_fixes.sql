-- Phase 0.8 foundation fixes.
-- DESTRUCTIVE: dropping products.category and products.sub_category is commented out.
-- The running app still reads those columns. Apply the DROP only after those reads are removed.
-- shops.location is additive. Indexes are IF NOT EXISTS.
-- Vision-table indexes run only when that table already exists (created in Phase 1).

CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);

UPDATE public.shops
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE location IS NULL
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shops_location ON public.shops USING gist (location);

-- Section 4 indexes for tables that already exist.
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_ai_profiles_persona ON public.ai_user_profiles(persona_preference);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_session ON public.ai_conversations(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_products_seller ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_shop ON public.products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_approval ON public.products(approval_status);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products(price);
CREATE INDEX IF NOT EXISTS idx_products_rating ON public.products(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_products_created ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_gin_tags ON public.products USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_products_gin_attrs ON public.products USING gin(attributes);
CREATE INDEX IF NOT EXISTS idx_variants_product ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.product_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_gift_reveal ON public.orders(gift_reveal_date) WHERE is_gift = TRUE;
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_seller ON public.order_items(seller_id);
CREATE INDEX IF NOT EXISTS idx_tracking_order ON public.order_tracking_events(order_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_shops_seller ON public.shops(seller_id);
CREATE INDEX IF NOT EXISTS idx_shops_postal ON public.shops(postal_code);
CREATE INDEX IF NOT EXISTS idx_ai_profiles_feed_weights ON public.ai_user_profiles USING gin ((feed_weights -> 'category_weights'));

-- Existing FKs already use ON DELETE SET NULL:
-- products.shop_id, products.category_id, products.sub_category_id
-- (supabase/migrations/20260922010000_amazon_ai_accessibility.sql).

-- Section 4 indexes for Phase 1 tables. Skipped until those tables exist.
DO $$
BEGIN
  IF to_regclass('public.user_behavior_events') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_behavior_events_user_time ON public.user_behavior_events(user_id, created_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_behavior_events_session ON public.user_behavior_events(session_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_behavior_events_entity ON public.user_behavior_events(entity_type, entity_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_behavior_events_type_time ON public.user_behavior_events(event_type, created_at DESC)';
  END IF;
  IF to_regclass('public.friend_relationships') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_friends_user ON public.friend_relationships(user_id, status)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_friends_friend ON public.friend_relationships(friend_id, status)';
  END IF;
  IF to_regclass('public.gifts') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_gifts_sender ON public.gifts(sender_id, status)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_gifts_recipient ON public.gifts(recipient_id, status)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_gifts_reveal ON public.gifts(reveal_date) WHERE reveal_trigger = ''date'' AND status = ''pending''';
  END IF;
  IF to_regclass('public.gift_notifications') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_gift_notif_user ON public.gift_notifications(user_id, read_at)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_gift_notif_gift ON public.gift_notifications(gift_id)';
  END IF;
  IF to_regclass('public.shared_products') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_shares_sharer ON public.shared_products(sharer_id, created_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_shares_recipient ON public.shared_products(recipient_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_shares_token ON public.shared_products(deep_link_token)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_shares_product ON public.shared_products(product_id)';
  END IF;
  IF to_regclass('public.group_gifts') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_group_gifts_organizer ON public.group_gifts(organizer_id, status)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_group_gifts_deadline ON public.group_gifts(deadline) WHERE status = ''collecting''';
  END IF;
  IF to_regclass('public.group_gift_contributions') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_group_contrib_gift ON public.group_gift_contributions(group_gift_id)';
  END IF;
  IF to_regclass('public.ai_agent_memory') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ai_memory_user ON public.ai_agent_memory(user_id, created_at DESC)';
  END IF;
  IF to_regclass('public.ai_agent_sessions') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ai_sessions_user ON public.ai_agent_sessions(user_id, status)';
  END IF;
  IF to_regclass('public.audio_descriptions') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_audio_desc_product ON public.audio_descriptions(product_id, is_active)';
  END IF;
  IF to_regclass('public.accessibility_usage_metrics') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_a11y_metrics_user ON public.accessibility_usage_metrics(user_id, created_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_a11y_metrics_feature ON public.accessibility_usage_metrics(feature, action)';
  END IF;
  IF to_regclass('public.user_features') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_user_features_computed ON public.user_features(computed_at DESC)';
  END IF;
END $$;

-- DESTRUCTIVE: do not apply while the app selects products.category and products.sub_category.
-- ALTER TABLE public.products DROP COLUMN IF EXISTS sub_category;
-- ALTER TABLE public.products DROP COLUMN IF EXISTS category;

-- ROLLBACK:
-- ALTER TABLE public.shops DROP COLUMN IF EXISTS location;
-- DROP INDEX IF EXISTS idx_shops_location;
