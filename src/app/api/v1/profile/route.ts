import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import { getWallet } from '@/services/wallet-service';

export async function GET(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;

    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);

    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { user, profile } = session;
    const adminDb = createAdminClient();

    // Fetch counts and related profile sub-systems concurrently
    const [
      addressRes,
      orderRes,
      friendsRes,
      wallet,
      aiProfileRes,
      accessibilityRes,
    ] = await Promise.all([
      supabase.from('user_addresses').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', user.id),
      supabase.from('friend_relationships').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'accepted'),
      getWallet(user.id).catch(() => null),
      adminDb.from('ai_user_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_accessibility_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    ]);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone || (user.user_metadata?.phone as string | undefined) || null,
        created_at: user.created_at,
        metadata: user.user_metadata,
      },
      profile: {
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        role: profile.role,
        is_active: profile.is_active,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      },
      counts: {
        addresses: addressRes.count ?? 0,
        orders: orderRes.count ?? 0,
        friends: friendsRes.count ?? 0,
      },
      wallet: wallet
        ? {
            balance: wallet.balance,
            currency: wallet.currency,
            is_frozen: wallet.is_frozen,
          }
        : null,
      aiProfile: aiProfileRes.data || null,
      accessibilityProfile: accessibilityRes.data || null,
    });
  } catch (err: unknown) {
    console.error('[Profile API GET] Error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to retrieve profile';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;
    const csrfError = csrfMiddleware(request);
    if (csrfError) return csrfError;

    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);

    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { user } = session;
    const body = await request.json();
    const adminDb = createAdminClient();

    const updates: {
      full_name?: string;
      avatar_url?: string;
    } = {};

    const authUserUpdates: {
      data?: Record<string, any>;
    } = {
      data: {},
    };

    // 1. Update Full Name
    if (typeof body.full_name === 'string') {
      const trimmed = body.full_name.trim();
      updates.full_name = trimmed;
      if (authUserUpdates.data) {
        authUserUpdates.data.full_name = trimmed;
      }
    }

    // 2. Update Phone Number (formats Indian 10-digit mobile)
    if (typeof body.phone === 'string') {
      const cleanPhone = body.phone.trim();
      const digitsOnly = cleanPhone.replace(/\D/g, '');
      if (digitsOnly.length > 0 && digitsOnly.length < 10) {
        return NextResponse.json({ error: 'Please enter a valid 10-digit Indian mobile number.' }, { status: 400 });
      }
      const formattedPhone = digitsOnly.length === 10 ? `+91 ${digitsOnly}` : cleanPhone;
      if (authUserUpdates.data) {
        authUserUpdates.data.phone = formattedPhone;
      }
    }

    // 3. Update Avatar URL
    if (typeof body.avatar_url === 'string') {
      const trimmedAvatar = body.avatar_url.trim();
      updates.avatar_url = trimmedAvatar;
      if (authUserUpdates.data) {
        authUserUpdates.data.avatar_url = trimmedAvatar;
      }
    }

    // Apply to public.users table
    if (updates.full_name !== undefined || updates.avatar_url !== undefined) {
      const { error: userTableError } = await adminDb
        .from('users')
        .update({
          full_name: updates.full_name !== undefined ? updates.full_name : undefined,
          avatar_url: updates.avatar_url !== undefined ? updates.avatar_url : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (userTableError) {
        throw new Error(userTableError.message);
      }
    }

    // 4. Update Email
    if (typeof body.email === 'string') {
      const newEmail = body.email.trim().toLowerCase();
      if (newEmail && newEmail !== user.email?.toLowerCase()) {
        const { error: emailError } = await supabase.auth.updateUser({ email: newEmail });
        if (emailError) {
          return NextResponse.json({ error: emailError.message }, { status: 400 });
        }
        await adminDb
          .from('users')
          .update({ email: newEmail, updated_at: new Date().toISOString() })
          .eq('id', user.id);
      }
    }

    // 5. Update Password
    if (typeof body.new_password === 'string' && body.new_password.trim()) {
      const pass = body.new_password.trim();
      if (pass.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
      }
      const { error: passError } = await supabase.auth.updateUser({ password: pass });
      if (passError) {
        return NextResponse.json({ error: passError.message }, { status: 400 });
      }
    }

    // Update Auth user_metadata if any
    if (authUserUpdates.data && Object.keys(authUserUpdates.data).length > 0) {
      await supabase.auth.updateUser({ data: authUserUpdates.data });
    }

    // 6. Update AI Shopping Persona Preference
    if (typeof body.ai_persona === 'string') {
      const validPersonas = ['everyday', 'tech', 'fashion', 'gourmet', 'beauty'];
      if (validPersonas.includes(body.ai_persona)) {
        await adminDb.from('ai_user_profiles').upsert(
          {
            user_id: user.id,
            persona_preference: body.ai_persona,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        );
      }
    }

    // 7. Reset AI Category Weights / Recommendation Memory
    if (body.reset_ai_weights === true) {
      await adminDb
        .from('ai_user_profiles')
        .update({
          feed_weights: {
            category_weights: {},
            recent_chat_intents: [],
            boosted_keywords: [],
            last_updated: Date.now(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
    }

    // Return latest profile
    const { data: updatedProfile } = await adminDb.from('users').select('*').eq('id', user.id).single();

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      profile: updatedProfile,
    });
  } catch (err: unknown) {
    console.error('[Profile API PATCH] Error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to update profile';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
