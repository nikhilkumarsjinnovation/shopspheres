import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import { getWallet, topupWallet } from '@/services/wallet-service';

export async function GET(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;

    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);

    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const wallet = await getWallet(session.user.id);
    return NextResponse.json({ wallet });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve wallet.';
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
    const amount = Number(body.amount);

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Valid positive top-up amount required.' }, { status: 400 });
    }

    const result = await topupWallet(session.user.id, amount, body.description);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Wallet top-up failed.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
