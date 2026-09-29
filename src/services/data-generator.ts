/**
 * Service to generate realistic fake products and fake shops using randomapi.dev
 * with full deduplication, category-to-department taxonomy mapping,
 * multi-batch chunking, deterministic seeding, and ImageResolver integration.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import {
  ImageResolver,
  isValidImageUrl,
  type ImageSource,
} from '@/services/image-provider';

export interface RandomApiProduct {
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  sku: string;
  ean13: string;
  rating: number;
  inStock: boolean;
  imageUrl: string;
}

export interface RandomApiCompany {
  name: string;
  legalName?: string;
  industry?: string;
  catchphrase?: string;
  foundedYear?: number;
  website?: string;
  email?: string;
}

export interface RandomApiUser {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

export interface ProductGenerationSummary {
  requested: number;
  generated: number;
  inserted: number;
  skippedDuplicates: number;
  approvalStatus: 'pending' | 'approved';
  imagesFromRandomApi: number;
  imagesFromPexels: number;
  placeholderImages: number;
  imageFailures: number;
}

export const MAX_DUMMY_PRODUCTS_PER_REQUEST = parseInt(
  process.env.MAX_DUMMY_PRODUCTS_PER_REQUEST || '500',
  10
);

export const MAX_DUMMY_SHOPS_PER_REQUEST = parseInt(
  process.env.MAX_DUMMY_SHOPS_PER_REQUEST || '100',
  10
);

export const CATEGORY_MAP: Record<
  string,
  { name: string; slug: string; id: string; randomApiCategory: string }
> = {
  Electronics: {
    name: 'Electronics',
    slug: 'electronics',
    id: '9ffc65df-5afe-4341-bed9-406ad725aad3',
    randomApiCategory: 'electronics',
  },
  'Fashion & Apparel': {
    name: 'Fashion & Apparel',
    slug: 'fashion',
    id: 'bf9d4b5c-299f-43d6-85f5-1b0f1f90d051',
    randomApiCategory: 'clothing',
  },
  'Home & Kitchen': {
    name: 'Home & Kitchen',
    slug: 'home-kitchen',
    id: '5b318d22-09ad-492b-8a23-96860fab8b0a',
    randomApiCategory: 'home',
  },
  'Groceries & Gourmet': {
    name: 'Groceries & Gourmet',
    slug: 'groceries',
    id: 'eafeef0e-64c7-41d8-9383-12d827dac696',
    randomApiCategory: 'food',
  },
  'Health & Beauty': {
    name: 'Health & Beauty',
    slug: 'beauty',
    id: '884de381-1dd9-4959-8b50-64a9eb60ec5d',
    randomApiCategory: 'beauty',
  },
  'Sports & Outdoors': {
    name: 'Sports & Outdoors',
    slug: 'sports',
    id: '8e8fdedb-3988-45b7-88d9-296b7ba3fc68',
    randomApiCategory: 'sports',
  },
};

const INDIAN_CITIES = [
  { city: 'Mumbai', state: 'Maharashtra', postal: '400001', lat: 18.922, lng: 72.8347 },
  { city: 'Bengaluru', state: 'Karnataka', postal: '560001', lat: 12.9716, lng: 77.5946 },
  { city: 'New Delhi', state: 'Delhi', postal: '110001', lat: 28.6139, lng: 77.209 },
  { city: 'Hyderabad', state: 'Telangana', postal: '500001', lat: 17.385, lng: 78.4867 },
  { city: 'Chennai', state: 'Tamil Nadu', postal: '600001', lat: 13.0827, lng: 80.2707 },
  { city: 'Kolkata', state: 'West Bengal', postal: '700001', lat: 22.5726, lng: 88.3639 },
  { city: 'Pune', state: 'Maharashtra', postal: '411001', lat: 18.5204, lng: 73.8567 },
  { city: 'Ahmedabad', state: 'Gujarat', postal: '380001', lat: 23.0225, lng: 72.5714 },
  { city: 'Jaipur', state: 'Rajasthan', postal: '302001', lat: 26.9124, lng: 75.7873 },
  { city: 'Kochi', state: 'Kerala', postal: '682001', lat: 9.9312, lng: 76.2673 },
];

const CONDITIONS = ['New', 'Renewed', 'Used'] as const;

/**
 * Fetch mock data from randomapi.dev with User-Agent header, unwrap, and timeout handling.
 */
