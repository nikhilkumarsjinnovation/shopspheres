/**
 * ShopSphere Database Seed Script
 * Loads 12 distinct Indian marketplace sellers with verified storefronts
 * and 300 rich catalog products distributed across 6 departments.
 *
 * Usage:
 *   node scripts/seed_products.mjs
 *   or: npm run seed
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load environment variables from .env.local if not already in process.env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment or .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log('========================================================================');
  console.log('🛍️  ShopSphere Marketplace — Catalog & Seller Seeder');
  console.log('========================================================================\n');

  // Load JSON datasets
  const sellersDataPath = path.join(__dirname, 'data', 'seed-sellers.json');
  const productsDataPath = path.join(__dirname, 'data', 'seed-products.json');

  if (!fs.existsSync(sellersDataPath) || !fs.existsSync(productsDataPath)) {
    console.error('❌ Data files not found in scripts/data/. Ensure seed-sellers.json and seed-products.json exist.');
    process.exit(1);
  }

  const sellers = JSON.parse(fs.readFileSync(sellersDataPath, 'utf8'));
  const products = JSON.parse(fs.readFileSync(productsDataPath, 'utf8'));

  console.log(`📦 Loaded ${sellers.length} sellers to seed (Limit: max 20).`);
  console.log(`📦 Loaded ${products.length} products to seed (Target: ~300).\n`);

  // Step 1: Ensure core categories exist and build category mapping
  console.log('🗂️  Step 1: Mapping categories...');
  const { data: dbCategories, error: catError } = await supabase
    .from('categories')
    .select('id, name, slug');

  if (catError) {
    console.error('❌ Failed to fetch categories:', catError.message);
    process.exit(1);
  }

  const categoryMap = new Map();
  for (const c of dbCategories || []) {
    categoryMap.set(c.name, c.id);
  }

  // Define default categories if missing
  const defaultCategories = [
    { name: 'Electronics', slug: 'electronics', description: 'Smartphones, computing, audio, and personal digital tech.' },
    { name: 'Fashion & Apparel', slug: 'fashion', description: 'Traditional ethnic wear, casual streetwear, and accessories.' },
    { name: 'Home & Kitchen', slug: 'home-kitchen', description: 'Culinary cookware, appliances, home decor, and bedding.' },
    { name: 'Groceries & Gourmet', slug: 'groceries', description: 'Organic spices, artisanal tea, coffees, dry fruits, and sweets.' },
    { name: 'Health & Beauty', slug: 'beauty', description: 'Ayurvedic wellness, skincare, luxury fragrances, and grooming.' },
    { name: 'Sports & Outdoors', slug: 'sports', description: 'Fitness gear, outdoor expedition, board games, and kids toys.' },
  ];

  for (const def of defaultCategories) {
    if (!categoryMap.has(def.name)) {
      const { data: createdCat, error: createCatErr } = await supabase
        .from('categories')
        .insert({
          name: def.name,
          slug: def.slug,
          description: def.description,
        })
        .select('id, name')
        .single();

      if (!createCatErr && createdCat) {
        categoryMap.set(createdCat.name, createdCat.id);
        console.log(`   + Created category "${createdCat.name}"`);
      }
    }
  }

  console.log(`   ✓ ${categoryMap.size} categories active and mapped.\n`);

  // Step 2: Seed sellers in Supabase Auth, public.users, and public.shops
  console.log('👤 Step 2: Seeding sellers and storefronts in Supabase Auth & DB...');

  // Fetch existing auth users to avoid duplicates
  const { data: authUsersData, error: listUsersErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listUsersErr) {
    console.error('❌ Failed to list auth users:', listUsersErr.message);
    process.exit(1);
  }

  const existingAuthMap = new Map();
  for (const u of authUsersData?.users || []) {
    if (u.email) {
      existingAuthMap.set(u.email.toLowerCase(), u.id);
    }
  }

  const sellerKeyMap = new Map();
  const sellerCredentialsList = [];

  for (const seller of sellers) {
    const emailNorm = seller.email.toLowerCase();
    let userId = existingAuthMap.get(emailNorm);

    if (!userId) {
      // Create new user in auth.users
      const { data: newAuth, error: createAuthErr } = await supabase.auth.admin.createUser({
        email: seller.email,
        password: seller.password,
        email_confirm: true,
        user_metadata: {
          role: 'seller',
          full_name: seller.full_name,
        },
      });

      if (createAuthErr || !newAuth.user) {
        console.error(`❌ Failed to create auth user for ${seller.email}:`, createAuthErr?.message);
        continue;
      }
      userId = newAuth.user.id;
    } else {
      // Update existing user password and confirmed status
      await supabase.auth.admin.updateUserById(userId, {
        password: seller.password,
        email_confirm: true,
        user_metadata: {
          role: 'seller',
          full_name: seller.full_name,
        },
      });
    }

    // Upsert into public.users
    const { error: userUpsertErr } = await supabase.from('users').upsert({
      id: userId,
      email: seller.email,
      full_name: seller.full_name,
      role: 'seller',
      is_active: true,
      updated_at: new Date().toISOString(),
    });

    if (userUpsertErr) {
      console.warn(`   ⚠️ Warning upserting user ${seller.email}:`, userUpsertErr.message);
    }

    // Check existing shop for this seller
    const { data: existingShop } = await supabase
      .from('shops')
      .select('id')
      .eq('seller_id', userId)
      .maybeSingle();

    let shopId = existingShop?.id;

    if (!shopId) {
      const { data: createdShop, error: shopErr } = await supabase
        .from('shops')
        .insert({
          seller_id: userId,
          name: seller.shop.name,
          slug: seller.shop.slug,
          description: seller.shop.description,
          address_line: seller.shop.address_line,
          city: seller.shop.city,
          state: seller.shop.state,
          postal_code: seller.shop.postal_code,
          latitude: seller.shop.latitude,
          longitude: seller.shop.longitude,
          rating: seller.shop.rating,
          is_verified: seller.shop.is_verified,
          pickup_radius_km: 30.0,
          allows_bopis: true,
        })
        .select('id')
        .single();

      if (shopErr || !createdShop) {
        console.error(`❌ Failed to create shop for ${seller.shop.name}:`, shopErr?.message);
        continue;
      }
      shopId = createdShop.id;
    } else {
      // Update shop details
      await supabase
        .from('shops')
        .update({
          name: seller.shop.name,
          description: seller.shop.description,
          address_line: seller.shop.address_line,
          city: seller.shop.city,
          state: seller.shop.state,
          postal_code: seller.shop.postal_code,
          latitude: seller.shop.latitude,
          longitude: seller.shop.longitude,
          rating: seller.shop.rating,
          is_verified: seller.shop.is_verified,
        })
        .eq('id', shopId);
    }

    sellerKeyMap.set(seller.seller_key, {
      userId,
      shopId,
      email: seller.email,
      password: seller.password,
      fullName: seller.full_name,
      shopName: seller.shop.name,
      city: seller.shop.city,
    });

    sellerCredentialsList.push({
      sellerKey: seller.seller_key,
      name: seller.full_name,
      email: seller.email,
      password: seller.password,
      shopName: seller.shop.name,
      city: seller.shop.city,
    });

    console.log(`   ✓ [${seller.full_name}] -> Shop: "${seller.shop.name}" in ${seller.shop.city}`);
  }

  console.log(`\n   ✓ All ${sellerKeyMap.size} sellers ready with live storefronts.\n`);

  // Step 3: Insert products in batches
  console.log('🛒 Step 3: Seeding 300 marketplace products...');

  const batchSize = 50;
  let totalInserted = 0;

  for (let i = 0; i < products.length; i += batchSize) {
    const rawBatch = products.slice(i, i + batchSize);
    const preparedBatch = [];

    for (const p of rawBatch) {
      const sellerInfo = sellerKeyMap.get(p.seller_key);
      if (!sellerInfo) {
        console.warn(`   ⚠️ Missing seller for key: ${p.seller_key}`);
        continue;
      }

      const catId = categoryMap.get(p.category) || null;

      preparedBatch.push({
        title: p.title,
        slug: p.slug,
        description: p.description,
        price: p.price,
        compare_at_price: p.compare_at_price,
        stock: p.stock,
        condition: p.condition || 'New',
        category: p.category,
        category_id: catId,
        sub_category: p.sub_category || null,
        seller_id: sellerInfo.userId,
        shop_id: sellerInfo.shopId,
        tags: p.tags || [],
        attributes: p.attributes || {},
        image_urls: p.image_urls || [],
        approval_status: p.approval_status || 'approved',
        average_rating: p.average_rating || 4.5,
        review_count: p.review_count || 100,
        ai_categorized: false,
        resubmit_count: 0,
      });
    }

    if (preparedBatch.length > 0) {
      const { data: insertedData, error: insertErr } = await supabase
        .from('products')
        .upsert(preparedBatch, { onConflict: 'slug' })
        .select('id');

      if (insertErr) {
        console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, insertErr.message);
      } else {
        totalInserted += (insertedData?.length || preparedBatch.length);
        console.log(`   ✓ Batch ${Math.floor(i / batchSize) + 1}: processed ${preparedBatch.length} products (Total so far: ${totalInserted})`);
      }
    }
  }

  console.log(`\n🎉 Successfully seeded ${totalInserted} products!\n`);

  // Step 4: Seed sample customer reviews for top products
  console.log('⭐ Step 4: Adding verified customer reviews to top items...');
  const { data: sampleProducts } = await supabase
    .from('products')
    .select('id, title, seller_id')
    .eq('approval_status', 'approved')
    .limit(10);

  if (sampleProducts && sampleProducts.length > 0) {
    // Pick first seller as reviewer for cross-store reviews
    const reviewerId = sampleProducts[0].seller_id;
    const reviewsToInsert = [];

    for (let idx = 1; idx < sampleProducts.length; idx++) {
      const sp = sampleProducts[idx];
      reviewsToInsert.push({
        product_id: sp.id,
        customer_id: reviewerId,
        rating: 5,
        title: 'Authentic product & lightning-fast delivery!',
        body: 'Received in pristine packaging within 24 hours. Exact match to the technical specifications and build quality is exceptional. Highly recommend this seller!',
        is_verified_purchase: true,
        helpful_votes: 18 + (idx * 3),
      });
    }

    const { error: reviewErr } = await supabase
      .from('product_reviews')
      .upsert(reviewsToInsert, { onConflict: 'product_id,customer_id' });

    if (!reviewErr) {
      console.log(`   ✓ Added sample verified reviews for ${reviewsToInsert.length} products.`);
    }
  }

  // Print final summary and credentials table
  console.log('\n========================================================================');
  console.log('✅ SEEDING COMPLETE — SELLER LOGIN CREDENTIALS');
  console.log('========================================================================\n');
  console.log('All sellers below can log in at: /login');
  console.log('Their dashboards (/seller/dashboard) are initialized with active mini-shops.\n');

  console.table(
    sellerCredentialsList.map((s, idx) => ({
      '#': idx + 1,
      'Seller Name': s.name,
      'Email (Login)': s.email,
      'Password': s.password,
      'Storefront Name': s.shopName,
      'City': s.city,
      'Products': 25,
    }))
  );

  console.log('\n========================================================================');
  console.log('👉 Next Steps:');
  console.log('  1. Navigate to http://localhost:3000/login');
  console.log('  2. Log in using any of the seller credentials above.');
  console.log('  3. Visit /shops to view all 12 live verified storefronts across India.');
  console.log('  4. Visit /explore to browse all 300 products with dynamic category filters.');
  console.log('========================================================================\n');
}

main().catch((err) => {
  console.error('Fatal error during seed execution:', err);
  process.exit(1);
});
