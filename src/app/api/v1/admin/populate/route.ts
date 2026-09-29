import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { requireActiveAdmin, writeAdminAudit } from '@/lib/admin-guard';
import { csrfMiddleware } from '@/lib/csrf';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { populateProductsForShop, populateFakeShops } from '@/services/data-generator';

export async function POST(request: NextRequest) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const csrfError = csrfMiddleware(request);
  if (csrfError) return csrfError;

  const supabase = await createClient();
  const gate = await requireActiveAdmin(supabase);
  if (gate.error || !gate.session) return gate.error;

  const body = await request.json().catch(() => ({}));
  const action = body?.action; // 'populate_shops' | 'populate_products'

  const adminClient = createAdminClient();

  if (action === 'populate_shops') {
    const count = typeof body?.count === 'number' ? Math.min(100, Math.max(1, body.count)) : 3;
    const productsPerShop = typeof body?.productsPerShop === 'number' ? Math.min(50, Math.max(0, body.productsPerShop)) : 5;

    try {
      const result = await populateFakeShops({ count, productsPerShop });
      await writeAdminAudit(supabase, gate.session.user.id, 'populate_fake_shops', 'shops', `${result.shopsCreated} shops`);
      return NextResponse.json({ ok: true, ...result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to populate shops.';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (action === 'populate_products') {
    // targetShops: 'all' | array of shop UUIDs | single shop UUID
    const target = body?.targetShops || 'all';
    const countPerShop = typeof body?.count === 'number' ? Math.min(500, Math.max(1, body.count)) : 5;
    const approvalStatus = body?.approvalStatus === 'pending' ? 'pending' : 'approved';
    const condition = body?.condition && ['New', 'Renewed', 'Used'].includes(body.condition) ? body.condition : undefined;

    try {
      let shopsToPopulate: Array<{ id: string; name: string; seller_id: string }> = [];

      if (target === 'all') {
        const { data: allShops } = await adminClient.from('shops').select('id, name, seller_id');
        shopsToPopulate = allShops || [];
      } else if (Array.isArray(target)) {
        const { data: filteredShops } = await adminClient
          .from('shops')
          .select('id, name, seller_id')
          .in('id', target);
        shopsToPopulate = filteredShops || [];
      } else if (typeof target === 'string') {
        const { data: singleShop } = await adminClient
          .from('shops')
          .select('id, name, seller_id')
          .eq('id', target)
          .maybeSingle();
        if (singleShop) shopsToPopulate = [singleShop];
      }

      if (shopsToPopulate.length === 0) {
        return NextResponse.json({ error: 'No target shops found to populate.' }, { status: 400 });
      }

      let totalInserted = 0;
      let totalSkipped = 0;
      let totalImagesFromRandomApi = 0;
      let totalImagesFromPexels = 0;
      let totalPlaceholderImages = 0;
      let totalImageFailures = 0;
      const breakdown: Array<{
        shop: string;
        inserted: number;
        skippedDuplicates: number;
        imagesFromRandomApi: number;
        imagesFromPexels: number;
        placeholderImages: number;
        imageFailures: number;
      }> = [];

      for (const shop of shopsToPopulate) {
        const res = await populateProductsForShop({
          shopId: shop.id,
          sellerId: shop.seller_id,
          count: countPerShop,
          approvalStatus,
          preferredCondition: condition,
        });
        totalInserted += res.inserted;
        totalSkipped += res.skippedDuplicates;
        totalImagesFromRandomApi += res.imagesFromRandomApi;
        totalImagesFromPexels += res.imagesFromPexels;
        totalPlaceholderImages += res.placeholderImages;
        totalImageFailures += res.imageFailures;

        breakdown.push({
          shop: shop.name,
          inserted: res.inserted,
          skippedDuplicates: res.skippedDuplicates,
          imagesFromRandomApi: res.imagesFromRandomApi,
          imagesFromPexels: res.imagesFromPexels,
          placeholderImages: res.placeholderImages,
          imageFailures: res.imageFailures,
        });
      }

      await writeAdminAudit(
        supabase,
        gate.session.user.id,
        'populate_fake_products',
        'products',
        `${totalInserted} items across ${shopsToPopulate.length} shops`
      );

      return NextResponse.json({
        ok: true,
        totalInserted,
        totalSkippedDuplicates: totalSkipped,
        imagesFromRandomApi: totalImagesFromRandomApi,
        imagesFromPexels: totalImagesFromPexels,
        placeholderImages: totalPlaceholderImages,
        imageFailures: totalImageFailures,
        shopsCount: shopsToPopulate.length,
        breakdown,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to populate products.';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid action. Use 'populate_shops' or 'populate_products'." }, { status: 400 });
}
