# ShopSphere — Master Architectural Mind-Map & Codebase Navigation Guide

> **Purpose:** This document is the definitive architectural map of the ShopSphere codebase. It maps user intents directly to exact files, schemas, and components so that any developer or AI agent can operate with 100% accuracy without guessing.  
> **Rule:** Update this document whenever new routes, tables, APIs, or architectural modules are created or modified.

---

## 1. Quick Task-to-File Lookup Matrix

| Developer / Agent Intent | Primary File(s) to Inspect or Modify | Secondary Related Files |
| :--- | :--- | :--- |
| **Modify Authentication Logic (Email / Google OAuth)** | [`src/app/login/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/login/page.tsx) & [`src/app/signup/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/signup/page.tsx) | [`src/lib/supabase/client.ts`](file:///home/batman/Pictures/shopsphere/src/lib/supabase/client.ts), [`src/app/auth/callback/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/auth/callback/route.ts) |
| **Update Edge Middleware Gatekeeper & RBAC Rules** | [`src/middleware.ts`](file:///home/batman/Pictures/shopsphere/src/middleware.ts) | [`src/lib/supabase/middleware.ts`](file:///home/batman/Pictures/shopsphere/src/lib/supabase/middleware.ts), [`src/lib/auth/roles.ts`](file:///home/batman/Pictures/shopsphere/src/lib/auth/roles.ts) |
| **Modify Customer Navigation & Top Header** | [`src/components/CustomerNavbar.tsx`](file:///home/batman/Pictures/shopsphere/src/components/CustomerNavbar.tsx) | [`src/app/(customer)/layout.tsx`](file:///home/batman/Pictures/shopsphere/src/app/(customer)/layout.tsx), [`src/context/CartContext.tsx`](file:///home/batman/Pictures/shopsphere/src/context/CartContext.tsx) |
| **Update Customer Explore & Faceted Search** | [`src/app/(customer)/explore/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/(customer)/explore/page.tsx) & [`src/components/ExploreFeedClient.tsx`](file:///home/batman/Pictures/shopsphere/src/components/ExploreFeedClient.tsx) | [`src/components/ProductCard.tsx`](file:///home/batman/Pictures/shopsphere/src/components/ProductCard.tsx), [`src/app/api/feed/personalized/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/feed/personalized/route.ts) |
| **Amazon-Grade Product Detail Page (PDP) & Buy Box** | [`src/app/(customer)/product/[id]/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/(customer)/product/[id]/page.tsx) & [`src/components/ProductDetailClient.tsx`](file:///home/batman/Pictures/shopsphere/src/components/ProductDetailClient.tsx) | [`src/app/api/reviews/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/reviews/route.ts), `product_variants`, `shops` |
| **Verified Customer Reviews & Helpful Voting** | [`src/app/api/reviews/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/reviews/route.ts) | [`src/components/ProductDetailClient.tsx`](file:///home/batman/Pictures/shopsphere/src/components/ProductDetailClient.tsx), `product_reviews`, `review_helpful_votes` |
| **Personal AI Companion & Live Feed Mutation** | [`src/components/PersonalAiAssistant.tsx`](file:///home/batman/Pictures/shopsphere/src/components/PersonalAiAssistant.tsx) & [`src/app/api/ai/chat/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/ai/chat/route.ts) | [`src/app/(customer)/layout.tsx`](file:///home/batman/Pictures/shopsphere/src/app/(customer)/layout.tsx), `ai_user_profiles`, `ai_conversations` |
| **Dynamic Feed Personalization Engine** | [`src/app/api/feed/personalized/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/feed/personalized/route.ts) | [`src/components/ExploreFeedClient.tsx`](file:///home/batman/Pictures/shopsphere/src/components/ExploreFeedClient.tsx) |
| **Saksham Multi-Disability Accessibility Framework** | [`src/context/AccessibilityContext.tsx`](file:///home/batman/Pictures/shopsphere/src/context/AccessibilityContext.tsx) & [`src/app/api/accessibility/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/accessibility/route.ts) | [`src/app/layout.tsx`](file:///home/batman/Pictures/shopsphere/src/app/layout.tsx), [`src/app/signup/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/signup/page.tsx), `user_accessibility_profiles` |
| **Indian Checkout, Saved Addresses & UPI/COD** | [`src/app/(customer)/checkout/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/(customer)/checkout/page.tsx) & [`src/app/api/orders/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/orders/route.ts) | [`src/app/api/addresses/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/addresses/route.ts), [`src/lib/formatters.ts`](file:///home/batman/Pictures/shopsphere/src/lib/formatters.ts), `user_addresses`, `orders`, `order_items` |
| **Personalized Behavioral Offers & Coupons** | [`src/app/api/offers/personalized/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/offers/personalized/route.ts) & [`src/components/BehavioralOffersBanner.tsx`](file:///home/batman/Pictures/shopsphere/src/components/BehavioralOffersBanner.tsx) | [`src/app/(customer)/checkout/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/(customer)/checkout/page.tsx), [`src/components/ExploreFeedClient.tsx`](file:///home/batman/Pictures/shopsphere/src/components/ExploreFeedClient.tsx) |
| **Indian Currency (INR / ₹) & Locale Formatting** | [`src/lib/formatters.ts`](file:///home/batman/Pictures/shopsphere/src/lib/formatters.ts) | [`src/components/ProductCard.tsx`](file:///home/batman/Pictures/shopsphere/src/components/ProductCard.tsx), [`src/components/ProductDetailClient.tsx`](file:///home/batman/Pictures/shopsphere/src/components/ProductDetailClient.tsx) |
| **Update Customer Order Tracking & History** | [`src/app/(customer)/orders/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/(customer)/orders/page.tsx) | `orders`, `order_items`, `order_tracking_events` |
| **Modify Seller Hub Dashboard & Metrics** | [`src/app/seller/dashboard/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/seller/dashboard/page.tsx) | [`src/components/SellerSidebar.tsx`](file:///home/batman/Pictures/shopsphere/src/components/SellerSidebar.tsx), [`src/components/SellerInventoryTabs.tsx`](file:///home/batman/Pictures/shopsphere/src/components/SellerInventoryTabs.tsx) |
| **Update Seller Onboarding Wizard & Attributes Form** | [`src/app/seller/add-product/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/seller/add-product/page.tsx) | [`src/app/api/ai/categorize/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/ai/categorize/route.ts), [`src/lib/validations/ai.ts`](file:///home/batman/Pictures/shopsphere/src/lib/validations/ai.ts) |
| **Modify AI Auto-Categorizer & 10+ Spec Extraction** | [`src/app/api/ai/categorize/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/ai/categorize/route.ts) | [`src/lib/validations/ai.ts`](file:///home/batman/Pictures/shopsphere/src/lib/validations/ai.ts), [`ai-agent.md`](file:///home/batman/Pictures/shopsphere/ai-agent.md) |
| **Modify Admin Dashboard & Operational Radar** | [`src/app/(admin)/dashboard/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/(admin)/dashboard/page.tsx) | [`src/components/AdminSidebar.tsx`](file:///home/batman/Pictures/shopsphere/src/components/AdminSidebar.tsx), [`src/components/AdminApprovalQueue.tsx`](file:///home/batman/Pictures/shopsphere/src/components/AdminApprovalQueue.tsx) |
| **Update Admin Product Moderation Queue** | [`src/components/AdminApprovalQueue.tsx`](file:///home/batman/Pictures/shopsphere/src/components/AdminApprovalQueue.tsx) | [`src/app/(admin)/dashboard/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/(admin)/dashboard/page.tsx) |
| **Modify Database Types & Supabase Clients** | [`src/types/database.types.ts`](file:///home/batman/Pictures/shopsphere/src/types/database.types.ts) | [`src/lib/supabase/client.ts`](file:///home/batman/Pictures/shopsphere/src/lib/supabase/client.ts), [`src/lib/supabase/server.ts`](file:///home/batman/Pictures/shopsphere/src/lib/supabase/server.ts), [`src/lib/supabase/admin.ts`](file:///home/batman/Pictures/shopsphere/src/lib/supabase/admin.ts) |
| **AI Guide Agent — Visual Search & Voice** | [`src/app/api/ai/visual-search/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/ai/visual-search/route.ts) & [`src/components/ai/VoiceInterface.tsx`](file:///home/batman/Pictures/shopsphere/src/components/ai/VoiceInterface.tsx) | [`src/app/api/ai/proactive/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/ai/proactive/route.ts), `ai_agent_memory`, `ai_agent_sessions` |
| **AI Behavior Analysis — Event Ingestion & Features** | [`src/app/api/behavior/events/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/behavior/events/route.ts) & [`src/services/behavior-service.ts`](file:///home/batman/Pictures/shopsphere/src/services/behavior-service.ts) | [`src/app/api/feed/personalized/v2/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/feed/personalized/v2/route.ts), `user_behavior_events`, `user_features`, `ml_models` |
| **Send a Friend — Sharing & Attribution** | [`src/app/api/friends/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/friends/route.ts) & [`src/components/gifting/FriendSelector.tsx`](file:///home/batman/Pictures/shopsphere/src/components/gifting/FriendSelector.tsx) | [`src/app/api/shared-products/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/shared-products/route.ts), `friend_relationships`, `shared_products` |
| **Gift a Friend — Complete Workflow** | [`src/app/api/gifts/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/gifts/route.ts) & [`src/components/gifting/GiftFlow.tsx`](file:///home/batman/Pictures/shopsphere/src/components/gifting/GiftFlow.tsx) | [`src/app/api/gifts/[id]/reveal/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/gifts/[id]/reveal/route.ts), `gifts`, `gift_notifications`, `group_gifts` |
| **Blind Accessibility — Audio Descriptions & Voice Nav** | [`src/app/api/accessibility/audio-description/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/accessibility/audio-description/route.ts) & [`src/components/accessibility/VoiceCommandBar.tsx`](file:///home/batman/Pictures/shopsphere/src/components/accessibility/VoiceCommandBar.tsx) | [`src/components/accessibility/AudioDescriptionPlayer.tsx`](file:///home/batman/Pictures/shopsphere/src/components/accessibility/AudioDescriptionPlayer.tsx), `audio_descriptions`, `accessibility_usage_metrics` |
| **Customer Super Agent & Autonomous Shopping (13 Tools)** | [`src/services/ai-service.ts`](file:///home/batman/Pictures/shopsphere/src/services/ai-service.ts), [`src/services/agent-executor.ts`](file:///home/batman/Pictures/shopsphere/src/services/agent-executor.ts) & [`src/services/agent-tools.ts`](file:///home/batman/Pictures/shopsphere/src/services/agent-tools.ts) | [`src/components/PersonalAiAssistant.tsx`](file:///home/batman/Pictures/shopsphere/src/components/PersonalAiAssistant.tsx), [`src/app/api/v1/ai/chat/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/ai/chat/route.ts), [`AGENT_ARCHITECTURE.md`](file:///home/batman/Pictures/shopsphere/AGENT_ARCHITECTURE.md) |
| **Agent Tasks Mission Control & Dedicated Workspace** | [`src/app/(customer)/agent/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/(customer)/agent/page.tsx) & [`src/components/CustomerNavbar.tsx`](file:///home/batman/Pictures/shopsphere/src/components/CustomerNavbar.tsx) | [`src/styles/globals.css`](file:///home/batman/Pictures/shopsphere/src/styles/globals.css), [`src/middleware.ts`](file:///home/batman/Pictures/shopsphere/src/middleware.ts) |
| **Agent Behavioral Memory & User Tracking Layer** | [`src/services/agent-memory-service.ts`](file:///home/batman/Pictures/shopsphere/src/services/agent-memory-service.ts) & [`src/app/api/v1/ai/agent-profile/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/ai/agent-profile/route.ts) | `user_behavior_events`, `ai_agent_memory`, `user_features`, `user_wallets` |
| **In-App Digital Wallet & 1-Tap Checkout** | [`src/services/wallet-service.ts`](file:///home/batman/Pictures/shopsphere/src/services/wallet-service.ts), [`src/app/api/v1/wallet/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/wallet/route.ts) & [`src/app/api/v1/wallet/pay/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/wallet/pay/route.ts) | [`src/app/(customer)/checkout/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/(customer)/checkout/page.tsx), `user_wallets`, `wallet_transactions` |
| **Product Favorites & Wishlist Management** | [`src/services/favorites-service.ts`](file:///home/batman/Pictures/shopsphere/src/services/favorites-service.ts) & [`src/app/api/v1/favorites/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/favorites/route.ts) | [`src/components/ProductCard.tsx`](file:///home/batman/Pictures/shopsphere/src/components/ProductCard.tsx), `user_favorites` |
| **Agent Orders, Tagging (`🤖 Agent Purchase`) & Relaxed Cancellation** | [`src/services/order-service.ts`](file:///home/batman/Pictures/shopsphere/src/services/order-service.ts) & [`src/app/(customer)/orders/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/(customer)/orders/page.tsx) | `orders.placed_by`, `order_tracking_events`, [`src/app/(customer)/checkout/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/(customer)/checkout/page.tsx) |
| **Service Layer & Business Logic** | [`src/services/order-service.ts`](file:///home/batman/Pictures/shopsphere/src/services/order-service.ts) & [`src/services/wallet-service.ts`](file:///home/batman/Pictures/shopsphere/src/services/wallet-service.ts) | [`src/services/agent-executor.ts`](file:///home/batman/Pictures/shopsphere/src/services/agent-executor.ts), [`src/services/agent-tools.ts`](file:///home/batman/Pictures/shopsphere/src/services/agent-tools.ts), [`src/services/agent-memory-service.ts`](file:///home/batman/Pictures/shopsphere/src/services/agent-memory-service.ts), [`src/services/cart-service.ts`](file:///home/batman/Pictures/shopsphere/src/services/cart-service.ts), [`src/services/favorites-service.ts`](file:///home/batman/Pictures/shopsphere/src/services/favorites-service.ts), [`src/services/gift-service.ts`](file:///home/batman/Pictures/shopsphere/src/services/gift-service.ts) |
| **Security — Rate Limiting, CSRF, Prompt Safety** | [`src/lib/rate-limiter.ts`](file:///home/batman/Pictures/shopsphere/src/lib/rate-limiter.ts) & [`src/lib/csrf.ts`](file:///home/batman/Pictures/shopsphere/src/lib/csrf.ts) | [`src/lib/prompt-templates.ts`](file:///home/batman/Pictures/shopsphere/src/lib/prompt-templates.ts), [`src/middleware.ts`](file:///home/batman/Pictures/shopsphere/src/middleware.ts) |

---

## 2. High-Level Architecture Diagram

```mermaid
mindmap
  root((ShopSphere System))
    Authentication & Security
      Supabase Auth "Email + Google OAuth"
      Passwordless Admin "Email OTP + CAPTCHA"
      Edge Gatekeeper "src/middleware.ts"
      RBAC "src/lib/auth/roles.ts"
      Database RLS "100% default-deny"
      Rate Limiting "src/lib/rate-limiter.ts"
      CSRF Protection "src/lib/csrf.ts"
      Prompt Safety "src/lib/prompt-templates.ts"
    Customer Portal "(customer)"
      Navbar "src/components/CustomerNavbar.tsx"
      Agent Tasks Workspace "src/app/(customer)/agent"
      Faceted Explore Feed "src/components/ExploreFeedClient.tsx"
      Amazon Product Detail "src/app/(customer)/product/[id]"
      Buy Box & Reviews "src/components/ProductDetailClient.tsx"
      Cart Context "src/context/CartContext.tsx"
      Checkout & In-App Wallet "src/app/(customer)/checkout"
      Order Tracking & Agent Badges "src/app/(customer)/orders"
      Personal AI Assistant "src/components/PersonalAiAssistant.tsx"
      Dynamic Feed Engine "/api/v1/feed/personalized"
      Reviews & Upvotes "/api/v1/reviews"
      Saksham Accessibility "src/context/AccessibilityContext.tsx"
      Voice Command Bar "src/components/accessibility/VoiceCommandBar.tsx"
      Audio Description Player "src/components/accessibility/AudioDescriptionPlayer.tsx"
    Seller Operations Hub "(seller)"
      Dashboard & Analytics "src/app/seller/dashboard"
      Multi-Inventory Tabs "src/components/SellerInventoryTabs.tsx"
      Listing Wizard "src/app/seller/add-product"
      AI Auto-Categorizer "src/app/api/v1/ai/categorize"
      10+ Spec Extraction "src/lib/validations/ai.ts"
    Admin Governance "(admin)"
      Platform Radar "src/app/(admin)/dashboard"
      Approval Queue "src/components/AdminApprovalQueue.tsx"
      Sidebar Navigation "src/components/AdminSidebar.tsx"
      Global Orders Ledger
      Immutable Audit Trail
    AI Intelligence Layer
      Customer Super Agent "src/services/agent-executor.ts, src/services/agent-tools.ts"
      Agent Tasks Workspace "src/app/(customer)/agent/page.tsx"
      Agent Behavioral Memory "src/services/agent-memory-service.ts"
      Agent Profile API "/api/v1/ai/agent-profile"
      Autonomous ReAct Loop "13 Tools: Search, Cart, Favorites, Review, Gift, Pay"
      Two-Phase HITL Protocol "Payload Approval + Execution Dispatch"
      Event Bus Bridge "CustomEvent State Synchronization"
      AI Guide Agent "src/components/ai/, /api/v1/ai/"
      Visual Search "src/app/api/v1/ai/visual-search"
      Proactive Notifications "src/app/api/v1/ai/proactive"
      Agent Memory "ai_agent_memory, ai_agent_sessions"
      Specialist Personas "Tech, Fashion, Gourmet, Beauty, Accessibility"
    Behavior Analysis Engine
      Event Ingestion "src/app/api/v1/behavior/events"
      Feature Store "user_features, ml_models"
      LTR Feed Ranking "/api/v1/feed/personalized/v2"
      Model Registry "ml_models"
    Social Commerce
      Friend Graph "friend_relationships"
      Send a Friend "shared_products, /api/v1/friends"
      Gift a Friend "gifts, gift_notifications, group_gifts"
      Gift Reveal & Unboxing "/api/v1/gifts/[id]/reveal"
    Blind Accessibility (Saksham Excellence)
      Audio Descriptions "audio_descriptions, /api/v1/accessibility/audio-description"
      Voice Navigation "VoiceCommandBar, STT/TTS"
      Accessible Sign-In "/login/accessible"
      Haptic/Earcon Feedback "Web Vibration API"
      Usage Analytics "accessibility_usage_metrics"
    Service Layer (Business Logic)
      OrderService "src/services/order-service.ts"
      WalletService "src/services/wallet-service.ts"
      CartService "src/services/cart-service.ts"
      FavoritesService "src/services/favorites-service.ts"
      AgentExecutor "src/services/agent-executor.ts"
      AgentTools "src/services/agent-tools.ts"
      AIService "src/services/ai-service.ts"
      GiftService "src/services/gift-service.ts"
      BehaviorService "src/services/behavior-service.ts"
      NotificationService "src/services/notification-service.ts"
    Data & State Layer
      Supabase PostgreSQL "database-schema.md"
      Profiles & Accessibility "users, user_accessibility_profiles"
      In-App Wallets & Ledger "user_wallets, wallet_transactions"
      Product Favorites "user_favorites"
      AI Context Vector "ai_user_profiles, ai_conversations"
      Amazon Catalog "categories, products, product_variants, attributes"
      Reviews & Community "product_reviews, review_helpful_votes"
      Orders & Fulfillment "orders (placed_by), order_items, order_tracking_events, order_returns"
      Behavior Events "user_behavior_events"
      Social Graph "friend_relationships, shared_products"
      Gifts "gifts, gift_notifications, group_gifts"
      AI Memory "ai_agent_memory, ai_agent_sessions"
      Audio Descriptions "audio_descriptions"
      ML Features "user_features, ml_models"
```

---

## 3. Route Tree & Responsibility Breakdown

### 3.1 Public & Authentication Routes
* **[`src/app/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/page.tsx)** (`/`): Landing redirect to role-specific dashboard or explore feed.
* **[`src/app/login/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/login/page.tsx)** (`/login`): Customer login interface supporting email/password and Google OAuth.
* **[`src/app/signup/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/signup/page.tsx)** (`/signup`): Customer onboarding with optional Saksham accessibility accommodation questions.
* **[`src/app/forgot-password/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/forgot-password/page.tsx)** (`/forgot-password`): Password reset recovery.
* **[`src/app/reset-password/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/reset-password/page.tsx)** (`/reset-password`): Password reset callback handler.
* **[`src/app/auth/callback/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/auth/callback/route.ts)** (`/auth/callback`): OAuth exchange handler exchanging code for session.

### 3.2 Customer App Portal (`src/app/(customer)/*`)
* **[`src/app/(customer)/layout.tsx`](file:///home/batman/Pictures/shopsphere/src/app/(customer)/layout.tsx)**: Customer shell wrapping all buyer views, hosts [`CustomerNavbar`](file:///home/batman/Pictures/shopsphere/src/components/CustomerNavbar.tsx), CartProvider, and [`PersonalAiAssistant`](file:///home/batman/Pictures/shopsphere/src/components/PersonalAiAssistant.tsx).
* **[`src/app/(customer)/agent/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/(customer)/agent/page.tsx)** (`/agent`): Dedicated Autonomous Super Agent Workspace & Mission Control — live memory radar, session dwell tracker, user category affinity (%), 1-click autonomous action presets (Phones under ₹20k, Earbuds, Wishlist inspection, Wallet topup, Gifting), high-fidelity markdown formatting stream, and 1-tap frictionless action cards.
* **[`src/app/(customer)/explore/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/(customer)/explore/page.tsx)** (`/explore`): Product discovery grid with category tabs, search, and dynamic AI-personalized carousels rendered by [`ExploreFeedClient`](file:///home/batman/Pictures/shopsphere/src/components/ExploreFeedClient.tsx).
* **[`src/app/(customer)/product/[id]/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/(customer)/product/[id]/page.tsx)** (`/product/[id]`): Amazon-grade Product Detail Page with image gallery, 10+ specs table, Buy Box, and verified reviews rendered by [`ProductDetailClient`](file:///home/batman/Pictures/shopsphere/src/components/ProductDetailClient.tsx).
* **[`src/app/(customer)/checkout/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/(customer)/checkout/page.tsx)** (`/checkout`): Multi-address selection, itemized split-seller totals, "Gift for Friend" delay parameters, and **ShopSphere In-App Wallet** payment method with live balance checking, auto-shortfall calculation, and 1-tap quick top-up chips (+₹500, +₹1,000, +exact shortfall).
* **[`src/app/(customer)/orders/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/(customer)/orders/page.tsx)** (`/orders`): Customer order history with live status badges, tracking timeline, **`🤖 Agent Purchase` visual distinction**, and **relaxed cancellation window** (cancellable through `packed` status with instant wallet refund).
* **[`src/app/(customer)/gifts/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/(customer)/gifts/page.tsx)** (`/gifts`): Gift dashboard — sent/received gifts, group gifts, reveal timeline, thank-you notes.
* **[`src/app/(customer)/gifts/[id]/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/(customer)/gifts/[id]/page.tsx)** (`/gifts/[id]`): Gift detail — stealth view (pre-reveal) or full unboxing (post-reveal) with exchange/return.
* **[`src/app/(customer)/gifts/send/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/(customer)/gifts/send/page.tsx)** (`/gifts/send`): Gift creation flow — product picker, recipient selector, reveal trigger, wrapping, message.
* **[`src/app/(customer)/friends/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/(customer)/friends/page.tsx)** (`/friends`): Friend management — requests, contacts import, shared wishlists.
* **[`src/app/(customer)/accessibility/login/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/(customer)/accessibility/login/page.tsx)** (`/login/accessible`): Special accessible sign-in — audio CAPTCHA, voice OTP, simplified form.
* **[`src/app/(customer)/accessibility/settings/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/(customer)/accessibility/settings/page.tsx)** (`/accessibility/settings`): Full Saksham control panel — voice nav, TTS, audio desc, haptics.

### 3.3 Seller Hub Portal (`src/app/seller/*` & `src/app/(seller)/*`)
* **[`src/app/seller/layout.tsx`](file:///home/batman/Pictures/shopsphere/src/app/seller/layout.tsx)**: Persistent merchant shell with [`SellerSidebar`](file:///home/batman/Pictures/shopsphere/src/components/SellerSidebar.tsx).
* **[`src/app/seller/dashboard/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/seller/dashboard/page.tsx)** (`/seller/dashboard`): Merchant KPI radar (total products, active inventory, pending orders) and [`SellerInventoryTabs`](file:///home/batman/Pictures/shopsphere/src/components/SellerInventoryTabs.tsx).
* **[`src/app/seller/add-product/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/seller/add-product/page.tsx)** (`/seller/add-product`): Enterprise listing creation wizard with AI auto-categorization and dynamic 10+ attribute editor.

### 3.4 Admin Operations Desk (`src/app/(admin)/*`)
* **[`src/app/(admin)/layout.tsx`](file:///home/batman/Pictures/shopsphere/src/app/(admin)/layout.tsx)**: Admin operations shell with [`AdminSidebar`](file:///home/batman/Pictures/shopsphere/src/components/AdminSidebar.tsx).
* **[`src/app/(admin)/dashboard/page.tsx`](file:///home/batman/Pictures/shopsphere/src/app/(admin)/dashboard/page.tsx)** (`/admin/dashboard`): Platform health radar (GMV, orders, active users) and [`AdminApprovalQueue`](file:///home/batman/Pictures/shopsphere/src/components/AdminApprovalQueue.tsx) for pending product compliance.

### 3.5 API Handlers (`src/app/api/v1/*`)
* **[`src/app/api/v1/ai/categorize/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/ai/categorize/route.ts)**: Multimodal AI endpoint parsing raw product titles, descriptions, and images to generate taxonomy, 10+ specs, and suggested pricing.
* **[`src/app/api/v1/ai/chat/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/ai/chat/route.ts)**: Customer Super Agent ReAct loop executing 13 function tools with Two-Phase HITL confirmation for autonomous purchasing, cart management, gifting, reviews, and wallet settlement.
* **[`src/app/api/v1/ai/agent-profile/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/ai/agent-profile/route.ts)**: Customer Behavioral Memory Profiling API — aggregates live dwell time from `user_behavior_events`, session counts, category affinities, price elasticity tiers, wallet balance, active cart, and persistent memories from `ai_agent_memory`.
* **[`src/app/api/v1/wallet/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/wallet/route.ts)**: In-App Wallet balance inquiry (GET) and top-up funds (POST).
* **[`src/app/api/v1/wallet/pay/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/wallet/pay/route.ts)**: Atomic wallet payment and balance debit execution for orders.
* **[`src/app/api/v1/favorites/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/favorites/route.ts)**: Customer favorite products CRUD (list favorites, add favorite, remove favorite).
* **[`src/app/api/v1/ai/visual-search/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/ai/visual-search/route.ts)**: Visual search endpoint — image upload → CLIP embedding → vector similarity search against product catalog.
* **[`src/app/api/v1/ai/proactive/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/ai/proactive/route.ts)**: Proactive notification trigger — checks price drops, back-in-stock, delivery updates for watched items.
* **[`src/app/api/v1/feed/personalized/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/feed/personalized/route.ts)**: Dynamic feed engine calculating weighted product carousels (heuristic v1).
* **[`src/app/api/v1/feed/personalized/v2/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/feed/personalized/v2/route.ts)**: LTR-powered feed ranking using ML model scores.
* **[`src/app/api/v1/behavior/events/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/behavior/events/route.ts)**: Batch behavioral event ingestion for ML feature computation.
* **[`src/app/api/v1/friends/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/friends/route.ts)**: Friend graph management — requests, accept, block, list.
* **[`src/app/api/v1/shared-products/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/shared-products/route.ts)**: Send a Friend — deep link generation, attribution tracking, viral coefficient.
* **[`src/app/api/v1/gifts/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/gifts/route.ts)**: Gift a Friend — create, list, stealth-mode tracking.
* **[`src/app/api/v1/gifts/[id]/reveal/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/gifts/[id]/reveal/route.ts)**: Manual/automated gift reveal with unboxing animation trigger.
* **[`src/app/api/v1/gifts/[id]/thank/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/gifts/[id]/thank/route.ts)**: Recipient thank-you note (text/voice/photo) with sender notification.
* **[`src/app/api/v1/group-gifts/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/group-gifts/route.ts)**: Group gifting — pool creation, contributions, auto-purchase on target.
* **[`src/app/api/v1/accessibility/audio-description/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/accessibility/audio-description/route.ts)**: AI-generated audio descriptions for products (script + TTS caching).
* **[`src/app/api/v1/reviews/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/reviews/route.ts)**: Verified buyer product review submissions and helpfulness community upvoting.
* **[`src/app/api/v1/accessibility/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/accessibility/route.ts)**: Saksham user accessibility preferences retrieval and server persistence.
* **[`src/app/api/v1/orders/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/orders/route.ts)**: Order creation with atomic stock reservation, split-seller totals, wallet settlement, and `placed_by: 'agent'` attribution.
* **[`src/app/api/v1/addresses/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/addresses/route.ts)**: Multi-address book CRUD with default management.
* **[`src/app/api/v1/offers/personalized/route.ts`](file:///home/batman/Pictures/shopsphere/src/app/api/v1/offers/personalized/route.ts)**: Behavioral offer generation based on AI profile and chat intents.

---

## 4. Customer Super Agent Architecture

For detailed architecture diagrams, sequence flows, tool contracts, and ReAct loop specifics, see [`AGENT_ARCHITECTURE.md`](file:///home/batman/Pictures/shopsphere/AGENT_ARCHITECTURE.md).

* **Model:** Google Gemini Flash (`gemini-flash-lite-latest` / `gemini-2.5-flash`), zero-cost tier, non-deprecated, high performance.
* **13 Function Tools:**
  1. `search_catalog` — Strict category-aware keyword & budget search with canonical category aliasing.
  2. `get_product_specs` — Fetch rich specs, 10+ dynamic attributes, stock status, seller info.
  3. `manage_cart` — Add, remove, update, or clear items with instant navbar badge sync.
  4. `manage_favorites` — Real-time wishlist bookmarking & card heart toggle.
  5. `get_friends_list` — Query social commerce graph for gifting recipients.
  6. `send_as_gift` — Dispatch product as surprise or scheduled gift with custom wrapping and notes.
  7. `get_reviewable_products` — Inspect past verified purchases awaiting customer feedback.
  8. `submit_product_review` — Submit verified review with star ratings and comments.
  9. `get_wallet_status` — Check in-app wallet balance in ₹ and transaction ledger.
  10. `topup_wallet` — Instant digital top-up with fast-fill quick chips.
  11. `prepare_wallet_checkout` — Phase 1 of HITL: Verifies funds, reserves stock, creates pending order, renders authorization card. Auto-resolves active cart or wishlist if product ID is omitted.
  12. `confirm_wallet_payment` — Phase 2 of HITL: Atomic debit, marks order confirmed, clears cart, and issues confirmation card.
  13. `cancel_or_replace_order` — Leniency engine: Extended cancellation through `packed` status with instant 100% wallet refund.
* **Behavioral Memory & Tracking Layer (`src/services/agent-memory-service.ts`):**
  - Aggregates dwell time across sessions from `user_behavior_events`.
  - Calculates user category affinity (% of interactions mapped to top categories).
  - Determines price elasticity and budget sensitivity tiers.
  - Ingests active wallet balance, cart contents, and recent wishlist items.
  - Pulls cross-session facts and user preferences from `ai_agent_memory`.
  - Exposes `formatBehavioralMemoryPrompt()` for prompt injection and `/api/v1/ai/agent-profile` for client UI.
* **Dedicated Tasks Workspace (`/agent`) vs. Floating Companion:**
  - **Top Navbar Section (`/agent`):** Full-screen Command Center with live memory radar, session dwell counter, 1-click autonomous task presets, and zero-click-friction purchasing.
  - **Bottom-Right Drawer (`PersonalAiAssistant.tsx`):** Available across all pages for quick natural language assistance and queries.
  - Both share session state and custom events seamlessly.
* **Strict Category Normalization & Search Filtering:**
  - Canonical aliases (e.g. `phones`/`smartphones` -> `Electronics`, `earbuds` -> `Audio & Accessories`, `shoes` -> `Footwear`).
  - Strict SQL boundary checking: Never falls back to unrelated categories. If a user asks for a category under ₹X, queries are strictly constrained.
* **Two-Phase Confirmation Protocol (HITL):** Financial operations pause execution to present interactive confirmation cards (`WALLET_PAY_AUTH`) to the user before running.
* **Client-Side Event Bus:** Dispatches `shopsphere:cart-update`, `shopsphere:wallet-update`, `shopsphere:favorites-update`, and `shopsphere:orders-update` custom DOM events for zero-refresh UI reactivity.
* **Agent Order Tagging & Relaxed Policy:** Orders placed by the agent are flagged with `placed_by: 'agent'`, rendered with `🤖 Agent Purchase` badges, and granted extended cancellation through the `packed` stage with instant 100% wallet refunds.

---

## 5. UI & Accessibility Architecture

* **Design Philosophy:** Type-safe CSS-in-TypeScript (`.css.ts`) using Vanilla Extract:
  * Zero runtime overhead (CSS extracted at build-time).
  * Strict contract tokens preventing arbitrary styling drift.
  * Headless accessibility primitives powered by **Radix UI**.
* **Saksham Inclusive Framework (`src/context/AccessibilityContext.tsx`):**
  * Root font scaling (100%, 125%, 150%, 175%) for low-vision users.
  * High-contrast visual presentation mode.
  * Motor tremor mode with large touch targets (min 48px target bounds).
  * Cognitive focus mode (simplified UI decluttering non-essential badges).
  * Persistent synchronization to `user_accessibility_profiles` table.

---

## 6. Maintenance Guidelines for Developers & AI Agents

1. **Bricks & Mortar First:** Never build superficial UI or animations before the database tables, TypeScript types, API routes, and validation schemas are fully verified.
2. **Schema Synchronization:** When adding or mutating a database column or table:
   - Update [`database-schema.md`](file:///home/batman/Pictures/shopsphere/database-schema.md) with DDL, indexes, and RLS policies.
   - Update [`src/types/database.types.ts`](file:///home/batman/Pictures/shopsphere/src/types/database.types.ts).
   - Update [`MINDMAP.md`](file:///home/batman/Pictures/shopsphere/MINDMAP.md).
3. **Role Isolation Integrity:** Ensure all new routes are explicitly mapped in [`src/middleware.ts`](file:///home/batman/Pictures/shopsphere/src/middleware.ts) and bounded by RLS in PostgreSQL.
4. **Accessibility (Saksham) Verification:** Ensure all interactive elements include keyboard focus handling, ARIA labels, semantic landmarks, and contrast compliance.
