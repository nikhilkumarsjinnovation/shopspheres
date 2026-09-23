import { NextRequest, NextResponse } from 'next/server';

export const CSRF_COOKIE = 'csrf_token';
export const CSRF_HEADER = 'x-csrf-token';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function ensureCsrfCookie(request: NextRequest, response: NextResponse): string {
  const existing = request.cookies.get(CSRF_COOKIE)?.value;
  if (existing) {
    return existing;
  }

  const token = crypto.randomUUID();
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return token;
}

/** Double-submit cookie: the header must match the cookie. Returns 403 when it does not. */
export function csrfMiddleware(request: NextRequest): NextResponse | null {
  if (SAFE_METHODS.has(request.method.toUpperCase())) {
    return null;
  }

  const cookie = request.cookies.get(CSRF_COOKIE)?.value;
  const header = request.headers.get(CSRF_HEADER);
  if (!cookie || !header || cookie !== header) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }
  return null;
}
