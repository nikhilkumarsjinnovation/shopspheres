import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { csrfMiddleware } from '@/lib/csrf';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { populateProductsForShop } from '@/services/data-generator';

export async function POST(request: NextRequest) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const csrfError = csrfMiddleware(request);
  if (csrfError) return csrfError;

  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session || (session.profile.role !== 'seller' && session.profile.role !== 'admin')) {
    return NextResponse.json({ error: 'Seller or admin authentication required.' }, { status: 403 });
  }

  // Find the seller's storefront
  const { data: shop, error: shopError } = await supabase
    .from('shops')
    .select('id, name')
    .eq('seller_id', session.user.id)
    .maybeSingle();

  if (shopError) {
    return NextResponse.json({ error: shopError.message }, { status: 500 });
  }

  if (!shop) {
    return NextResponse.json({ error: 'No registered shop found for this account. Create a storefront first.' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const count = typeof body?.count === 'number' ? Math.min(500, Math.max(1, body.count)) : 10;
  const condition = body?.condition && ['New', 'Renewed', 'Used'].includes(body.condition) ? body.condition : undefined;
  const categoryName = typeof body?.category === 'string' ? body.category : undefined;

  try {
    const result = await populateProductsForShop({
      shopId: shop.id,
      sellerId: session.user.id,
      count,
      // Shopkeeper products are inserted in non-verified (pending) state
      approvalStatus: 'pending',
      preferredCondition: condition,
      categoryName,
    });

    return NextResponse.json({
      ok: true,
      shop: shop.name,
      ...result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to populate products.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
