# ShopSphere — Dev Control Tower submission

**Product:** ShopSphere (customer marketplace, seller storefront, admin moderation, customer super agent, seller/admin RAG copilot)  
**Live URL:** https://shopsphere-lilac.vercel.app/  
**GitHub:** https://github.com/nikhilkumarsjinnovation/shopspheres  
**Report date:** 1 October 2026

## 1. Links

| Item | Value |
| --- | --- |
| Updated live URL (Vercel) | https://shopsphere-lilac.vercel.app/ |
| GitHub repository | https://github.com/nikhilkumarsjinnovation/shopspheres |
| Assessment code on the remote | `main`. RAG shop/admin work landed in [PR #16](https://github.com/nikhilkumarsjinnovation/shopspheres/pull/16) (`feat/shop-admin-Rag-v1`) and automations in [PR #17](https://github.com/nikhilkumarsjinnovation/shopspheres/pull/17) (`feat/Rag-offers-inventory-report-automations`). |
| Related remote branches | `feat/customer-super-agent`, `feat/phase-2-ai-agent`, `bugfix/AI-Agent-v1`, `feat/shop-admin-Rag-v1`, `feat/Rag-offers-inventory-report-automations` |
| Local working branch at report time | `fix/UI-polishing` (UI polish; not listed on `origin` in this checkout) |

There is no git tag in this checkout for an Assessment 2 release. Submit the repository URL plus `main` (or one of the feature branches above) unless a tag is created before the deadline.

## 2. Demo notes

### The agent

The customer super agent is a Gemini function-calling loop, not a chat-only FAQ.

- Entry points: `/agent` and the in-app assistant drawer.
- API: `POST /api/v1/ai/chat`.
- Model: `process.env.GEMINI_MODEL`, default **`gemini-flash-lite-latest`** (`src/services/ai-service.ts`, `src/services/rag-service.ts`).
- Router: `src/services/agent-router.ts` classifies each turn as `governed_query`, `qualitative`, `blended`, `action_task`, or `clarification`, and is mode-aware (`chat` vs `agent`).
- Tools (`src/services/agent-tools.ts`): catalog search, product specs, cart, favorites, friends, send gift, reviewable products, submit review, wallet status, wallet top-up, prepare checkout, confirm payment, cancel or replace order.
- Safety: wallet checkout is two-step. `prepare_wallet_checkout` shows a pay card; money moves only after `confirm_wallet_payment`. Prices in replies are checked against catalog rows in `src/services/agent-validator.ts` (hallucinated rupee amounts are rewritten to the stored price).
- Cache: agent results are keyed by user id (`src/services/agent-cache.ts`). A hit for one user is a miss for another.

### The two workflows

**Workflow 1 — Customer agent (browse, then act).**  
Chat mode answers and recommends. Agent mode is required before cart, gift, review, or wallet mutations. Underspecified prompts (a single word such as “phone”, or a gift “for him” with no recipient) stop at a clarification question and quick-reply chips instead of guessing. A complete gift turn looks up a friend by email, picks a catalog product, and places the gift order. A recorded happy path is in section 5.

**Workflow 2 — Seller / admin store copilot (RAG).**  
Shop owners and admins use `executeRagChat` in `src/services/rag-service.ts`.

- **Normal mode** (`isPersonalized: false`): general store Q&A with no vector retrieval.
- **Personalized mode** (`isPersonalized: true`): embed the question, rank that tenant’s products by cosine similarity, and answer only from the retrieved nodes. Stock and restock language also pulls velocity alerts. Sales, revenue, digest, or weekly language also pulls the latest store-intelligence digest.

Seller retrieval is filtered with `seller_id = userContext.userId`. Admin retrieval is global unless a `shopId` is set. Soft-deleted products are excluded from retrieval during the grace window (`softDeleteProduct` / `restoreProduct` / `cleanupExpiredSoftDeleted`).

### RAG design

1. **Chunk.** `generateProductKnowledgeChunk` builds one text chunk per product (title, description, category, price, stock, tags, attributes).
2. **Embed.** `src/lib/embeddings.ts` calls Gemini `gemini-embedding-001` (1536 dimensions). If that call fails, it tries OpenAI `text-embedding-3-small`, then NVIDIA `nemotron-3-embed-1b`.
3. **Store.** The vector is written on `products.embedding` by `syncTenantKnowledge` (and the backfill script `scripts/backfill-product-embeddings.mjs`).
4. **Retrieve.** `retrieveTenantProducts` embeds the query, drops soft-deleted rows, scores cosine similarity (or a title/category text fallback when a product has no embedding), and returns the top matches (default 6 for chat).
5. **Generate.** Gemini receives the ranked nodes, similarity percents, and optional restock or weekly-digest context, and is instructed to stay inside that context.
6. **Maintain.** `src/services/rag-janitor-service.ts` expires the soft-delete grace window and incrementally embeds products that are still pending.

There is no separate vector table and no `match_documents` RPC. Ranking is computed in the service after a tenant-scoped product select.

### How to run the tests

Requires Node. Scripts that talk to Supabase or Gemini also need `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`). `tsx` is not a project dependency; `npx tsx` works.