export async function fetchRandomApi<T>(
  endpoint: string,
  params: Record<string, string | number>,
  timeoutMs = 6000
): Promise<T[]> {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    query.set(k, String(v));
  }
  query.set('unwrap', 'true');

  const url = `https://randomapi.dev/api/${endpoint}?${query.toString()}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'ShopSphere-App/1.0 (Mozilla/5.0)',
        Accept: 'application/json',
      },
      signal: controller.signal,
      next: { revalidate: 0 },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[randomapi] Endpoint /api/${endpoint} returned ${res.status}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? (data as T[]) : [];
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[randomapi] Failed to fetch /api/${endpoint}:`, message);
    return [];
  }
}

/**
 * Generate products for a specific shop / seller
 * Transparently chunks requests to RandomAPI up to MAX_DUMMY_PRODUCTS_PER_REQUEST,
 * resolves product images through ImageResolver, deduplicates against existing records,
 * and bulk inserts into database in safe chunks.
 */
export async function populateProductsForShop({
  shopId,
  sellerId,
  count = 10,
  approvalStatus = 'pending',
  preferredCondition,
  stockRange = [10, 100],
  categoryName,
  seed,
  imageResolver,
}: {
  shopId: string;
  sellerId: string;
  count?: number;
  approvalStatus?: 'pending' | 'approved';
  preferredCondition?: 'New' | 'Renewed' | 'Used';
  stockRange?: [number, number];
  categoryName?: string;
  seed?: number;
  imageResolver?: ImageResolver;
}): Promise<ProductGenerationSummary> {
  const adminClient = createAdminClient();
  const cappedCount = Math.min(MAX_DUMMY_PRODUCTS_PER_REQUEST, Math.max(1, count));
  const resolver = imageResolver || new ImageResolver();

  // 1. Fetch existing products for this seller to guarantee uniqueness
  // Rule: Same seller + same title + same condition is NOT allowed.
  const { data: existingRows } = await adminClient
    .from('products')
    .select('title, condition')
    .eq('seller_id', sellerId);

  const existingCombos = new Set<string>();
  for (const row of existingRows ?? []) {
    existingCombos.add(`${row.title.toLowerCase().trim()}::${row.condition}`);
  }

  // 2. Resolve category taxonomy mapping
  let targetCategory = categoryName ? CATEGORY_MAP[categoryName] : undefined;
  if (!targetCategory) {
    const catKeys = Object.keys(CATEGORY_MAP);
    const randomKey = catKeys[Math.floor(Math.random() * catKeys.length)];
    targetCategory = CATEGORY_MAP[randomKey];
  }

  // 3. Transparently chunk requests to RandomAPI (upstream limit is 100 per call)
  // Derive deterministic chunk seeds from a generation seed
  const generationSeed = seed ?? Math.floor(Math.random() * 10000000);
  const candidates: RandomApiProduct[] = [];
  const neededCandidates = Math.ceil(cappedCount * 1.35); // 35% buffer for duplicates
  const neededChunks = Math.ceil(neededCandidates / 100);

  for (let chunkIdx = 0; chunkIdx < neededChunks; chunkIdx++) {
    const chunkSeed = generationSeed + chunkIdx * 37;
    const chunkSize = Math.min(100, neededCandidates - candidates.length);
    if (chunkSize <= 0) break;

    const batchItems = await fetchRandomApi<RandomApiProduct>('products', {
      count: chunkSize,
      category: targetCategory.randomApiCategory,
      currency: 'INR',
      minPrice: 199,
      maxPrice: 65000,
      seed: chunkSeed,
    });

    candidates.push(...batchItems);
  }

  // Fallback candidate generation if RandomAPI was unavailable
  if (candidates.length === 0) {
    for (let i = 1; i <= cappedCount; i++) {
      candidates.push({
        name: `${targetCategory.name} Item #${(generationSeed % 1000) + i}`,
        description: `Premium grade ${targetCategory.name} merchandise offering stellar durability and reliable performance.`,
        category: targetCategory.randomApiCategory,
        price: Math.floor(Math.random() * 5000) + 499,
        currency: 'INR',
        sku: `SKU-${(generationSeed % 1000) + i}`,
        ean13: `890${Math.floor(Math.random() * 10000000000)}`,
        rating: +(3.5 + Math.random() * 1.5).toFixed(1),
        inStock: true,
        imageUrl: '', // Deliberately empty so fallback resolver triggers
      });
    }
  }

  const toInsert: Array<{
    seller_id: string;
    shop_id: string;
    category_id: string;
    title: string;
    slug: string;
    description: string;
    price: number;
    compare_at_price: number;
    stock: number;
    condition: string;
    category: string;
    tags: string[];
    image_urls: string[];
    attributes: Record<string, string>;
    approval_status: 'pending' | 'approved';
    average_rating: number;
    review_count: number;
    ai_categorized: boolean;
  }> = [];

  let skippedCount = 0;
  let imagesFromRandomApi = 0;
  let imagesFromPexels = 0;
  let placeholderImages = 0;
  let imageFailures = 0;

  for (let i = 0; i < candidates.length; i++) {
    if (toInsert.length >= cappedCount) break;

    const item = candidates[i];
    const condition =
      preferredCondition || CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)];
    const comboKey = `${item.name.toLowerCase().trim()}::${condition}`;

    // Deduplication check:
    if (existingCombos.has(comboKey)) {
      skippedCount++;
      continue;
    }
    existingCombos.add(comboKey);

    // 4. Resolve Image URL through modular pipeline:
    // Priority: RandomAPI imageUrl -> Pexels fallback -> Placeholder fallback -> None
    const resolvedImage = await resolver.resolveProductImage({
      candidateImageUrl: item.imageUrl,
      category: targetCategory.name,
      productTitle: item.name,
      productIndex: toInsert.length,
    });

    if (resolvedImage.imageSource === 'randomapi') {
      imagesFromRandomApi++;
    } else if (resolvedImage.imageSource === 'pexels') {
      imagesFromPexels++;
    } else if (resolvedImage.imageSource === 'placeholder') {
      placeholderImages++;
    } else {
      imageFailures++;
    }

    const price = Math.round(item.price);
    const compareAtPrice = Math.round(price * (1.1 + Math.random() * 0.25));
    const minStock = stockRange[0] ?? 10;
    const maxStock = stockRange[1] ?? 100;
    const stock = Math.floor(Math.random() * (maxStock - minStock + 1)) + minStock;
    const rating = Math.min(5.0, Math.max(1.0, +(item.rating || 4.2).toFixed(2)));
    const reviewCount = Math.floor(Math.random() * 180) + 10;

    const slugBase = item.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const uniqueSlug = `${slugBase}-${condition.toLowerCase()}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const finalImageUrls = resolvedImage.imageUrl ? [resolvedImage.imageUrl] : [];

    toInsert.push({
      seller_id: sellerId,
      shop_id: shopId,
      category_id: targetCategory.id,
      title: item.name,
      slug: uniqueSlug,
      description:
        item.description ||
        `Authentic ${targetCategory.name} product offering stellar durability and reliable performance.`,
      price,
      compare_at_price: compareAtPrice,
      stock,
      condition,
      category: targetCategory.name,
      tags: [
        targetCategory.slug,
        condition.toLowerCase(),
        'marketplace',
        item.sku.toLowerCase(),
      ],
      image_urls: finalImageUrls,
      attributes: {
        Brand: 'ShopSphere Curated',
        SKU: item.sku,
        Condition: condition,
        EAN: item.ean13,
        image_source: resolvedImage.imageSource,
        primary_image_url: resolvedImage.imageUrl || '',
      },
      approval_status: approvalStatus,
      average_rating: rating,
      review_count: reviewCount,
      ai_categorized: false,
    });
  }

  // 5. Insert into Supabase in chunks of 100 to avoid payload size constraints
  if (toInsert.length > 0) {
    const chunkSize = 100;
    for (let c = 0; c < toInsert.length; c += chunkSize) {
      const chunk = toInsert.slice(c, c + chunkSize);
      const { error: insertError } = await adminClient.from('products').insert(chunk);
      if (insertError) {
        throw new Error(`Failed to insert products chunk: ${insertError.message}`);
      }
    }
  }

  return {
    requested: cappedCount,
    generated: toInsert.length,
    inserted: toInsert.length,
    skippedDuplicates: skippedCount,
    approvalStatus,
    imagesFromRandomApi,
    imagesFromPexels,
    placeholderImages,
    imageFailures,
  };
}

/**
 * Super Admin: Create one or more new fake shops along with merchant seller profiles
 * Transparently chunks requests to RandomAPI up to MAX_DUMMY_SHOPS_PER_REQUEST.
 */
export async function populateFakeShops({
  count = 1,
  productsPerShop = 0,
  seed,
}: {
  count?: number;
  productsPerShop?: number;
  seed?: number;
}) {
  const adminClient = createAdminClient();
  const cappedCount = Math.min(MAX_DUMMY_SHOPS_PER_REQUEST, Math.max(1, count));
  const baseSeed = seed ?? Math.floor(Math.random() * 1000000);

  const companies: RandomApiCompany[] = [];
  const users: RandomApiUser[] = [];

  // Upstream RandomAPI supports up to 50 records per companies/users endpoint
  const neededBatches = Math.ceil(cappedCount / 50);
  for (let b = 0; b < neededBatches; b++) {
    const batchSize = Math.min(50, cappedCount - companies.length);
    if (batchSize <= 0) break;

    const compBatch = await fetchRandomApi<RandomApiCompany>('companies', {
      count: batchSize,
      seed: baseSeed + b * 13,
    });
    companies.push(...compBatch);

    const userBatch = await fetchRandomApi<RandomApiUser>('users', {
      count: batchSize,
      seed: baseSeed + b * 17,
    });
    users.push(...userBatch);
  }

  const createdShops: Array<{ id: string; name: string; seller_id: string }> = [];

  for (let i = 0; i < cappedCount; i++) {
    const company = companies[i] || {
      name: `Apex Retail Group #${i + 1}`,
      catchphrase: 'Quality goods for everyday living',
    };
    const user = users[i] || {
      fullName: `Merchant Owner ${i + 1}`,
      email: `merchant_${Date.now()}_${i}@example.com`,
    };

    const email = `seller_${Date.now()}_${i}@shopsphere-partner.com`;
    const password = 'Password@1234!';

    // 1. Create auth user with seller role
    const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'seller',
        full_name: user.fullName || 'Merchant Partner',
      },
    });

    if (authErr || !authData.user) {
      console.error('[populateFakeShops] Auth user error:', authErr);
      continue;
    }

    const sellerId = authData.user.id;

    // Ensure users table profile row exists
    await adminClient.from('users').upsert({
      id: sellerId,
      email,
      full_name: user.fullName,
      role: 'seller',
      is_active: true,
    });

    // 2. Assign Indian city & geographic coordinates
    const location = INDIAN_CITIES[Math.floor(Math.random() * INDIAN_CITIES.length)];
    const shopSlug = `${company.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}-${i + 1}`;

    const { data: shop, error: shopErr } = await adminClient
      .from('shops')
      .insert({
        seller_id: sellerId,
        name: company.name,
        slug: shopSlug,
        description: company.catchphrase || 'Premier retail partner on ShopSphere Marketplace.',
        address_line: `Plot #${Math.floor(Math.random() * 200) + 1}, Commercial Hub`,
        city: location.city,
        state: location.state,
        postal_code: location.postal,
        latitude: location.lat,
        longitude: location.lng,
        logo_url: user.avatarUrl || null,
        is_verified: true, // Admin-created fake shops are verified
        rating: 4.8,
        allows_bopis: true,
      })
      .select('id, name, seller_id')
      .single();

    if (shopErr || !shop) {
      console.error('[populateFakeShops] Shop insert error:', shopErr);
      continue;
    }

    createdShops.push(shop);

    // If initial products requested for this shop, populate them as approved
    if (productsPerShop > 0) {
      await populateProductsForShop({
        shopId: shop.id,
        sellerId,
        count: productsPerShop,
        approvalStatus: 'approved',
      });
    }
  }

  return {
    shopsCreated: createdShops.length,
    shops: createdShops,
  };
}
