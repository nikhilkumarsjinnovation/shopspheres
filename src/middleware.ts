import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import type { UserRole } from '@/types/database.types';

interface ProfileRecord {
  role: UserRole;
  is_active: boolean;
}

export async function middleware(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);
  const path = request.nextUrl.pathname;

  // Public paths that do not require role authorization
  const isAuthPath = path.startsWith('/auth');
  const isApiPath = path.startsWith('/api/auth');
  const isPublicAsset = path.startsWith('/_next') || path.startsWith('/favicon.ico');

  if (isPublicAsset || isApiPath || isAuthPath) {
    return response;
  }

  // Protected route boundaries
  const isCustomerRoute = path.startsWith('/customer');
  const isSellerRoute = path.startsWith('/seller');
  const isAdminRoute = path.startsWith('/admin');

  if (!isCustomerRoute && !isSellerRoute && !isAdminRoute) {
    return response;
  }

  // Unauthenticated users attempting to access protected routes
  if (!user) {
    const redirectUrl = new URL('/auth/login', request.url);
    redirectUrl.searchParams.set('redirectTo', path);
    return NextResponse.redirect(redirectUrl);
  }

  // Fetch user role from public.users table
  const { data } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  const profile = data as ProfileRecord | null;

  if (!profile || !profile.is_active) {
    return NextResponse.redirect(new URL('/auth/login?error=account_inactive', request.url));
  }

  const role = profile.role;

  // Strict Role Route Enforcement
  if (isCustomerRoute && role !== 'customer' && role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isSellerRoute && role !== 'seller') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isAdminRoute && role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
