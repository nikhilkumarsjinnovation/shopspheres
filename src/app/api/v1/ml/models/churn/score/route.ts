import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { requireActiveAdmin } from '@/lib/admin-guard';
import { csrfMiddleware } from '@/lib/csrf';
import { enforceRateLimit, mlModelsLimiter, rateLimitKey } from '@/lib/rate-limiter';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCommittedChurnArtifacts } from '@/services/churn-model-artifacts';
import { mergeIntoUserFeatures, scoreCustomer } from '@/services/churn-models';
import { loadOrdersForCustomer } from '@/services/churn-order-loader';

export async function POST(request: NextRequest) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const limited = await enforceRateLimit(mlModelsLimiter, await rateLimitKey(request));
  if (limited) return limited;
  const csrfError = csrfMiddleware(request);
  if (csrfError) return csrfError;

  const supabase = await createClient();
  const gate = await requireActiveAdmin(supabase);
  if (gate.error || !gate.session) return gate.error;

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'A JSON body is required.' }, { status: 400 });
  }
  const userId = 'userId' in body ? body.userId : undefined;
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    return NextResponse.json({ error: 'userId is required.' }, { status: 400 });
  }

  try {
    const orders = await loadOrdersForCustomer(supabase, userId.trim());
    const artifacts = getCommittedChurnArtifacts();
    const score = scoreCustomer(
      userId.trim(),
      orders,
      new Date(),
      artifacts.nextPurchase.model,
      artifacts.churn.model,
    );
    if (!score) {
      return NextResponse.json(
        { error: 'No paid order history for this user; cannot score RFM features.' },
        { status: 404 },
      );
    }

    const admin = createAdminClient();
    await mergeIntoUserFeatures(admin, userId.trim(), score);

    return NextResponse.json({
      ok: true,
      userId: userId.trim(),
      score: {
        next_purchase_prob: score.nextPurchaseProb,
        next_purchase_label: score.nextPurchaseLabel,
        churn_risk: score.churnRisk,
        churn_tier: score.churnTier,
        churn_label: score.churnLabel,
      },
      artifacts: {
        next_purchase: artifacts.nextPurchase.artifactUri,
        churn: artifacts.churn.artifactUri,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 300) : 'Failed to score user.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
