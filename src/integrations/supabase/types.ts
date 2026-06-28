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
      empresas: {
        Row: {
          cnpj: string | null
          created_at: string
          id: string
          nome: string
          plano: string
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          id?: string
          nome: string
          plano?: string
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          id?: string
          nome?: string
          plano?: string
          updated_at?: string
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          cep: string | null
          cidade: string | null
          cnpj: string
          created_at: string
          deleted_at: string | null
          email_comercial: string | null
          email_financeiro: string | null
          empresa_id: string
          endereco: string | null
          estado: string | null
          id: string
          nome_fantasia: string | null
          observacoes: string | null
          razao_social: string
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cnpj: string
          created_at?: string
          deleted_at?: string | null
          email_comercial?: string | null
          email_financeiro?: string | null
          empresa_id: string
          endereco?: string | null
          estado?: string | null
          id?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social: string
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          created_at?: string
          deleted_at?: string | null
          email_comercial?: string | null
          email_financeiro?: string | null
          empresa_id?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social?: string
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      mapa_itens: {
        Row: {
          created_at: string
          id: string
          mapa_id: string
          produto_id: string
          quantidade: number
        }
        Insert: {
          created_at?: string
          id?: string
          mapa_id: string
          produto_id: string
          quantidade: number
        }
        Update: {
          created_at?: string
          id?: string
          mapa_id?: string
          produto_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "mapa_itens_mapa_id_fkey"
            columns: ["mapa_id"]
            isOneToOne: false
            referencedRelation: "mapas_cotacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mapa_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      mapa_precos: {
        Row: {
          created_at: string
          fornecedor_id: string
          id: string
          mapa_item_id: string
          preco: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          fornecedor_id: string
          id?: string
          mapa_item_id: string
          preco?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          fornecedor_id?: string
          id?: string
          mapa_item_id?: string
          preco?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mapa_precos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mapa_precos_mapa_item_id_fkey"
            columns: ["mapa_item_id"]
            isOneToOne: false
            referencedRelation: "mapa_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      mapas_cotacao: {
        Row: {
          codigo: string
          created_at: string
          deleted_at: string | null
          empresa_id: string
          id: string
          observacoes: string | null
          solicitacao_id: string
          status: Database["public"]["Enums"]["mapa_status"]
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          deleted_at?: string | null
          empresa_id: string
          id?: string
          observacoes?: string | null
          solicitacao_id: string
          status?: Database["public"]["Enums"]["mapa_status"]
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          deleted_at?: string | null
          empresa_id?: string
          id?: string
          observacoes?: string | null
          solicitacao_id?: string
          status?: Database["public"]["Enums"]["mapa_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mapas_cotacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mapas_cotacao_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          cliente: string | null
          codigo: string
          created_at: string
          deleted_at: string | null
          empresa_id: string
          id: string
          local: string | null
          nome: string
          status: Database["public"]["Enums"]["obra_status"]
          updated_at: string
        }
        Insert: {
          cliente?: string | null
          codigo: string
          created_at?: string
          deleted_at?: string | null
          empresa_id: string
          id?: string
          local?: string | null
          nome: string
          status?: Database["public"]["Enums"]["obra_status"]
          updated_at?: string
        }
        Update: {
          cliente?: string | null
          codigo?: string
          created_at?: string
          deleted_at?: string | null
          empresa_id?: string
          id?: string
          local?: string | null
          nome?: string
          status?: Database["public"]["Enums"]["obra_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          categoria: string | null
          codigo: string
          created_at: string
          deleted_at: string | null
          descricao: string
          empresa_id: string
          id: string
          observacoes: string | null
          unidade: string | null
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          codigo: string
          created_at?: string
          deleted_at?: string | null
          descricao: string
          empresa_id: string
          id?: string
          observacoes?: string | null
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          codigo?: string
          created_at?: string
          deleted_at?: string | null
          descricao?: string
          empresa_id?: string
          id?: string
          observacoes?: string | null
          unidade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacao_itens: {
        Row: {
          created_at: string
          id: string
          observacoes: string | null
          produto_id: string
          quantidade: number
          solicitacao_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          observacoes?: string | null
          produto_id: string
          quantidade: number
          solicitacao_id: string
        }
        Update: {
          created_at?: string
          id?: string
          observacoes?: string | null
          produto_id?: string
          quantidade?: number
          solicitacao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacao_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacao_itens_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes: {
        Row: {
          codigo: string
          created_at: string
          deleted_at: string | null
          empresa_id: string
          id: string
          obra_id: string
          observacoes: string | null
          status: Database["public"]["Enums"]["solicitacao_status"]
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          deleted_at?: string | null
          empresa_id: string
          id?: string
          obra_id: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["solicitacao_status"]
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          deleted_at?: string | null
          empresa_id?: string
          id?: string
          obra_id?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["solicitacao_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          cargo: string | null
          created_at: string
          deleted_at: string | null
          email: string
          empresa_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          cargo?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          empresa_id: string
          id: string
          nome: string
          updated_at?: string
        }
        Update: {
          cargo?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          empresa_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_empresa_id: { Args: never; Returns: string }
      ensure_usuario_empresa: { Args: never; Returns: string }
      ensure_usuario_empresa_for_user: {
        Args: { _user_id: string }
        Returns: string
      }
    }
    Enums: {
      mapa_status: "aberto" | "finalizado" | "cancelado"
      obra_status: "ativa" | "pausada" | "finalizada"
      solicitacao_status: "aberta" | "em_cotacao" | "finalizada" | "cancelada"
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
      mapa_status: ["aberto", "finalizado", "cancelado"],
      obra_status: ["ativa", "pausada", "finalizada"],
      solicitacao_status: ["aberta", "em_cotacao", "finalizada", "cancelada"],
    },
  },
} as const
