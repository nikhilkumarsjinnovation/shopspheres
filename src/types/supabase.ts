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
          embedding: string | null
          id: string
          image_urls: string[]
          price: number
          rejection_reason: string | null
          resubmit_count: number
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
          embedding?: string | null
          id?: string
          image_urls?: string[]
          price: number
          rejection_reason?: string | null
          resubmit_count?: number
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
          embedding?: string | null
          id?: string
          image_urls?: string[]
          price?: number
          rejection_reason?: string | null
          resubmit_count?: number
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
          branding_edits_used: number
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
          branding_edits_used?: number
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
          branding_edits_used?: number
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
      user_behavior_events: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          metadata: Json | null
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          event_type: string
          id?: string
          metadata?: Json | null
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      friend_relationships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          initiated_by: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          initiated_by: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          initiated_by?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gift_wrapping_options: {
        Row: {
          animation_url: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          preview_image_url: string | null
          price: number
        }
        Insert: {
          animation_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          preview_image_url?: string | null
          price?: number
        }
        Update: {
          animation_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          preview_image_url?: string | null
          price?: number
        }
        Relationships: []
      }
      gifts: {
        Row: {
          created_at: string
          delivered_at: string | null
          id: string
          message: string | null
          order_id: string | null
          recipient_email: string | null
          recipient_id: string | null
          recipient_phone: string | null
          reveal_date: string | null
          reveal_trigger: string
          revealed_at: string | null
          sender_id: string
          status: string
          updated_at: string
          wrapping_option_id: string | null
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          id?: string
          message?: string | null
          order_id?: string | null
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          reveal_date?: string | null
          reveal_trigger?: string
          revealed_at?: string | null
          sender_id: string
          status?: string
          updated_at?: string
          wrapping_option_id?: string | null
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          id?: string
          message?: string | null
          order_id?: string | null
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          reveal_date?: string | null
          reveal_trigger?: string
          revealed_at?: string | null
          sender_id?: string
          status?: string
          updated_at?: string
          wrapping_option_id?: string | null
        }
        Relationships: []
      }
      gift_notifications: {
        Row: {
          channel: string
          gift_id: string
          id: string
          payload: Json | null
          read_at: string | null
          sent_at: string
          type: string
          user_id: string
        }
        Insert: {
          channel?: string
          gift_id: string
          id?: string
          payload?: Json | null
          read_at?: string | null
          sent_at?: string
          type: string
          user_id: string
        }
        Update: {
          channel?: string
          gift_id?: string
          id?: string
          payload?: Json | null
          read_at?: string | null
          sent_at?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      group_gifts: {
        Row: {
          created_at: string
          currency: string
          current_amount: number
          deadline: string
          description: string | null
          id: string
          order_id: string | null
          organizer_id: string
          product_id: string | null
          status: string
          target_amount: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          current_amount?: number
          deadline: string
          description?: string | null
          id?: string
          order_id?: string | null
          organizer_id: string
          product_id?: string | null
          status?: string
          target_amount: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          current_amount?: number
          deadline?: string
          description?: string | null
          id?: string
          order_id?: string | null
          organizer_id?: string
          product_id?: string | null
          status?: string
          target_amount?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_gift_contributions: {
        Row: {
          amount: number
          contributor_id: string
          created_at: string
          group_gift_id: string
          id: string
          message: string | null
          payment_id: string | null
          status: string
        }
        Insert: {
          amount: number
          contributor_id: string
          created_at?: string
          group_gift_id: string
          id?: string
          message?: string | null
          payment_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          contributor_id?: string
          created_at?: string
          group_gift_id?: string
          id?: string
          message?: string | null
          payment_id?: string | null
          status?: string
        }
        Relationships: []
      }
      shared_products: {
        Row: {
          clicked_at: string | null
          converted_at: string | null
          created_at: string
          deep_link_token: string
          id: string
          product_id: string
          recipient_email: string | null
          recipient_id: string | null
          recipient_phone: string | null
          share_channel: string
          share_message: string | null
          sharer_id: string
          status: string
          viewed_at: string | null
        }
        Insert: {
          clicked_at?: string | null
          converted_at?: string | null
          created_at?: string
          deep_link_token: string
          id?: string
          product_id: string
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          share_channel: string
          share_message?: string | null
          sharer_id: string
          status?: string
          viewed_at?: string | null
        }
        Update: {
          clicked_at?: string | null
          converted_at?: string | null
          created_at?: string
          deep_link_token?: string
          id?: string
          product_id?: string
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          share_channel?: string
          share_message?: string | null
          sharer_id?: string
          status?: string
          viewed_at?: string | null
        }
        Relationships: []
      }
      ai_agent_memory: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_agent_sessions: {
        Row: {
          context_summary: string | null
          created_at: string
          ended_at: string | null
          id: string
          persona: string
          status: string
          tool_calls: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context_summary?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          persona?: string
          status?: string
          tool_calls?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context_summary?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          persona?: string
          status?: string
          tool_calls?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audio_descriptions: {
        Row: {
          audio_url: string
          created_at: string
          duration_seconds: number | null
          generated_by: string
          id: string
          is_active: boolean
          language: string
          product_id: string
          script: string
          updated_at: string
          version: number
        }
        Insert: {
          audio_url: string
          created_at?: string
          duration_seconds?: number | null
          generated_by?: string
          id?: string
          is_active?: boolean
          language?: string
          product_id: string
          script: string
          updated_at?: string
          version?: number
        }
        Update: {
          audio_url?: string
          created_at?: string
          duration_seconds?: number | null
          generated_by?: string
          id?: string
          is_active?: boolean
          language?: string
          product_id?: string
          script?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      accessibility_usage_metrics: {
        Row: {
          action: string
          created_at: string
          feature: string
          id: string
          metadata: Json | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          feature: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          feature?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_features: {
        Row: {
          computed_at: string
          features: Json
          model_version: string | null
          user_id: string
        }
        Insert: {
          computed_at?: string
          features?: Json
          model_version?: string | null
          user_id: string
        }
        Update: {
          computed_at?: string
          features?: Json
          model_version?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ml_models: {
        Row: {
          activated_at: string | null
          artifact_uri: string
          created_at: string
          framework: string | null
          id: string
          is_active: boolean
          metrics: Json | null
          name: string
          training_data_snapshot: string | null
          version: string
        }
        Insert: {
          activated_at?: string | null
          artifact_uri: string
          created_at?: string
          framework?: string | null
          id?: string
          is_active?: boolean
          metrics?: Json | null
          name: string
          training_data_snapshot?: string | null
          version: string
        }
        Update: {
          activated_at?: string | null
          artifact_uri?: string
          created_at?: string
          framework?: string | null
          id?: string
          is_active?: boolean
          metrics?: Json | null
          name?: string
          training_data_snapshot?: string | null
          version?: string
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
      are_friends: {
        Args: { left_id: string; right_id: string }
        Returns: boolean
      }
      is_gift_participant: {
        Args: { target_gift_id: string }
        Returns: boolean
      }
      match_products: {
        Args: { query_embedding: string; match_count: number }
        Returns: {
          id: string
          title: string
          price: number
          category: string
          image_urls: string[]
          similarity: number
        }[]
      }
      lookup_user_id_by_email: {
        Args: { target_email: string }
        Returns: string
      }
      record_share_open: {
        Args: { target_token: string }
        Returns: {
          product_id: string
          sharer_name: string
          status: string
        }[]
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
