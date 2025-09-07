// Supabase Database Types
// Based on 002_schema_v2.sql structure

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          role: 'admin' | 'order_manager' | 'ship_manager'
          locale: 'ko' | 'zh-CN'
          active: boolean
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          phone?: string | null
          role?: 'admin' | 'order_manager' | 'ship_manager'
          locale?: 'ko' | 'zh-CN'
          active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          role?: 'admin' | 'order_manager' | 'ship_manager'
          locale?: 'ko' | 'zh-CN'
          active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          sku: string
          category: string
          name: string
          model: string | null
          color: string | null
          brand: string | null
          cost_cny: number
          sale_price_krw: number | null
          on_hand: number
          low_stock_threshold: number
          barcode: string | null
          image_url: string | null
          description: string | null
          notes: string | null
          active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          sku: string
          category: string
          name: string
          model?: string | null
          color?: string | null
          brand?: string | null
          cost_cny: number
          sale_price_krw?: number | null
          on_hand?: number
          low_stock_threshold?: number
          barcode?: string | null
          image_url?: string | null
          description?: string | null
          notes?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          sku?: string
          category?: string
          name?: string
          model?: string | null
          color?: string | null
          brand?: string | null
          cost_cny?: number
          sale_price_krw?: number | null
          on_hand?: number
          low_stock_threshold?: number
          barcode?: string | null
          image_url?: string | null
          description?: string | null
          notes?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          order_date: string
          customer_name: string
          customer_phone: string
          customer_email: string | null
          pccc: string
          shipping_address_line1: string
          shipping_address_line2: string | null
          shipping_postal_code: string
          status: 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
          total_krw: number
          currency: 'CNY' | 'KRW'
          customer_memo: string | null
          internal_memo: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          order_number: string
          order_date?: string
          customer_name: string
          customer_phone: string
          customer_email?: string | null
          pccc: string
          shipping_address_line1: string
          shipping_address_line2?: string | null
          shipping_postal_code: string
          status?: 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
          total_krw: number
          currency?: 'CNY' | 'KRW'
          customer_memo?: string | null
          internal_memo?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          order_number?: string
          order_date?: string
          customer_name?: string
          customer_phone?: string
          customer_email?: string | null
          pccc?: string
          shipping_address_line1?: string
          shipping_address_line2?: string | null
          shipping_postal_code?: string
          status?: 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
          total_krw?: number
          currency?: 'CNY' | 'KRW'
          customer_memo?: string | null
          internal_memo?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          cancelled_at?: string | null
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          sku: string
          product_name: string
          product_category: string | null
          product_model: string | null
          product_color: string | null
          product_brand: string | null
          quantity: number
          unit_price: number
          subtotal: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          sku: string
          product_name: string
          product_category?: string | null
          product_model?: string | null
          product_color?: string | null
          product_brand?: string | null
          quantity: number
          unit_price: number
          subtotal: number
          created_at?: string
          unit_price_krw?: number
          total_price_krw?: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          sku?: string
          product_name?: string
          product_category?: string | null
          product_model?: string | null
          product_color?: string | null
          product_brand?: string | null
          quantity?: number
          unit_price?: number
          subtotal?: number
          created_at?: string
        }
      }
      shipments: {
        Row: {
          id: string
          order_id: string
          courier: string | null
          courier_code: string | null
          tracking_no: string | null
          tracking_barcode: string | null
          tracking_url: string | null
          courier_cn: string | null
          tracking_no_cn: string | null
          tracking_url_cn: string | null
          shipping_fee: number
          actual_weight: number | null
          volume_weight: number | null
          shipment_photo_url: string | null
          receipt_photo_url: string | null
          shipped_at: string | null
          delivered_at: string | null
          created_at: string
          created_by: string | null
          // Additional fields from legacy schema
          tracking_number?: string
          shipping_cost_krw?: number
          weight_g?: number
          package_images?: string[]
          status?: string
          delivery_notes?: string
          actual_delivery_date?: string | null
          orders?: any
        }
        Insert: {
          id?: string
          order_id: string
          courier?: string | null
          courier_code?: string | null
          tracking_no?: string | null
          tracking_barcode?: string | null
          tracking_url?: string | null
          courier_cn?: string | null
          tracking_no_cn?: string | null
          tracking_url_cn?: string | null
          shipping_fee?: number
          actual_weight?: number | null
          volume_weight?: number | null
          shipment_photo_url?: string | null
          receipt_photo_url?: string | null
          shipped_at?: string | null
          delivered_at?: string | null
          created_at?: string
          created_by?: string | null
          // Additional fields
          tracking_number?: string
          shipping_cost_krw?: number
          weight_g?: number
          package_images?: string[]
          status?: string
          delivery_notes?: string
        }
        Update: {
          id?: string
          order_id?: string
          courier?: string | null
          courier_code?: string | null
          tracking_no?: string | null
          tracking_barcode?: string | null
          tracking_url?: string | null
          courier_cn?: string | null
          tracking_no_cn?: string | null
          tracking_url_cn?: string | null
          shipping_fee?: number
          actual_weight?: number | null
          volume_weight?: number | null
          shipment_photo_url?: string | null
          receipt_photo_url?: string | null
          shipped_at?: string | null
          delivered_at?: string | null
          created_at?: string
          created_by?: string | null
          // Additional fields
          status?: string
          actual_delivery_date?: string | null
        }
      }
      inventory_movements: {
        Row: {
          id: string
          product_id: string
          movement_type: 'inbound' | 'sale' | 'adjustment' | 'disposal'
          quantity: number
          balance_before: number
          balance_after: number
          ref_type: string | null
          ref_id: string | null
          ref_no: string | null
          unit_cost: number | null
          total_cost: number | null
          note: string | null
          movement_date: string
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          product_id: string
          movement_type: 'inbound' | 'sale' | 'adjustment' | 'disposal'
          quantity: number
          balance_before: number
          balance_after: number
          ref_type?: string | null
          ref_id?: string | null
          ref_no?: string | null
          unit_cost?: number | null
          total_cost?: number | null
          note?: string | null
          movement_date?: string
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          movement_type?: 'inbound' | 'sale' | 'adjustment' | 'disposal'
          quantity?: number
          balance_before?: number
          balance_after?: number
          ref_type?: string | null
          ref_id?: string | null
          ref_no?: string | null
          unit_cost?: number | null
          total_cost?: number | null
          note?: string | null
          movement_date?: string
          created_at?: string
          created_by?: string | null
        }
      }
      cashbook: {
        Row: {
          id: string
          transaction_date: string
          type: 'sale' | 'inbound' | 'shipping' | 'adjustment' | 'refund'
          amount: number
          currency: 'CNY' | 'KRW'
          fx_rate: number
          amount_krw: number
          ref_type: string | null
          ref_id: string | null
          ref_no: string | null
          description: string | null
          note: string | null
          bank_name: string | null
          account_no: string | null
          created_at: string
          created_by: string | null
          // Additional fields for compatibility
          notes?: string | null
          reference_type?: string | null
          reference_id?: string | null
        }
        Insert: {
          id?: string
          transaction_date: string
          type: 'sale' | 'inbound' | 'shipping' | 'adjustment' | 'refund'
          amount: number
          currency?: 'CNY' | 'KRW'
          fx_rate?: number
          amount_krw: number
          ref_type?: string | null
          ref_id?: string | null
          ref_no?: string | null
          description?: string | null
          note?: string | null
          bank_name?: string | null
          account_no?: string | null
          created_at?: string
          created_by?: string | null
          // Additional fields
          notes?: string | null
          reference_type?: string | null
          reference_id?: string | null
        }
        Update: {
          id?: string
          transaction_date?: string
          type?: 'sale' | 'inbound' | 'shipping' | 'adjustment' | 'refund'
          amount?: number
          currency?: 'CNY' | 'KRW'
          fx_rate?: number
          amount_krw?: number
          ref_type?: string | null
          ref_id?: string | null
          ref_no?: string | null
          description?: string | null
          note?: string | null
          bank_name?: string | null
          account_no?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
      event_logs: {
        Row: {
          id: string
          actor_id: string | null
          actor_name: string | null
          actor_role: 'admin' | 'order_manager' | 'ship_manager' | null
          event_type: string
          event_category: string | null
          event_severity: string
          entity_type: string | null
          entity_id: string | null
          entity_name: string | null
          action: string | null
          before_data: Json | null
          after_data: Json | null
          changes: Json | null
          ip_address: string | null
          user_agent: string | null
          request_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: 'admin' | 'order_manager' | 'ship_manager' | null
          event_type: string
          event_category?: string | null
          event_severity?: string
          entity_type?: string | null
          entity_id?: string | null
          entity_name?: string | null
          action?: string | null
          before_data?: Json | null
          after_data?: Json | null
          changes?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          request_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: 'admin' | 'order_manager' | 'ship_manager' | null
          event_type?: string
          event_category?: string | null
          event_severity?: string
          entity_type?: string | null
          entity_id?: string | null
          entity_name?: string | null
          action?: string | null
          before_data?: Json | null
          after_data?: Json | null
          changes?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          request_id?: string | null
          created_at?: string
        }
      }
    }
    Views: {}
    Functions: {
      generate_order_number: {
        Args: {}
        Returns: string
      }
      generate_sku: {
        Args: {
          p_category: string
          p_model: string
          p_color: string
          p_brand: string
        }
        Returns: string
      }
      update_inventory_after_sale: {
        Args: {
          p_product_id: string
          p_quantity: number
        }
        Returns: void
      }
      restore_inventory_after_cancellation: {
        Args: {
          p_product_id: string
          p_quantity: number
        }
        Returns: void
      }
    }
    Enums: {
      user_role: 'admin' | 'order_manager' | 'ship_manager'
      locale_type: 'ko' | 'zh-CN'
      order_status: 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
      movement_type: 'inbound' | 'sale' | 'adjustment' | 'disposal'
      cashbook_type: 'sale' | 'inbound' | 'shipping' | 'adjustment' | 'refund'
      currency_type: 'CNY' | 'KRW'
    }
  }
}