import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { getAuthenticatedUser } from '@/lib/auth';
import { getPersonalizedFeed } from '@/lib/cache';
import { fetchFeedFromDB } from '@/lib/personalized-feed';
import { assignFeedVariant } from '@/lib/ltr-rank';
import { createClient } from '@/lib/supabase/server';

export type { FeedCarousel, FeedResponse } from '@/lib/personalized-feed';

export async function GET(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;

    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);
    const userId = session?.user.id ?? null;
    if (userId && assignFeedVariant(userId) === 'v2') {
      const rankedUrl = new URL('/api/v1/feed/personalized/v2', request.url);
      const ranked = await fetch(rankedUrl, { headers: request.headers });
      const body = await ranked.json();
      return NextResponse.json(body, { status: ranked.status });
    }
    const feed = userId ? await getPersonalizedFeed(userId) : await fetchFeedFromDB(null);
    return NextResponse.json(userId ? { ...feed, variant: 'v1' } : feed);
  } catch (err: unknown) {
    console.error('[Personalized Feed API] Error:', err);
    const msg = err instanceof Error ? err.message : 'Internal error generating personalized feed.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
