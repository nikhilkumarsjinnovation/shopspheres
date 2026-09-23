-- ==============================================================================
-- ShopSphere Phase 2 Architecture: Amazon-Grade Commerce, Personal AI & Accessibility
-- Migration: 20260922010000_amazon_ai_accessibility.sql
-- ==============================================================================

-- 1. Extend Order Status Enum
DO $$ BEGIN
  ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'confirmed';
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'packed';
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'out_for_delivery';
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'return_requested';
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'returned';
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'refunded';
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. New Enumerated Types
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'return_status') THEN
    CREATE TYPE public.return_status AS ENUM (
      'requested',
      'approved',
      'pickup_scheduled',
      'received',
      'refund_issued',
      'rejected'
    );
  END IF;
END $$;

-- ==============================================================================
-- 3. Accessibility Profiles Table (Saksham Framework)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_accessibility_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  has_disability BOOLEAN NOT NULL DEFAULT FALSE,
  visual_high_contrast BOOLEAN NOT NULL DEFAULT FALSE,
  visual_font_magnification NUMERIC(3, 2) NOT NULL DEFAULT 1.00 CHECK (visual_font_magnification >= 1.00 AND visual_font_magnification <= 2.50),
  visual_screen_reader_optimized BOOLEAN NOT NULL DEFAULT FALSE,
  visual_audio_descriptions BOOLEAN NOT NULL DEFAULT FALSE,
  auditory_visual_alerts BOOLEAN NOT NULL DEFAULT FALSE,
  auditory_text_captions BOOLEAN NOT NULL DEFAULT FALSE,
  motor_voice_navigation BOOLEAN NOT NULL DEFAULT FALSE,
  motor_large_touch_targets BOOLEAN NOT NULL DEFAULT FALSE,
  motor_sticky_keys BOOLEAN NOT NULL DEFAULT FALSE,
  cognitive_simplified_ui BOOLEAN NOT NULL DEFAULT FALSE,
  cognitive_step_confirmation BOOLEAN NOT NULL DEFAULT FALSE,
  special_signin_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 4. Personal AI Profiles & Memory Graph (Dynamic Feed Mutation Engine)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ai_user_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  persona_preference TEXT NOT NULL DEFAULT 'everyday',
  price_sensitivity TEXT NOT NULL DEFAULT 'balanced',
  interest_tags TEXT[] NOT NULL DEFAULT '{}',
  dietary_preferences TEXT[] NOT NULL DEFAULT '{}',
  brand_affinities TEXT[] NOT NULL DEFAULT '{}',
  feed_weights JSONB NOT NULL DEFAULT '{
    "category_weights": {},
    "recent_chat_intents": [],
    "boosted_keywords": [],
    "last_updated": 0
  }'::jsonb,
  total_scans_today INTEGER NOT NULL DEFAULT 0,
  last_scan_date DATE DEFAULT CURRENT_DATE,
  is_pro BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  extracted_intents JSONB DEFAULT '{}'::jsonb,
  recommended_product_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 5. Merchant Storefronts & Hyperlocal Logistics (0-30km Radius)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  address_line TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  latitude NUMERIC(9, 6),
  longitude NUMERIC(9, 6),
  pickup_radius_km NUMERIC(5, 2) NOT NULL DEFAULT 30.00,
  allows_bopis BOOLEAN NOT NULL DEFAULT TRUE,
  rating NUMERIC(3, 2) NOT NULL DEFAULT 5.00 CHECK (rating >= 0 AND rating <= 5.00),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 6. Hierarchical Catalog Taxonomy (Categories & Sub-Categories)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sub_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Essential Marketplace Categories
INSERT INTO public.categories (name, slug, description, display_order)
VALUES
  ('Electronics', 'electronics', 'Audio, computing, accessories, and mobile gadgets', 1),
  ('Fashion & Apparel', 'fashion', 'Clothing, footwear, bags, and jewelry', 2),
  ('Home & Kitchen', 'home-kitchen', 'Cookware, small appliances, and home decor', 3),
  ('Groceries & Gourmet', 'groceries', 'Local produce, pantry staples, and specialty foods', 4),
  ('Health & Beauty', 'beauty', 'Skincare, haircare, wellness, and personal care', 5),
  ('Sports & Outdoors', 'sports', 'Fitness equipment, athletic wear, and outdoor gear', 6)
ON CONFLICT (name) DO NOTHING;

-- ==============================================================================
-- 7. Upgrade Products Table with Amazon-Grade Metadata
-- ==============================================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sub_category_id UUID REFERENCES public.sub_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create Unique Slug Constraint for Products if Not Exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_slug_unique'
  ) THEN
    ALTER TABLE public.products ADD CONSTRAINT products_slug_unique UNIQUE (slug);
  END IF;
