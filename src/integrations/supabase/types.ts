export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      apartados: {
        Row: {
          completed_at: string | null
          created_at: string | null
          customer_id: string | null
          expires_at: string | null
          first_payment: number | null
          id: string
          items: Json
          second_payment: number | null
          status: string | null
          total_usd: number | null
          transaction_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          expires_at?: string | null
          first_payment?: number | null
          id?: string
          items?: Json
          second_payment?: number | null
          status?: string | null
          total_usd?: number | null
          transaction_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          expires_at?: string | null
          first_payment?: number | null
          id?: string
          items?: Json
          second_payment?: number | null
          status?: string | null
          total_usd?: number | null
          transaction_id?: string | null
        }
        Relationships: []
      }
      caja_chica: {
        Row: {
          amount: number
          created_at: string | null
          date: string | null
          description: string | null
          id: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          type?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          key: string
          label: string
          subcategories: string[] | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          label: string
          subcategories?: string[] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          label?: string
          subcategories?: string[] | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          birthday: string | null
          cedula: string | null
          created_at: string | null
          discount_codes: string[] | null
          id: string
          instagram: string | null
          lifetime_spend: number | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          birthday?: string | null
          cedula?: string | null
          created_at?: string | null
          discount_codes?: string[] | null
          id?: string
          instagram?: string | null
          lifetime_spend?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          birthday?: string | null
          cedula?: string | null
          created_at?: string | null
          discount_codes?: string[] | null
          id?: string
          instagram?: string | null
          lifetime_spend?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_closes: {
        Row: {
          created_at: string | null
          date: string
          id: string
          seller_id: string | null
          total_divisa: number | null
          total_pago_movil: number | null
          total_zelle: number | null
          transaction_count: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          seller_id?: string | null
          total_divisa?: number | null
          total_pago_movil?: number | null
          total_zelle?: number | null
          transaction_count?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          seller_id?: string | null
          total_divisa?: number | null
          total_pago_movil?: number | null
          total_zelle?: number | null
          transaction_count?: number | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          currency: string | null
          date: string | null
          description: string | null
          exchange_rate: number | null
          id: string
          receipt_photo: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          currency?: string | null
          date?: string | null
          description?: string | null
          exchange_rate?: number | null
          id?: string
          receipt_photo?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          currency?: string | null
          date?: string | null
          description?: string | null
          exchange_rate?: number | null
          id?: string
          receipt_photo?: string | null
        }
        Relationships: []
      }
      investments: {
        Row: {
          concept: string
          created_at: string | null
          id: string
          month: string | null
          notes: string | null
          paid_amount: number | null
          payment_history: Json | null
          status: string | null
          supplier: string | null
          total_cost: number | null
        }
        Insert: {
          concept: string
          created_at?: string | null
          id?: string
          month?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_history?: Json | null
          status?: string | null
          supplier?: string | null
          total_cost?: number | null
        }
        Update: {
          concept?: string
          created_at?: string | null
          id?: string
          month?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_history?: Json | null
          status?: string | null
          supplier?: string | null
          total_cost?: number | null
        }
        Relationships: []
      }
      pickups: {
        Row: {
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          delivered_at: string | null
          id: string
          items: Json
          notes: string | null
          status: string | null
          transaction_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          delivered_at?: string | null
          id?: string
          items?: Json
          notes?: string | null
          status?: string | null
          transaction_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          delivered_at?: string | null
          id?: string
          items?: Json
          notes?: string | null
          status?: string | null
          transaction_id?: string | null
        }
        Relationships: []
      }
      product_variations: {
        Row: {
          color: string | null
          id: string
          product_id: string
          size: string | null
          stock: number | null
        }
        Insert: {
          color?: string | null
          id?: string
          product_id: string
          size?: string | null
          stock?: number | null
        }
        Update: {
          color?: string | null
          id?: string
          product_id?: string
          size?: string | null
          stock?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          cost_usd: number | null
          created_at: string | null
          has_variations: boolean | null
          id: string
          low_stock_threshold: number | null
          name: string
          photos: string[] | null
          price_usd: number
          publish_online: boolean | null
          simple_stock: number | null
          sku: string | null
          subcategory: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          cost_usd?: number | null
          created_at?: string | null
          has_variations?: boolean | null
          id?: string
          low_stock_threshold?: number | null
          name: string
          photos?: string[] | null
          price_usd: number
          publish_online?: boolean | null
          simple_stock?: number | null
          sku?: string | null
          subcategory?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          cost_usd?: number | null
          created_at?: string | null
          has_variations?: boolean | null
          id?: string
          low_stock_threshold?: number | null
          name?: string
          photos?: string[] | null
          price_usd?: number
          publish_online?: boolean | null
          simple_stock?: number | null
          sku?: string | null
          subcategory?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      salaries: {
        Row: {
          base_salary_usd: number | null
          created_at: string | null
          id: string
          month: string | null
          paid_amount: number | null
          payment_history: Json | null
          role: string | null
          status: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          base_salary_usd?: number | null
          created_at?: string | null
          id?: string
          month?: string | null
          paid_amount?: number | null
          payment_history?: Json | null
          role?: string | null
          status?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          base_salary_usd?: number | null
          created_at?: string | null
          id?: string
          month?: string | null
          paid_amount?: number | null
          payment_history?: Json | null
          role?: string | null
          status?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          contact: string | null
          created_at: string | null
          id: string
          name: string
          notes: string | null
          payments: Json | null
          total_debt: number | null
        }
        Insert: {
          contact?: string | null
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          payments?: Json | null
          total_debt?: number | null
        }
        Update: {
          contact?: string | null
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          payments?: Json | null
          total_debt?: number | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          created_at: string | null
          customer_id: string | null
          discount: number | null
          exchange_rate: number | null
          fulfillment: string | null
          id: string
          items: Json
          notes: string | null
          origin: string | null
          payment_method: string
          return_reason: string | null
          seller_id: string | null
          seller_name: string | null
          shipping_address: string | null
          shipping_company: string | null
          split_payment: Json | null
          total_local: number | null
          total_usd: number
          tracking_number: string | null
          type: string
          voided: boolean | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          discount?: number | null
          exchange_rate?: number | null
          fulfillment?: string | null
          id?: string
          items?: Json
          notes?: string | null
          origin?: string | null
          payment_method: string
          return_reason?: string | null
          seller_id?: string | null
          seller_name?: string | null
          shipping_address?: string | null
          shipping_company?: string | null
          split_payment?: Json | null
          total_local?: number | null
          total_usd?: number
          tracking_number?: string | null
          type?: string
          voided?: boolean | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          discount?: number | null
          exchange_rate?: number | null
          fulfillment?: string | null
          id?: string
          items?: Json
          notes?: string | null
          origin?: string | null
          payment_method?: string
          return_reason?: string | null
          seller_id?: string | null
          seller_name?: string | null
          shipping_address?: string | null
          shipping_company?: string | null
          split_payment?: Json | null
          total_local?: number | null
          total_usd?: number
          tracking_number?: string | null
          type?: string
          voided?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
