# ShopSphere — Master Database Schema & Security Architecture

**Document Version:** 2.0.0  
**Database Engine:** Supabase PostgreSQL 15+  
**Naming Standard:** Strict `snake_case` for all table, column, index, and constraint identifiers  
**Philosophy:** *"Build the foundation with bricks, cement, stones, and metal first; paints and tiles come later."*  
**Status:** Approved for Production Migration

---

## 1. Architectural Overview & Conventions

* **Schema Isolation:** All application tables reside in the `public` schema and link foreign keys directly to Supabase's managed `auth.users`.
* **Primary Keys:** Standardized on `UUID` with `gen_random_uuid()` for decentralized scalability and security against sequential enumeration.
* **Timestamp Standard:** `TIMESTAMPTZ` (UTC) with default value `NOW()`.
* **Monetary Precision:** Monetary values use `NUMERIC(10, 2)` with non-negative check constraints (`CHECK (column >= 0)`).
* **Row-Level Security (RLS):** 100% of tables have RLS enabled with default-deny policies.
* **JSONB Strategy:** Dynamic specifications, AI context vectors, accessibility preferences, and address structures utilize indexed `JSONB` for zero-schema-migration adaptability.

---

## 2. Enumerated Types (Enums)

```sql
-- Role definitions for platform authorization
CREATE TYPE user_role AS ENUM (
  'customer',
  'seller',
  'admin'
);

-- Fulfillment lifecycle state machine
CREATE TYPE order_status AS ENUM (
  'pending',
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'return_requested',
  'returned',
  'refunded'
);

-- Enterprise listing moderation states
CREATE TYPE approval_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- Product physical/functional condition
CREATE TYPE product_condition AS ENUM (
  'New',
  'Renewed',
  'Used'
);

-- Return resolution states
CREATE TYPE return_status AS ENUM (
  'requested',
  'approved',
  'pickup_scheduled',
  'received',
  'refund_issued',
  'rejected'
);
```

---

## 3. Relational Table Specifications

### 3.1 `users` Table
Handles user profile records, authorization roles, and direct binding to Supabase `auth.users`.

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'customer',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.2 `user_accessibility_profiles` Table (Saksham Framework)
Stores multi-modal disability accommodations and interface adaptations for buyers.

```sql
CREATE TABLE public.user_accessibility_profiles (
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
```

---

### 3.3 `ai_user_profiles` Table (Living Personal AI & Feed Mutation)
Persists the Personal AI's dynamic contextual memory graph and feed re-ranking weights.

```sql
CREATE TABLE public.ai_user_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  persona_preference TEXT NOT NULL DEFAULT 'everyday', -- 'everyday', 'tech', 'fashion', 'gourmet', 'beauty'
  price_sensitivity TEXT NOT NULL DEFAULT 'balanced', -- 'budget', 'balanced', 'premium'
  interest_tags TEXT[] NOT NULL DEFAULT '{}',
  dietary_preferences TEXT[] NOT NULL DEFAULT '{}', -- e.g., 'vegan', 'gluten-free', 'organic'
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
```

---

### 3.4 `ai_conversations` Table
Maintains multi-turn context between the customer and their Personal AI Shopping Companion.