EXCEPTION WHEN OTHERS THEN null; END $$;

-- ==============================================================================
-- 8. Product Variants Matrix (Amazon-Grade SKUs)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 9. Verified Customer Reviews & Helpful Voting
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
  helpful_votes INTEGER NOT NULL DEFAULT 0 CHECK (helpful_votes >= 0),
  image_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_product_customer_review UNIQUE (product_id, customer_id)
);

CREATE TABLE IF NOT EXISTS public.review_helpful_votes (
  review_id UUID NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (review_id, user_id)
);

-- ==============================================================================
-- 10. Multi-Address Book & Order Tracking Events
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Home',
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  delivery_instructions TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status public.order_status NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status public.return_status NOT NULL DEFAULT 'requested',
  refund_amount NUMERIC(10, 2) NOT NULL CHECK (refund_amount >= 0),
  pickup_tracking_number TEXT,
  seller_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 11. Immutable Admin Audit Logs
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  target_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 12. Performance Indexes
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_ai_user_profiles_user ON public.ai_user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_shops_seller ON public.shops(seller_id);
CREATE INDEX IF NOT EXISTS idx_shops_postal ON public.shops(postal_code);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_products_shop ON public.products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_rating ON public.products(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_user ON public.user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_order_tracking_order ON public.order_tracking_events(order_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_returns_order ON public.order_returns(order_id);

-- ==============================================================================
-- 13. Row-Level Security (RLS) Policies
-- ==============================================================================
ALTER TABLE public.user_accessibility_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_helpful_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- 13.1 Accessibility Profiles
DROP POLICY IF EXISTS "accessibility_user_policy" ON public.user_accessibility_profiles;
CREATE POLICY "accessibility_user_policy" ON public.user_accessibility_profiles
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- 13.2 AI Profiles & Conversations
DROP POLICY IF EXISTS "ai_profile_user_policy" ON public.ai_user_profiles;
CREATE POLICY "ai_profile_user_policy" ON public.ai_user_profiles
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "ai_conversations_user_policy" ON public.ai_conversations;
CREATE POLICY "ai_conversations_user_policy" ON public.ai_conversations
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- 13.3 Shops
DROP POLICY IF EXISTS "shops_read_policy" ON public.shops;
CREATE POLICY "shops_read_policy" ON public.shops
  FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "shops_seller_policy" ON public.shops;
CREATE POLICY "shops_seller_policy" ON public.shops
  FOR ALL TO authenticated
  USING (seller_id = auth.uid() OR public.is_admin())
  WITH CHECK (seller_id = auth.uid() OR public.is_admin());

-- 13.4 Categories (Public Read, Admin Write)
DROP POLICY IF EXISTS "categories_read_policy" ON public.categories;
CREATE POLICY "categories_read_policy" ON public.categories
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "categories_admin_policy" ON public.categories;
CREATE POLICY "categories_admin_policy" ON public.categories
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "sub_categories_read_policy" ON public.sub_categories;
CREATE POLICY "sub_categories_read_policy" ON public.sub_categories
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "sub_categories_admin_policy" ON public.sub_categories;
CREATE POLICY "sub_categories_admin_policy" ON public.sub_categories
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 13.5 Product Variants
DROP POLICY IF EXISTS "product_variants_read_policy" ON public.product_variants;
CREATE POLICY "product_variants_read_policy" ON public.product_variants
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "product_variants_seller_policy" ON public.product_variants;
CREATE POLICY "product_variants_seller_policy" ON public.product_variants
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = auth.uid())
    OR public.is_admin()
  );

-- 13.6 Product Reviews
DROP POLICY IF EXISTS "reviews_read_policy" ON public.product_reviews;
CREATE POLICY "reviews_read_policy" ON public.product_reviews
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "reviews_insert_policy" ON public.product_reviews;
CREATE POLICY "reviews_insert_policy" ON public.product_reviews
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "reviews_update_policy" ON public.product_reviews;
CREATE POLICY "reviews_update_policy" ON public.product_reviews
  FOR UPDATE TO authenticated
  USING (customer_id = auth.uid() OR public.is_admin())
  WITH CHECK (customer_id = auth.uid() OR public.is_admin());

-- 13.7 User Addresses
DROP POLICY IF EXISTS "addresses_user_policy" ON public.user_addresses;
CREATE POLICY "addresses_user_policy" ON public.user_addresses
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- 13.8 Order Tracking Events
DROP POLICY IF EXISTS "tracking_read_policy" ON public.order_tracking_events;
CREATE POLICY "tracking_read_policy" ON public.order_tracking_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.customer_id = auth.uid() OR public.is_admin()))
  );

-- 13.9 Admin Audit Logs
DROP POLICY IF EXISTS "admin_audit_policy" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_policy" ON public.admin_audit_logs
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
