import type { ComputedUserFeatures } from '@/services/behavior-service';
import type { FeedCarousel, FeedProduct, FeedResponse } from '@/lib/personalized-feed';

interface ScoredProduct extends FeedProduct {
  score: number;
}

function categoryScore(features: ComputedUserFeatures, category: string): number {
  const direct = features.category_affinity[category] ?? 0;
  const folded = Object.entries(features.category_affinity).find(
    ([name]) => name.toLowerCase() === category.toLowerCase(),
  );
  return folded ? folded[1] : direct;
}

export function scoreProducts(products: FeedProduct[], features: ComputedUserFeatures | null): ScoredProduct[] {
  return products.map((product) => {
    const affinity = features ? categoryScore(features, product.category) : 0;
    const rating = product.average_rating || 0;
    const priceFit = features ? 1 - Math.min(1, features.price_elasticity) * (product.price > 10000 ? 0.2 : 0) : 0;
    return { ...product, score: affinity * 2 + rating + priceFit };
  });
}

export function mmr(products: ScoredProduct[], limit: number): ScoredProduct[] {
  const ranked = [...products].sort((a, b) => b.score - a.score);
  const picked: ScoredProduct[] = [];
  const usedCategories = new Set<string>();
  for (const product of ranked) {
    if (picked.length >= limit) break;
    if (usedCategories.has(product.category) && picked.length < limit - 2) continue;
    picked.push(product);
    usedCategories.add(product.category);
  }
  for (const product of ranked) {
    if (picked.length >= limit) break;
    if (!picked.some((item) => item.id === product.id)) picked.push(product);
  }
  return picked;
}

export function buildLtrFeed(products: FeedProduct[], features: ComputedUserFeatures | null, modelName: string): FeedResponse {
  const ranked = mmr(scoreProducts(products, features), 16);
  const topCategory = features
    ? Object.entries(features.category_affinity).sort((a, b) => b[1] - a[1])[0]?.[0]
    : ranked[0]?.category;
  const themed = topCategory
    ? ranked.filter((product) => product.category.toLowerCase() === topCategory.toLowerCase()).slice(0, 8)
    : [];
  const carousels: FeedCarousel[] = [];
  if (themed.length > 0 && topCategory) {
    carousels.push({
      id: 'ltr-affinity',
      title: `Because you browse ${topCategory}`,
      subtitle: `Ranked by ${modelName}`,
      badge: 'For You',
      products: themed,
    });
  }
  carousels.push({
    id: 'ltr-ranked',
    title: 'Ranked for you',
    subtitle: 'Diverse picks from your recent behavior',
    badge: 'Ranked',
    products: ranked.slice(0, 8),
  });
  return {
    personalized: true,
    userPersona: 'everyday',
    summary: `LTR feed using ${modelName}.`,
    carousels,
    totalLiveProducts: products.length,
  };
}

export function assignFeedVariant(userId: string): 'v1' | 'v2' {
  const hash = Array.from(userId).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return hash % 2 === 0 ? 'v2' : 'v1';
}
