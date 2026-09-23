import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';

export async function GET(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;
    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);

    if (!session) {
      return NextResponse.json({ addresses: [] });
    }

    const { data: addresses, error } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', session.user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ addresses: addresses || [] });
  } catch (err: unknown) {
    console.error('[Addresses API GET] Error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to fetch addresses';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;
    const csrfError = csrfMiddleware(request);
    if (csrfError) {
      return csrfError;
    }

    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);

    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      recipient_name,
      recipient_phone,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      label = 'Home',
      delivery_instructions,
      is_default = false,
    } = body;

    if (!recipient_name || !recipient_phone || !address_line1 || !city || !state || !postal_code) {
      return NextResponse.json(
        { error: 'Name, 10-digit phone, address line, city, state, and PIN code are required.' },
        { status: 400 }
      );
    }

    if (is_default) {
      const { error: clearError } = await supabase
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', session.user.id);

      if (clearError) {
        throw new Error(clearError.message);
      }
    }

    const { data: newAddress, error } = await supabase
      .from('user_addresses')
      .insert({
        user_id: session.user.id,
        recipient_name: recipient_name.trim(),
        recipient_phone: recipient_phone.trim(),
        address_line1: address_line1.trim(),
        address_line2: address_line2 ? address_line2.trim() : null,
        city: city.trim(),
        state: state.trim(),
        postal_code: postal_code.trim(),
        label: label || 'Home',
        delivery_instructions: delivery_instructions ? delivery_instructions.trim() : null,
        is_default: Boolean(is_default),
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true, address: newAddress });
  } catch (err: unknown) {
    console.error('[Addresses API POST] Error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to save address';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;
    const csrfError = csrfMiddleware(request);
    if (csrfError) {
      return csrfError;
    }

    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);

    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const addressId = searchParams.get('id');

    if (!addressId) {
      return NextResponse.json({ error: 'Address ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_addresses')
      .delete()
      .eq('id', addressId)
      .eq('user_id', session.user.id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[Addresses API DELETE] Error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to delete address';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
