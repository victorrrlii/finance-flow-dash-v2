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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          archived_at: string | null
          cor: string
          created_at: string
          data_inicial: string
          id: string
          nome: string
          saldo_inicial: number
          status: string
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          cor?: string
          created_at?: string
          data_inicial?: string
          id?: string
          nome: string
          saldo_inicial?: number
          status?: string
          tipo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          cor?: string
          created_at?: string
          data_inicial?: string
          id?: string
          nome?: string
          saldo_inicial?: number
          status?: string
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          archived_at: string | null
          cor: string
          created_at: string
          id: string
          nome: string
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          cor?: string
          created_at?: string
          id?: string
          nome: string
          tipo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      imports: {
        Row: {
          created_at: string
          file_name: string
          id: string
          rows_duplicated: number
          rows_imported: number
          rows_invalid: number
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          rows_duplicated?: number
          rows_imported?: number
          rows_invalid?: number
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          rows_duplicated?: number
          rows_imported?: number
          rows_invalid?: number
          user_id?: string
        }
        Relationships: []
      }
      installment_items: {
        Row: {
          created_at: string
          data_prevista: string
          id: string
          installment_id: string
          numero: number
          status: string
          transaction_id: string | null
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_prevista: string
          id?: string
          installment_id: string
          numero: number
          status?: string
          transaction_id?: string | null
          user_id: string
          valor: number
        }
        Update: {
          created_at?: string
          data_prevista?: string
          id?: string
          installment_id?: string
          numero?: number
          status?: string
          transaction_id?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "installment_items_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "installments"
            referencedColumns: ["id"]
          },
        ]
      }
      installments: {
        Row: {
          account_id: string | null
          category_id: string | null
          created_at: string
          descricao: string
          id: string
          primeira_data: string
          qtd_parcelas: number
          status: string
          subcategory_id: string | null
          updated_at: string
          user_id: string
          valor_parcela: number
          valor_total: number
        }
        Insert: {
          account_id?: string | null
          category_id?: string | null
          created_at?: string
          descricao: string
          id?: string
          primeira_data: string
          qtd_parcelas: number
          status?: string
          subcategory_id?: string | null
          updated_at?: string
          user_id: string
          valor_parcela: number
          valor_total: number
        }
        Update: {
          account_id?: string | null
          category_id?: string | null
          created_at?: string
          descricao?: string
          id?: string
          primeira_data?: string
          qtd_parcelas?: number
          status?: string
          subcategory_id?: string | null
          updated_at?: string
          user_id?: string
          valor_parcela?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "installments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installments_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      recurrences: {
        Row: {
          account_id: string | null
          ativo: boolean
          category_id: string | null
          created_at: string
          descricao: string
          forma_pagto: string | null
          frequencia: string
          id: string
          proximo_vencimento: string
          subcategory_id: string | null
          tipo: string
          ultima_geracao: string | null
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          account_id?: string | null
          ativo?: boolean
          category_id?: string | null
          created_at?: string
          descricao: string
          forma_pagto?: string | null
          frequencia: string
          id?: string
          proximo_vencimento: string
          subcategory_id?: string | null
          tipo: string
          ultima_geracao?: string | null
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          account_id?: string | null
          ativo?: boolean
          category_id?: string | null
          created_at?: string
          descricao?: string
          forma_pagto?: string | null
          frequencia?: string
          id?: string
          proximo_vencimento?: string
          subcategory_id?: string | null
          tipo?: string
          ultima_geracao?: string | null
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "recurrences_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurrences_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurrences_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories: {
        Row: {
          archived_at: string | null
          category_id: string
          created_at: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          category_id: string
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          category_id?: string
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          categoria: string | null
          category_id: string | null
          conta: string | null
          created_at: string
          data: string
          data_prevista: string | null
          dedupe_hash: string
          descricao: string | null
          forma_pagto: string | null
          id: string
          imported_at: string
          installment_item_id: string | null
          observacoes: string | null
          realizado: boolean
          recurrence_id: string | null
          source_file: string | null
          status: string | null
          subcategoria: string | null
          subcategory_id: string | null
          tipo: string
          tipo_efetivo: string
          user_id: string
          valor: number
        }
        Insert: {
          account_id?: string | null
          categoria?: string | null
          category_id?: string | null
          conta?: string | null
          created_at?: string
          data: string
          data_prevista?: string | null
          dedupe_hash: string
          descricao?: string | null
          forma_pagto?: string | null
          id?: string
          imported_at?: string
          installment_item_id?: string | null
          observacoes?: string | null
          realizado?: boolean
          recurrence_id?: string | null
          source_file?: string | null
          status?: string | null
          subcategoria?: string | null
          subcategory_id?: string | null
          tipo: string
          tipo_efetivo: string
          user_id: string
          valor: number
        }
        Update: {
          account_id?: string | null
          categoria?: string | null
          category_id?: string | null
          conta?: string | null
          created_at?: string
          data?: string
          data_prevista?: string | null
          dedupe_hash?: string
          descricao?: string | null
          forma_pagto?: string | null
          id?: string
          imported_at?: string
          installment_item_id?: string | null
          observacoes?: string | null
          realizado?: boolean
          recurrence_id?: string | null
          source_file?: string | null
          status?: string | null
          subcategoria?: string | null
          subcategory_id?: string | null
          tipo?: string
          tipo_efetivo?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_installment_item_id_fkey"
            columns: ["installment_item_id"]
            isOneToOne: false
            referencedRelation: "installment_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurrence_id_fkey"
            columns: ["recurrence_id"]
            isOneToOne: false
            referencedRelation: "recurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