```sql
CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  extracted_intents JSONB DEFAULT '{}'::jsonb,
  recommended_product_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.5 `shops` Table (Merchant Storefronts & Hyperlocal Geolocation)
Supports multi-vendor marketplace isolation, neighborhood physical store mapping, and 0–30 km logistics.

```sql
CREATE TABLE public.shops (
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
  allows_bopis BOOLEAN NOT NULL DEFAULT TRUE, -- Buy Online, Pick Up in Store
  rating NUMERIC(3, 2) NOT NULL DEFAULT 5.00 CHECK (rating >= 0 AND rating <= 5.00),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.6 `categories` & `sub_categories` Tables (Hierarchical Taxonomy)
Amazon-grade departmental and category categorization.

```sql
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.sub_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.7 `products` Table
Amazon-grade product catalog with dynamic 10+ specifications (`attributes JSONB`), condition, and compliance state.

```sql
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  compare_at_price NUMERIC(10, 2) CHECK (compare_at_price >= price),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  condition product_condition NOT NULL DEFAULT 'New',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sub_category_id UUID REFERENCES public.sub_categories(id) ON DELETE SET NULL,
  category TEXT NOT NULL, -- Legacy / Flat string lookup
  sub_category TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb, -- 10+ dynamic technical specifications
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  approval_status approval_status NOT NULL DEFAULT 'pending',
  ai_categorized BOOLEAN NOT NULL DEFAULT FALSE,
  rejection_reason TEXT,
  average_rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00 CHECK (average_rating >= 0 AND average_rating <= 5.00),
  review_count INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.8 `product_variants` Table (Amazon-Grade SKUs)
Supports dynamic matrix variations (Color, Size, Storage, Capacity).

```sql
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL, -- e.g., "Space Black / 256GB"
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g., {"color": "Space Black", "storage": "256GB"}
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.9 `product_reviews` & `review_helpful_votes` Tables
Verified buyer reviews, 5-star distribution, and community validation.

```sql
CREATE TABLE public.product_reviews (
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
  UNIQUE (product_id, customer_id)
);

CREATE TABLE public.review_helpful_votes (
  review_id UUID NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (review_id, user_id)
);
```

---

### 3.10 `user_addresses` Table (Multi-Address Book)
Saved customer delivery destinations with instructions.

```sql
CREATE TABLE public.user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Home', -- 'Home', 'Work', 'Other'
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
```

---

### 3.11 `orders` Table
Encapsulates transaction headers, customer identity, payment totals, state machine status, and social gift parameters.

```sql
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
  subtotal_amount NUMERIC(10, 2) NOT NULL CHECK (subtotal_amount >= 0),
  shipping_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (shipping_fee >= 0),
  tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
  status order_status NOT NULL DEFAULT 'pending',
  is_gift BOOLEAN NOT NULL DEFAULT FALSE,
  recipient_email TEXT,
  recipient_phone TEXT,
  gift_reveal_date TIMESTAMPTZ,
  gift_message TEXT,
  shipping_address JSONB NOT NULL,
  is_pickup BOOLEAN NOT NULL DEFAULT FALSE, -- BOPIS Hub Pickup
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.12 `order_items` Table
Connects individual items to fulfilling merchants and preserves historical prices.

```sql
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.13 `order_tracking_events` Table
Fulfillment audit trail tracking carrier milestones and delivery scans.

```sql
CREATE TABLE public.order_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.14 `order_returns` Table
Customer return requests, inspection states, and automated refund tracking.

```sql
CREATE TABLE public.order_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status return_status NOT NULL DEFAULT 'requested',
  refund_amount NUMERIC(10, 2) NOT NULL CHECK (refund_amount >= 0),
  pickup_tracking_number TEXT,
  seller_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.15 `admin_audit_logs` Table
Append-only log for platform governance, compliance moderation, and user interventions.

```sql
CREATE TABLE public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- e.g., 'approve_product', 'reject_product', 'suspend_user', 'cancel_order'
  target_entity TEXT NOT NULL, -- 'product', 'user', 'order', 'shop'
  target_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---
 
### 3.16 `user_behavior_events` Table (AI Behavior Analysis)
Immutable event stream for behavioral analytics and ML feature computation.
 
```sql
CREATE TABLE public.user_behavior_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'view', 'click', 'add_to_cart', 'search', 'ai_chat', 'voice_command', 'scroll', 'carousel_impression', 'product_compare', 'checkout_start', 'checkout_complete', 'gift_sent', 'gift_revealed'
  entity_type TEXT NOT NULL, -- 'product', 'category', 'carousel', 'ai_recommendation', 'search_result', 'seller', 'brand'
  entity_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb, -- dwell_time_ms, scroll_depth, viewport, device, source, position
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
-- Indexes for time-series queries
CREATE INDEX idx_behavior_events_user_time ON public.user_behavior_events(user_id, created_at DESC);
CREATE INDEX idx_behavior_events_session ON public.user_behavior_events(session_id);
CREATE INDEX idx_behavior_events_entity ON public.user_behavior_events(entity_type, entity_id);
CREATE INDEX idx_behavior_events_type_time ON public.user_behavior_events(event_type, created_at DESC);
```
 
---
 
### 3.17 `friend_relationships` Table (Social Commerce)
Bidirectional friend graph for "Send a Friend" and social features.
 
```sql
CREATE TABLE public.friend_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'
  initiated_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, friend_id)
);
 
CREATE INDEX idx_friends_user ON public.friend_relationships(user_id, status);
CREATE INDEX idx_friends_friend ON public.friend_relationships(friend_id, status);
```
 
---
 
### 3.18 `gifts` Table (Gift a Friend — Complete Workflow)
Full gift lifecycle from creation to reveal and post-reveal.
 
```sql
CREATE TABLE public.gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  reveal_trigger TEXT NOT NULL DEFAULT 'date', -- 'date', 'delivery', 'manual'
  reveal_date TIMESTAMPTZ,
  message TEXT, -- Text/voice/video message from sender
  wrapping_option_id UUID REFERENCES public.gift_wrapping_options(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'revealed', 'delivered', 'thanked', 'exchanged', 'returned'
  revealed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
CREATE INDEX idx_gifts_sender ON public.gifts(sender_id, status);
CREATE INDEX idx_gifts_recipient ON public.gifts(recipient_id, status);
CREATE INDEX idx_gifts_reveal ON public.gifts(reveal_date) WHERE reveal_trigger = 'date' AND status = 'pending';
```
 
---
 
### 3.19 `gift_notifications` Table
Notification delivery tracking for gift lifecycle events.
 
```sql
CREATE TABLE public.gift_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id UUID NOT NULL REFERENCES public.gifts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'gift_sent', 'gift_revealed', 'gift_delivered', 'thank_you_received', 'exchange_requested'
  channel TEXT NOT NULL DEFAULT 'in_app', -- 'in_app', 'push', 'email', 'sms'
  payload JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);
 
CREATE INDEX idx_gift_notif_user ON public.gift_notifications(user_id, read_at);
CREATE INDEX idx_gift_notif_gift ON public.gift_notifications(gift_id);
```
 
---
 
### 3.20 `gift_wrapping_options` Table
Digital gift wrapping options for personalization.
 
```sql
CREATE TABLE public.gift_wrapping_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  preview_image_url TEXT,
  animation_url TEXT, -- Lottie/JSON animation for unboxing
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
 
---
 
### 3.21 `group_gifts` & `group_gift_contributions` Tables (Advanced Group Gifting)
Collaborative gifting with pooled payments.
 
```sql
CREATE TABLE public.group_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_amount NUMERIC(10, 2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'INR',
  deadline TIMESTAMPTZ NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'collecting', -- 'collecting', 'completed', 'failed', 'refunded'
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
CREATE TABLE public.group_gift_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_gift_id UUID NOT NULL REFERENCES public.group_gifts(id) ON DELETE CASCADE,
  contributor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  message TEXT,
  payment_id TEXT, -- Razorpay/Stripe payment ID
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'refunded'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
CREATE INDEX idx_group_gifts_organizer ON public.group_gifts(organizer_id, status);
CREATE INDEX idx_group_gifts_deadline ON public.group_gifts(deadline) WHERE status = 'collecting';
CREATE INDEX idx_group_contrib_gift ON public.group_gift_contributions(group_gift_id);
```
 
---
 
### 3.22 `shared_products` Table (Send a Friend)
Viral sharing with attribution tracking.
 
```sql
CREATE TABLE public.shared_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sharer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  share_message TEXT,
  share_channel TEXT NOT NULL, -- 'link', 'whatsapp', 'email', 'sms', 'qr'
  deep_link_token TEXT NOT NULL UNIQUE, -- For tracking: shopsphere.app/p/<id>?ref=<token>
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'viewed', 'clicked', 'converted'
  viewed_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
CREATE INDEX idx_shares_sharer ON public.shared_products(sharer_id, created_at DESC);
CREATE INDEX idx_shares_recipient ON public.shared_products(recipient_id);
CREATE INDEX idx_shares_token ON public.shared_products(deep_link_token);
CREATE INDEX idx_shares_product ON public.shared_products(product_id);
```
 
---
 
### 3.23 `ai_agent_memory` Table (AI Guide Agent — Long-term Vector Memory)
Semantic memory for continuous learning across sessions.
 
```sql
CREATE TABLE public.ai_agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  content TEXT NOT NULL, -- Summarized conversation or extracted fact
  embedding VECTOR(1536), -- OpenAI ada-002 or equivalent
  metadata JSONB DEFAULT '{}'::jsonb, -- {type: 'preference'|'fact'|'intent', confidence: 0.9, source: 'chat'|'behavior'}
  expires_at TIMESTAMPTZ, -- Optional TTL for temporary context
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
CREATE INDEX idx_ai_memory_user ON public.ai_agent_memory(user_id, created_at DESC);
CREATE INDEX idx_ai_memory_embedding ON public.ai_agent_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```
 
---
 
### 3.24 `ai_agent_sessions` Table
Agent session management with tool-call history.
 
```sql
CREATE TABLE public.ai_agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  persona TEXT NOT NULL DEFAULT 'everyday',
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'ended'
  tool_calls JSONB DEFAULT '[]'::jsonb, -- History of tool invocations
  context_summary TEXT, -- Rolling summary for context window management
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);
 
CREATE INDEX idx_ai_sessions_user ON public.ai_agent_sessions(user_id, status);
```
 
---
 
### 3.25 `audio_descriptions` Table (Blind Accessibility — AI-Generated)
Audio descriptions for product images and specifications.
 
```sql
CREATE TABLE public.audio_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'en-IN',
  script TEXT NOT NULL, -- TTS-ready script
  audio_url TEXT NOT NULL, -- Cached MP3 (ElevenLabs/Google Cloud TTS)
  duration_seconds INTEGER,
  generated_by TEXT NOT NULL DEFAULT 'ai-gemini', -- 'ai-gemini', 'human'
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, language, version)
);
 
