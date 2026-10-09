import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { requireActiveAdmin } from '@/lib/admin-guard';
import { parsePlatformStats } from '@/lib/platform-stats';
import { adminApiLimiter, enforceRateLimit, rateLimitKey } from '@/lib/rate-limiter';
import { captureRouteError } from '@/lib/sentry';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;
    const limited = await enforceRateLimit(adminApiLimiter, await rateLimitKey(request));
    if (limited) return limited;
    const supabase = await createClient();
    const gate = await requireActiveAdmin(supabase);
    if (gate.error) return gate.error;

    const { data, error } = await supabase.rpc('admin_platform_stats');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const stats = parsePlatformStats(data);
    if (!stats) return NextResponse.json({ error: 'Stats were empty.' }, { status: 500 });
    return NextResponse.json({ stats });
  } catch (error: unknown) {
    captureRouteError(error, { route: '/api/v1/admin/stats', method: 'GET' });
    const message = error instanceof Error ? error.message : 'Failed to load stats.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