```bash
# Unit: question router, price provenance, user-scoped cache. No network.
npx tsx scripts/test_agent_v1.ts

# Unit: image resolution, chunking, dedup. No network.
npx tsx scripts/test_dummy_data_generator.ts

# E2E-style: multi-turn gift conversation. Needs GEMINI_API_KEY and a reachable catalog.
npx tsx scripts/test_gifting_flow.ts

# Integration: seller isolation, soft delete, RAG chat. Needs Supabase service role.
npx tsx scripts/test_admin_seller_rag.ts

# Integration: RAG janitor, listing moderation, stockout prediction, flash offers, weekly digest.
npx tsx scripts/test_all_automations.ts

# Config check for the customer agent (catalog read + Gemini model name).
node scripts/verify_agent.mjs
```

`package.json` has `dev`, `build`, `lint`, `typecheck`, and `seed`. It does not define `test`, `vitest`, or Playwright.

## 3. RAG evaluation — retrieval with vs without noise

**Not in the repository.** No script, table, or screenshot compares retrieval quality on clean queries versus queries with noise. Do not submit a made-up precision or recall figure.

What the code does measure, and what `scripts/test_admin_seller_rag.ts` asserts:

| Check | What it proves |
| --- | --- |
| Tenant filter | Seller A’s hits all have `seller_id` of seller A. Same for seller B. Cross-seller rows fail the test. |
| Learning stats | Counts total, active, learned, pending, and grace-period products, plus coverage percent. |
| Soft delete | A deleted product leaves retrieval; restore puts it back; embeddings are kept across the grace window. |
| Unindexed fallback | If `embedding` is null, title/category substring match scores 0.75 or 0.55. That path is a heuristic, not a noise study. |

A noise study still needs a fixed query set, a relevance label per product, a clean run, a noisy run (typos, extra tokens, or unrelated sentences), and hit-rate or precision@k for both. That run was not executed for this report.

## 4. Accuracy evidence (≥70%) and model

**Not in the repository.** There is no metrics printout, confusion matrix, or logged accuracy at or above 70% for the agent, the RAG ranker, or the listing moderator.

Model actually wired in code:

| Use | Model |
| --- | --- |
| Customer agent and RAG answers | `GEMINI_MODEL` or **`gemini-flash-lite-latest`** |
| Listing moderation | Same Gemini model; on failure, **`heuristic-rules-v1`** (keyword and length rules in `src/services/moderation-service.ts`) |
| Embeddings | **`gemini-embedding-001`**, then `text-embedding-3-small`, then `nemotron-3-embed-1b` |

`scripts/export-training-jsonl.mjs` only prints up to 200 rows from `user_behavior_events`, `orders`, and `user_features`. The file header says it does not train a model. Feed ranking in `src/lib/ltr-rank.ts` is a hand-written score (category affinity, rating, price fit) plus a category cap. It is not a trained classifier and has no accuracy number.

## 5. Test run output

### Unit tests (this session)

Command: `npx tsx scripts/test_agent_v1.ts`  
Exit code: **0**

```
🧪 Starting Governed AI Agent v1 Architecture Test
--- TEST 1: Question Router & Smart Cross-Questioning ---
PASSED: Vague prompt "phone" flags needs_clarification
PASSED: Generates interactive quick reply suggestion chips
PASSED: Cross-questions for budget ceiling
PASSED: Vague prompt "shoes" flags needs_clarification
PASSED: Unrealistic price constraint triggers clarification
PASSED: Specific prompt "smartphones under ₹20,000" needs no clarification
PASSED: Classified as governed_query
PASSED: Parsed max price ceiling of ₹20,000
PASSED: Buying in chat mode triggers action_requires_agent_mode
PASSED: Ambiguous gift recipient "him" triggers cross-questioning
PASSED: Exploratory gift request does NOT prematurely ask for recipient
PASSED: Affirmative gift confirmation with recipient in history does NOT trigger clarification
--- TEST 2: Deterministic Validation Gate (Numeric Provenance) ---
PASSED: Auto-corrected hallucinated price ₹1,249 to verified database price ₹1,499
PASSED: Scope gate caught foreign user order
PASSED: Preserved user budget ceiling "under ₹20,000"
PASSED: Preserved verified product price ₹19,999
--- TEST 3: User-Scoped Result Cache Layer ---
PASSED: Alice gets cache hit
PASSED: Bob gets cache miss (cross-tenant leak prevention guaranteed)
🎉 ALL ARCHITECTURE UNIT & INTEGRATION TESTS PASSED!
```

