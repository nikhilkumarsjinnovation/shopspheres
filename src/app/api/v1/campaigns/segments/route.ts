import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { requireActiveAdmin } from '@/lib/admin-guard';
import { csrfMiddleware } from '@/lib/csrf';
import { enforceRateLimit, integrationsLimiter, rateLimitKey } from '@/lib/rate-limiter';
import { createClient } from '@/lib/supabase/server';
import { loadSegmentSnapshot } from '@/services/campaign-segments';
import { createOrderUserLoader } from '@/services/campaign-store';

export async function GET(request: NextRequest) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const limited = await enforceRateLimit(integrationsLimiter, await rateLimitKey(request));
  if (limited) return limited;
  const csrfError = csrfMiddleware(request);
  if (csrfError) return csrfError;

  const supabase = await createClient();
  const gate = await requireActiveAdmin(supabase);
  if (gate.error || !gate.session) return gate.error;

  try {
    const { counts } = await loadSegmentSnapshot(createOrderUserLoader(supabase));
    return NextResponse.json({ ok: true, counts });
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 300) : 'Failed to load segments.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
