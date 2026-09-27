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
      avaliacao_grupos: {
        Row: {
          avaliacao_id: string
          descricao: string | null
          grupo_origem_id: string | null
          id: string
          meta: number | null
          nome: string
          nome_curto: string
          ordem: number
          peso: number
        }
        Insert: {
          avaliacao_id: string
          descricao?: string | null
          grupo_origem_id?: string | null
          id?: string
          meta?: number | null
          nome: string
          nome_curto: string
          ordem?: number
          peso?: number
        }
        Update: {
          avaliacao_id?: string
          descricao?: string | null
          grupo_origem_id?: string | null
          id?: string
          meta?: number | null
          nome?: string
          nome_curto?: string
          ordem?: number
          peso?: number
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_grupos_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_grupos_grupo_origem_id_fkey"
            columns: ["grupo_origem_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_perguntas: {
        Row: {
          avaliacao_grupo_id: string
          avaliacao_id: string
          enunciado: string
          escala_invertida: boolean
          id: string
          ordem: number
          pergunta_origem_id: string | null
          permite_comentario: boolean
          peso: number
          rotulo_max: string | null
          rotulo_min: string | null
          texto_apoio: string | null
        }
        Insert: {
          avaliacao_grupo_id: string
          avaliacao_id: string
          enunciado: string
          escala_invertida?: boolean
          id?: string
          ordem?: number
          pergunta_origem_id?: string | null
          permite_comentario?: boolean
          peso?: number
          rotulo_max?: string | null
          rotulo_min?: string | null
          texto_apoio?: string | null
        }
        Update: {
          avaliacao_grupo_id?: string
          avaliacao_id?: string
          enunciado?: string
          escala_invertida?: boolean
          id?: string
          ordem?: number
          pergunta_origem_id?: string | null
          permite_comentario?: boolean
          peso?: number
          rotulo_max?: string | null
          rotulo_min?: string | null
          texto_apoio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_perguntas_avaliacao_grupo_id_fkey"
            columns: ["avaliacao_grupo_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_perguntas_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_perguntas_pergunta_origem_id_fkey"
            columns: ["pergunta_origem_id"]
            isOneToOne: false
            referencedRelation: "perguntas"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes: {
        Row: {
          atualizado_em: string
          avaliacao_anterior_id: string | null
          criado_em: string
          empresa_id: string
          enviado_em: string | null
          id: string
          mensagem_apresentacao: string | null
          periodo_referencia: string | null
          prazo: string | null
          publicado_em: string | null
          questionario_origem_id: string | null
          respondente_cargo: string | null
          respondente_email: string | null
          respondente_nome: string | null
          respondido_em: string | null
          status: string
          titulo: string
          token_relatorio: string
          token_resposta: string
          ultima_visualizacao: string | null
          visualizacoes: number
        }
        Insert: {
          atualizado_em?: string
          avaliacao_anterior_id?: string | null
          criado_em?: string
          empresa_id: string
          enviado_em?: string | null
          id?: string
          mensagem_apresentacao?: string | null
          periodo_referencia?: string | null
          prazo?: string | null
          publicado_em?: string | null
          questionario_origem_id?: string | null
          respondente_cargo?: string | null
          respondente_email?: string | null
          respondente_nome?: string | null
          respondido_em?: string | null
          status?: string
          titulo: string
          token_relatorio?: string
          token_resposta?: string
          ultima_visualizacao?: string | null
          visualizacoes?: number
        }
        Update: {
          atualizado_em?: string
          avaliacao_anterior_id?: string | null
          criado_em?: string
          empresa_id?: string
          enviado_em?: string | null
          id?: string
          mensagem_apresentacao?: string | null
          periodo_referencia?: string | null
          prazo?: string | null
          publicado_em?: string | null
          questionario_origem_id?: string | null
          respondente_cargo?: string | null
          respondente_email?: string | null
          respondente_nome?: string | null
          respondido_em?: string | null
          status?: string
          titulo?: string
          token_relatorio?: string
          token_resposta?: string
          ultima_visualizacao?: string | null
          visualizacoes?: number
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_avaliacao_anterior_id_fkey"
            columns: ["avaliacao_anterior_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_questionario_origem_id_fkey"
            columns: ["questionario_origem_id"]
            isOneToOne: false
            referencedRelation: "questionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          atualizado_em: string
          cor_destaque: string
          faixas: Json
          id: boolean
          logo_url: string | null
          nome_empresa: string
          rotulo_escala_max: string
          rotulo_escala_min: string
          texto_apresentacao: string
          texto_privacidade: string
          texto_rodape: string
        }
        Insert: {
          atualizado_em?: string
          cor_destaque?: string
          faixas?: Json
          id?: boolean
          logo_url?: string | null
          nome_empresa?: string
          rotulo_escala_max?: string
          rotulo_escala_min?: string
          texto_apresentacao?: string
          texto_privacidade?: string
          texto_rodape?: string
        }
        Update: {
          atualizado_em?: string
          cor_destaque?: string
          faixas?: Json
          id?: boolean
          logo_url?: string | null
          nome_empresa?: string
          rotulo_escala_max?: string
          rotulo_escala_min?: string
          texto_apresentacao?: string
          texto_privacidade?: string
          texto_rodape?: string
        }
        Relationships: []
      }
      empresas: {
        Row: {
          ativo: boolean
          atualizado_em: string
          cnpj: string
          criado_em: string
          id: string
          municipio: string | null
          nome_fantasia: string | null
          observacoes: string | null
          porte: string | null
          razao_social: string
          responsavel_cargo: string | null
          responsavel_email: string | null
          responsavel_nome: string | null
          responsavel_telefone: string | null
          segmento: string | null
          uf: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          cnpj: string
          criado_em?: string
          id?: string
          municipio?: string | null
          nome_fantasia?: string | null
          observacoes?: string | null
          porte?: string | null
          razao_social: string
          responsavel_cargo?: string | null
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          segmento?: string | null
          uf?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          cnpj?: string
          criado_em?: string
          id?: string
          municipio?: string | null
          nome_fantasia?: string | null
          observacoes?: string | null
          porte?: string | null
          razao_social?: string
          responsavel_cargo?: string | null
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          segmento?: string | null
          uf?: string | null
        }
        Relationships: []
      }
      grupos: {
        Row: {
          descricao: string | null
          id: string
          meta: number | null
          nome: string
          nome_curto: string
          ordem: number
          peso: number
          questionario_id: string
        }
        Insert: {
          descricao?: string | null
          id?: string
          meta?: number | null
          nome: string
          nome_curto: string
          ordem?: number
          peso?: number
          questionario_id: string
        }
        Update: {
          descricao?: string | null
          id?: string
          meta?: number | null
          nome?: string
          nome_curto?: string
          ordem?: number
          peso?: number
          questionario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupos_questionario_id_fkey"
            columns: ["questionario_id"]
            isOneToOne: false
            referencedRelation: "questionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          ativo: boolean
          criado_em: string
          email: string
          id: string
          nome: string
          papel: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          email: string
          id: string
          nome: string
          papel?: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          email?: string
          id?: string
          nome?: string
          papel?: string
        }
        Relationships: []
      }
      perguntas: {
        Row: {
          enunciado: string
          escala_invertida: boolean
          grupo_id: string
          id: string
          ordem: number
          permite_comentario: boolean
          peso: number
          rotulo_max: string | null
          rotulo_min: string | null
          texto_apoio: string | null
        }
        Insert: {
          enunciado: string
          escala_invertida?: boolean
          grupo_id: string
          id?: string
          ordem?: number
          permite_comentario?: boolean
          peso?: number
          rotulo_max?: string | null
          rotulo_min?: string | null
          texto_apoio?: string | null
        }
        Update: {
          enunciado?: string
          escala_invertida?: boolean
          grupo_id?: string
          id?: string
          ordem?: number
          permite_comentario?: boolean
          peso?: number
          rotulo_max?: string | null
          rotulo_min?: string | null
          texto_apoio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perguntas_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      questionarios: {
        Row: {
          arquivado: boolean
          atualizado_em: string
          criado_em: string
          descricao: string | null
          id: string
          titulo: string
        }
        Insert: {
          arquivado?: boolean
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          titulo: string
        }
        Update: {
          arquivado?: boolean
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          titulo?: string
        }
        Relationships: []
      }
      relatorios: {
        Row: {
          avaliacao_id: string
          conteudo_ia: Json | null
          conteudo_publicado: Json | null
          conteudo_rascunho: Json | null
          gerado_em: string | null
          id: string
          modelo_ia: string | null
          opcoes: Json
          publicado_em: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          avaliacao_id: string
          conteudo_ia?: Json | null
          conteudo_publicado?: Json | null
          conteudo_rascunho?: Json | null
          gerado_em?: string | null
          id?: string
          modelo_ia?: string | null
          opcoes?: Json
          publicado_em?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          avaliacao_id?: string
          conteudo_ia?: Json | null
          conteudo_publicado?: Json | null
          conteudo_rascunho?: Json | null
          gerado_em?: string | null
          id?: string
          modelo_ia?: string | null
          opcoes?: Json
          publicado_em?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: true
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      respostas: {
        Row: {
          atualizado_em: string
          avaliacao_id: string
          comentario: string | null
          id: string
          nota: number
          pergunta_id: string
        }
        Insert: {
          atualizado_em?: string
          avaliacao_id: string
          comentario?: string | null
          id?: string
          nota: number
          pergunta_id: string
        }
        Update: {
          atualizado_em?: string
          avaliacao_id?: string
          comentario?: string | null
          id?: string
          nota?: number
          pergunta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "respostas_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_perguntas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      criar_avaliacao: {
        Args: {
          p_anterior_id?: string
          p_empresa_id: string
          p_mensagem?: string
          p_periodo?: string
          p_prazo?: string
          p_questionario_id: string
          p_titulo: string
        }
        Returns: string
      }
      eh_admin: { Args: never; Returns: boolean }
      eh_usuario_ativo: { Args: never; Returns: boolean }
      gerar_token: { Args: never; Returns: string }
      obter_formulario: { Args: { p_token: string }; Returns: Json }
      obter_marca: { Args: never; Returns: Json }
      obter_relatorio: { Args: { p_token: string }; Returns: Json }
      regenerar_token: {
        Args: { p_avaliacao_id: string; p_qual: string }
        Returns: string
      }
      salvar_respostas: {
        Args: { p_finalizar?: boolean; p_payload: Json; p_token: string }
        Returns: Json
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
