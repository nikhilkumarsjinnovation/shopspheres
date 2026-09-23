export type { Database, Json } from './supabase';
import type { Database } from './supabase';

// Enums
export type UserRole = Database['public']['Enums']['user_role'];
export type OrderStatus = Database['public']['Enums']['order_status'];
export type ApprovalStatus = Database['public']['Enums']['approval_status'];
export type ReturnStatus = Database['public']['Enums']['return_status'];

// Users & Accessibility
export type UserProfile = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

export type UserAccessibilityProfile = Database['public']['Tables']['user_accessibility_profiles']['Row'];
export type UserAccessibilityProfileInsert = Database['public']['Tables']['user_accessibility_profiles']['Insert'];
export type UserAccessibilityProfileUpdate = Database['public']['Tables']['user_accessibility_profiles']['Update'];

// Personal AI
export type AiUserProfile = Database['public']['Tables']['ai_user_profiles']['Row'];
export type AiUserProfileInsert = Database['public']['Tables']['ai_user_profiles']['Insert'];
export type AiUserProfileUpdate = Database['public']['Tables']['ai_user_profiles']['Update'];

export type AiConversation = Database['public']['Tables']['ai_conversations']['Row'];
export type AiConversationInsert = Database['public']['Tables']['ai_conversations']['Insert'];

// Taxonomy & Shops
export type Category = Database['public']['Tables']['categories']['Row'];
export type CategoryInsert = Database['public']['Tables']['categories']['Insert'];

export type SubCategory = Database['public']['Tables']['sub_categories']['Row'];
export type SubCategoryInsert = Database['public']['Tables']['sub_categories']['Insert'];

export type Shop = Database['public']['Tables']['shops']['Row'];
export type ShopInsert = Database['public']['Tables']['shops']['Insert'];
export type ShopUpdate = Database['public']['Tables']['shops']['Update'];

// Products & Variants
export type Product = Database['public']['Tables']['products']['Row'];
export type ProductInsert = Database['public']['Tables']['products']['Insert'];
export type ProductUpdate = Database['public']['Tables']['products']['Update'];

export type ProductVariant = Database['public']['Tables']['product_variants']['Row'];
export type ProductVariantInsert = Database['public']['Tables']['product_variants']['Insert'];

// Reviews
export type ProductReview = Database['public']['Tables']['product_reviews']['Row'];
export type ProductReviewInsert = Database['public']['Tables']['product_reviews']['Insert'];
export type ProductReviewUpdate = Database['public']['Tables']['product_reviews']['Update'];

// Addresses & Orders
export type UserAddress = Database['public']['Tables']['user_addresses']['Row'];
export type UserAddressInsert = Database['public']['Tables']['user_addresses']['Insert'];
export type UserAddressUpdate = Database['public']['Tables']['user_addresses']['Update'];

export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderInsert = Database['public']['Tables']['orders']['Insert'];
export type OrderUpdate = Database['public']['Tables']['orders']['Update'];

export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type OrderItemInsert = Database['public']['Tables']['order_items']['Insert'];

export type OrderTrackingEvent = Database['public']['Tables']['order_tracking_events']['Row'];
export type OrderTrackingEventInsert = Database['public']['Tables']['order_tracking_events']['Insert'];

export type OrderReturn = Database['public']['Tables']['order_returns']['Row'];
export type OrderReturnInsert = Database['public']['Tables']['order_returns']['Insert'];

// Admin Audit
export type AdminAuditLog = Database['public']['Tables']['admin_audit_logs']['Row'];
export type AdminAuditLogInsert = Database['public']['Tables']['admin_audit_logs']['Insert'];
