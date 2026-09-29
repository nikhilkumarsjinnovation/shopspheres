# ShopSphere — Comprehensive AI Subsystem Architecture & Agents Specification

**Document Version:** 2.0.0  
**Subsystem:** Intelligent Platform Intelligence & Autonomous Agent Network  
**Philosophy:** *"Build the foundation with bricks, cement, stones, and metal first; paints and tiles come later."*  
**Status:** Approved Engineering Blueprint

---

## 1. Architectural Overview & The AI Agent Ecosystem

ShopSphere incorporates a multi-agent AI architecture spanning both customer and merchant operations:

```mermaid
flowchart TD
    User([Customer Interaction]) --> PersonalAI[Personal AI Shopping Companion\n/api/ai/chat]
    PersonalAI --> MemoryGraph[(ai_user_profiles\nContext Memory)]
    MemoryGraph --> FeedEngine[Dynamic Feed Personalization\n/api/feed/personalized]
    FeedEngine --> CustomerFeed([Personalized Explore Feed])

    User --> VoiceAgent[Accessibility Voice Agent\nSaksham STT / TTS]
    VoiceAgent --> PersonalAI

    Seller([Merchant Listing]) --> AutoCategorizer[Seller Auto-Categorizer\n10+ Attribute Extractor\n/api/ai/categorize]
    AutoCategorizer --> ZodValidator{Zod Schema Validator\n& Self-Healing Loop}
    ZodValidator -->|Valid| ProductCatalog[(products table)]
    ZodValidator -->|Retry| AutoCategorizer
```

---

## 2. Agent 1: The Customer Super Agent (Autonomous ReAct Companion)

