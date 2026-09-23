import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { requireActiveAdmin } from '@/lib/admin-guard';
import { parsePlatformStats } from '@/lib/platform-stats';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const supabase = await createClient();
  const gate = await requireActiveAdmin(supabase);
  if (gate.error) return gate.error;

  const { data, error } = await supabase.rpc('admin_platform_stats');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const stats = parsePlatformStats(data);
  if (!stats) return NextResponse.json({ error: 'Stats were empty.' }, { status: 500 });
  return NextResponse.json({ stats });
}
