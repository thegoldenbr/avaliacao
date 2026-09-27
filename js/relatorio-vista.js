/**
 * Renderiza o snapshot do relatório (mesmo HTML no editor, na pré-visualização e no dashboard do cliente).
 * Recebe só o snapshot (ver lib/snapshot.js); não consulta o banco. Tudo passa por html`` (escapado);
 * os textos do relatório passam por mdParaHtml (markdown básico sem HTML bruto).
 */
import { html } from './html.js';
import { icone, FAIXA_ICONE } from './icones.js';
import { radar } from './radar.js';
import { mdParaHtml } from './markdown.js';
import { formatarData, formatarNota } from './lib/formatacao.js';

const ROTULO_PRIORIDADE = { alta: 'Prioridade alta', media: 'Prioridade média', baixa: 'Prioridade baixa' };
const ROTULO_HORIZONTE = { curto: 'Curto prazo', medio: 'Médio prazo', longo: 'Longo prazo' };
const TOM_PRIORIDADE = { alta: 'badge--erro', media: 'badge--aviso', baixa: '' };
const ORDEM_PRIORIDADE = { alta: 0, media: 1, baixa: 2 };

const faixaDe = (s, id) => s.faixas.find((f) => f.id === id) ?? null;
const chipFaixa = (s, id, fundo = false) => {
  const f = faixaDe(s, id);
  return f ? html`<span class="faixa faixa--${f.id} ${fundo ? 'faixa-fundo' : ''}">${icone(FAIXA_ICONE[f.id], 'icone--sm')}${f.rotulo}</span>` : '';
};

function series(s) {
  const lista = [{ nome: 'Atual', tipo: 'atual', valores: s.grupos.map((g) => g.nota) }];
  if (s.grupos.some((g) => g.anterior !== null)) lista.push({ nome: 'Avaliação anterior', tipo: 'anterior', valores: s.grupos.map((g) => g.anterior) });
  if (s.grupos.some((g) => g.meta !== null)) lista.push({ nome: 'Meta', tipo: 'meta', valores: s.grupos.map((g) => g.meta) });
  if (s.grupos.some((g) => g.media !== null)) lista.push({ nome: 'Média das empresas', tipo: 'media', valores: s.grupos.map((g) => g.media) });
  return lista;
}

const nomeDoGrupo = (s, id) => s.grupos.find((g) => g.id === id)?.nome ?? '';

function listaComDescricao(s, itens, tom) {
  return html`<ul class="marcador marcador--${tom}">${itens.map((i) => html`<li><b>${i.titulo}</b>${i.grupo ? html`<span class="muted" style="font-size:.875rem">${nomeDoGrupo(s, i.grupo)}</span>` : ''}<div class="muted">${mdParaHtml(i.descricao)}</div></li>`)}</ul>`;
}

const oculta = (s, secao) => s.opcoes?.ocultar?.[secao];

