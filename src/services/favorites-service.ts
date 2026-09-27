import { createAdminClient } from '@/lib/supabase/admin';

export interface FavoriteItem {
  id: string;
  product_id: string;
  created_at: string;
  product: {
    id: string;
    title: string;
    price: number;
    compare_at_price?: number | null;
    category: string;
    image_urls: string[];
    stock: number;
    average_rating: number;
  };
}

/**
 * Returns user favorites.
 * Attempts database table first; falls back to profile storage if migration pending.
 */
export async function getFavorites(userId: string): Promise<FavoriteItem[]> {
  const adminDb = createAdminClient();

  try {
    const { data: rows, error } = await adminDb
      .from('user_favorites' as any)
      .select('id, product_id, created_at, product:products(id, title, price, compare_at_price, category, image_urls, stock, average_rating)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && rows) {
      return (rows as any[]).map((r) => ({
        id: r.id,
        product_id: r.product_id,
        created_at: r.created_at,
        product: r.product,
      }));
    }
  } catch {
    // Fall back
  }

  // Profile-based fallback
  const { data: profile } = await adminDb
    .from('ai_user_profiles')
    .select('feed_weights')
    .eq('user_id', userId)
    .maybeSingle();

  const fw = (profile?.feed_weights as any) || {};
  const favIds: string[] = fw.favorites_list || [];

  if (favIds.length === 0) return [];

  const { data: products } = await adminDb
    .from('products')
    .select('id, title, price, compare_at_price, category, image_urls, stock, average_rating')
    .in('id', favIds);

  return (products || []).map((p) => ({
    id: `fav_${p.id.slice(0, 8)}`,
    product_id: p.id,
    created_at: new Date().toISOString(),
    product: p,
  }));
}

/**
 * Adds a product to user favorites.
 */
export async function addFavorite(userId: string, productId: string): Promise<boolean> {
  const adminDb = createAdminClient();

  try {
    const { error } = await adminDb
      .from('user_favorites' as any)
      .insert({ user_id: userId, product_id: productId });

    if (!error) return true;
  } catch {
    // Fall back
  }

  // Profile fallback
  const { data: profile } = await adminDb
    .from('ai_user_profiles')
    .select('feed_weights')
    .eq('user_id', userId)
    .maybeSingle();

  const fw = (profile?.feed_weights as any) || {};
  const favIds = new Set<string>(fw.favorites_list || []);
  favIds.add(productId);
  fw.favorites_list = Array.from(favIds);

  await adminDb
    .from('ai_user_profiles')
    .update({ feed_weights: fw, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  return true;
}

/**
 * Removes a product from user favorites.
 */
export async function removeFavorite(userId: string, productId: string): Promise<boolean> {
  const adminDb = createAdminClient();

  try {
    const { error } = await adminDb
      .from('user_favorites' as any)
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (!error) return true;
  } catch {
    // Fall back
  }

  // Profile fallback
  const { data: profile } = await adminDb
    .from('ai_user_profiles')
    .select('feed_weights')
    .eq('user_id', userId)
    .maybeSingle();

  const fw = (profile?.feed_weights as any) || {};
  const favIds = (fw.favorites_list || []).filter((id: string) => id !== productId);
  fw.favorites_list = favIds;

  await adminDb
    .from('ai_user_profiles')
    .update({ feed_weights: fw, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  return true;
}

/**
 * Checks if a product is favorited by the user.
 */
export async function isFavorite(userId: string, productId: string): Promise<boolean> {
  const adminDb = createAdminClient();

  try {
    const { data, error } = await adminDb
      .from('user_favorites' as any)
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle();

    if (!error && data) return true;
  } catch {
    // Fall back
  }

  const { data: profile } = await adminDb
    .from('ai_user_profiles')
    .select('feed_weights')
    .eq('user_id', userId)
    .maybeSingle();

  const fw = (profile?.feed_weights as any) || {};
  const favIds: string[] = fw.favorites_list || [];
  return favIds.includes(productId);
}
