import type { StatusAvaliacao } from './tipos';

export const ROTULO_STATUS: Record<StatusAvaliacao, string> = {
  rascunho: 'Rascunho',
  aguardando_resposta: 'Aguardando resposta',
  respondida: 'Respondida',
  em_analise: 'Em análise',
  publicada: 'Publicada',
  arquivada: 'Arquivada',
};

export const TOM_STATUS: Record<StatusAvaliacao, 'neutro' | 'aviso' | 'info' | 'ok'> = {
  rascunho: 'neutro',
  aguardando_resposta: 'aviso',
  respondida: 'info',
  em_analise: 'info',
  publicada: 'ok',
  arquivada: 'neutro',
};