export function renderRelatorio(s, { animar = false } = {}) {
  const c = s.conteudo ?? {};
  const recomendacoes = [...(c.recomendacoes ?? [])].sort((a, b) => (ORDEM_PRIORIDADE[a.prioridade] ?? 3) - (ORDEM_PRIORIDADE[b.prioridade] ?? 3));
  const pontosFortes = c.pontos_fortes ?? [];
  const pontosAtencao = c.pontos_de_atencao ?? [];
  const mostraFortes = !oculta(s, 'pontos_fortes') && pontosFortes.length > 0;
  const mostraAtencao = !oculta(s, 'pontos_de_atencao') && pontosAtencao.length > 0;

  return html`<div class="pilha pilha--lg" style="gap:3rem">
    <header class="pilha pilha--sm"><h1>${s.empresa}</h1><p class="muted">${s.titulo}${s.periodo ? ` · ${s.periodo}` : ''}${s.publicado_em ? ` · publicado em ${formatarData(s.publicado_em)}` : ''}</p></header>

    <section class="rel-hero" aria-label="Resultado geral">
      <div class="pilha">
        <div class="nota-destaque"><span class="valor num">${s.geral.nota === null ? '—' : formatarNota(s.geral.nota)}</span><span class="de">de 10</span></div>
        <p class="linha">${chipFaixa(s, s.geral.faixaId, true)}${s.variacao ? html`<span class="variacao ${s.variacao.geral >= 0 ? 'variacao--sobe' : 'variacao--desce'}">${icone(s.variacao.geral >= 0 ? 'sobe' : 'desce', 'icone--sm')} ${s.variacao.geral >= 0 ? '+' : '−'}${formatarNota(Math.abs(s.variacao.geral))} desde a avaliação anterior</span>` : ''}</p>
        ${c.resumo_executivo ? html`<div class="leitura">${mdParaHtml(c.resumo_executivo)}</div>` : ''}
      </div>
      <div>${radar(s.grupos.map((g) => g.nomeCurto), series(s), { animar })}</div>
    </section>

    ${mostraFortes || mostraAtencao
      ? html`<div class="duas-col">
          ${mostraFortes ? html`<section aria-labelledby="r-fortes"><h2 id="r-fortes">Onde a empresa se destaca</h2>${listaComDescricao(s, pontosFortes, 'forte')}</section>` : ''}
          ${mostraAtencao ? html`<section aria-labelledby="r-melhorar"><h2 id="r-melhorar">Onde precisa melhorar</h2>${listaComDescricao(s, pontosAtencao, 'atencao')}</section>` : ''}
        </div>`
      : ''}

    <section aria-labelledby="r-grupos"><h2 id="r-grupos">Detalhe por tema</h2>
      ${s.grupos.map((g, i) => {
        const texto = oculta(s, 'analise_por_grupo') ? '' : (c.analise_por_grupo ?? []).find((a) => a.grupo === g.id)?.texto;
        return html`<details class="bloco" ${i === 0 ? html`open` : ''}><summary><h3>${g.nome}</h3><span class="sc"><b class="num">${g.nota === null ? '—' : formatarNota(g.nota)}</b>${chipFaixa(s, g.faixaId)}${icone('baixo', 'chev')}</span></summary>
          <div class="corpo">${g.perguntas.map((p) => html`<div class="barra-pergunta ${p.faixaId ? `faixa--${p.faixaId}` : ''}"><p class="texto">${p.enunciado}</p><div class="trilho"><div class="preenchido" style="--nota:${p.nota}"></div></div><span class="valor num">${p.nota}</span></div>`)}
            ${texto ? html`<div class="leitura">${mdParaHtml(texto)}</div>` : ''}</div></details>`;
      })}
    </section>

    ${!oculta(s, 'recomendacoes') && recomendacoes.length
      ? html`<section aria-labelledby="r-fazer"><h2 id="r-fazer">O que fazer</h2><div class="pilha pilha--lg">${recomendacoes.map((r) => html`<article class="recomendacao recomendacao--${r.prioridade}">
          <div class="meta"><span class="badge ${TOM_PRIORIDADE[r.prioridade] ?? ''}">${ROTULO_PRIORIDADE[r.prioridade] ?? r.prioridade}</span><span class="badge">${ROTULO_HORIZONTE[r.horizonte] ?? r.horizonte}</span>${r.grupo ? html`<span class="badge">${nomeDoGrupo(s, r.grupo)}</span>` : ''}</div>
          <h3>${r.titulo}</h3><div class="leitura">${mdParaHtml(r.descricao)}</div>${r.impacto_esperado ? html`<p class="muted leitura"><b>Impacto esperado:</b> ${r.impacto_esperado}</p>` : ''}</article>`)}</div></section>`
      : ''}

    ${!oculta(s, 'o_que_evitar') && (c.o_que_evitar ?? []).length ? html`<section aria-labelledby="r-evitar"><h2 id="r-evitar">O que evitar</h2>${listaComDescricao(s, c.o_que_evitar, 'atencao')}</section>` : ''}

    ${(!oculta(s, 'proximos_passos') && (c.proximos_passos ?? []).length) || (!oculta(s, 'consideracoes_finais') && c.consideracoes_finais)
      ? html`<section aria-labelledby="r-passos" class="pilha"><h2 id="r-passos" style="margin-bottom:0">Próximos passos</h2>
          ${!oculta(s, 'proximos_passos') && (c.proximos_passos ?? []).length ? html`<ol class="pilha pilha--sm leitura" style="list-style:decimal;padding-left:1.25rem">${c.proximos_passos.map((p) => html`<li>${p}</li>`)}</ol>` : ''}
          ${!oculta(s, 'consideracoes_finais') && c.consideracoes_finais ? html`<div class="leitura">${mdParaHtml(c.consideracoes_finais)}</div>` : ''}</section>`
      : ''}
  </div>`;
}
