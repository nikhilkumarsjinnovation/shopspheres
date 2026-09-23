import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { getAuthenticatedUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { buildLtrFeed } from '@/lib/ltr-rank';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserFeatures } from '@/services/behavior-service';

export async function GET(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;
    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { data: products, error } = await supabase
      .from('products')
      .select('id, title, description, price, compare_at_price, stock, condition, category, sub_category, tags, attributes, image_urls, average_rating, review_count, created_at')
      .eq('approval_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(40);
    if (error || !products) {
      throw new Error(error?.message ?? 'Catalog unavailable');
    }

    const features = await getUserFeatures(supabase, session.user.id);
    const admin = createAdminClient();
    const { data: activeModel } = await admin
      .from('ml_models')
      .select('name, version, framework')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    const modelName = activeModel ? `${activeModel.name}@${activeModel.version}` : 'heuristic-ltr-v1';
    const feed = buildLtrFeed(products, features, modelName);
    return NextResponse.json({ ...feed, variant: 'v2', model: modelName });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Ranked feed failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