CREATE INDEX idx_audio_desc_product ON public.audio_descriptions(product_id, is_active);
```
 
---
 
### 3.26 `accessibility_usage_metrics` Table
Analytics for accessibility feature adoption and effectiveness.
 
```sql
CREATE TABLE public.accessibility_usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL, -- 'voice_nav', 'tts', 'high_contrast', 'large_touch', 'simplified_ui', 'audio_desc', 'voice_command'
  action TEXT NOT NULL, -- 'enabled', 'disabled', 'used', 'completed_task'
  metadata JSONB DEFAULT '{}'::jsonb, -- {task: 'checkout', duration_ms: 5000, success: true}
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
CREATE INDEX idx_a11y_metrics_user ON public.accessibility_usage_metrics(user_id, created_at DESC);
CREATE INDEX idx_a11y_metrics_feature ON public.accessibility_usage_metrics(feature, action);
```
 
---
 
### 3.27 `user_features` Table (Computed ML Features)
Pre-computed features for real-time personalization.
 
```sql
CREATE TABLE public.user_features (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  features JSONB NOT NULL DEFAULT '{}'::jsonb, -- {category_affinity: {...}, price_elasticity: 0.3, brand_loyalty: {...}, size_preference: {...}, delivery_urgency: 'high', gifting_propensity: 0.15, accessibility_needs: {...}}
  model_version TEXT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
CREATE INDEX idx_user_features_computed ON public.user_features(computed_at DESC);
```
 
---
 
### 3.28 `ml_models` Table (Model Registry)
ML model versioning and metadata.
 
```sql
CREATE TABLE public.ml_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 'next_purchase_predictor', 'churn_scorer', 'category_affinity_ranker', 'price_sensitivity_estimator', 'gift_recommender', 'accessibility_needs_predictor'
  version TEXT NOT NULL,
  artifact_uri TEXT NOT NULL, -- S3/GCS path to model artifact
  framework TEXT, -- 'xgboost', 'lightgbm', 'pytorch', 'tensorflow', 'sklearn'
  metrics JSONB DEFAULT '{}'::jsonb, -- {auc: 0.87, precision: 0.72, recall: 0.68}
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  training_data_snapshot TEXT, -- Reference to training dataset version
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ
);
```
 
---
 
## 4. Performance Indexes

```sql
-- Users
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_email ON public.users(email);

