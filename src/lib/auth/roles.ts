import type { UserRole } from '@/types/database.types';

export function getRoleDashboardUrl(role?: UserRole | string | null): string {
  switch (role) {
    case 'customer':
      return '/customer/dashboard';
    case 'seller':
      return '/seller/dashboard';
    case 'admin':
      return '/admin/dashboard';
    default:
      return '/customer/dashboard';
  }
}
