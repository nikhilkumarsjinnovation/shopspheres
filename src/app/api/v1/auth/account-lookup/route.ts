import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const body: unknown = await request.json();
  const email = body && typeof body === 'object' && 'email' in body && typeof body.email === 'string'
    ? body.email.trim().toLowerCase()
    : '';
  if (!email) return NextResponse.json({ exists: false });

  const admin = createAdminClient();
  let page = 1;
  let match: { identities?: Array<{ provider?: string }> } | undefined;
  while (page <= 5 && !match) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (data.users.length < 200) break;
    page += 1;
  }
  if (!match) return NextResponse.json({ exists: false });
  const providers = (match.identities ?? []).map((identity) => identity.provider).filter((provider): provider is string => Boolean(provider));
  const method = providers.includes('google')
    ? 'Google'
    : providers.includes('email')
      ? 'email and password'
      : 'an existing sign-in method';
  return NextResponse.json({
    exists: true,
    method,
    message: `This email already has an account. It was created with ${method}.`,
  });
}