Command: `npx tsx scripts/test_dummy_data_generator.ts`  
Exit code: **0**. All nine sections passed (URL checks, query cache, RandomAPI image keep, placeholder fallback, chunking of 250 products into 100+100+50, stable seeds, title+condition dedup, pending-by-default for shopkeeper rows).

### E2E happy path (gift)

`scripts/test_gifting_flow.ts` is the automated multi-turn gift script. It was **not** re-run for this report (it needs Gemini and the live catalog).

A completed run is already saved in `test.md`:

| Turn | User | Agent |
| --- | --- | --- |
| 1 | Surprise gift for a friend | Clarification gate, 0 verified items. Asks who the gift is for. Chips: saved friends, enter email, add to cart first. |
| 2 | Enter friend's email | Verified DB. Captures `list.append17@gmail.com`. Asks which product. |
| 3 | any perfume will do | 1 verified item. Gift placed. Product: Bella Vita Luxury Man Luxury Perfume Gift Set 4 x 20ml. Price ₹649. Order `9cf9803a-458a-440b-8dfd-4ae0bf950657`. |

Playwright (or another browser E2E runner) is not set up, so this path is a service-level conversation, not a browser recording.

Not run in this session: `scripts/test_admin_seller_rag.ts`, `scripts/test_all_automations.ts`, `scripts/test_gifting_flow.ts`, `node scripts/verify_agent.mjs`.

## 6. Test credentials

Seeded seller accounts (`scripts/data/seed-sellers.json`, applied by `npm run seed` / `scripts/seed_products.mjs`). Every seller uses the same password.

**Password:** `Seller@ShopSphere2026!`

| Role | Email | Shop |
| --- | --- | --- |
| Seller | seller.priya@shopsphere.in | NovaTech Electronics, Bengaluru |
| Seller | seller.rohan@shopsphere.in | SoundScape Audio Studio, Mumbai |
| Seller | seller.ananya@shopsphere.in | Vastram Ethnic Couture, Jaipur |
| Seller | seller.kabir@shopsphere.in | UrbanEdge Fashion & Streetwear, New Delhi |
| Seller | seller.vikram@shopsphere.in | (see seed file) |
| Seller | seller.sneha@shopsphere.in | (see seed file) |
| Seller | seller.rajesh@shopsphere.in | (see seed file) |
| Seller | seller.pooja@shopsphere.in | (see seed file) |
| Seller | seller.meera@shopsphere.in | (see seed file) |
| Seller | seller.ritu@shopsphere.in | (see seed file) |
| Seller | seller.arjun@shopsphere.in | (see seed file) |
| Seller | seller.divya@shopsphere.in | (see seed file) |

**Customer:** no seeded email or password is in the repo. Sign-up on https://shopsphere-lilac.vercel.app/signup creates a customer. `scripts/seed_indian_catalog.py` references customer id `f1ac9e3c-b5f0-4ea9-9b5e-7a76d60c3ff5` and does not store a login password.

**Admin:** no seeded admin email or password is in the repo. Admin is not created by `seed_products.mjs`.

**Extra dummy merchants** from `populateFakeShops` in `src/services/data-generator.ts` use a generated `seller_<timestamp>_<i>@shopsphere-partner.com` address and password `Password@1234!`. Those addresses are not stable.

Login for all roles is email and password at `/login`.

## 7. What is safe to submit today

1. Live URL and GitHub link — ready.
2. Agent, two workflows, RAG design, and test commands — this file.
3. RAG noise table — missing. Run a labeled retrieval set before submitting a number.
4. ≥70% accuracy and confusion matrix — missing. Do not claim the threshold.
5. Unit tests — passing output above. Gift happy path — transcript in `test.md`, not re-run here. Browser E2E — not set up.
6. Seller credentials — ready. Customer and admin logins — not in the seed data.

VERIFIED: `npx tsx scripts/test_agent_v1.ts` exit 0; `npx tsx scripts/test_dummy_data_generator.ts` exit 0 (1 Oct 2026).  
NOT VERIFIED: RAG noise comparison, any accuracy ≥70%, `test_gifting_flow.ts`, `test_admin_seller_rag.ts`, `test_all_automations.ts`, `verify_agent.mjs`, and that the Vercel deployment matches `main` or `fix/UI-polishing`.
