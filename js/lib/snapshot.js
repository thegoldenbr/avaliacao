/**
 * Snapshot publicado do relatório: tudo o que o dashboard do cliente precisa, autocontido, porque a página
 * pública só lê este JSON (por RPC) e nunca as tabelas. Função pura, testável.
 */
import { arredondar, classificar } from './indicadores.js';

export const SECOES = ['pontos_fortes', 'pontos_de_atencao', 'analise_por_grupo', 'recomendacoes', 'o_que_evitar', 'proximos_passos', 'consideracoes_finais'];

export const OPCOES_PADRAO = { mostrarAnterior: true, mostrarMeta: true, mostrarMedia: true, ocultar: {} };

export function normalizarOpcoes(opcoes) {
  const o = opcoes && typeof opcoes === 'object' ? opcoes : {};
  return {
    mostrarAnterior: o.mostrarAnterior !== false,
    mostrarMeta: o.mostrarMeta !== false,
    mostrarMedia: o.mostrarMedia !== false,
    ocultar: Object.fromEntries(SECOES.map((s) => [s, Boolean(o.ocultar?.[s])])),
  };
}

/**
 * @param dados { avaliacao, empresa, indicadores, faixas, anterior (indicadores|null), variacao ({geral,anterior}|null),
 *                media (Map grupoOrigemId→nota|null), conteudo, opcoes }
 */
export function montarSnapshot({ avaliacao, empresa, indicadores, faixas, anterior, variacao, media, conteudo, opcoes }) {
  const op = normalizarOpcoes(opcoes);
  const notaAnterior = (g) => {
    const a = anterior?.grupos.find((x) => (g.grupoOrigemId && x.grupoOrigemId === g.grupoOrigemId) || x.nome === g.nome);
    return a && a.nota !== null ? arredondar(a.nota) : null;
  };
  const faixaGeral = classificar(indicadores.geral, faixas);
  return {
    versao: 1,
    empresa: empresa.nome_fantasia ?? empresa.razao_social,
    titulo: avaliacao.titulo,
    periodo: avaliacao.periodo_referencia ?? null,
    gerado_em: new Date().toISOString(),
    faixas,
    geral: { nota: indicadores.geral === null ? null : arredondar(indicadores.geral), faixaId: faixaGeral?.id ?? null },
    variacao: op.mostrarAnterior && variacao ? { geral: arredondar(variacao.geral), anterior: arredondar(variacao.anterior) } : null,
    grupos: indicadores.grupos.map((g) => ({
      id: g.id,
      nome: g.nome,
      nomeCurto: g.nomeCurto,
      nota: g.nota === null ? null : arredondar(g.nota),
      faixaId: classificar(g.nota, faixas)?.id ?? null,
      meta: op.mostrarMeta ? g.meta : null,
      anterior: op.mostrarAnterior ? notaAnterior(g) : null,
      media: op.mostrarMedia && media && g.grupoOrigemId && media.has(g.grupoOrigemId) ? arredondar(media.get(g.grupoOrigemId)) : null,
      perguntas: g.perguntas.filter((p) => p.notaEfetiva !== null).map((p) => ({ enunciado: p.enunciado, nota: p.notaEfetiva, invertida: p.invertida, faixaId: classificar(p.notaEfetiva, faixas)?.id ?? null })),
    })),
    opcoes: op,
    conteudo,
  };
}

/** Problemas que impedem publicar (lista vazia = pode publicar). */
export function problemasParaPublicar(conteudo) {
  const p = [];
  if (!conteudo?.resumo_executivo?.trim()) p.push('Escreva o resumo executivo.');
  if (!conteudo?.recomendacoes?.length) p.push('Adicione pelo menos uma recomendação.');
  return p;
}
