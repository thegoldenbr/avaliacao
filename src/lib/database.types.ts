/**
 * Tipos do banco. Espelham supabase/migrations.
 * Para regenerar a partir do projeto real: `npx supabase login` e depois `npm run tipos`.
 */
export type Json = string | number | boolean | null | { [chave: string]: Json | undefined } | Json[];

type Tabela<Row, Obrigatorios extends keyof Row> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Obrigatorios>;
  Update: Partial<Row>;
  Relationships: [];
};

export type StatusAvaliacao = 'rascunho' | 'aguardando_resposta' | 'respondida' | 'em_analise' | 'publicada' | 'arquivada';
export type PapelUsuario = 'admin' | 'analista';

export interface Perfil {
  id: string;
  nome: string;
  email: string;
  papel: PapelUsuario;
  ativo: boolean;
  criado_em: string;
}

export interface Configuracoes {
  id: boolean;
  nome_empresa: string;
  logo_url: string | null;
  cor_destaque: string;
  texto_apresentacao: string;
  texto_privacidade: string;
  texto_rodape: string;
  rotulo_escala_min: string;
  rotulo_escala_max: string;
  faixas: Json;
  atualizado_em: string;
}

export interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  segmento: string | null;
  porte: string | null;
  municipio: string | null;
  uf: string | null;
  responsavel_nome: string | null;
  responsavel_cargo: string | null;
  responsavel_email: string | null;
  responsavel_telefone: string | null;
  observacoes: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Questionario {
  id: string;
  titulo: string;
  descricao: string | null;
  arquivado: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Grupo {
  id: string;
  questionario_id: string;
  nome: string;
  nome_curto: string;
  descricao: string | null;
  peso: number;
  meta: number | null;
  ordem: number;
}

export interface Pergunta {
  id: string;
  grupo_id: string;
  enunciado: string;
  texto_apoio: string | null;
  peso: number;
  ordem: number;
  escala_invertida: boolean;
  rotulo_min: string | null;
  rotulo_max: string | null;
  permite_comentario: boolean;
}

export interface Avaliacao {
  id: string;
  empresa_id: string;
  questionario_origem_id: string | null;
  avaliacao_anterior_id: string | null;
  titulo: string;
  periodo_referencia: string | null;
  status: StatusAvaliacao;
  token_resposta: string;
  token_relatorio: string;
  prazo: string | null;
  mensagem_apresentacao: string | null;
  respondente_nome: string | null;
  respondente_cargo: string | null;
  respondente_email: string | null;
  criado_em: string;
  enviado_em: string | null;
  respondido_em: string | null;
  publicado_em: string | null;
  visualizacoes: number;
  ultima_visualizacao: string | null;
  atualizado_em: string;
}

export interface AvaliacaoGrupo {
  id: string;
  avaliacao_id: string;
  grupo_origem_id: string | null;
  nome: string;
  nome_curto: string;
  descricao: string | null;
  peso: number;
  meta: number | null;
  ordem: number;
}

export interface AvaliacaoPergunta {
  id: string;
  avaliacao_id: string;
  avaliacao_grupo_id: string;
  pergunta_origem_id: string | null;
  enunciado: string;
  texto_apoio: string | null;
  peso: number;
  ordem: number;
  escala_invertida: boolean;
  rotulo_min: string | null;
  rotulo_max: string | null;
  permite_comentario: boolean;
}

export interface Resposta {
  id: string;
  avaliacao_id: string;
  pergunta_id: string;
  nota: number;
  comentario: string | null;
  atualizado_em: string;
}

export interface Relatorio {
  id: string;
  avaliacao_id: string;
  conteudo_ia: Json | null;
  conteudo_rascunho: Json | null;
  conteudo_publicado: Json | null;
  opcoes: Json;
  modelo_ia: string | null;
  updated_by: string | null;
  updated_at: string;
  gerado_em: string | null;
  publicado_em: string | null;
}

export interface Database {
  public: {
    Tables: {
      perfis: Tabela<Perfil, 'id' | 'nome' | 'email'>;
      configuracoes: Tabela<Configuracoes, never>;
      empresas: Tabela<Empresa, 'razao_social' | 'cnpj'>;
      questionarios: Tabela<Questionario, 'titulo'>;
      grupos: Tabela<Grupo, 'questionario_id' | 'nome' | 'nome_curto'>;
      perguntas: Tabela<Pergunta, 'grupo_id' | 'enunciado'>;
      avaliacoes: Tabela<Avaliacao, 'empresa_id' | 'titulo'>;
      avaliacao_grupos: Tabela<AvaliacaoGrupo, 'avaliacao_id' | 'nome' | 'nome_curto'>;
      avaliacao_perguntas: Tabela<AvaliacaoPergunta, 'avaliacao_id' | 'avaliacao_grupo_id' | 'enunciado'>;
      respostas: Tabela<Resposta, 'avaliacao_id' | 'pergunta_id' | 'nota'>;
      relatorios: Tabela<Relatorio, 'avaliacao_id'>;
    };
    Views: Record<string, never>;
    Functions: {
      obter_marca: { Args: Record<PropertyKey, never>; Returns: Json };
      obter_formulario: { Args: { p_token: string }; Returns: Json };
      salvar_respostas: { Args: { p_token: string; p_payload: Json; p_finalizar?: boolean }; Returns: Json };
      obter_relatorio: { Args: { p_token: string }; Returns: Json };
      criar_avaliacao: {
        Args: {
          p_empresa_id: string;
          p_questionario_id: string;
          p_titulo: string;
          p_periodo?: string;
          p_prazo?: string;
          p_mensagem?: string;
          p_anterior_id?: string;
        };
        Returns: string;
      };
      regenerar_token: { Args: { p_avaliacao_id: string; p_qual: 'resposta' | 'relatorio' }; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
