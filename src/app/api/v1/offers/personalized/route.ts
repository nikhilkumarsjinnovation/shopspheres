import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { parseFeedWeights } from '@/lib/feed-weights';
import { getUserFeatures } from '@/services/behavior-service';

export interface BehavioralOffer {
  id: string;
  code: string;
  title: string;
  description: string;
  badge: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount: number;
  targetCategory?: string;
  expiresInHours: number;
}

export async function GET(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;
    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);

    let personaPreference = 'everyday';
    let topCategory = 'Electronics';
    let recentIntents: string[] = [];

    let priceElasticity = 0.5;
    let giftingPropensity = 0;
    if (session) {
      const { data: profile, error: profileError } = await supabase
        .from('ai_user_profiles')
        .select('persona_preference, feed_weights')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (profileError) {
        throw new Error(profileError.message);
      }

      if (profile) {
        personaPreference = profile.persona_preference || 'everyday';
        const weights = parseFeedWeights(profile.feed_weights);
        const sortedCats = Object.entries(weights.category_weights).sort((a, b) => b[1] - a[1]);
        const topEntry = sortedCats[0];
        if (topEntry) {
          topCategory = topEntry[0];
        }
        recentIntents = weights.recent_chat_intents;
      }

      const stored = await getUserFeatures(supabase, session.user.id);
      if (stored) {
        priceElasticity = stored.price_elasticity;
        giftingPropensity = stored.gifting_propensity;
        const topAffinity = Object.entries(stored.category_affinity).sort((a, b) => b[1] - a[1])[0];
        if (topAffinity) {
          topCategory = topAffinity[0];
        }
      }
    }

    const offers: BehavioralOffer[] = [];
    const lowerCategory = topCategory.toLowerCase();
    const intentsText = recentIntents.join(' ').toLowerCase();

    if (lowerCategory.includes('audio') || intentsText.includes('headphone') || intentsText.includes('earbuds') || intentsText.includes('boat')) {
      offers.push({
        id: 'off_audio15',
        code: 'AUDIO15',
        title: '🎧 Audio Bonanza: Flat 15% OFF',
        description: 'Curated from your interest in boAt & audio gear. Max discount ₹400.',
        badge: 'AI Behavior Match',
        discountType: 'percentage',
        discountValue: 15,
        maxDiscount: 400,
        minOrderAmount: 999,
        targetCategory: 'Audio & Accessories',
        expiresInHours: 24,
      });
    } else if (lowerCategory.includes('fashion') || intentsText.includes('kurta') || intentsText.includes('ethnic') || intentsText.includes('watch')) {
      offers.push({
        id: 'off_utsav500',
        code: 'UTSAV500',
        title: '🪔 Festive Ethnic Wear: Flat ₹500 OFF',
        description: 'Curated for your fashion style on orders above ₹1,999.',
        badge: 'Festive Stylist Deal',
        discountType: 'fixed',
        discountValue: 500,
        minOrderAmount: 1999,
        targetCategory: 'Fashion & Apparel',
        expiresInHours: 48,
      });
    } else if (lowerCategory.includes('kitchen') || intentsText.includes('cooker') || intentsText.includes('mixer')) {
      offers.push({
        id: 'off_kitchen300',
        code: 'KITCHEN300',
        title: '🍲 Home Chef Savings: Flat ₹300 OFF',
        description: 'Instant discount on kitchen appliances & cookware above ₹1,500.',
        badge: 'Smart Kitchen Pick',
        discountType: 'fixed',
        discountValue: 300,
        minOrderAmount: 1500,
        targetCategory: 'Home & Kitchen',
        expiresInHours: 24,
      });
    } else {
      offers.push({
        id: 'off_tech1000',
        code: 'TECH1000',
        title: '⚡ TechFest: Extra ₹1,000 Instant Discount',
        description: 'Tailored for your interest in 5G smartphones & tech gadgets on orders above ₹10,000.',
        badge: 'AI Curated Offer',
        discountType: 'fixed',
        discountValue: 1000,
        minOrderAmount: 10000,
        targetCategory: 'Electronics',
        expiresInHours: 24,
      });
    }

    offers.push({
      id: 'off_welcome10',
      code: 'WELCOME10',
      title: '🎉 Welcome Shopper: Flat 10% OFF',
      description: 'Exclusive 10% discount on your cart up to ₹250 for orders above ₹499.',
      badge: 'Welcome Special',
      discountType: 'percentage',
      discountValue: Math.round(10 + priceElasticity * 10),
      maxDiscount: Math.round(250 + priceElasticity * 150),
      minOrderAmount: 499,
      expiresInHours: 72,
    });

    if (giftingPropensity >= 0.2) {
      offers.push({
        id: 'off_gift300',
        code: 'GIFT300',
        title: '🎁 Gift a Friend: ₹300 OFF',
        description: 'Extra savings when you send a gift, based on your gifting activity.',
        badge: 'Gift Match',
        discountType: 'fixed',
        discountValue: 300,
        minOrderAmount: 1499,
        expiresInHours: 48,
      });
    }

    offers.push({
      id: 'off_upisave50',
      code: 'UPISAVE50',
      title: '🇮🇳 Instant UPI Discount: Flat ₹50 OFF',
      description: 'Get flat ₹50 off on orders above ₹499 paid via Google Pay, PhonePe, Paytm, or BHIM.',
      badge: 'UPI Exclusive',
      discountType: 'fixed',
      discountValue: 50,
      minOrderAmount: 499,
      expiresInHours: 12,
    });

    return NextResponse.json({
      userContext: {
        topCategory,
        recentIntents: recentIntents.slice(0, 3),
        persona: personaPreference,
      },
      offers,
    });
  } catch (err: unknown) {
    console.error('[Personalized Offers API] Error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to generate personalized offers.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
