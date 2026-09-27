import { createAdminClient } from '@/lib/supabase/admin';
import { getWallet, topupWallet, debitWallet, refundWallet } from '@/services/wallet-service';
import { getFavorites, addFavorite, removeFavorite } from '@/services/favorites-service';
import { createOrder, calculateTotals } from '@/services/order-service';

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
      let q = adminDb
        .from('products')
        .select('id, title, description, price, compare_at_price, category, sub_category, tags, image_urls, stock, average_rating, attributes')
        .eq('approval_status', 'approved');

      if (category && category !== 'All') {
        q = q.ilike('category', `%${category}%`);
      }
      if (min_price && !isNaN(min_price)) {
        q = q.gte('price', Number(min_price));
      }
      if (max_price && !isNaN(max_price)) {
        q = q.lte('price', Number(max_price));
      }
      if (in_stock_only) {
        q = q.gt('stock', 0);
      }

      if (query && query.trim() !== '') {
        const clean = query.replace(/[%_,()]/g, '').trim();
        q = q.or(`title.ilike.%${clean}%,description.ilike.%${clean}%,category.ilike.%${clean}%`);
      }

      const { data: products, error } = await q.order('average_rating', { ascending: false }).limit(6);

      if (error || !products || products.length === 0) {
        // Fallback: search without category constraint
        const { data: fallback } = await adminDb
          .from('products')
          .select('id, title, price, compare_at_price, category, image_urls, stock, average_rating')
          .eq('approval_status', 'approved')
          .limit(4);

        return {
          toolName,
          output: {
            count: fallback?.length || 0,
            products: fallback || [],
            message: `No exact matches for "${query}". Displaying popular items.`,
          },
          actionCard: {
            type: 'PRODUCT_CAROUSEL',
            data: { products: fallback || [] },
          },
        };
      }

      return {
        toolName,
        output: {
          count: products.length,
          products: products.map((p) => ({
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
          data: { products },
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

      if (!itemToBuy) {
        return {
          toolName,
          output: { error: 'Please specify which product you would like to purchase.' },
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
      const { order_id } = args;

      if (!order_id) {
        return { toolName, output: { error: 'order_id is required.' } };
      }

      const { data: order } = await adminDb
        .from('orders')
        .select('*')
        .eq('id', order_id)
        .eq('customer_id', userId)
        .single();

      if (!order) return { toolName, output: { error: 'Order not found.' } };

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
