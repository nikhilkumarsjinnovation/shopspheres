import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { runStockoutPrediction } from '@/services/stock-predictor-service';

export interface StoreIntelligenceMetrics {
  totalRevenue7d: number;
  totalOrders7d: number;
  averageOrderValue: number;
  topSellingProducts: Array<{ id: string; title: string; unitsSold: number; revenue: number }>;
  deadStockCount: number;
  deadStockProducts: Array<{ id: string; title: string; stock: number; price: number }>;
  criticalRestockCount: number;
}

export interface StoreIntelligenceDigest {
  sellerId: string;
  shopId?: string | null;
  shopName: string;
  generatedAt: string;
  period: string;
  metrics: StoreIntelligenceMetrics;
  executiveSummary: string;
  actionableRecommendations: string[];
}

/**
 * Generates an executive AI briefing for a shop owner analyzing recent performance.
 */
export async function generateStoreIntelligenceDigest(
  supabase: SupabaseClient<Database>,
  sellerId: string
): Promise<StoreIntelligenceDigest> {
  const generatedAt = new Date().toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Fetch shop profile
  const { data: shop } = await supabase
    .from('shops')
    .select('id, name')
    .eq('seller_id', sellerId)
    .maybeSingle();

  const shopName = shop?.name || 'Your Store';

  // 2. Fetch seller's active products
  const { data: products } = await supabase
    .from('products')
    .select('id, title, price, stock, approval_status, attributes')
    .eq('seller_id', sellerId)
    .eq('approval_status', 'approved');

  const validProducts = (products || []).filter((p) => {
    const isDeleted =
      p.attributes &&
      typeof p.attributes === 'object' &&
      !Array.isArray(p.attributes) &&
      (p.attributes as Record<string, any>).is_soft_deleted === true;
    return !isDeleted;
  });

  const productIds = validProducts.map((p) => p.id);

  // 3. Fetch orders & order items for these products in past 7 days
  let totalRevenue7d = 0;
  let totalOrders7d = 0;
  const productSalesMap = new Map<string, { units: number; revenue: number }>();

  if (productIds.length > 0) {
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, quantity, unit_price, created_at')
      .in('product_id', productIds)
      .gte('created_at', sevenDaysAgo);

    for (const item of orderItems || []) {
      const qty = item.quantity || 1;
      const price = item.unit_price || 0;
      const rev = qty * price;
      totalRevenue7d += rev;

      const current = productSalesMap.get(item.product_id) || { units: 0, revenue: 0 };
      productSalesMap.set(item.product_id, {
        units: current.units + qty,
        revenue: current.revenue + rev,
      });
    }

    const { count: orderCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo);

    totalOrders7d = orderCount || (orderItems && orderItems.length > 0 ? 1 : 0);
  }

  // 4. Compute top sellers & dead stock
  const topSellingProducts: Array<{ id: string; title: string; unitsSold: number; revenue: number }> = [];
  const deadStockProducts: Array<{ id: string; title: string; stock: number; price: number }> = [];

  for (const p of validProducts) {
    const sales = productSalesMap.get(p.id);
    if (sales && sales.units > 0) {
      topSellingProducts.push({
        id: p.id,
        title: p.title,
        unitsSold: sales.units,
        revenue: sales.revenue,
      });
    } else if ((p.stock ?? 0) > 5) {
      deadStockProducts.push({
        id: p.id,
        title: p.title,
        stock: p.stock ?? 0,
        price: p.price,
      });
    }
  }

  topSellingProducts.sort((a, b) => b.revenue - a.revenue);

  // 5. Restock prediction
  const restockAnalysis = await runStockoutPrediction(supabase, sellerId);
  const criticalRestockCount = restockAnalysis.criticalCount + restockAnalysis.outOfStockCount;

  const averageOrderValue = totalOrders7d > 0 ? parseFloat((totalRevenue7d / totalOrders7d).toFixed(2)) : 0;

  const metrics: StoreIntelligenceMetrics = {
    totalRevenue7d: parseFloat(totalRevenue7d.toFixed(2)),
    totalOrders7d,
    averageOrderValue,
    topSellingProducts: topSellingProducts.slice(0, 5),
    deadStockCount: deadStockProducts.length,
    deadStockProducts: deadStockProducts.slice(0, 5),
    criticalRestockCount,
  };

  // 6. Gemini Synthesis
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  let executiveSummary = `${shopName} generated ₹${metrics.totalRevenue7d.toLocaleString()} across ${metrics.totalOrders7d} orders over the past 7 days (AOV: ₹${metrics.averageOrderValue}).`;
  let recommendations: string[] = [
    criticalRestockCount > 0
      ? `Restock ${criticalRestockCount} fast-depleting products immediately to avoid stockout revenue loss.`
      : 'Maintain healthy inventory buffers across top-moving categories.',
    deadStockProducts.length > 0
      ? `Optimize pricing or bundle promotion for stagnant items like "${deadStockProducts[0]?.title || 'stagnant items'}".`
      : 'Review high-converting product tags to increase organic customer impressions.',
    'Promote top sellers via weekend flash offers to accelerate order velocity.',
  ];

  if (apiKey) {
    try {
      const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const prompt = `You are the AI Merchant Advisor for ShopSphere.
Analyze this store's 7-day performance metrics and generate a concise executive brief:
- Store: ${shopName}
- 7-Day Revenue: ₹${metrics.totalRevenue7d}
- Total Orders: ${metrics.totalOrders7d}
- AOV: ₹${metrics.averageOrderValue}
- Top Sellers: ${metrics.topSellingProducts.map((p) => `${p.title} (${p.unitsSold} units)`).join(', ') || 'None'}
- Stagnant Inventory: ${metrics.deadStockProducts.map((p) => p.title).join(', ') || 'None'}
- Critical Low-Stock Alerts: ${criticalRestockCount} products

Respond in strict JSON:
{
  "summary": "2-sentence high-level overview of momentum and health",
  "recommendations": [
    "actionable tactical recommendation 1",
    "actionable tactical recommendation 2",
    "actionable tactical recommendation 3"
  ]
}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (resp.ok) {
        const payload: any = await resp.json();
        const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed.summary) executiveSummary = parsed.summary;
          if (Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0) {
            recommendations = parsed.recommendations;
          }
        }
      }
    } catch (err) {
      console.warn('[Store Intelligence] AI synthesis fallback:', err);
    }
  }

  const digest: StoreIntelligenceDigest = {
    sellerId,
    shopId: shop?.id || null,
    shopName,
    generatedAt,
    period: 'Past 7 Days',
    metrics,
    executiveSummary,
    actionableRecommendations: recommendations,
  };

  // Cache latest digest event in user_behavior_events
  await supabase.from('user_behavior_events').insert({
    user_id: sellerId,
    session_id: 'weekly_store_intelligence_digest',
    event_type: 'store_intelligence_digest',
    entity_type: 'shop',
    entity_id: shop?.id || sellerId,
    metadata: {
      generated_at: generatedAt,
      executive_summary: executiveSummary,
      recommendations,
      metrics: {
        total_revenue_7d: metrics.totalRevenue7d,
        total_orders_7d: metrics.totalOrders7d,
        critical_restock_count: metrics.criticalRestockCount,
      },
    },
  });

  return digest;
}

/**
 * Returns latest saved digest for a seller, or generates fresh one if none exists.
 */
export async function getLatestStoreDigest(
  supabase: SupabaseClient<Database>,
  sellerId: string
): Promise<StoreIntelligenceDigest> {
  const { data } = await supabase
    .from('user_behavior_events')
    .select('metadata, created_at')
    .eq('user_id', sellerId)
    .eq('event_type', 'store_intelligence_digest')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const meta = (data?.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata))
    ? (data.metadata as Record<string, any>)
    : null;

  // If cached within the last 24 hours, return formatted cached summary
  if (data && meta && Date.now() - new Date(data.created_at).getTime() < 24 * 60 * 60 * 1000) {
    const { data: shop } = await supabase.from('shops').select('id, name').eq('seller_id', sellerId).maybeSingle();
    return {
      sellerId,
      shopId: shop?.id || null,
      shopName: shop?.name || 'Your Store',
      generatedAt: meta.generated_at || data.created_at,
      period: 'Past 7 Days',
      metrics: {
        totalRevenue7d: meta.metrics?.total_revenue_7d || 0,
        totalOrders7d: meta.metrics?.total_orders_7d || 0,
        averageOrderValue: 0,
        topSellingProducts: [],
        deadStockCount: 0,
        deadStockProducts: [],
        criticalRestockCount: meta.metrics?.critical_restock_count || 0,
      },
      executiveSummary: meta.executive_summary || 'Weekly store brief is ready.',
      actionableRecommendations: meta.recommendations || [],
    };
  }

  return generateStoreIntelligenceDigest(supabase, sellerId);
}

/**
 * Unified batch processor for weekly store digest across active sellers.
 */
export async function runWeeklyStoreIntelligence(
  supabase: SupabaseClient<Database>
): Promise<{ processedSellers: number; executedAt: string }> {
  const executedAt = new Date().toISOString();

  // Find all distinct sellers with active products
  const { data: sellers } = await supabase
    .from('products')
    .select('seller_id')
    .eq('approval_status', 'approved')
    .limit(100);

  const uniqueSellerIds = Array.from(new Set((sellers || []).map((s) => s.seller_id)));

  for (const sellerId of uniqueSellerIds) {
    try {
      await generateStoreIntelligenceDigest(supabase, sellerId);
    } catch (e) {
      console.warn(`[Store Intelligence] Error for seller ${sellerId}:`, e);
    }
  }

  return {
    processedSellers: uniqueSellerIds.length,
    executedAt,
  };
}
