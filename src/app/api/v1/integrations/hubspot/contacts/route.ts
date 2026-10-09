import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { requireActiveAdmin } from '@/lib/admin-guard';
import { csrfMiddleware } from '@/lib/csrf';
import { enforceRateLimit, integrationsLimiter, rateLimitKey } from '@/lib/rate-limiter';
import { createClient } from '@/lib/supabase/server';
import { toHubSpotContactProperties, upsertHubSpotContact } from '@/services/hubspot-sync';

const USER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const limited = await enforceRateLimit(integrationsLimiter, await rateLimitKey(request));
  if (limited) return limited;
  const csrfError = csrfMiddleware(request);
  if (csrfError) return csrfError;

  const supabase = await createClient();
  const gate = await requireActiveAdmin(supabase);
  if (gate.error || !gate.session) return gate.error;

  const body: unknown = await request.json().catch(() => null);
  const userId = body && typeof body === 'object' && 'userId' in body && typeof body.userId === 'string' ? body.userId : '';
  if (!USER_ID_PATTERN.test(userId)) {
    return NextResponse.json({ error: 'userId must be a UUID.' }, { status: 400 });
  }

  const { data: user, error: readError } = await supabase
    .from('users')
    .select('id, email, full_name')
    .eq('id', userId)
    .maybeSingle();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN ?? '';
  let properties;
  try {
    properties = toHubSpotContactProperties({ email: user.email, fullName: user.full_name });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Contact could not be mapped.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const synced = await upsertHubSpotContact({ email: user.email, fullName: user.full_name }, token);
  const { error: saveError } = await supabase.from('crm_sync_state').upsert(
    {
      user_id: user.id,
      email: properties.email,
      hubspot_contact_id: synced.ok ? synced.contactId : null,
      last_status: synced.ok ? 'synced' : 'error',
      last_error: synced.ok ? null : synced.error,
      last_synced_at: synced.ok ? new Date().toISOString() : null,
    },
    { onConflict: 'user_id' },
  );

  const { error: auditError } = await supabase.from('admin_audit_logs').insert({
    action: synced.ok ? 'hubspot_contact_sync' : 'hubspot_contact_sync_failed',
    admin_id: gate.session.user.id,
    target_entity: 'users',
    target_id: user.id,
    metadata: { email: properties.email, hubspotStatus: synced.status },
  });

  if (!synced.ok) {
    return NextResponse.json({ error: synced.error, syncSaved: !saveError }, { status: synced.status === 501 ? 501 : 502 });
  }
  if (saveError) {
    return NextResponse.json(
      { error: 'HubSpot accepted the contact, but crm_sync_state is not available yet.', contactId: synced.contactId },
      { status: 502 },
    );
  }
  if (auditError) {
    return NextResponse.json({ ok: true, contactId: synced.contactId, auditSaved: false }, { status: 200 });
  }
  return NextResponse.json({ ok: true, contactId: synced.contactId });
}
