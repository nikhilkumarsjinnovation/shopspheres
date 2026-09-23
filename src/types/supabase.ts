// hand-edited: regenerate after apply
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          target_entity: string
          target_id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          target_entity: string
          target_id: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          target_entity?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          content: string
          created_at: string
          extracted_intents: Json | null
          id: string
          recommended_product_ids: string[] | null
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          extracted_intents?: Json | null
          id?: string
          recommended_product_ids?: string[] | null
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          extracted_intents?: Json | null
          id?: string
          recommended_product_ids?: string[] | null
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_user_profiles: {
        Row: {
          brand_affinities: string[]
          created_at: string
          dietary_preferences: string[]
          feed_weights: Json
          interest_tags: string[]
          is_pro: boolean
          last_scan_date: string | null
          persona_preference: string
          price_sensitivity: string
          total_scans_today: number
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_affinities?: string[]
          created_at?: string
          dietary_preferences?: string[]
          feed_weights?: Json
          interest_tags?: string[]
          is_pro?: boolean
          last_scan_date?: string | null
          persona_preference?: string
          price_sensitivity?: string
          total_scans_today?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_affinities?: string[]
          created_at?: string
          dietary_preferences?: string[]
          feed_weights?: Json
          interest_tags?: string[]
          is_pro?: boolean
          last_scan_date?: string | null
          persona_preference?: string
          price_sensitivity?: string
          total_scans_today?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_user_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          quantity: number
          seller_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          seller_id: string
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          seller_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      order_returns: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          order_id: string
          order_item_id: string
          pickup_tracking_number: string | null
          reason: string
          refund_amount: number
          seller_id: string
          seller_notes: string | null
          status: Database["public"]["Enums"]["return_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          order_id: string
          order_item_id: string
          pickup_tracking_number?: string | null
          reason: string
          refund_amount: number
          seller_id: string
          seller_notes?: string | null
          status?: Database["public"]["Enums"]["return_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          order_id?: string
          order_item_id?: string
          pickup_tracking_number?: string | null
          reason?: string
          refund_amount?: number
          seller_id?: string
          seller_notes?: string | null
          status?: Database["public"]["Enums"]["return_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_tracking_events: {
        Row: {
          description: string | null
          id: string
          location: string | null
          occurred_at: string
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
          title: string
        }
        Insert: {
          description?: string | null
          id?: string
          location?: string | null
          occurred_at?: string
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
          title: string
        }
        Update: {
          description?: string | null
          id?: string
          location?: string | null
          occurred_at?: string
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_tracking_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_id: string
          gift_reveal_date: string | null
          id: string
          is_gift: boolean
          recipient_email: string | null
          recipient_phone: string | null
          shipping_address: Json
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          gift_reveal_date?: string | null
          id?: string
          is_gift?: boolean
          recipient_email?: string | null
          recipient_phone?: string | null
          shipping_address: Json
          status?: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          gift_reveal_date?: string | null
          id?: string
          is_gift?: boolean
          recipient_email?: string | null
          recipient_phone?: string | null
          shipping_address?: Json
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          body: string
          created_at: string
          customer_id: string
          helpful_votes: number
          id: string
          image_urls: string[] | null
          is_verified_purchase: boolean
          product_id: string
          rating: number
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          customer_id: string
          helpful_votes?: number
          id?: string
          image_urls?: string[] | null
          is_verified_purchase?: boolean
          product_id: string
          rating: number
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          customer_id?: string
          helpful_votes?: number
          id?: string
          image_urls?: string[] | null
          is_verified_purchase?: boolean
          product_id?: string
          rating?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          attributes: Json
          created_at: string
          id: string
          image_url: string | null
          price: number
          product_id: string
          sku: string
          stock: number
          title: string
        }
        Insert: {
          attributes?: Json
          created_at?: string
          id?: string
          image_url?: string | null
          price: number
          product_id: string
          sku: string
          stock?: number
          title: string
        }
        Update: {
          attributes?: Json
          created_at?: string
          id?: string
          image_url?: string | null
          price?: number
          product_id?: string
          sku?: string
          stock?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          ai_categorized: boolean
          approval_status: Database["public"]["Enums"]["approval_status"]
          attributes: Json
          average_rating: number
          category: string
          category_id: string | null
          compare_at_price: number | null
          condition: string
          created_at: string
          description: string
          id: string
          image_urls: string[]
          price: number
          rejection_reason: string | null
          review_count: number
          seller_id: string
          shop_id: string | null
          slug: string | null
          stock: number
          sub_category: string | null
          sub_category_id: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          ai_categorized?: boolean
          approval_status?: Database["public"]["Enums"]["approval_status"]
          attributes?: Json
          average_rating?: number
          category: string
          category_id?: string | null
          compare_at_price?: number | null
          condition?: string
          created_at?: string
          description: string
          id?: string
          image_urls?: string[]
          price: number
          rejection_reason?: string | null
          review_count?: number
          seller_id: string
          shop_id?: string | null
          slug?: string | null
          stock?: number
          sub_category?: string | null
          sub_category_id?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          ai_categorized?: boolean
          approval_status?: Database["public"]["Enums"]["approval_status"]
          attributes?: Json
          average_rating?: number
          category?: string
          category_id?: string | null
          compare_at_price?: number | null
          condition?: string
          created_at?: string
          description?: string
          id?: string
          image_urls?: string[]
          price?: number
          rejection_reason?: string | null
          review_count?: number
          seller_id?: string
          shop_id?: string | null
          slug?: string | null
          stock?: number
          sub_category?: string | null
          sub_category_id?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      review_helpful_votes: {
        Row: {
          created_at: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          review_id?: string
          user_id?: string
        }
        Relationships: []
      }
      shops: {
        Row: {
          address_line: string
          allows_bopis: boolean
          banner_url: string | null
          city: string
          created_at: string
          description: string | null
          id: string
          is_verified: boolean
          latitude: number | null
          location: string | null
          logo_url: string | null
          longitude: number | null
          name: string
          pickup_radius_km: number
          postal_code: string
          rating: number
          seller_id: string
          slug: string
          state: string
          updated_at: string
        }
        Insert: {
          address_line: string
          allows_bopis?: boolean
          banner_url?: string | null
          city: string
          created_at?: string
          description?: string | null
          id?: string
          is_verified?: boolean
          latitude?: number | null
          location?: string | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          pickup_radius_km?: number
          postal_code: string
          rating?: number
          seller_id: string
          slug: string
          state: string
          updated_at?: string
        }
        Update: {
          address_line?: string
          allows_bopis?: boolean
          banner_url?: string | null
          city?: string
          created_at?: string
          description?: string | null
          id?: string
          is_verified?: boolean
          latitude?: number | null
          location?: string | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          pickup_radius_km?: number
          postal_code?: string
          rating?: number
          seller_id?: string
          slug?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shops_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_categories: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          slug: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          slug: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_accessibility_profiles: {
        Row: {
          auditory_text_captions: boolean
          auditory_visual_alerts: boolean
          cognitive_simplified_ui: boolean
          cognitive_step_confirmation: boolean
          created_at: string
          has_disability: boolean
          motor_large_touch_targets: boolean
          motor_sticky_keys: boolean
          motor_voice_navigation: boolean
          special_signin_enabled: boolean
          updated_at: string
          user_id: string
          visual_audio_descriptions: boolean
          visual_font_magnification: number
          visual_high_contrast: boolean
          visual_screen_reader_optimized: boolean
        }
        Insert: {
          auditory_text_captions?: boolean
          auditory_visual_alerts?: boolean
          cognitive_simplified_ui?: boolean
          cognitive_step_confirmation?: boolean
          created_at?: string
          has_disability?: boolean
          motor_large_touch_targets?: boolean
          motor_sticky_keys?: boolean
          motor_voice_navigation?: boolean
          special_signin_enabled?: boolean
          updated_at?: string
          user_id: string
          visual_audio_descriptions?: boolean
          visual_font_magnification?: number
          visual_high_contrast?: boolean
          visual_screen_reader_optimized?: boolean
        }
        Update: {
          auditory_text_captions?: boolean
          auditory_visual_alerts?: boolean
          cognitive_simplified_ui?: boolean
          cognitive_step_confirmation?: boolean
          created_at?: string
          has_disability?: boolean
          motor_large_touch_targets?: boolean
          motor_sticky_keys?: boolean
          motor_voice_navigation?: boolean
          special_signin_enabled?: boolean
          updated_at?: string
          user_id?: string
          visual_audio_descriptions?: boolean
          visual_font_magnification?: number
          visual_high_contrast?: boolean
          visual_screen_reader_optimized?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_accessibility_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          created_at: string
          delivery_instructions: string | null
          id: string
          is_default: boolean
          label: string
          postal_code: string
          recipient_name: string
          recipient_phone: string
          state: string
          user_id: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          created_at?: string
          delivery_instructions?: string | null
          id?: string
          is_default?: boolean
          label?: string
          postal_code: string
          recipient_name: string
          recipient_phone: string
          state: string
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          created_at?: string
          delivery_instructions?: string | null
          id?: string
          is_default?: boolean
          label?: string
          postal_code?: string
          recipient_name?: string
          recipient_phone?: string
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_seller: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      approval_status: "pending" | "approved" | "rejected"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "packed"
        | "shipped"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
        | "return_requested"
        | "returned"
        | "refunded"
      return_status:
        | "requested"
        | "approved"
        | "pickup_scheduled"
        | "received"
        | "refund_issued"
        | "rejected"
      user_role: "customer" | "seller" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
