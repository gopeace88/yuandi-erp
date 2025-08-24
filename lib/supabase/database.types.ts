// This file is auto-generated from your Supabase database schema
// Run: npx supabase gen types typescript --local > lib/supabase/database.types.ts

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
          role: 'Admin' | 'OrderManager' | 'ShipManager'
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
          role?: 'Admin' | 'OrderManager' | 'ShipManager'
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
          role?: 'Admin' | 'OrderManager' | 'ShipManager'
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
          description: string | null
          notes: string | null
          active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          sku?: string
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
          order_no: string
          order_date: string
          customer_name: string
          customer_phone: string
          customer_email: string | null
          pccc_code: string
          shipping_address: string
          shipping_address_detail: string | null
          zip_code: string
          status: 'PAID' | 'SHIPPED' | 'DONE' | 'REFUNDED'
          total_amount: number
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
          order_no?: string
          order_date?: string
          customer_name: string
          customer_phone: string
          customer_email?: string | null
          pccc_code: string
          shipping_address: string
          shipping_address_detail?: string | null
          zip_code: string
          status?: 'PAID' | 'SHIPPED' | 'DONE' | 'REFUNDED'
          total_amount: number
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
          order_no?: string
          order_date?: string
          customer_name?: string
          customer_phone?: string
          customer_email?: string | null
          pccc_code?: string
          shipping_address?: string
          shipping_address_detail?: string | null
          zip_code?: string
          status?: 'PAID' | 'SHIPPED' | 'DONE' | 'REFUNDED'
          total_amount?: number
          currency?: 'CNY' | 'KRW'
          customer_memo?: string | null
          internal_memo?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
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
          courier: string
          courier_code: string | null
          tracking_no: string
          tracking_url: string | null
          shipping_fee: number | null
          actual_weight: number | null
          volume_weight: number | null
          shipment_photo_url: string | null
          receipt_photo_url: string | null
          shipped_at: string
          delivered_at: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          order_id: string
          courier: string
          courier_code?: string | null
          tracking_no: string
          tracking_url?: string | null
          shipping_fee?: number | null
          actual_weight?: number | null
          volume_weight?: number | null
          shipment_photo_url?: string | null
          receipt_photo_url?: string | null
          shipped_at?: string
          delivered_at?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          courier?: string
          courier_code?: string | null
          tracking_no?: string
          tracking_url?: string | null
          shipping_fee?: number | null
          actual_weight?: number | null
          volume_weight?: number | null
          shipment_photo_url?: string | null
          receipt_photo_url?: string | null
          shipped_at?: string
          delivered_at?: string | null
          created_at?: string
          created_by?: string | null
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
        }
        Insert: {
          id?: string
          transaction_date?: string
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
          actor_role: 'Admin' | 'OrderManager' | 'ShipManager' | null
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
          actor_role?: 'Admin' | 'OrderManager' | 'ShipManager' | null
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
          actor_role?: 'Admin' | 'OrderManager' | 'ShipManager' | null
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
    Views: {
      dashboard_stats: {
        Row: {
          date: string
          order_count: number
          total_sales: number
          unique_customers: number
          status: string
          pending_orders: number
          shipping_orders: number
          completed_orders: number
          refunded_orders: number
        }
      }
      low_stock_products: {
        Row: {
          id: string
          sku: string
          name: string
          on_hand: number
          low_stock_threshold: number
        }
      }
      my_orders: {
        Row: {
          id: string
          order_no: string
          customer_name: string
          status: string
          total_amount: number
          created_at: string
        }
      }
      pending_shipments: {
        Row: {
          id: string
          order_no: string
          customer_name: string
          shipping_address: string
          tracking_no: string | null
          courier: string | null
        }
      }
    }
    Functions: {
      create_order_with_items: {
        Args: {
          p_customer_name: string
          p_customer_phone: string
          p_customer_email?: string
          p_pccc_code: string
          p_shipping_address: string
          p_shipping_address_detail?: string
          p_zip_code: string
          p_customer_memo?: string
          p_internal_memo?: string
          p_items: Json
          p_created_by: string
        }
        Returns: Json
      }
      generate_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_sku: {
        Args: {
          p_category: string
          p_model?: string
          p_color?: string
          p_brand?: string
        }
        Returns: string
      }
      lookup_customer_orders: {
        Args: {
          p_customer_name: string
          p_customer_phone: string
        }
        Returns: {
          id: string
          order_no: string
          customer_name: string
          status: string
          total_amount: number
          created_at: string
        }[]
      }
      refresh_dashboard_stats: {
        Args: Record<PropertyKey, never>
        Returns: void
      }
      update_user_profile: {
        Args: {
          p_name?: string
          p_phone?: string
          p_locale?: 'ko' | 'zh-CN'
        }
        Returns: Json
      }
    }
    Enums: {
      user_role: 'Admin' | 'OrderManager' | 'ShipManager'
      locale_type: 'ko' | 'zh-CN'
      order_status: 'PAID' | 'SHIPPED' | 'DONE' | 'REFUNDED'
      cashbook_type: 'sale' | 'inbound' | 'shipping' | 'adjustment' | 'refund'
      currency_type: 'CNY' | 'KRW'
      movement_type: 'inbound' | 'sale' | 'adjustment' | 'disposal'
    }
  }
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Exported type aliases
export type Profile = Tables<'profiles'>
export type Product = Tables<'products'>
export type Order = Tables<'orders'>
export type OrderItem = Tables<'order_items'>
export type Shipment = Tables<'shipments'>
export type InventoryMovement = Tables<'inventory_movements'>
export type Cashbook = Tables<'cashbook'>
export type EventLog = Tables<'event_logs'>

export type UserRole = Enums<'user_role'>
export type LocaleType = Enums<'locale_type'>
export type OrderStatus = Enums<'order_status'>
export type CashbookType = Enums<'cashbook_type'>
export type CurrencyType = Enums<'currency_type'>
export type MovementType = Enums<'movement_type'>