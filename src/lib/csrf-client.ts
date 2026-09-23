const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const prefix = `${name}=`;
  const match = document.cookie.split('; ').find((row) => row.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

async function ensureToken(): Promise<string | null> {
  const existing = readCookie(CSRF_COOKIE);
  if (existing) {
    return existing;
  }
  await fetch('/api/csrf', { credentials: 'same-origin' });
  return readCookie(CSRF_COOKIE);
}

export async function fetchWithCsrf(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const method = (init.method ?? 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const token = await ensureToken();
    if (token) {
      headers.set(CSRF_HEADER, token);
    }
  }
  return fetch(input, { ...init, headers, credentials: 'same-origin' });
}
