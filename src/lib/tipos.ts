import type { Tables } from './database.types';

/** Tipos de domínio derivados dos tipos gerados pelo Supabase (npm run tipos). */
export type StatusAvaliacao = 'rascunho' | 'aguardando_resposta' | 'respondida' | 'em_analise' | 'publicada' | 'arquivada';
export type PapelUsuario = 'admin' | 'analista';

export type Perfil = Tables<'perfis'>;
export type Configuracoes = Tables<'configuracoes'>;
export type Empresa = Tables<'empresas'>;
export type Questionario = Tables<'questionarios'>;
export type Grupo = Tables<'grupos'>;
export type Pergunta = Tables<'perguntas'>;
export type Avaliacao = Tables<'avaliacoes'>;
export type AvaliacaoGrupo = Tables<'avaliacao_grupos'>;
export type AvaliacaoPergunta = Tables<'avaliacao_perguntas'>;
export type Resposta = Tables<'respostas'>;
export type Relatorio = Tables<'relatorios'>;