-- AI User Profiles
CREATE INDEX idx_ai_profiles_persona ON public.ai_user_profiles(persona_preference);
CREATE INDEX idx_ai_conversations_user_session ON public.ai_conversations(user_id, session_id);

-- Products & Variants
CREATE INDEX idx_products_seller ON public.products(seller_id);
CREATE INDEX idx_products_shop ON public.products(shop_id);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_approval ON public.products(approval_status);
CREATE INDEX idx_products_price ON public.products(price);
CREATE INDEX idx_products_rating ON public.products(average_rating DESC);
CREATE INDEX idx_products_created ON public.products(created_at DESC);
CREATE INDEX idx_products_gin_tags ON public.products USING gin(tags);
CREATE INDEX idx_products_gin_attrs ON public.products USING gin(attributes);
CREATE INDEX idx_variants_product ON public.product_variants(product_id);

-- Reviews
CREATE INDEX idx_reviews_product ON public.product_reviews(product_id);
CREATE INDEX idx_reviews_rating ON public.product_reviews(rating);

-- Orders & Items
CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_gift_reveal ON public.orders(gift_reveal_date) WHERE is_gift = TRUE;
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_items_seller ON public.order_items(seller_id);
CREATE INDEX idx_tracking_order ON public.order_tracking_events(order_id, occurred_at DESC);