> **Detailed Specification:** See the dedicated [`AGENT_ARCHITECTURE.md`](file:///home/batman/Pictures/shopsphere/AGENT_ARCHITECTURE.md) for full sequence diagrams, tool schemas, and reactive state flows.

### 2.1 Mission & Core Capabilities
The Customer Super Agent is an autonomous shopping companion powered by **Google Gemini** (`gemini-flash-lite-latest` / `gemini-3.1-flash-lite`, free-tier and non-deprecated). It moves beyond passive Q&A to execute real marketplace transactions across the platform:
* **Catalog Exploration & Specs**: Semantic search with price bounds in ₹ and deep spec extraction.
* **Autonomous Cart Management**: Adding, updating quantities, and clearing items in real time.
* **Favorites / Wishlist Management**: Adding and removing saved items with instant heart icon synchronization.
* **Social Gifting**: Finding friends and sending surprise gift packages with scheduled reveal dates.
* **Verified Product Reviews**: Querying past purchases and submitting customer ratings & text reviews.
* **In-App Wallet 1-Tap Checkout**: Atomic balance verification, top-up prompts, and 2-phase HITL checkout.
* **Agent Purchase Protection**: Every order placed by the agent is labeled `🤖 Agent Purchase` and backed by a relaxed cancellation policy (cancellable through `packed` status with instant 100% wallet refunds).

### 2.2 Native Gemini 13-Tool Calling Registry (`src/services/agent-tools.ts`)
The Super Agent operates with 13 registered Gemini function declarations:
1. `search_catalog`: Search approved catalog by query, category, price in ₹, and stock.
2. `get_product_specs`: Detailed attributes, specifications, seller details, and reviews.
3. `manage_cart`: Direct cart operations emitting `CART_SYNC` / `CART_CLEAR` client actions.
4. `manage_favorites`: Manage customer wishlist items emitting `FAVORITES_SYNC` client actions.
5. `get_friends_list`: Query user's social circle for gifting and sharing.
6. `send_as_gift`: Configure surprise gift wraps with custom greetings and scheduled reveal.
7. `get_reviewable_products`: Retrieve past delivered purchases eligible for reviews.
8. `submit_product_review`: Post verified buyer reviews (1–5★) and feedback.
9. `get_wallet_status`: Atomic query of in-app wallet balance in ₹ and transaction ledger.
10. `topup_wallet`: Instant demo/prepaid deposit to the customer's in-app wallet.
11. `prepare_wallet_checkout`: Phase 1 of HITL: validate balance, reserve stock, and generate `WALLET_PAY_AUTH` card.
12. `confirm_wallet_payment`: Phase 2 of HITL: customer 1-tap confirmation, atomic debit, and order placement.
13. `cancel_or_replace_order`: Relaxed cancellation engine through `packed` status with instant 100% refund.

### 2.3 Two-Phase Human-in-the-Loop (HITL) Financial Safety Protocol
To ensure strict financial security:
* The agent never deducts money unilaterally.
* `prepare_wallet_checkout` generates a secure `WALLET_PAY_AUTH` interactive card in the chat drawer.
* The user must explicitly tap **"Authorize ₹[total] & Confirm Order"**, which executes `confirm_wallet_payment`.

### 2.4 Client-Side Reactive State Bridge (DOM CustomEvent Bus)
* `shopsphere:cart-update` & `shopsphere:cart-clear` -> Instantly updates the navbar bag badge and `CartContext`.
* `shopsphere:favorites-update` -> Toggles the heart icons on `ProductCard` across explore feeds.
* `shopsphere:wallet-update` -> Syncs in-app wallet balance across checkout and assistant drawers.

---

## 3. Dynamic Feed Personalization Engine ("Change His Feed Accordingly")

### 3.1 Overview & Architecture
The customer explore feed (`/customer/explore`) is not a static list. It is driven by the dynamic feed calculation endpoint (`/api/feed/personalized`), which merges general popularity with the user's active AI memory profile.

### 3.2 Feed Weight Scoring Algorithm
Every approved product $P$ receives a real-time relevance score $S(P, U)$ for user $U$:

$$S(P, U) = W_{\text{base}} \cdot \text{Rating}(P) + W_{\text{cat}} \cdot C(P, U) + W_{\text{intent}} \cdot I(P, U) + W_{\text{price}} \cdot D_{\text{price}}(P, U)$$

Where:
* $C(P, U)$ is the user's affinity score for the product's category from `ai_user_profiles.feed_weights`.
* $I(P, U)$ is the match score between the product's tags/attributes and recent AI chat intents.
* $D_{\text{price}}(P, U)$ rewards products that fall within the user's typical purchasing price band.

### 3.3 Dynamic Carousel Generation
The feed API dynamically synthesizes customized carousels based on the user's latest interaction signals:
* **Signal (User chats about hiking gear):**
  * Carousel generated: *"Curated for Your Outdoor Trail Adventure"*
  * Category boost: *Sports & Outdoors*, *Waterproof Footwear*, *Backpacks*.
* **Signal (User searches for kitchen gadgets under ₹2,000):**
  * Carousel generated: *"Top Rated Kitchen Essentials in Your Budget"*

---

## 4. Agent 2: Accessibility Voice & Navigation Agent (Saksham Framework)

### 4.1 Speech-to-Text (STT) Voice Command Engine
* Ingests microphone audio stream, transcribes queries, and classifies navigation or purchasing intents.
* Supported commands:
  * *"Search for stainless steel water bottles under five hundred rupees"*
  * *"Add the second product to my cart"*
  * *"Read the specifications of this item"*
  * *"Proceed to checkout with my default home address"*
  * *"Where is my order?"*

### 4.2 Text-to-Speech (TTS) Audible Guidance
* Generates clear, concise natural language audio descriptions.
* Strips marketing clutter and announces crucial parameters:
  * *"Drift ANC Headphones. Priced at ₹3,499. Rated 4.8 stars by 142 buyers. In stock at Sound & Co. Delivery in 42 minutes."*

---

## 5. Agent 3: Category Specialist Personas (PRO Feature)

When enabled, the assistant adopts specialized domain expertise:

| Persona | Domain | Reasoning Focus | Example Query Resolution |
| :--- | :--- | :--- | :--- |
| **Tech & Electronics Guru** | Audio, Computing, Smart Home | Specs, compatibility, benchmarks, battery life | *"Will these headphones support low-latency gaming on a PS5 without a dongle?"* |
| **Fashion Stylist** | Apparel, Footwear, Accessories | Color harmony, occasion dressing, sizing fits | *"Recommend shoes that pair with an emerald linen blazer for a summer evening."* |
| **Gourmet Sommelier** | Groceries, Coffee, Pantry | Origin, dietary allergies, shelf life, pairings | *"Suggest medium-roast beans roasted within 10 days that work well with French press."* |
| **Beauty Consultant** | Skincare, Cosmetics | Active ingredients, skin tolerance, clean formula | *"Find a daytime moisturizer with niacinamide for sensitive combination skin."* |

---

## 6. Agent 4: Seller Auto-Categorization & 10+ Attribute Extractor

### 6.1 Pipeline Architecture
The endpoint `/api/ai/categorize` transforms minimal seller inputs into an enterprise listing draft.

```mermaid
sequenceDiagram
    autonumber
    actor Seller
    participant API as /api/ai/categorize
    participant LLM as Multimodal Vision Model
    participant Zod as Zod Schema Validator
    participant DB as products table

    Seller->>API: POST { title, description, condition, image_url }
    loop Retry Cycle (Up to 3 Attempts)
        API->>LLM: Ingest multimodal prompt & strict JSON Schema
        LLM-->>API: Raw JSON Output
        API->>Zod: Validate against CategoryResponseSchema
        alt Schema Valid
            Zod-->>API: Typed CategoryResponse
            API-->>Seller: 200 OK (10+ Attributes, Taxonomy, Suggested Price)
        else Schema Violation
            Zod-->>API: ZodError (Path, Validation Rule)
            Note over API: Feed error diagnostic back into prompt & retry
        end
    end
```

### 6.2 Strict Zod Schema Contract
```typescript
import { z } from "zod";

export const CategoryResponseSchema = z.object({
  category: z.string().min(1, "Primary category is required"),
  sub_category: z.string().min(1, "Sub-category is required"),
  tags: z.array(z.string()).min(3).max(10),
  confidence: z.number().min(0).max(1),
  attributes: z.record(z.string()).refine(
    (attrs) => Object.keys(attrs).length >= 5,
    "At least 5 detailed specification attributes are required"
  ),
  suggested_price: z.number().min(0, "Price must be positive")
});

export type CategoryResponse = z.infer<typeof CategoryResponseSchema>;
```

---

## 7. Agent 5: Customer Review Summarizer & Comparison Engine

### 7.1 Verified Review Distillation
* Ingests verified buyer reviews from `product_reviews`.
* Outputs concise structural overview:
  * **Top Highlights:** Key praised features (e.g. *"Long battery life (35+ hrs)", "Soft ear cushions"*).
  * **Watch Outs:** Common critical notes (e.g. *"Microphone is average in noisy outdoor environments"*).
  * **Buyer Verdict:** One-sentence summary for rapid decision-making.

### 7.2 Multi-Product Comparison Matrix
* Evaluates 2 (Free) or up to 5 (PRO) products side-by-side.
* Generates clear comparison grid comparing Price, Rating, Battery, Dimensions, Warranty, and Value Score.

---

## 8. Latency Budgets, Fallbacks & Error Recovery

| Operation | Target Latency | Fallback Strategy on Failure |
| :--- | :--- | :--- |
| **Personal AI Chat (`/api/ai/chat`)** | < 1,500 ms | Standard semantic search fallback with rule-based recommendations. |
| **Feed Personalization (`/api/feed/personalized`)** | < 250 ms | Falls back to global top-rated popularity ordering if profile is cold or query times out. |
| **Voice Command Parsing (STT)** | < 800 ms | Standard text search query fallback with error confirmation. |
| **Seller Auto-Categorization (`/api/ai/categorize`)** | < 2,500 ms | 3-attempt self-healing retry loop; falls back to manual merchant form on failure. |
