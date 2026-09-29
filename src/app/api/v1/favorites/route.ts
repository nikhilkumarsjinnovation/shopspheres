import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import { getFavorites, addFavorite, removeFavorite } from '@/services/favorites-service';

export async function GET(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;

    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);

    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const favorites = await getFavorites(session.user.id);
    return NextResponse.json({ favorites });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch favorites.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;
    const csrfError = csrfMiddleware(request);
    if (csrfError) return csrfError;

    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);

    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ error: 'productId is required.' }, { status: 400 });
    }

    await addFavorite(session.user.id, productId);
    return NextResponse.json({ success: true, productId, isFavorite: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to add favorite.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;
    const csrfError = csrfMiddleware(request);
    if (csrfError) return csrfError;

    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);

    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'productId is required.' }, { status: 400 });
    }

    await removeFavorite(session.user.id, productId);
    return NextResponse.json({ success: true, productId, isFavorite: false });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to remove favorite.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
