import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { getRoleDashboardUrl } from '@/lib/auth/roles';
import type { UserRole } from '@/types/database.types';

interface ProfileRecord {
  role: UserRole;
  is_active: boolean;
}

export async function middleware(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);
  const path = request.nextUrl.pathname;

  // Assets and API endpoints
  const isPublicAsset = path.startsWith('/_next') || path.startsWith('/favicon.ico');
  const isApiPath = path.startsWith('/api');
  if (isPublicAsset || isApiPath) {
    return response;
  }

  const isAuthPage = path === '/login' || path === '/signup' || path.startsWith('/auth');

  // If authenticated user visits /login or /signup, route directly to their dashboard
  if (user && (path === '/login' || path === '/signup')) {
    const { data } = await supabase
      .from('users')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    const profile = data as ProfileRecord | null;
    if (profile && profile.is_active) {
      const destination = getRoleDashboardUrl(profile.role);
      return NextResponse.redirect(new URL(destination, request.url));
    }
  }

  // Allow unauthenticated access to auth pages
  if (isAuthPage) {
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
    const redirectUrl = new URL('/login', request.url);
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
    return NextResponse.redirect(new URL('/login?error=account_inactive', request.url));
  }

  const role = profile.role;

  // Strict Role Route Enforcement
  if (isCustomerRoute && role !== 'customer' && role !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isSellerRoute && role !== 'seller' && role !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAdminRoute && role !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
