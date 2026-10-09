import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { requireActiveAdmin } from '@/lib/admin-guard';
import { csrfMiddleware } from '@/lib/csrf';
import { enforceRateLimit, mlModelsLimiter, rateLimitKey } from '@/lib/rate-limiter';
import { createClient } from '@/lib/supabase/server';
import { getCommittedChurnArtifacts } from '@/services/churn-model-artifacts';
import { fetchChurnModelRows } from '@/services/ml-registry';

export async function GET(request: NextRequest) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const limited = await enforceRateLimit(mlModelsLimiter, await rateLimitKey(request));
  if (limited) return limited;
  const csrfError = csrfMiddleware(request);
  if (csrfError) return csrfError;

  const supabase = await createClient();
  const gate = await requireActiveAdmin(supabase);
  if (gate.error || !gate.session) return gate.error;

  try {
    const rows = await fetchChurnModelRows(supabase);
    const committed = getCommittedChurnArtifacts();
    return NextResponse.json({
      ok: true,
      models: rows,
      committed: {
        next_purchase_predictor: {
          artifact_uri: committed.nextPurchase.artifactUri,
          version: committed.nextPurchase.version,
          metrics: committed.nextPurchase.metrics,
        },
        churn_scorer: {
          artifact_uri: committed.churn.artifactUri,
          version: committed.churn.version,
          metrics: committed.churn.metrics,
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 300) : 'Failed to load churn models.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
