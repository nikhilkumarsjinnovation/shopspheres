export type { Database } from './supabase';
import type { Database } from './supabase';

export type UserRole = Database['public']['Enums']['user_role'];
export type OrderStatus = Database['public']['Enums']['order_status'];
export type UserProfile = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];
