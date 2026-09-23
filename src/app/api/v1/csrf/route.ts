import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { CSRF_COOKIE, ensureCsrfCookie } from '@/lib/csrf';

export async function GET(request: NextRequest) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const response = NextResponse.json({ ok: true });
  const token = ensureCsrfCookie(request, response);
  if (!response.cookies.get(CSRF_COOKIE)) {
    response.cookies.set(CSRF_COOKIE, token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }
  return response;
}
