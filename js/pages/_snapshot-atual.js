/** Obtém o relatório "como está agora" para prévia e apresentação: o publicado, ou o rascunho atual, ou só os indicadores. */
import { supabase, dados } from '../supabase.js';
import { marcaEmCache } from '../marca.js';
import { relatorioEmBranco } from '../lib/relatorio-ia.js';
import { montarSnapshot, normalizarOpcoes } from '../lib/snapshot.js';
import { snapshotValido } from '../relatorio-pagina.js';
import { carregarIndicadores } from './_avaliacao-indicadores.js';

export const SELECAO_AVALIACAO = '*, empresas(*), avaliacao_grupos(*, avaliacao_perguntas(*))';

/** Completa o conteúdo salvo com o que falta (uma análise por tema), sem alterar o original. */
export function completarConteudo(conteudo, grupos) {
  const modelo = relatorioEmBranco(grupos);
  const saida = { ...modelo, ...structuredClone(conteudo ?? {}) };
  saida.analise_por_grupo = grupos.map((g) => ({ grupo: g.id, texto: conteudo?.analise_por_grupo?.find((a) => a.grupo === g.id)?.texto ?? '' }));
  return saida;
}

export const temConteudo = (c) => Boolean(c && (c.resumo_executivo?.trim() || c.recomendacoes?.length || c.pontos_fortes?.length));

/**
 * @returns {{snapshot:object, origem:'publicado'|'rascunho'|'indicadores', marca:object, rodape:string, relatorio:object|null}}
 */
export async function obterSnapshotAtual(av) {
  const relatorio = dados(await supabase.from('relatorios').select('*').eq('avaliacao_id', av.id).maybeSingle());
  const config = dados(await supabase.from('configuracoes').select('texto_rodape, nome_empresa, logo_url, cor_destaque').eq('id', true).single());
  const marca = { nome: config.nome_empresa, logo_url: config.logo_url, cor_destaque: config.cor_destaque } ?? marcaEmCache();
  const rodape = config.texto_rodape;

  if (av.status === 'publicada' && snapshotValido(relatorio?.conteudo_publicado)) {
    return { snapshot: { ...relatorio.conteudo_publicado, publicado_em: relatorio.publicado_em ?? relatorio.conteudo_publicado.publicado_em }, origem: 'publicado', marca, rodape, relatorio };
  }
  const base = await carregarIndicadores(av);
  const conteudo = completarConteudo(relatorio?.conteudo_rascunho, base.ind.grupos);
  const snapshot = montarSnapshot({
    avaliacao: av,
    empresa: av.empresas,
    indicadores: base.ind,
    faixas: base.faixas,
    anterior: base.anterior?.indicadores ?? null,
    variacao: base.insights.variacao,
    media: base.media,
    conteudo,
    opcoes: normalizarOpcoes(relatorio?.opcoes),
  });
  return { snapshot, origem: temConteudo(conteudo) ? 'rascunho' : 'indicadores', marca, rodape, relatorio };
}
