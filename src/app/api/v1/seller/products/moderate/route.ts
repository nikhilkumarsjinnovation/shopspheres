import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { evaluateAndApplyModeration } from '@/services/moderation-service';

export async function POST(request: NextRequest) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const csrfError = csrfMiddleware(request);
  if (csrfError) return csrfError;

  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session || (session.profile.role !== 'seller' && session.profile.role !== 'admin')) {
    return NextResponse.json({ error: 'Seller or admin authorization required.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const productId = body.productId;
    if (!productId || typeof productId !== 'string') {
      return NextResponse.json({ error: 'productId is required.' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Query product
    let query = admin.from('products').select('*').eq('id', productId);
    if (session.profile.role === 'seller') {
      query = query.eq('seller_id', session.user.id);
    }

    const { data: product, error: fetchErr } = await query.maybeSingle();

    if (fetchErr || !product) {
      return NextResponse.json({ error: 'Product not found or access denied.' }, { status: 404 });
    }

    const moderationInput = {
      id: product.id,
      title: product.title,
      description: product.description,
      category: product.category,
      sub_category: product.sub_category,
      price: product.price,
      condition: product.condition,
      tags: Array.isArray(product.tags) ? product.tags : [],
      attributes: (product.attributes && typeof product.attributes === 'object' && !Array.isArray(product.attributes))
        ? product.attributes
        : {},
      image_urls: Array.isArray(product.image_urls) ? product.image_urls : [],
    };

    const result = await evaluateAndApplyModeration(admin, product.id, moderationInput);

    return NextResponse.json({
      ok: true,
      productId: product.id,
      moderation: result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Autonomous moderation failed.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
