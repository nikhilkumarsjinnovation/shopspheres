import { createAdminClient } from '@/lib/supabase/admin';
import { getWallet, topupWallet, debitWallet, refundWallet } from '@/services/wallet-service';
import { getFavorites, addFavorite, removeFavorite } from '@/services/favorites-service';
import { createOrder, calculateTotals } from '@/services/order-service';
import { getCart } from '@/services/cart-service';

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
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1);
  return w;
}

export interface AgentExecutionResult {
  toolName: string;
  output: any;
  clientActions?: Array<{
    type: 'CART_SYNC' | 'FAVORITES_SYNC' | 'WALLET_SYNC' | 'CART_CLEAR';
    payload: any;
  }>;
  actionCard?: {
    type: 'PRODUCT_CAROUSEL' | 'WALLET_CARD' | 'WALLET_PAY_AUTH' | 'WALLET_TOPUP_PROMPT' | 'GIFT_CARD' | 'ORDER_CONFIRMED' | 'REVIEWABLE_LIST' | 'ORDER_CANCELLED';
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
        let q = adminDb
          .from('products')
          .select('id, title, description, price, compare_at_price, category, sub_category, tags, image_urls, stock, average_rating, attributes')
          .eq('approval_status', 'approved');

        if (targetCategory) {
          q = q.ilike('category', `%${targetCategory}%`);
        }
        if (min_price && !isNaN(Number(min_price))) {
          q = q.gte('price', Number(min_price));
        }
        if (max_price && !isNaN(Number(max_price))) {
          q = q.lte('price', Number(max_price));
        }
        if (in_stock_only) {
          q = q.gt('stock', 0);
        }

        if (searchTerms.length > 0) {
          const orClauses: string[] = [];
          for (const term of searchTerms.slice(0, 4)) {
            orClauses.push(`title.ilike.%${term}%`);
            orClauses.push(`description.ilike.%${term}%`);
            orClauses.push(`sub_category.ilike.%${term}%`);
          }
          q = q.or(orClauses.join(','));
        }

        const { data } = await q.order('average_rating', { ascending: false }).limit(6);
        return data || [];
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
      const { data: product } = await adminDb
        .from('products')
        .select('*')
        .eq('id', product_id)
        .maybeSingle();

      if (!product) {
        return { toolName, output: { error: 'Product not found.' } };
      }

      const { data: variants } = await adminDb
        .from('product_variants')
        .select('id, sku, title, price, stock, attributes')
        .eq('product_id', product_id);

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
        return { toolName, output: { error: 'product_id is required for this action.' } };
      }

      const { data: product } = await adminDb
        .from('products')
        .select('id, title, price, seller_id, image_urls, category')
        .eq('id', product_id)
        .maybeSingle();

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

      if (!product_id) return { toolName, output: { error: 'product_id is required.' } };

      if (action === 'add') {
        await addFavorite(userId, product_id);
        const { data: prod } = await adminDb.from('products').select('title').eq('id', product_id).maybeSingle();
        return {
          toolName,
          output: { success: true, isFavorite: true, productTitle: prod?.title || 'Product' },
          clientActions: [{ type: 'FAVORITES_SYNC', payload: { productId: product_id, isFavorite: true } }],
        };
      }

      if (action === 'remove') {
        await removeFavorite(userId, product_id);
        return {
          toolName,
          output: { success: true, isFavorite: false },
          clientActions: [{ type: 'FAVORITES_SYNC', payload: { productId: product_id, isFavorite: false } }],
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
      if (!userId) return { toolName, output: { error: 'Please log in to send gifts.' } };
      const { friend_email_or_name, product_id, gift_message, reveal_date } = args;

      const { data: product } = await adminDb
        .from('products')
        .select('id, title, price, image_urls, category')
        .eq('id', product_id)
        .maybeSingle();

      if (!product) return { toolName, output: { error: 'Product not found for gifting.' } };

      return {
        toolName,
        output: {
          success: true,
          recipient: friend_email_or_name,
          product: product.title,
          price: product.price,
          message: gift_message || 'A special gift for you!',
          reveal_date: reveal_date || 'Instant reveal',
        },
        actionCard: {
          type: 'GIFT_CARD',
          data: {
            recipient: friend_email_or_name,
            product,
            giftMessage: gift_message || 'A special gift for you from ShopSphere!',
            revealDate: reveal_date,
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
      const { amount } = args;

      const numAmount = Number(amount);
      if (!numAmount || numAmount <= 0) {
        return { toolName, output: { error: 'Valid positive top-up amount required.' } };
      }

      const res = await topupWallet(userId, numAmount, 'Demo Top-up via AI Assistant');
      return {
        toolName,
        output: {
          success: true,
          creditedAmount: numAmount,
          newBalance: res.new_balance,
        },
        clientActions: [{ type: 'WALLET_SYNC', payload: { balance: res.new_balance } }],
        actionCard: {
          type: 'WALLET_CARD',
          data: {
            balance: res.new_balance,
            currency: 'INR',
            message: `Successfully added ₹${numAmount.toLocaleString('en-IN')} to your in-app wallet!`,
          },
        },
      };
    }

    // -------------------------------------------------------------
    // 11. Prepare Wallet Checkout (HITL Step 1)
    // -------------------------------------------------------------
    case 'prepare_wallet_checkout': {
      if (!userId) return { toolName, output: { error: 'Please log in to make purchases.' } };
      const { product_id, product_title, quantity = 1, checkout_cart } = args;

      const wallet = await getWallet(userId);

      // Fetch product to buy
      let itemToBuy: any = null;
      if (product_id) {
        const { data: prod } = await adminDb.from('products').select('*').eq('id', product_id).maybeSingle();
        itemToBuy = prod;
      }

      // If product_title or query was passed instead of product_id
      if (!itemToBuy && product_title) {
        const { data: prod } = await adminDb
          .from('products')
          .select('*')
          .ilike('title', `%${product_title.trim()}%`)
          .eq('approval_status', 'approved')
          .limit(1)
          .maybeSingle();
        itemToBuy = prod;
      }

      // If user specifically requested checking out their entire cart
      if (!itemToBuy && checkout_cart && userId) {
        try {
          const cartItems = await getCart(userId);
          if (Array.isArray(cartItems) && cartItems.length > 0) {
            const firstCartItem = cartItems[0];
            const { data: prod } = await adminDb.from('products').select('*').eq('id', firstCartItem.id).maybeSingle();
            itemToBuy = prod;
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
      const totals = calculateTotals(unitPrice * qty, 0);

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
            message: `Your wallet balance is ₹${wallet.balance.toLocaleString('en-IN')}, but ₹${totals.total.toLocaleString('en-IN')} is required. Top up ₹${shortfall.toLocaleString('en-IN')} to proceed.`,
          },
          actionCard: {
            type: 'WALLET_TOPUP_PROMPT',
            data: {
              currentBalance: wallet.balance,
              requiredTotal: totals.total,
              shortfall,
              product: itemToBuy,
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
          totalAmount: totals.total,
          walletBalance: wallet.balance,
          remainingBalanceAfterPayment: wallet.balance - totals.total,
        },
        actionCard: {
          type: 'WALLET_PAY_AUTH',
          data: {
            orderId: order.id,
            total: totals.total,
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
