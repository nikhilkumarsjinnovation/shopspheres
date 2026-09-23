import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { parseFeedWeights } from '@/lib/feed-weights';
import type { Product } from '@/types/database.types';

type FeedProduct = Pick<
  Product,
  | 'id'
  | 'title'
  | 'description'
  | 'price'
  | 'compare_at_price'
  | 'stock'
  | 'condition'
  | 'category'
  | 'sub_category'
  | 'tags'
  | 'attributes'
  | 'image_urls'
  | 'average_rating'
  | 'review_count'
  | 'created_at'
>;

export interface FeedCarousel {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  products: FeedProduct[];
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);
    const userId = session?.user.id ?? null;

    let personaPreference = 'everyday';
    let categoryWeights: Record<string, number> = {};
    let recentChatIntents: string[] = [];

    if (userId) {
      const { data: profile, error: profileError } = await supabase
        .from('ai_user_profiles')
        .select('persona_preference, feed_weights')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        throw new Error(profileError.message);
      }

      if (profile) {
        personaPreference = profile.persona_preference || 'everyday';
        const weights = parseFeedWeights(profile.feed_weights);
        categoryWeights = weights.category_weights;
        recentChatIntents = weights.recent_chat_intents;
      }
    }

    const { data: allApprovedProducts, error: prodErr } = await supabase
      .from('products')
      .select('id, title, description, price, compare_at_price, stock, condition, category, sub_category, tags, attributes, image_urls, average_rating, review_count, created_at')
      .eq('approval_status', 'approved')
      .order('created_at', { ascending: false });

    if (prodErr || !allApprovedProducts) {
      throw new Error(`Failed to load catalog inventory: ${prodErr?.message ?? 'empty catalog'}`);
    }

    const carousels: FeedCarousel[] = [];
    let isPersonalized = false;

    if (recentChatIntents.length > 0) {
      const chatMatchedProducts = allApprovedProducts.filter((product) => {
        const text = `${product.title} ${product.description} ${(product.tags || []).join(' ')} ${product.category}`.toLowerCase();
        return recentChatIntents.some((intent) => text.includes(intent.toLowerCase()));
      });

      if (chatMatchedProducts.length > 0) {
        carousels.push({
          id: 'ai-consultation',
          title: 'Curated from Your Recent AI Consultation',
          subtitle: `Based on your recent interest in "${recentChatIntents.slice(0, 3).join(', ')}"`,
          badge: 'AI Tailored',
          products: chatMatchedProducts.slice(0, 8),
        });
        isPersonalized = true;
      }
    }

    const sortedCategories = Object.entries(categoryWeights).sort((a, b) => b[1] - a[1]);
    const topCategoryEntry = sortedCategories[0];
    if (topCategoryEntry) {
      const topCategory = topCategoryEntry[0];
      const categoryProducts = allApprovedProducts.filter(
        (product) => product.category.toLowerCase() === topCategory.toLowerCase()
      );

      if (categoryProducts.length > 0) {
        carousels.push({
          id: `affinity-${topCategory.toLowerCase().replace(/\s+/g, '-')}`,
          title: `Trending in ${topCategory}`,
          subtitle: 'Selected based on your browsing and conversational preferences',
          badge: 'For You',
          products: categoryProducts.slice(0, 8),
        });
        isPersonalized = true;
      }
    }

    const topRatedProducts = [...allApprovedProducts]
      .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
      .slice(0, 8);

    carousels.push({
      id: 'top-rated',
      title: 'Highest Rated by Indian Shoppers',
      subtitle: 'Products with verified 5-star customer feedback',
      badge: 'Bestsellers',
      products: topRatedProducts,
    });

    carousels.push({
      id: 'new-arrivals',
      title: 'Fresh Arrivals on ShopSphere India',
      subtitle: 'Recently approved listings from verified Indian merchants',
      products: allApprovedProducts.slice(0, 8),
    });

    return NextResponse.json({
      personalized: isPersonalized,
      userPersona: personaPreference,
      summary: isPersonalized
        ? `Feed personalized using ${recentChatIntents.length} chat signals and ${sortedCategories.length} category affinities.`
        : 'Displaying standard discovery feed. Chat with your Personal AI to customize your recommendations in real-time.',
      carousels,
      totalLiveProducts: allApprovedProducts.length,
    });
  } catch (err: unknown) {
    console.error('[Personalized Feed API] Error:', err);
    const msg = err instanceof Error ? err.message : 'Internal error generating personalized feed.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
