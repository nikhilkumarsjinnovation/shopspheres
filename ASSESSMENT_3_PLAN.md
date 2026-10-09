# ShopSphere Assessment 3 plan

Saved so the branch stack stays the source of truth. Status below is updated as branches land. Migrations are authored only. Nothing here is applied, deployed, or committed until you say so.

**Live app:** https://shopsphere-lilac.vercel.app/  
**Repo:** https://github.com/nikhilkumarsjinnovation/shopspheres  
**Start branch:** `main` (clean, tracking `origin/main`)  
**Tag at the end:** `assessment-3` on the tip of `feat/a3-demo`  
**Strategy:** stack. Each pull request targets the previous `feat/` branch, because the agent router, RAG service, migrations, and `package.json` would collide if these were cut from `main` independently.

| Order | Branch | Status | Points |
| --- | --- | --- | --- |
| 1 | `feat/a3-integrations` | merged to main (PR #20) | 20 |
| 2 | `feat/a3-campaigns` | implemented locally, not committed | 15 |
| 3 | `feat/a3-agents` | not started | 20 |
| 4 | `feat/a3-eval-hybrid` | implemented locally, not committed | 15 |
| 5 | `feat/a3-churn` | merged (PR #26) | 10 |
| 6 | `feat/a3-platform` | merged (PR #27) | 15 |
| 7 | `feat/a3-demo` | implemented locally, not committed | 5 |

## What you do

I cannot create vendor accounts, paste secrets, apply SQL, or deploy.

1. **HubSpot (outbound contacts).** Free CRM → Settings → Integrations → Private Apps. Scopes: `crm.objects.contacts.read` and `crm.objects.contacts.write`. Put the token in `.env.local` as `HUBSPOT_PRIVATE_APP_TOKEN`. Do not commit that file.
2. **Resend (outbound email).** Create an API key. Until a domain is verified, Resend only delivers from `onboarding@resend.dev`, and only to the email on the Resend account. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL=ShopSphere <onboarding@resend.dev>`.
3. **Stripe (inbound webhook).** Test mode. Endpoint URL after deploy: `https://shopsphere-lilac.vercel.app/api/v1/webhooks/stripe`. Local: `stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe`. Subscribe to `checkout.session.completed`. Put the signing secret in `STRIPE_WEBHOOK_SECRET`. `STRIPE_SECRET_KEY` should already be an `sk_test_...` key. This route does not use the app CSRF cookie or `Accept: application/vnd.shopsphere.v1+json`; the Stripe signature is the check.
4. **Apply the migration** when you want the event log and contact-sync rows to persist. Agent hooks block `supabase db push`. Command for you: `supabase db push`. Until then, signature checks and the HubSpot/Resend calls still run, and database writes stay unverified.
5. **Admin session** for the two outbound routes. `POST /api/v1/integrations/hubspot/contacts` and `POST /api/v1/integrations/email` require a logged-in active admin, the CSRF header, and `Accept: application/vnd.shopsphere.v1+json`. There is no seeded admin password in the repo.
6. **Say commit / push / open PRs** when a branch should leave this machine. I will not commit or push on my own. Pull request base is the previous feature branch, not `main`, until you want the stack merged.

### Env names (values stay in `.env.local` and later Vercel)

Already used: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

Added for this branch: `HUBSPOT_PRIVATE_APP_TOKEN`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `STRIPE_WEBHOOK_SECRET`.

Branch 6 adds: `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`.

## Branch 1 — `feat/a3-integrations`

Outbound HubSpot contact upsert (email, first name, last name only). Outbound Resend promo send with a 1–100% discount (campaign redeemable codes). Inbound `POST /api/v1/webhooks/stripe` verifies the `Stripe-Signature` header and stores the event id, not the raw body.

**Files:** `src/services/hubspot-sync.ts`, `src/services/resend-mail.ts`, `src/services/stripe-webhook.ts`, `src/app/api/v1/webhooks/stripe/route.ts`, `src/app/api/v1/integrations/hubspot/contacts/route.ts`, `src/app/api/v1/integrations/email/route.ts`, `scripts/test_a3_integrations.ts`, one migration, hand-edited `src/types/supabase.ts`, `.env.example`.

**Tables (new):** `crm_sync_state`, `stripe_webhook_events`. RLS on, admin read, admin write on sync state. Webhook inserts use the service role because Stripe has no user session.

**Done when:** `npx tsx scripts/test_a3_integrations.ts` accepts a valid test signature, rejects a bad one, drops phone and address from the HubSpot payload, and refuses a promo above 100%.

**Rollback:**

```sql
drop table if exists public.stripe_webhook_events;
drop table if exists public.crm_sync_state;
```

## Branch 2 — `feat/a3-campaigns`

Segments from `orders`: new = 1 paid order, repeat = 2+ orders in 90 days, lapsed = last paid order older than 90 days. Paid = `status NOT IN ('pending','cancelled')`. Exclusive priority: lapsed > repeat > new. One email campaign via the Resend helper with redeemable `SS{pct}-XXXX` codes (discount 1–100%). Rows track sent / opened / converted (`opened_at`/`converted_at` columns only; no open webhook).

**Files:** `src/services/campaign-segments.ts`, `src/services/campaign-send.ts`, `src/services/campaign-store.ts`, `src/app/api/v1/campaigns/segments/route.ts`, `src/app/api/v1/campaigns/send/route.ts`, `scripts/test_a3_campaigns.ts`, migration `*_create_campaigns_and_sends.sql`, hand-edited `src/types/supabase.ts`.

**Tables (new):** `campaigns`, `campaign_sends`. RLS on, admin read/write.

**Depends on:** branch 1. **Done when:** `npx tsx scripts/test_a3_campaigns.ts` prints three segment counts and a send writes `sent_at`.

**Rollback:**

```sql
drop table if exists public.campaign_sends;
drop table if exists public.campaigns;
```

## Branch 3 — `feat/a3-agents`

Supervisor routes to the existing customer tool loop or a marketing specialist. Marketing drafts and schedules one campaign to one segment and refuses discounts above 15%. Shared memory stays `ai_agent_memory`. Guardrails: schema check, PII redaction, low-confidence refusal, JSON output.

**Depends on:** branch 2. **Done when:** gift and checkout still hit the customer agent, and an over-limit discount is refused.

## Branch 4 — `feat/a3-eval-hybrid`

Labelled gift and checkout scenarios. First run writes `scripts/eval/baseline-a2.json` from today's cosine retriever (Assessment 2 published no retrieval numbers). Then Postgres full-text plus cosine, then a re-ranker. Report task-success %, hit-rate, precision@k, faithfulness, and answer-relevance beside that baseline.

**Depends on:** branch 3. **Done when:** the report has two measured columns and the baseline file is from the pre-change retriever.

## Branch 5 — `feat/a3-churn`

Repeat-purchase and churn from order history. Precision, recall, and F1 for the existing `ml_models` rows `next_purchase_predictor` and `churn_scorer`. Pure-TypeScript RFM logistic models (`inline://rfm-logistic-*`); optional Ollama `Modelfile` only (not in the request path). If F1 is under 0.80, the measured number is what gets recorded.

**Files:** `src/services/rfm-features.ts`, `src/services/ml-logistic.ts`, `src/services/churn-models.ts`, `src/services/churn-model-artifacts.ts`, `src/services/ml-registry.ts`, `src/services/churn-order-loader.ts`, `src/app/api/v1/ml/models/churn/route.ts`, `src/app/api/v1/ml/models/churn/score/route.ts`, `scripts/fixtures/a3-churn-orders.json`, `scripts/test_a3_churn.ts`, `scripts/gen_a3_churn_artifacts.ts`, `ml/Modelfile.churn`.

**Done when:** `npx tsx scripts/test_a3_churn.ts` (or `npm run test:a3-churn`) prints precision/recall/F1 for both models from the fixture and leaves `pending://not-trained`.

**Depends on:** branch 4.

## Branch 6 — `feat/a3-platform`

`npm test` plus `.github/workflows/test.yml` on push and pull request (typecheck and the existing `tsx` unit scripts). Sentry on server routes and a small metrics view. RLS advisor findings fixed in a migration once a real advisor dump exists. Extra rate limits where this branch's routes still lack them (the Stripe webhook is already limited).

**Files:** `.github/workflows/test.yml`, `src/instrumentation.ts`, `src/lib/sentry.ts`, `src/app/(admin)/admin/metrics/page.tsx`, rate-limit wires on admin/stats, campaigns list, orders, behavior/events, `scripts/test_a3_platform.ts`, `.env.example` Sentry names.

**RLS advisor:** skipped — no real advisor dump in the repo. Add a migration only after you export one from the Supabase dashboard.

**Depends on:** branch 5. **Done when:** `npm test` exits 0 locally and the workflow lists those commands.

## Branch 7 — `feat/a3-demo`

Architecture diagram, eval summary, and a short click-path in the PR body and `scripts/eval/assessment-3-report.md`. Annotated tag `assessment-3` on this tip. `docs/` stays untouched.

**Files:** `scripts/eval/assessment-3-report.md`, `scripts/test_a3_demo.ts`, `package.json` (`test:a3-unit` includes demo smoke).

**Done when:** report has architecture (mermaid), eval summary (hybrid + churn F1), click-path; `npx tsx scripts/test_a3_demo.ts` exits 0; annotated tag `assessment-3` exists on the tip (pushed after merge).

**Depends on:** branch 6.

## Out of scope

Twilio, Slack, Google Calendar, HubSpot deals, Resend DNS, live Colab LoRA, a Vitest or Playwright rewrite, production Stripe charges, inventing Assessment 2 metrics.

## Contract already in the repo

- `public.users` (`id`, `email`, `full_name`, `role`) and `public.orders` (`customer_id`, `status`, `created_at`, `metadata` is not a column; Stripe `order_id` is sent as Checkout `metadata[order_id]`).
- `public.is_admin()` and `public.set_updated_at_column()` exist.
- Stripe Checkout create exists in `src/app/api/v1/orders/route.ts`. No Stripe webhook route yet.
- `src/lib/rate-limiter.ts` exists. No `.github/workflows`. No HubSpot, Resend, Sentry, campaigns, or eval harness.

## Apply checklist (reviewer)

1. Apply `supabase/migrations/*_create_crm_sync_and_stripe_events.sql`, then `*_create_campaigns_and_sends.sql`, then `*_campaign_sends_customer_inbox.sql`, then `*_campaigns_promo_code.sql`, then `*_campaigns_discount_percent_100.sql` (branch order).
2. Set the env names on Vercel. Never put `SUPABASE_SERVICE_ROLE_KEY` in a client bundle.
3. HubSpot private app with contact read/write. Resend sender. Stripe test endpoint and `STRIPE_WEBHOOK_SECRET`.
4. Re-run `npx tsx scripts/test_a3_integrations.ts` and `npx tsx scripts/test_a3_campaigns.ts` after migrations are applied if you want the database path marked verified. Until then that path is **NOT VERIFIED (pending apply)**.
