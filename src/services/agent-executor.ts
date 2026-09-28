import { createAdminClient } from '@/lib/supabase/admin';
import { getWallet, topupWallet, debitWallet, refundWallet } from '@/services/wallet-service';
import { getFavorites, addFavorite, removeFavorite } from '@/services/favorites-service';
import { createOrder, calculateTotals } from '@/services/order-service';
import { getCart } from '@/services/cart-service';

function normalizeCategory(input?: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const c = input.trim().toLowerCase();
  if (c === 'all') return null;
  if (c.includes('elect') || c.includes('phone') || c.includes('mobile') || c.includes('gadget') || c.includes('laptop') || c.includes('smart') || c.includes('tech')) {
    return 'Electronics';
  }
  if (c.includes('audio') || c.includes('earbud') || c.includes('headphone') || c.includes('speaker') || c.includes('sound')) {
    return 'Audio & Accessories';
  }
  if (c.includes('cloth') || c.includes('fashion') || c.includes('apparel') || c.includes('shirt') || c.includes('kurta') || c.includes('wear') || c.includes('dress') || c.includes('watch')) {
    return 'Fashion & Apparel';
  }
  if (c.includes('kitchen') || c.includes('home') || c.includes('cooker') || c.includes('mixer') || c.includes('appliance') || c.includes('jar')) {
    return 'Home & Kitchen';
  }
  if (c.includes('beauty') || c.includes('health') || c.includes('wash') || c.includes('cream') || c.includes('soap') || c.includes('skin') || c.includes('makeup')) {
    return 'Health & Beauty';
  }
  if (c.includes('gourmet') || c.includes('grocer') || c.includes('food') || c.includes('snack') || c.includes('chocolate') || c.includes('sweet')) {
    return 'Gourmet & Groceries';
  }
  if (c.includes('sport') || c.includes('fitness') || c.includes('exercis') || c.includes('gym')) {
    return 'Sports & Outdoors';
  }
  return input;
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

      // 1. Normalize and resolve canonical category
      const normCat = normalizeCategory(category) || normalizeCategory(query);

      // 2. Parse Keywords & Strip Stop Words
      const stopWords = new Set([
        'product', 'products', 'item', 'items', 'show', 'me', 'under', 'cheap', 'best',
        'good', 'from', 'category', 'in', 'the', 'for', 'buy', 'need', 'want', 'please',
        'any', 'find', 'get', 'give', 'below', 'less', 'than', 'price', 'budget', 'with', 'and'
      ]);

      const rawWords = (query || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w: string) => w.length > 2 && !stopWords.has(w));

      // 3. Build Base Query with Strict Category and Price
      let baseQ = adminDb
        .from('products')
        .select('id, title, description, price, compare_at_price, category, sub_category, tags, image_urls, stock, average_rating, attributes')
        .eq('approval_status', 'approved');

      if (normCat) {
        baseQ = baseQ.ilike('category', `%${normCat}%`);
      }
      if (min_price && !isNaN(Number(min_price))) {
        baseQ = baseQ.gte('price', Number(min_price));
      }
      if (max_price && !isNaN(Number(max_price))) {
        baseQ = baseQ.lte('price', Number(max_price));
      }
      if (in_stock_only) {
        baseQ = baseQ.gt('stock', 0);
      }

      // First attempt: search with extracted keywords if any
      let matchedProducts: any[] = [];
      if (rawWords.length > 0) {
        let kwQ = baseQ;
        const orClauses: string[] = [];
        for (const w of rawWords.slice(0, 3)) {
          orClauses.push(`title.ilike.%${w}%`);
          orClauses.push(`description.ilike.%${w}%`);
        }
        kwQ = kwQ.or(orClauses.join(','));
        const { data: kwMatches } = await kwQ.order('average_rating', { ascending: false }).limit(6);
        if (kwMatches && kwMatches.length > 0) {
          matchedProducts = kwMatches;
        }
      }

      // Second attempt: if keyword search yielded nothing, fetch top-rated products strictly within THAT category and price range
      if (matchedProducts.length === 0) {
        const { data: catMatches } = await baseQ.order('average_rating', { ascending: false }).limit(6);
        if (catMatches && catMatches.length > 0) {
          matchedProducts = catMatches;
        }
      }

      // Third attempt: If still 0 products found because budget was too low or category was very narrow:
      if (matchedProducts.length === 0) {
        let hintMessage = `No products found`;
        if (normCat) hintMessage += ` in "${normCat}"`;
        if (max_price) hintMessage += ` under ₹${Number(max_price).toLocaleString('en-IN')}`;

        let altProducts: any[] = [];
        if (normCat) {
          // Find the lowest-priced products within THAT SAME category so user sees actual prices
          const { data: catOnly } = await adminDb
            .from('products')
            .select('id, title, price, compare_at_price, category, image_urls, stock, average_rating')
            .eq('approval_status', 'approved')
            .ilike('category', `%${normCat}%`)
            .order('price', { ascending: true })
            .limit(4);

          if (catOnly && catOnly.length > 0) {
            altProducts = catOnly;
            hintMessage += `. The most affordable ${normCat} products start at ₹${catOnly[0].price.toLocaleString('en-IN')}.`;
          }
        }

        return {
          toolName,
          output: {
            count: altProducts.length,
            products: altProducts,
            message: hintMessage,
            appliedCategory: normCat || 'All',
            appliedMaxPrice: max_price || null,
          },
          actionCard: altProducts.length > 0 ? {
            type: 'PRODUCT_CAROUSEL',
            data: { products: altProducts },
          } : undefined,
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
      const { product_id, quantity = 1 } = args;

      const wallet = await getWallet(userId);

      // Fetch product to buy
      let itemToBuy: any = null;
      if (product_id) {
        const { data: prod } = await adminDb.from('products').select('*').eq('id', product_id).maybeSingle();
        itemToBuy = prod;
      }

      // If no product_id specified, inspect the user's active cart
      if (!itemToBuy && userId) {
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

      // If still no item, inspect user's recent wishlist
      if (!itemToBuy && userId) {
        try {
          const favs = await getFavorites(userId);
          if (favs.length > 0 && favs[0].product) {
            itemToBuy = favs[0].product;
          }
        } catch {
          // ignore favs fetch error
        }
      }

      if (!itemToBuy) {
        return {
          toolName,
          output: { error: 'Please specify which product you would like to purchase (e.g. "Buy POCO X4 Pro 5G with wallet") or add an item to your bag first.' },
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