-- Shops (Spatial / Hyperlocal)
CREATE INDEX idx_shops_seller ON public.shops(seller_id);
CREATE INDEX idx_shops_postal ON public.shops(postal_code);
 
-- Behavior Events (AI Behavior Analysis)
CREATE INDEX idx_behavior_events_user_time ON public.user_behavior_events(user_id, created_at DESC);
CREATE INDEX idx_behavior_events_session ON public.user_behavior_events(session_id);
CREATE INDEX idx_behavior_events_entity ON public.user_behavior_events(entity_type, entity_id);
CREATE INDEX idx_behavior_events_type_time ON public.user_behavior_events(event_type, created_at DESC);
 
-- Friend Relationships (Social Commerce)
CREATE INDEX idx_friends_user ON public.friend_relationships(user_id, status);
CREATE INDEX idx_friends_friend ON public.friend_relationships(friend_id, status);
 
-- Gifts (Gift a Friend)
CREATE INDEX idx_gifts_sender ON public.gifts(sender_id, status);
CREATE INDEX idx_gifts_recipient ON public.gifts(recipient_id, status);
CREATE INDEX idx_gifts_reveal ON public.gifts(reveal_date) WHERE reveal_trigger = 'date' AND status = 'pending';
 
-- Gift Notifications
CREATE INDEX idx_gift_notif_user ON public.gift_notifications(user_id, read_at);
CREATE INDEX idx_gift_notif_gift ON public.gift_notifications(gift_id);
 
-- Shared Products (Send a Friend)
CREATE INDEX idx_shares_sharer ON public.shared_products(sharer_id, created_at DESC);
CREATE INDEX idx_shares_recipient ON public.shared_products(recipient_id);
CREATE INDEX idx_shares_token ON public.shared_products(deep_link_token);
CREATE INDEX idx_shares_product ON public.shared_products(product_id);
 
-- Group Gifts
CREATE INDEX idx_group_gifts_organizer ON public.group_gifts(organizer_id, status);
CREATE INDEX idx_group_gifts_deadline ON public.group_gifts(deadline) WHERE status = 'collecting';
CREATE INDEX idx_group_contrib_gift ON public.group_gift_contributions(group_gift_id);
 
-- AI Agent Memory (Vector Search)
CREATE INDEX idx_ai_memory_user ON public.ai_agent_memory(user_id, created_at DESC);
CREATE INDEX idx_ai_memory_embedding ON public.ai_agent_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
 
-- AI Agent Sessions
CREATE INDEX idx_ai_sessions_user ON public.ai_agent_sessions(user_id, status);
 
-- Audio Descriptions (Blind Accessibility)
CREATE INDEX idx_audio_desc_product ON public.audio_descriptions(product_id, is_active);
 
-- Accessibility Usage Metrics
CREATE INDEX idx_a11y_metrics_user ON public.accessibility_usage_metrics(user_id, created_at DESC);
CREATE INDEX idx_a11y_metrics_feature ON public.accessibility_usage_metrics(feature, action);
 
-- User Features (ML)
CREATE INDEX idx_user_features_computed ON public.user_features(computed_at DESC);
 
-- Shops (PostGIS for Hyperlocal)
-- Requires: CREATE EXTENSION postgis;
-- ALTER TABLE public.shops ADD COLUMN location geography(POINT);
-- CREATE INDEX idx_shops_location ON public.shops USING GIST(location);
 
-- AI Profiles Feed Weights (JSONB GIN)
CREATE INDEX idx_ai_profiles_feed_weights ON public.ai_user_profiles USING GIN((feed_weights->'category_weights'));
```
 
---
 
## 5. Row-Level Security (RLS) Policies
 
### 5.1 RLS Activation
```sql
-- Core tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_accessibility_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_helpful_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- New tables for vision features (AI Behavior Analysis, Social Commerce, Blind Accessibility)
ALTER TABLE public.user_behavior_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_wrapping_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_gift_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accessibility_usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_models ENABLE ROW LEVEL SECURITY;
```

---

### 5.2 RLS Helper Functions
```sql
-- Check if current authenticated session is an administrator
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Check if current authenticated session is a merchant seller
CREATE OR REPLACE FUNCTION public.is_seller()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'seller'
  );
