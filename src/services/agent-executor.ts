import { createAdminClient } from '@/lib/supabase/admin';
import { getWallet, topupWallet, debitWallet, refundWallet } from '@/services/wallet-service';
import { getFavorites, addFavorite, removeFavorite } from '@/services/favorites-service';
import { createOrder, calculateTotals } from '@/services/order-service';
import { createGift } from '@/services/gift-service';
import { getCart } from '@/services/cart-service';
import {
  getWalletEligibleOffers,
  calculateWalletCouponDiscount,
  AppliedOfferInfo,
  WalletAvailableOffer,
} from '@/lib/offer-eligibility';

function normalizeCategory(input?: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const c = input.trim().toLowerCase();
  if (c === 'all') return null;
  if (c.includes('elect') || c.includes('phone') || c.includes('mobile') || c.includes('gadget') || c.includes('laptop') || c.includes('tech')) {
    return 'Electronics';
  }
  if (c.includes('audio') || c.includes('earbud') || c.includes('headphone') || c.includes('speaker') || c.includes('sound')) {
    return 'Audio & Accessories';
  }
  if (c.includes('cloth') || c.includes('fashion') || c.includes('apparel') || c.includes('shirt') || c.includes('kurta') || c.includes('wear') || c.includes('dress') || c.includes('saree')) {
    return 'Fashion & Apparel';
  }
  if (c.includes('kitchen') || c.includes('home') || c.includes('cooker') || c.includes('mixer') || c.includes('appliance') || c.includes('jar')) {
    return 'Home & Kitchen';
  }
  if (c.includes('beauty') || c.includes('health') || c.includes('wash') || c.includes('cream') || c.includes('soap') || c.includes('skin') || c.includes('makeup')) {
    return 'Health & Beauty';
  }
  if (c.includes('gourmet') || c.includes('grocer') || c.includes('food') || c.includes('snack') || c.includes('chocolate') || c.includes('sweet') || c.includes('tea') || c.includes('coffee')) {
    return 'Gourmet & Groceries';
  }
  if (c.includes('sport') || c.includes('fitness') || c.includes('exercis') || c.includes('gym') || c.includes('badminton')) {
    return 'Sports & Outdoors';
  }
  return input;
}

function stemWord(word: string): string {
  const w = word.toLowerCase().trim();
  if (w.endsWith('watches')) return w.slice(0, -2);
  if (w.endsWith('smartwatches')) return w.slice(0, -2);
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
  if (w.endsWith('es') && w.length > 4) return w.slice(0, -2);
  return w;
}

