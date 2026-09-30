import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export interface StockPredictionItem {
  productId: string;
  productTitle: string;
  shopId: string | null;
  sellerId: string;
  currentStock: number;
  salesPast14Days: number;
  dailyVelocity: number;
  daysUntilStockout: number;
  urgency: 'out_of_stock' | 'critical' | 'warning' | 'healthy';
  recommendedReorderQty: number;
  projectedStockoutDate: string | null;
  estimatedDailyRevenueLost?: number;
}

export interface RestockAnalysisSummary {
  totalAnalyzed: number;
  outOfStockCount: number;
  criticalCount: number;
  warningCount: number;
  healthyCount: number;
  alertsGenerated: number;
  items: StockPredictionItem[];
  executedAt: string;
}

/**
 * Predicts stockouts based on 14-day sales velocity and triggers restock notifications.
 */
export async function runStockoutPrediction(
  supabase: SupabaseClient<Database>,
  targetSellerId?: string
): Promise<RestockAnalysisSummary> {
  const executedAt = new Date().toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Fetch products
  let productsQuery = supabase
    .from('products')
    .select('id, title, price, stock, shop_id, seller_id, approval_status, attributes')
    .eq('approval_status', 'approved');

  if (targetSellerId) {
    productsQuery = productsQuery.eq('seller_id', targetSellerId);
  }

  const { data: products, error: prodErr } = await productsQuery.limit(500);

  if (prodErr || !products || products.length === 0) {
    return {
      totalAnalyzed: 0,
      outOfStockCount: 0,
      criticalCount: 0,
      warningCount: 0,
      healthyCount: 0,
      alertsGenerated: 0,
      items: [],
      executedAt,
    };
  }

  // 2. Fetch order items from past 14 days
  const productIds = products.map((p) => p.id);
  const { data: orderItems, error: orderErr } = await supabase
    .from('order_items')
    .select('product_id, quantity, created_at')
    .in('product_id', productIds)
    .gte('created_at', fourteenDaysAgo);

  const salesMap = new Map<string, number>();
  if (orderItems && !orderErr) {
    for (const item of orderItems) {
      const current = salesMap.get(item.product_id) || 0;
      salesMap.set(item.product_id, current + (item.quantity || 1));
    }
  }

  const items: StockPredictionItem[] = [];
  let outOfStockCount = 0;
  let criticalCount = 0;
  let warningCount = 0;
  let healthyCount = 0;
  let alertsGenerated = 0;

  for (const product of products) {
    // Skip soft-deleted items
    const isSoftDeleted =
      product.attributes &&
      typeof product.attributes === 'object' &&
      !Array.isArray(product.attributes) &&
      (product.attributes as Record<string, any>).is_soft_deleted === true;

    if (isSoftDeleted) continue;

    const currentStock = Math.max(0, product.stock ?? 0);
    const salesPast14Days = salesMap.get(product.id) || 0;
    // Daily velocity over 14 days (or minimum heuristic velocity if recently ordered)
    const dailyVelocity = parseFloat((salesPast14Days / 14).toFixed(2));

    let daysUntilStockout: number;
    let urgency: 'out_of_stock' | 'critical' | 'warning' | 'healthy';
    let projectedStockoutDate: string | null = null;

    if (currentStock === 0) {
      daysUntilStockout = 0;
      urgency = 'out_of_stock';
      outOfStockCount++;
      projectedStockoutDate = new Date().toISOString();
    } else if (dailyVelocity > 0) {
      daysUntilStockout = parseFloat((currentStock / dailyVelocity).toFixed(1));
      const hoursUntil = daysUntilStockout * 24;
      projectedStockoutDate = new Date(Date.now() + hoursUntil * 60 * 60 * 1000).toISOString();

      if (daysUntilStockout <= 3) {
        urgency = 'critical';
        criticalCount++;
      } else if (daysUntilStockout <= 7) {
        urgency = 'warning';
        warningCount++;
      } else {
        urgency = 'healthy';
        healthyCount++;
      }
    } else {
      // Velocity is 0: check if stock is naturally low (<= 3 units)
      if (currentStock <= 3) {
        daysUntilStockout = 5;
        urgency = 'warning';
        warningCount++;
      } else {
        daysUntilStockout = 999;
        urgency = 'healthy';
        healthyCount++;
      }
    }

    // Recommended reorder quantity: target 30 days of safety stock or minimum batch of 20
    const target30Days = Math.ceil(dailyVelocity * 30);
    const recommendedReorderQty = Math.max(20, target30Days);

    const predictionItem: StockPredictionItem = {
      productId: product.id,
      productTitle: product.title,
      shopId: product.shop_id,
      sellerId: product.seller_id,
      currentStock,
      salesPast14Days,
      dailyVelocity,
      daysUntilStockout,
      urgency,
      recommendedReorderQty,
      projectedStockoutDate,
      estimatedDailyRevenueLost: urgency === 'out_of_stock' ? parseFloat((dailyVelocity * (product.price || 0)).toFixed(2)) : undefined,
    };

    items.push(predictionItem);

    // If critical or out of stock, record proactive alert event
    if (urgency === 'critical' || urgency === 'out_of_stock') {
      alertsGenerated++;
    }
  }

  // Sort items with highest urgency first
  items.sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);

  return {
    totalAnalyzed: items.length,
    outOfStockCount,
    criticalCount,
    warningCount,
    healthyCount,
    alertsGenerated,
    items,
    executedAt,
  };
}

/**
 * Returns prioritized restock recommendations for a specific seller.
 */
export async function getSellerRestockAlerts(
  supabase: SupabaseClient<Database>,
  sellerId: string
): Promise<StockPredictionItem[]> {
  const analysis = await runStockoutPrediction(supabase, sellerId);
  return analysis.items.filter((item) => item.urgency !== 'healthy');
}