$$;
```

---

### 5.3 RLS Policy Specifications

#### 1. `users` Table
* **SELECT:** User reads self (`id = auth.uid()`) OR Admin reads all OR public reads sellers (`role = 'seller'`).
* **UPDATE:** User updates self (cannot alter `role`) OR Admin updates all.

#### 2. `user_accessibility_profiles` Table
* **SELECT / INSERT / UPDATE:** User accesses own record (`user_id = auth.uid()`) OR Admin reads all.

#### 3. `ai_user_profiles` & `ai_conversations` Tables
* **SELECT / INSERT / UPDATE:** Strictly isolated to owning customer (`user_id = auth.uid()`) OR Admin audit.

#### 4. `products` & `product_variants` Tables
* **SELECT:**
  * Public can read products where `approval_status = 'approved'`.
  * Sellers can read own products regardless of status (`seller_id = auth.uid()`).
  * Admins can read all products.
* **INSERT:** Authenticated sellers where `auth.uid() = seller_id`.
* **UPDATE:**
  * Sellers can update own products (setting `approval_status = 'pending'` on core changes).
  * Admins can update any product (e.g. `approval_status = 'approved'` or `'rejected'`).

#### 5. `orders` & `order_items` Tables
* **INSERT:** Authenticated customers.
* **SELECT (`orders`):**
  * Customer reads own orders (`customer_id = auth.uid()`).
  * In Gift orders (`is_gift = true`), recipient matching `recipient_email` can view tracking **only after** `NOW() >= gift_reveal_date`.
  * Admins can read all orders.
* **SELECT (`order_items`):**
  * Purchasing customer reads items linked to their order.
  * Sellers read items where `seller_id = auth.uid()`.
  * Admins read all line items.

#### 6. `admin_audit_logs` Table
* **SELECT / INSERT:** Strictly restricted to Admins (`public.is_admin()`).

#### 7. `user_behavior_events` Table (AI Behavior Analysis)
* **INSERT:** Authenticated users (own events only, validated by middleware).
* **SELECT:** User reads own events (`user_id = auth.uid()`) OR Admin reads all.
* **Policy:** Events are immutable — no UPDATE/DELETE policies.

#### 8. `friend_relationships` Table (Social Commerce)
* **SELECT:** User reads relationships where they are `user_id` OR `friend_id` (`auth.uid() IN (user_id, friend_id)`).
* **INSERT:** Authenticated users can send friend requests (`user_id = auth.uid()`).
* **UPDATE:** Users can accept/block requests where they are `friend_id` (`friend_id = auth.uid()`).
* **DELETE:** Users can remove own friendships (`user_id = auth.uid() OR friend_id = auth.uid()`).

#### 9. `gifts` Table (Gift a Friend)
* **SELECT:** Sender (`sender_id = auth.uid()`) OR Recipient (`recipient_id = auth.uid()`) OR Admin.
* **INSERT:** Authenticated customers (`sender_id = auth.uid()`).
* **UPDATE:** Sender can update before reveal; Recipient can update after reveal (thank you, exchange).

#### 10. `gift_notifications` Table
* **SELECT:** User reads own notifications (`user_id = auth.uid()`).
* **INSERT:** System only (via service role / triggers).

#### 11. `shared_products` Table (Send a Friend)
* **SELECT:** Sharer reads own shares (`sharer_id = auth.uid()`); Recipient reads shares where they are recipient.
* **INSERT:** Authenticated users sharing products.

#### 12. `ai_agent_memory` & `ai_agent_sessions` Tables (AI Guide Agent)
* **SELECT / INSERT / UPDATE:** Strictly isolated to owning customer (`user_id = auth.uid()`) OR Admin audit.

#### 13. `audio_descriptions` Table (Blind Accessibility)
* **SELECT:** Public can read for approved products; Users with `visual_screen_reader_optimized = true` get priority access.
* **INSERT / UPDATE:** Admins and AI generation pipeline only.

#### 14. `accessibility_usage_metrics` Table
* **INSERT:** Authenticated users (own metrics).
* **SELECT:** User reads own; Admin reads all for analytics.

#### 15. `user_features` & `ml_models` Tables
* **SELECT (`user_features`):** User reads own features; Admin reads all.
* **SELECT (`ml_models`):** Admin only (model registry).
* **INSERT/UPDATE:** System/ML pipeline only (service role).