function isValidUuid(id: unknown): boolean {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

async function resolveProduct(productIdOrTitle?: string, fallbackTitle?: string) {
  const adminDb = createAdminClient();
  const idCandidate = productIdOrTitle ? String(productIdOrTitle).trim() : '';
  const titleCandidate = fallbackTitle ? String(fallbackTitle).trim() : (!isValidUuid(idCandidate) ? idCandidate : '');

  if (isValidUuid(idCandidate)) {
    const { data } = await adminDb
      .from('products')
      .select('id, title, description, price, compare_at_price, category, sub_category, tags, image_urls, stock, average_rating, attributes, seller_id')
      .eq('id', idCandidate)
      .maybeSingle();
    if (data) return data;
  }

  if (titleCandidate) {
    // 1. Partial title match
    const { data: prods } = await adminDb
      .from('products')
      .select('id, title, description, price, compare_at_price, category, sub_category, tags, image_urls, stock, average_rating, attributes, seller_id')
      .ilike('title', `%${titleCandidate}%`)
      .eq('approval_status', 'approved')
      .limit(3);
    if (prods && prods.length > 0) return prods[0];

    // 2. Token match
    const tokens = titleCandidate.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    if (tokens.length > 0) {
      let q = adminDb
        .from('products')
        .select('id, title, description, price, compare_at_price, category, sub_category, tags, image_urls, stock, average_rating, attributes, seller_id')
        .eq('approval_status', 'approved');
      for (const t of tokens.slice(0, 2)) {
        q = q.ilike('title', `%${t}%`);
      }
      const { data: tokenProds } = await q.limit(1);
      if (tokenProds && tokenProds.length > 0) return tokenProds[0];
    }
  }

  return null;
}

export interface AgentExecutionResult {
  toolName: string;
  output: any;
  clientActions?: Array<{
    type: 'CART_SYNC' | 'FAVORITES_SYNC' | 'WALLET_SYNC' | 'CART_CLEAR';
    payload: any;
  }>;
  actionCard?: {
    type: 'PRODUCT_CAROUSEL' | 'WALLET_CARD' | 'WALLET_PAY_AUTH' | 'WALLET_TOPUP_PROMPT' | 'WALLET_TOPUP_SUCCESS' | 'GIFT_CARD' | 'ORDER_CONFIRMED' | 'REVIEWABLE_LIST' | 'ORDER_CANCELLED';
    data: any;
  };
}

export async function executeAgentTool(
  toolName: string,
  args: Record<string, any>,
  userId: string | null
): Promise<AgentExecutionResult> {
  const adminDb = createAdminClient();

  switch (toolName) {
    // -------------------------------------------------------------
    // 1. Search Catalog
    // -------------------------------------------------------------
    case 'search_catalog': {
      const { query = '', category, min_price, max_price, in_stock_only } = args;

      // 1. Normalize category ONLY if explicitly provided
      const normCat = normalizeCategory(category);

      // 2. Parse Keywords & Strip Stop Words
      const stopWords = new Set([
        'product', 'products', 'item', 'items', 'show', 'me', 'under', 'cheap', 'best',
        'good', 'from', 'category', 'in', 'the', 'for', 'buy', 'need', 'want', 'please',
        'any', 'find', 'get', 'give', 'below', 'less', 'than', 'price', 'budget', 'with', 'and',
        'about', 'asked', 'you', 'some', 'randome', 'random', 'stuff', 'can', 'this', 'that',
        'decent', 'a', 'an', 'to', 'of', 'i', 'my', 'would', 'like', 'there', 'is', 'are', 'purchase'
      ]);

      const rawWords = (query || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .map((w: string) => w.trim())
        .filter((w: string) => w.length > 2 && !stopWords.has(w));

      const stemmedWords = rawWords.map(stemWord).filter((w: string) => w.length > 2 && !stopWords.has(w));
      const searchTerms = Array.from(new Set([...rawWords, ...stemmedWords]));

      // 3. Helper to query products with or without category filter
      const executeQuery = async (targetCategory: string | null) => {
        const buildBase = () => {
          let b = adminDb
            .from('products')
            .select('id, title, description, price, compare_at_price, category, sub_category, tags, image_urls, stock, average_rating, attributes')
            .eq('approval_status', 'approved');

          if (targetCategory) {
            b = b.ilike('category', `%${targetCategory}%`);
          }
          if (min_price && !isNaN(Number(min_price))) {
            b = b.gte('price', Number(min_price));
          }
          if (max_price && !isNaN(Number(max_price))) {
            b = b.lte('price', Number(max_price));
          }
          if (in_stock_only) {
            b = b.gt('stock', 0);
          }
          return b;
        };

        if (searchTerms.length === 0) {
          const { data } = await buildBase().order('average_rating', { ascending: false }).limit(6);
          return data || [];
        }

        // Phase 1: High-relevance query matching Title or Subcategory
        const titleClauses = searchTerms.map((t) => `title.ilike.%${t}%,sub_category.ilike.%${t}%`).join(',');
        const { data: titleData } = await buildBase().or(titleClauses).limit(25);
        let candidates: any[] = titleData || [];

        // Phase 2: If title matches are fewer than 6, supplement with description matches
        if (candidates.length < 6) {
          const descClauses = searchTerms.slice(0, 3).map((t) => `description.ilike.%${t}%`).join(',');
          const { data: descData } = await buildBase().or(descClauses).limit(20);
          if (descData && descData.length > 0) {
            const seen = new Set(candidates.map((p) => p.id));
            for (const dp of descData) {
              if (!seen.has(dp.id)) {
                candidates.push(dp);
                seen.add(dp.id);
              }
            }
          }
        }

        if (candidates.length === 0) return [];

        // Smart relevance scoring:
        // Direct title match = +15 per matched term
        // Direct sub_category match = +20 per matched term
        // Tag match = +5
        // Description match = +1
        const scored = candidates.map((p) => {
          let score = 0;
          const t = (p.title || '').toLowerCase();
          const sc = (p.sub_category || '').toLowerCase();
          const d = (p.description || '').toLowerCase();
          const tags = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : '';

          for (const term of searchTerms) {
            if (t.includes(term)) score += 20;
            if (sc.includes(term)) score += 15;
            if (tags.includes(term)) score += 5;
            if (d.includes(term)) score += 1;
          }

          // Bonus for higher rating
          score += (Number(p.average_rating) || 0) * 0.5;
          return { product: p, score };
        });

        // Filter out low-relevance noise if strong matches exist
        const hasStrongMatches = scored.some((s) => s.score >= 15);
        const filtered = hasStrongMatches ? scored.filter((s) => s.score >= 10) : scored;

        filtered.sort((a, b) => b.score - a.score);
        return filtered.map((s) => s.product).slice(0, 6);
      };

      let matchedProducts: any[] = await executeQuery(normCat);

      // If category was specified but yielded 0 results and we have specific search terms (like 'watch'),
      // try cross-category search because some items belong to multiple departments (e.g. smartwatches vs analog watches)
      if (matchedProducts.length === 0 && normCat && searchTerms.length > 0) {
        const crossCat = await executeQuery(null);
        if (crossCat.length > 0) {
          matchedProducts = crossCat;
        }
      }

      // If no search keywords were provided, fetch top products strictly in that category
      if (matchedProducts.length === 0 && searchTerms.length === 0 && normCat) {
        let catQ = adminDb
          .from('products')
          .select('id, title, description, price, compare_at_price, category, sub_category, tags, image_urls, stock, average_rating, attributes')
          .eq('approval_status', 'approved')
          .ilike('category', `%${normCat}%`);
        if (min_price && !isNaN(Number(min_price))) catQ = catQ.gte('price', Number(min_price));
        if (max_price && !isNaN(Number(max_price))) catQ = catQ.lte('price', Number(max_price));
        const { data: topCat } = await catQ.order('average_rating', { ascending: false }).limit(6);
        if (topCat && topCat.length > 0) {
          matchedProducts = topCat;
        }
      }

      // If still 0 products found: DO NOT dump random category products! Return honest 0 count.
      if (matchedProducts.length === 0) {
        let hintMessage = `No products found`;
        if (query) hintMessage += ` matching "${query}"`;
        if (normCat) hintMessage += ` in ${normCat}`;
        if (max_price) hintMessage += ` under ₹${Number(max_price).toLocaleString('en-IN')}`;
        hintMessage += `. Would you like to adjust your price filter or search for something else?`;

        return {
          toolName,
          output: {
            count: 0,
            products: [],
            message: hintMessage,
            appliedCategory: normCat || 'All',
            appliedMaxPrice: max_price || null,
          },
        };
      }

      return {
        toolName,
        output: {
          count: matchedProducts.length,
          categoryFilter: normCat || 'All',
          maxPriceFilter: max_price || null,
          products: matchedProducts.map((p) => ({
            id: p.id,
            title: p.title,
            price: p.price,
            category: p.category,
            stock: p.stock,
            rating: p.average_rating,
          })),
        },
        actionCard: {
          type: 'PRODUCT_CAROUSEL',
          data: { products: matchedProducts },
        },
      };
    }

    // -------------------------------------------------------------
    // 2. Product Specs
    // -------------------------------------------------------------
    case 'get_product_specs': {
      const { product_id } = args;
      const product = await resolveProduct(product_id);

      if (!product) {
        return { toolName, output: { error: 'Product not found.' } };
      }

      const { data: variants } = await adminDb
        .from('product_variants')
        .select('id, sku, title, price, stock, attributes')
        .eq('product_id', product.id);

      return {
        toolName,
        output: {
          id: product.id,
          title: product.title,
          price: product.price,
          stock: product.stock,
          rating: product.average_rating,
          attributes: product.attributes || {},
          variants: variants || [],
        },
      };
    }

    // -------------------------------------------------------------
    // 3. Manage Cart
    // -------------------------------------------------------------
    case 'manage_cart': {
      const { action, product_id, quantity = 1 } = args;

      if (action === 'clear') {
        return {
          toolName,
          output: { success: true, message: 'Shopping cart cleared.' },
          clientActions: [{ type: 'CART_CLEAR', payload: {} }],
        };
      }

      if (action === 'view') {
        return {
          toolName,
          output: { message: 'Viewing current bag in customer session.' },
        };
      }

      if (!product_id) {
        return { toolName, output: { error: 'product_id or title is required for this action.' } };
      }

      const product = await resolveProduct(product_id);

      if (!product) {
        return { toolName, output: { error: 'Product not found to update cart.' } };
      }

      const cartProductPayload = {
        id: product.id,
        title: product.title,
        price: product.price,
        seller_id: product.seller_id,
        image_url: (product.image_urls && product.image_urls[0]) || null,
        category: product.category,
      };

      if (action === 'add') {
        return {
          toolName,
          output: {
            success: true,
            action: 'add',
            item: product.title,
            quantity: Math.max(1, quantity),
            unitPrice: product.price,
          },
          clientActions: [
            {
              type: 'CART_SYNC',
              payload: {
                action: 'add',
                product: cartProductPayload,
                quantity: Math.max(1, quantity),
              },
            },
          ],
        };
      }

      if (action === 'remove') {
        return {
          toolName,
          output: { success: true, action: 'remove', item: product.title },
          clientActions: [
            {
              type: 'CART_SYNC',
              payload: {
                action: 'remove',
                productId: product.id,
              },
            },
          ],
        };
      }

      return {
        toolName,
        output: { success: true, action: 'update', quantity },
        clientActions: [
          {
            type: 'CART_SYNC',
            payload: {
              action: 'update',
              productId: product.id,
              quantity,
            },
          },
        ],
      };
    }

    // -------------------------------------------------------------
    // 4. Manage Favorites / Wishlist
    // -------------------------------------------------------------
    case 'manage_favorites': {
      if (!userId) return { toolName, output: { error: 'Please log in to manage your favorites.' } };
      const { action, product_id } = args;

      if (action === 'list') {
        const favs = await getFavorites(userId);
        return {
          toolName,
          output: {
            count: favs.length,
            favorites: favs.map((f) => ({
              id: f.product.id,
              title: f.product.title,
              price: f.product.price,
            })),
          },
          actionCard: {
            type: 'PRODUCT_CAROUSEL',
            data: { products: favs.map((f) => f.product) },
          },
        };
      }

      if (!product_id) return { toolName, output: { error: 'product_id or title is required.' } };

      const product = await resolveProduct(product_id);
      if (!product) return { toolName, output: { error: 'Product not found.' } };

      if (action === 'add') {
        await addFavorite(userId, product.id);
        return {
          toolName,
          output: { success: true, isFavorite: true, productTitle: product.title },
          clientActions: [{ type: 'FAVORITES_SYNC', payload: { productId: product.id, isFavorite: true } }],
        };
      }

      if (action === 'remove') {
        await removeFavorite(userId, product.id);
        return {
          toolName,
          output: { success: true, isFavorite: false },
          clientActions: [{ type: 'FAVORITES_SYNC', payload: { productId: product.id, isFavorite: false } }],
        };
      }

      return { toolName, output: { error: 'Invalid favorites action.' } };
    }

    // -------------------------------------------------------------
    // 5. Friends List for Gifting
    // -------------------------------------------------------------
    case 'get_friends_list': {
      if (!userId) return { toolName, output: { error: 'Please log in to view friends.' } };

      const { data: relations } = await adminDb
        .from('friend_relationships')
        .select('friend_id, status')
        .eq('user_id', userId)
        .eq('status', 'accepted');

      const friendIds = (relations || []).map((r) => r.friend_id);

      if (friendIds.length === 0) {
        return {
          toolName,
          output: {
            friends: [],
            message: 'You have not added any friends yet. Add friends from the /friends page to send surprise gifts!',
          },
        };
      }

      const { data: friendUsers } = await adminDb
        .from('users')
        .select('id, full_name, email')
        .in('id', friendIds);

      return {
        toolName,
        output: {
          count: (friendUsers || []).length,
          friends: friendUsers || [],
        },
      };
    }

    // -------------------------------------------------------------
    // 6. Send as Gift
    // -------------------------------------------------------------
    case 'send_as_gift': {
      if (!userId) {
        return { toolName, output: { error: 'Please log in to send a surprise gift.' } };
      }

      const { friend_email_or_name, product_id, product_title, gift_message, reveal_date, coupon_code } = args;

      if (!friend_email_or_name) {
        return { toolName, output: { error: 'Recipient email or friend name is required.' } };
      }

      const product = await resolveProduct(product_id, product_title);

      if (!product) {
        return {
          toolName,
          output: {
            error: `Could not find product "${product_title || product_id || ''}" in catalog for gifting. Please search catalog first.`,
          },
        };
      }

      let recipientEmail: string | null = null;
      let recipientId: string | null = null;

      if (String(friend_email_or_name).includes('@')) {
        recipientEmail = String(friend_email_or_name).trim().toLowerCase();
      } else {
        // Check if user has an accepted friend by this name
        const { data: relations } = await adminDb
          .from('friend_relationships')
          .select('friend_id')
          .eq('user_id', userId)
          .eq('status', 'accepted');

        const friendIds = (relations || []).map((r) => r.friend_id);
        if (friendIds.length > 0) {
          const { data: friendUsers } = await adminDb
            .from('users')
            .select('id, full_name, email')
            .in('id', friendIds);

          const candidate = String(friend_email_or_name).toLowerCase().trim();
          const matched = (friendUsers || []).find(
            (u) => u.full_name?.toLowerCase().includes(candidate) || u.email?.toLowerCase().includes(candidate)
          );
          if (matched) {
            recipientEmail = matched.email?.toLowerCase() || null;
            recipientId = matched.id;
          }
        }
      }

      // If we have an email, resolve recipientId from users table
      if (recipientEmail && !recipientId) {
        const { data: userRec } = await adminDb
          .from('users')
          .select('id')
          .eq('email', recipientEmail)
          .maybeSingle();
        recipientId = userRec?.id || null;
      }

      const subtotal = Number(product.price);
      let appliedOffer: AppliedOfferInfo | null = null;
      let couponError: string | null = null;

      // Handle coupon only if explicitly provided by customer. Agent will NOT auto-apply!
      if (coupon_code) {
        const couponCheck = calculateWalletCouponDiscount(coupon_code, subtotal, true, product.category);
        if (couponCheck.valid) {
          appliedOffer = {
            code: coupon_code.toUpperCase(),
            title: couponCheck.title,
            discountAmount: couponCheck.discountAmount,
          };
        } else {
          couponError = couponCheck.reason || 'Invalid coupon for this gift.';
        }
      }

      // Discovered wallet-compatible offers (non-card, non-UPI) to show customer
      const availableOffers = getWalletEligibleOffers(subtotal, product.category, true);
      const totals = calculateTotals(subtotal, appliedOffer?.discountAmount || 0);
      const orderTotal = totals.total;

      const wallet = await getWallet(userId);
      if (wallet.balance < orderTotal) {
        return {
          toolName,
          output: {
            error: `Insufficient wallet balance to send gift. Required: ₹${orderTotal.toLocaleString('en-IN')}, Available: ₹${wallet.balance.toLocaleString('en-IN')} (shortfall: ₹${(orderTotal - wallet.balance).toLocaleString('en-IN')}). Please top up your wallet via Card, UPI, or Net Banking to proceed.`,
            required: orderTotal,
            currentBalance: wallet.balance,
            shortfall: orderTotal - wallet.balance,
            availableOffers,
            appliedOffer,
            couponError,
          },
          actionCard: {
            type: 'WALLET_TOPUP_PROMPT',
            data: {
              currentBalance: wallet.balance,
              requiredTotal: orderTotal,
              shortfall: orderTotal - wallet.balance,
              product,
              recipient: recipientEmail || friend_email_or_name,
              availableOffers,
              appliedOffer,
            },
          },
        };
      }

      // Fetch user address or default fallback
      const { data: addr } = await adminDb
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .limit(1)
        .maybeSingle();

      const shippingAddress = addr
        ? {
            recipient_name: friend_email_or_name,
            recipient_phone: addr.recipient_phone,
            address_line: addr.address_line1 + (addr.address_line2 ? `, ${addr.address_line2}` : ''),
            city: addr.city,
            state: addr.state,
            postal_code: addr.postal_code,
            country: 'India',
          }
        : {
            recipient_name: friend_email_or_name,
            recipient_phone: '+91 98765 43210',
            address_line: '12-A Heritage Residency, MG Road',
            city: 'Bengaluru',
            state: 'Karnataka',
            postal_code: '560001',
            country: 'India',
          };

      // Create order with confirmNow: true (immediately paid via in-app wallet and marked confirmed!)
      const order = await createOrder(
        {
          items: [{ id: product.id, quantity: 1, price: Number(product.price) }],
          shippingAddress,
          paymentMethod: 'wallet',
          appliedOffer: appliedOffer || undefined,
          confirmNow: true,
          isGift: true,
          giftRecipientEmail: recipientEmail || String(friend_email_or_name).trim(),
          giftRevealDate: reveal_date || null,
          placedBy: 'agent',
        },
        userId
      );

      // Create gift record in Supabase gifts table
      let giftRecord: any = null;
      try {
        giftRecord = await createGift(adminDb, {
          senderId: userId,
          recipientId,
          recipientEmail: recipientEmail || String(friend_email_or_name).trim(),
          revealTrigger: reveal_date ? 'date' : 'manual',
          revealDate: reveal_date || null,
          message: gift_message || 'A special gift for you!',
          orderId: order.id,
        });
      } catch (giftErr) {
        console.warn('[send_as_gift] createGift warning:', giftErr);
      }

      // Record tracking event for gift order
      await adminDb.from('order_tracking_events').insert({
        order_id: order.id,
        status: 'confirmed',
        title: 'Gift Package Confirmed & Sealed',
        description: `Surprise gift order successfully placed and paid in full (₹${orderTotal.toLocaleString('en-IN')}) via in-app wallet for ${recipientEmail || friend_email_or_name}.`,
        location: `${shippingAddress.city}, ${shippingAddress.state}`,
      });

      const updatedWallet = await getWallet(userId);

      return {
        toolName,
        output: {
          success: true,
          paymentConfirmed: true,
          orderId: order.id,
          giftId: giftRecord?.id || null,
          recipient: recipientEmail || friend_email_or_name,
          recipientId,
          product: product.title,
          productId: product.id,
          price: product.price,
          totalAmount: orderTotal,
          walletBalance: updatedWallet.balance,
          message: gift_message || 'A special gift for you!',
          reveal_date: reveal_date || 'Instant reveal',
          status: 'confirmed',
        },
        clientActions: [
          { type: 'WALLET_SYNC', payload: { balance: updatedWallet.balance } },
          { type: 'CART_CLEAR', payload: {} },
        ],
        actionCard: {
          type: 'ORDER_CONFIRMED',
          data: {
            orderId: order.id,
            giftId: giftRecord?.id,
            total: orderTotal,
            subtotal,
            discount: appliedOffer?.discountAmount || 0,
            appliedOffer,
            availableOffers,
            remainingBalance: updatedWallet.balance,
            placedBy: 'agent',
            isGift: true,
            recipient: recipientEmail || friend_email_or_name,
            product,
          },
        },
      };
    }

    // -------------------------------------------------------------
    // 7. Get Reviewable Products
    // -------------------------------------------------------------
    case 'get_reviewable_products': {
      if (!userId) return { toolName, output: { error: 'Please log in to view reviewable products.' } };

      const { data: orderItems } = await adminDb
        .from('order_items')
        .select('product_id, orders!inner(customer_id, status), product:products(id, title, price, image_urls, category)')
        .eq('orders.customer_id', userId)
        .limit(10);

      const items = (orderItems || []).map((oi: any) => oi.product).filter(Boolean);
      const uniqueItems = Array.from(new Map(items.map((i: any) => [i.id, i])).values());

      return {
        toolName,
        output: {
          count: uniqueItems.length,
          products: uniqueItems,
        },
        actionCard: {
          type: 'REVIEWABLE_LIST',
          data: { products: uniqueItems },
        },
      };
    }

    // -------------------------------------------------------------
    // 8. Submit Product Review
    // -------------------------------------------------------------
    case 'submit_product_review': {
      if (!userId) return { toolName, output: { error: 'Please log in to write reviews.' } };
      const { product_id, rating, title, comment } = args;

      if (!product_id || !rating || !comment) {
        return { toolName, output: { error: 'product_id, rating, and comment are required.' } };
      }

      // Check if user purchased this product
      const { data: orderItem } = await adminDb
        .from('order_items')
        .select('id, orders!inner(customer_id)')
        .eq('product_id', product_id)
        .eq('orders.customer_id', userId)
        .limit(1)
        .maybeSingle();

      const isVerified = Boolean(orderItem);

      const { error: reviewErr } = await adminDb
        .from('product_reviews')
        .upsert({
          product_id,
          customer_id: userId,
          rating: Math.min(5, Math.max(1, Math.round(rating))),
          title: title || 'Customer Review',
          body: comment,
          is_verified_purchase: isVerified,
        });

      if (reviewErr) {
        return { toolName, output: { error: reviewErr.message } };
      }

      return {
        toolName,
        output: {
          success: true,
          rating,
          isVerifiedPurchase: isVerified,
          message: 'Thank you! Your verified review has been published.',
        },
      };
    }

    // -------------------------------------------------------------
    // 9. In-App Wallet Status
    // -------------------------------------------------------------
    case 'get_wallet_status': {
      if (!userId) return { toolName, output: { error: 'Please log in to inspect your wallet.' } };

      const wallet = await getWallet(userId);
      return {
        toolName,
        output: {
          balanceINR: wallet.balance,
          currency: wallet.currency,
          recentTransactions: wallet.transactions.slice(0, 5),
        },
        actionCard: {
          type: 'WALLET_CARD',
          data: {
            balance: wallet.balance,
            currency: wallet.currency,
            transactions: wallet.transactions.slice(0, 5),
          },
        },
      };
    }

    // -------------------------------------------------------------
    // 10. Top Up Wallet
    // -------------------------------------------------------------
    case 'topup_wallet': {
      if (!userId) return { toolName, output: { error: 'Please log in to top up your wallet.' } };
      const { amount, payment_method, order_id } = args;

      const numAmount = Number(amount);
      if (!numAmount || numAmount <= 0) {
        return { toolName, output: { error: 'Valid positive top-up amount required.' } };
      }

      const method = String(payment_method || 'upi').toLowerCase().trim();
      const methodName =
        method === 'card'
          ? 'Credit / Debit Card'
          : method === 'netbanking'
          ? 'Net Banking'
          : 'Instant UPI';

      const res = await topupWallet(userId, numAmount, `Top-up ₹${numAmount} via ${methodName}`);

      // Locate pending order to allow customer to immediately return and complete payment
      let pendingOrder: any = null;
      if (order_id) {
        const { data: ord } = await adminDb
          .from('orders')
          .select('id, total_amount, status')
          .eq('id', order_id)
          .eq('customer_id', userId)
          .maybeSingle();
        if (ord && ord.status === 'pending') pendingOrder = ord;
      }
      if (!pendingOrder) {
        const { data: latestPending } = await adminDb
          .from('orders')
          .select('id, total_amount, status')
          .eq('customer_id', userId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latestPending) pendingOrder = latestPending;
      }

      return {
        toolName,
        output: {
          success: true,
          creditedAmount: numAmount,
          paymentMethod: methodName,
          newBalance: res.new_balance,
          pendingOrderId: pendingOrder?.id || null,
          pendingOrderTotal: pendingOrder?.total_amount || null,
          message: `Successfully added ₹${numAmount.toLocaleString('en-IN')} to your in-app wallet via ${methodName}! Your new balance is ₹${res.new_balance.toLocaleString('en-IN')}.${pendingOrder ? ' You can now return to the agent and authorize your order payment.' : ''}`,
        },
        clientActions: [{ type: 'WALLET_SYNC', payload: { balance: res.new_balance } }],
        actionCard: {
          type: 'WALLET_TOPUP_SUCCESS',
          data: {
            creditedAmount: numAmount,
            paymentMethod: methodName,
            newBalance: res.new_balance,
            currency: 'INR',
            pendingOrderId: pendingOrder?.id || null,
            pendingOrderTotal: pendingOrder?.total_amount || null,
            message: `Successfully credited ₹${numAmount.toLocaleString('en-IN')} via ${methodName}!`,
          },
        },
      };
    }

    // -------------------------------------------------------------
    // 10b. Apply Coupon (Explicit Customer Choice Only)
    // -------------------------------------------------------------
    case 'apply_coupon': {
      if (!userId) return { toolName, output: { error: 'Please log in to apply coupons.' } };
      const { coupon_code, order_id } = args;

      if (!coupon_code) {
        return { toolName, output: { error: 'Please specify a coupon code to apply.' } };
      }

      // Check if user has a pending order
      let order: any = null;
      if (order_id) {
        const { data: ord } = await adminDb
          .from('orders')
          .select('*, order_items(*, products(*))')
          .eq('id', order_id)
          .eq('customer_id', userId)
          .maybeSingle();
        order = ord;
      } else {
        const { data: latestPending } = await adminDb
          .from('orders')
          .select('*, order_items(*, products(*))')
          .eq('customer_id', userId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        order = latestPending;
      }

      const wallet = await getWallet(userId);

      if (order) {
        const items = order.order_items || [];
        const subtotal = items.reduce(
          (sum: number, it: any) => sum + Number(it.unit_price) * Number(it.quantity || 1),
          0
        ) || Number(order.total_amount);
        const isGift = Boolean(order.is_gift);
        const category = items[0]?.products?.category || null;

        let check = calculateWalletCouponDiscount(coupon_code, subtotal, isGift, category);
        const normalizedCode = String(coupon_code).trim().toUpperCase();
        if (!check.valid && /^SS([1-9]|[1-9][0-9]|100)-[A-Z0-9]{4}$/.test(normalizedCode)) {
          const { data: campaign } = await adminDb
            .from('campaigns')
            .select('id, discount_percent, promo_code, name')
            .eq('promo_code', normalizedCode)
            .maybeSingle();
          const { data: send } = campaign
            ? await adminDb
                .from('campaign_sends')
                .select('id, converted_at')
                .eq('campaign_id', campaign.id)
                .eq('user_id', userId)
                .not('sent_at', 'is', null)
                .maybeSingle()
            : { data: null };
          if (campaign && send && !send.converted_at) {
            const {
              calculateCampaignDiscount,
              campaignPromoTitle,
            } = await import('@/services/campaign-promo');
            const calc = calculateCampaignDiscount(campaign.discount_percent, subtotal);
            if (calc.valid) {
              check = {
                valid: true,
                discountAmount: calc.discountAmount,
                title: campaignPromoTitle(campaign.discount_percent, campaign.promo_code ?? normalizedCode),
              };
              await adminDb
                .from('campaign_sends')
                .update({ converted_at: new Date().toISOString() })
                .eq('id', send.id);
            } else {
              check = { valid: false, discountAmount: 0, title: '', reason: calc.reason };
            }
          } else if (campaign && send?.converted_at) {
            check = { valid: false, discountAmount: 0, title: '', reason: `Code ${normalizedCode} was already used.` };
          } else if (campaign) {
            check = {
              valid: false,
              discountAmount: 0,
              title: '',
              reason: `Code ${normalizedCode} is not assigned to your account.`,
            };
          }
        }
        if (!check.valid) {
          return {
            toolName,
            output: {
              error: check.reason || `Coupon "${coupon_code}" cannot be applied to this order.`,
              availableOffers: getWalletEligibleOffers(subtotal, category, isGift),
            },
          };
        }

        const newTotals = calculateTotals(subtotal, check.discountAmount);

        // Update order in Supabase
        await adminDb
          .from('orders')
          .update({
            total_amount: newTotals.total,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        const appliedOffer = {
          code: coupon_code.toUpperCase(),
          title: check.title,
          discountAmount: check.discountAmount,
        };

        const firstProduct = items[0]?.products || { title: 'Order Item', price: subtotal };

        return {
          toolName,
          output: {
            success: true,
            appliedOffer,
            newTotal: newTotals.total,
            savings: check.discountAmount,
            message: `🎉 Coupon ${coupon_code.toUpperCase()} applied! Saved ₹${check.discountAmount}. New order total is ₹${newTotals.total.toLocaleString('en-IN')}.`,
          },
          actionCard: {
            type: 'WALLET_PAY_AUTH',
            data: {
              orderId: order.id,
              total: newTotals.total,
              subtotal,
              discount: check.discountAmount,
              appliedOffer,
              product: firstProduct,
              quantity: items[0]?.quantity || 1,
              walletBalance: wallet.balance,
              remainingBalance: wallet.balance - newTotals.total,
              authToken: `auth_${Date.now()}`,
            },
          },
        };
      }

      return {
        toolName,
        output: {
          error: `No pending order found to apply coupon "${coupon_code}". Please pick a product first, and I will show you available coupons you can apply!`,
        },
      };
    }

    // -------------------------------------------------------------
    // 11. Prepare Wallet Checkout (HITL Step 1)
    // -------------------------------------------------------------
    case 'prepare_wallet_checkout': {
      if (!userId) return { toolName, output: { error: 'Please log in to make purchases.' } };
      const { product_id, product_title, quantity = 1, checkout_cart, coupon_code } = args;

      const wallet = await getWallet(userId);

      // Fetch product to buy
      let itemToBuy = await resolveProduct(product_id, product_title);

      // If user specifically requested checking out their entire cart
      if (!itemToBuy && checkout_cart && userId) {
        try {
          const cartItems = await getCart(userId);
          if (Array.isArray(cartItems) && cartItems.length > 0) {
            const firstCartItem = cartItems[0];
            itemToBuy = await resolveProduct(firstCartItem.id);
          }
        } catch {
          // ignore cart fetch error
        }
      }

      if (!itemToBuy) {
        return {
          toolName,
          output: {
            error: 'Please specify which product you would like to purchase (e.g. "Buy Noise ColorFit Smart Watch with wallet").',
          },
        };
      }

      const unitPrice = Number(itemToBuy.price);
      const qty = Math.max(1, quantity);
      const subtotal = unitPrice * qty;

      let appliedOffer: AppliedOfferInfo | null = null;
      let couponError: string | null = null;

      // Only apply coupon if user explicitly requested it!
      if (coupon_code) {
        const couponCheck = calculateWalletCouponDiscount(coupon_code, subtotal, false, itemToBuy.category);
        if (couponCheck.valid) {
          appliedOffer = {
            code: coupon_code.toUpperCase(),
            title: couponCheck.title,
            discountAmount: couponCheck.discountAmount,
          };
        } else {
          couponError = couponCheck.reason || 'Invalid coupon for this purchase.';
        }
      }

      // Discovered wallet-compatible offers (non-card, non-UPI) to present to customer
      const availableOffers = getWalletEligibleOffers(subtotal, itemToBuy.category, false);
      const totals = calculateTotals(subtotal, appliedOffer?.discountAmount || 0);

      // Check balance
      if (wallet.balance < totals.total) {
        const shortfall = totals.total - wallet.balance;
        return {
          toolName,
          output: {
            insufficientFunds: true,
            currentBalance: wallet.balance,
            requiredTotal: totals.total,
            shortfall,
            availableOffers,
            appliedOffer,
            couponError,
            message: `Your wallet balance is ₹${wallet.balance.toLocaleString('en-IN')}, but ₹${totals.total.toLocaleString('en-IN')} is required (shortfall: ₹${shortfall.toLocaleString('en-IN')}). Please top up your wallet via Card, UPI, or Net Banking to proceed.`,
          },
          actionCard: {
            type: 'WALLET_TOPUP_PROMPT',
            data: {
              currentBalance: wallet.balance,
              requiredTotal: totals.total,
              shortfall,
              product: itemToBuy,
              quantity: qty,
              availableOffers,
              appliedOffer,
            },
          },
        };
      }

      // Fetch default address or mock default
      const { data: addr } = await adminDb
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .limit(1)
        .maybeSingle();

      const shippingAddress = addr
        ? {
            recipient_name: addr.recipient_name,
            recipient_phone: addr.recipient_phone,
            address_line: addr.address_line1 + (addr.address_line2 ? `, ${addr.address_line2}` : ''),
            city: addr.city,
            state: addr.state,
            postal_code: addr.postal_code,
            country: 'India',
          }
        : {
            recipient_name: 'ShopSphere Customer',
            recipient_phone: '+91 98765 43210',
            address_line: '12-A Heritage Residency, MG Road',
            city: 'Bengaluru',
            state: 'Karnataka',
            postal_code: '560001',
            country: 'India',
          };

      // Create order marked with placed_by: 'agent'
      const order = await createOrder(
        {
          items: [{ id: itemToBuy.id, quantity: qty, price: unitPrice }],
          shippingAddress,
          paymentMethod: 'wallet',
          appliedOffer: appliedOffer || undefined,
          confirmNow: false, // Wait for customer 1-tap authorization
          placedBy: 'agent',
        },
        userId
      );

      return {
        toolName,
        output: {
          orderPrepared: true,
          orderId: order.id,
          itemTitle: itemToBuy.title,
          quantity: qty,
          subtotal,
          discountAmount: appliedOffer?.discountAmount || 0,
          appliedOffer,
          availableOffers,
          totalAmount: totals.total,
          walletBalance: wallet.balance,
          remainingBalanceAfterPayment: wallet.balance - totals.total,
        },
        actionCard: {
          type: 'WALLET_PAY_AUTH',
          data: {
            orderId: order.id,
            total: totals.total,
            subtotal,
            discount: appliedOffer?.discountAmount || 0,
            appliedOffer,
            availableOffers,
            product: itemToBuy,
            quantity: qty,
            walletBalance: wallet.balance,
            remainingBalance: wallet.balance - totals.total,
            authToken: `auth_${Date.now()}`,
          },
        },
      };
    }

    // -------------------------------------------------------------
    // 12. Confirm Wallet Payment (HITL Step 2)
    // -------------------------------------------------------------
    case 'confirm_wallet_payment': {
      if (!userId) return { toolName, output: { error: 'Please log in to confirm payment.' } };
      let { order_id } = args;

      let order: any = null;

      if (order_id) {
        const { data: foundOrder } = await adminDb
          .from('orders')
          .select('*')
          .eq('id', order_id)
          .eq('customer_id', userId)
          .single();
        order = foundOrder;
      } else {
        // Smart resolution: find latest pending order for this user
        const { data: latestPending } = await adminDb
          .from('orders')
          .select('*')
          .eq('customer_id', userId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestPending) {
          order = latestPending;
          order_id = latestPending.id;
        }
      }

      if (!order) {
        return { toolName, output: { error: 'No pending order found to authorize. Please choose a product to purchase first.' } };
      }

      const debitRes = await debitWallet(userId, Number(order.total_amount), order.id);

      if (!debitRes.success) {
        return { toolName, output: { error: debitRes.error || 'Wallet payment failed.' } };
      }

      // Mark order confirmed
      await adminDb
        .from('orders')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', order_id);

      await adminDb.from('order_tracking_events').insert({
        order_id,
        status: 'confirmed',
        title: 'Payment Confirmed by AI Agent',
        description: `₹${Number(order.total_amount).toLocaleString('en-IN')} debited from in-app wallet. Order placed under relaxed AI Agent policy.`,
      });

      return {
        toolName,
        output: {
          paymentSuccess: true,
          orderId: order.id,
          totalAmount: order.total_amount,
          remainingBalance: debitRes.remaining_balance,
          message: 'Order paid successfully! Track your order anytime under My Orders.',
        },
        clientActions: [
          { type: 'WALLET_SYNC', payload: { balance: debitRes.remaining_balance } },
          { type: 'CART_CLEAR', payload: {} },
        ],
        actionCard: {
          type: 'ORDER_CONFIRMED',
          data: {
            orderId: order.id,
            total: order.total_amount,
            remainingBalance: debitRes.remaining_balance,
            placedBy: 'agent',
          },
        },
      };
    }

    // -------------------------------------------------------------
    // 13. Cancel or Replace Order (Relaxed Policy)
    // -------------------------------------------------------------
    case 'cancel_or_replace_order': {
      if (!userId) return { toolName, output: { error: 'Please log in to modify orders.' } };
      const { order_id, action, replacement_product_id } = args;

      const { data: order } = await adminDb
        .from('orders')
        .select('id, status, total_amount, placed_by')
        .eq('id', order_id)
        .eq('customer_id', userId)
        .maybeSingle();

      if (!order) return { toolName, output: { error: 'Order not found.' } };

      // Allow cancellation if agent order through 'packed' status
      const nonCancellable = order.placed_by === 'agent'
        ? ['delivered', 'cancelled', 'shipped', 'out_for_delivery']
        : ['delivered', 'cancelled', 'shipped', 'out_for_delivery', 'processing', 'packed'];

      if (nonCancellable.includes(order.status)) {
        return {
          toolName,
          output: {
            error: `Order cannot be cancelled online because it is currently "${order.status}".`,
          },
        };
      }

      // Execute 100% wallet refund
      const refundRes = await refundWallet(
        userId,
        Number(order.total_amount),
        order.id,
        '100% refund for cancelled agent order'
      );

      await adminDb.from('orders').update({ status: 'cancelled' }).eq('id', order.id);

      await adminDb.from('order_tracking_events').insert({
        order_id: order.id,
        status: 'cancelled',
        title: 'Order Cancelled via AI Agent',
        description: `100% refund of ₹${Number(order.total_amount).toLocaleString('en-IN')} credited back to your in-app wallet immediately.`,
      });

      if (action === 'replace' && replacement_product_id) {
        // Trigger replacement
        return {
          toolName,
          output: {
            cancelledOrderId: order.id,
            refundedAmount: order.total_amount,
            newWalletBalance: refundRes.new_balance,
            message: `Previous order cancelled and ₹${Number(order.total_amount).toLocaleString('en-IN')} refunded to wallet. Preparing replacement...`,
          },
          clientActions: [{ type: 'WALLET_SYNC', payload: { balance: refundRes.new_balance } }],
        };
      }

      return {
        toolName,
        output: {
          cancelledOrderId: order.id,
          refundedAmount: order.total_amount,
          newWalletBalance: refundRes.new_balance,
          message: `Order SS-${order.id.slice(0, 8).toUpperCase()} has been cancelled. ₹${Number(order.total_amount).toLocaleString('en-IN')} is refunded instantly to your wallet.`,
        },
        clientActions: [{ type: 'WALLET_SYNC', payload: { balance: refundRes.new_balance } }],
        actionCard: {
          type: 'ORDER_CANCELLED',
          data: {
            orderId: order.id,
            refundedAmount: order.total_amount,
            newBalance: refundRes.new_balance,
          },
        },
      };
    }

    default:
      return { toolName, output: { error: `Unrecognized tool ${toolName}` } };
  }
}
