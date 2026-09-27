/**
 * Modo de apresentação: o operador mostra o resultado da avaliação ao cliente, em tela cheia, slide a slide.
 * Setas, espaço e PageUp/PageDown navegam; F alterna tela cheia; Esc sai. Também funciona por toque (deslizar) e botões.
 */
import { html } from '../html.js';
import { icone, FAIXA_ICONE } from '../icones.js';
import { iniciarPagina } from '../shell.js';
import { supabase } from '../supabase.js';
import { radar } from '../radar.js';
import { mdParaHtml } from '../markdown.js';
import { formatarData, formatarNota } from '../lib/formatacao.js';
import { statusTemIndicadores } from './_avaliacao-indicadores.js';
import { SELECAO_AVALIACAO, obterSnapshotAtual } from './_snapshot-atual.js';

const { main } = await iniciarPagina({ ativo: 'avaliacoes', semShell: true });
document.documentElement.dataset.tema = 'escuro'; // apresentações ficam no tema escuro; não altera a escolha salva
const id = new URLSearchParams(location.search).get('id');
const { data: av } = await supabase.from('avaliacoes').select(SELECAO_AVALIACAO).eq('id', id ?? '').maybeSingle();

if (!av || !statusTemIndicadores(av.status)) {
  main.innerHTML = String(html`<div class="ap-vazio"><h1>Nada para apresentar ainda</h1><p>Esta avaliação ainda não foi respondida. <a class="link" href="${av ? `avaliacao.html?id=${av.id}` : 'avaliacoes.html'}">Voltar</a></p></div>`);
  throw new Error('sem respostas');
}

const { snapshot: s, marca, rodape } = await obterSnapshotAtual(av);
const c = s.conteudo ?? {};
const oculta = (k) => s.opcoes?.ocultar?.[k];
const faixa = (fid) => s.faixas.find((f) => f.id === fid);
const nomeGrupo = (gid) => s.grupos.find((g) => g.id === gid)?.nome ?? '';
const ORDEM = { alta: 0, media: 1, baixa: 2 };
const ROTULO_PRIO = { alta: 'Prioridade alta', media: 'Prioridade média', baixa: 'Prioridade baixa' };
const ROTULO_HOR = { curto: 'Curto prazo', medio: 'Médio prazo', longo: 'Longo prazo' };

const chipFaixa = (fid) => {
  const f = faixa(fid);
  return f ? html`<span class="faixa faixa--${f.id} ap-faixa">${icone(FAIXA_ICONE[f.id], 'icone--sm')}${f.rotulo}</span>` : '';
};
const logo = marca.logo_url ? html`<img src="${marca.logo_url}" alt="" class="marca-logo">` : html`<span class="marca-logo" aria-hidden="true">${marca.nome.charAt(0).toUpperCase()}</span>`;
const marcaTopo = html`<div class="ap-marca marca">${logo}<span>${marca.nome}</span></div>`;

function barra(rotulo, nota, fid, meta = null, anterior = null) {
  return html`<div class="ap-linha-barra ${fid ? `faixa--${fid}` : ''}">
    <span class="ap-rot">${rotulo}</span>
    <div class="ap-trilho" role="img" aria-label="${rotulo}: ${nota === null ? 'sem nota' : formatarNota(nota)}${meta != null ? `, meta ${formatarNota(meta)}` : ''}">
      ${anterior != null ? html`<div class="ap-cheio ap-cheio--ant" style="--v:${anterior * 10}%"></div>` : ''}
      <div class="ap-cheio" style="--v:${(nota ?? 0) * 10}%"></div>
      ${meta != null ? html`<div class="ap-meta" style="--v:${meta * 10}%" title="Meta ${formatarNota(meta)}"></div>` : ''}
    </div>
    <b class="ap-val num">${nota === null ? '—' : formatarNota(nota)}</b></div>`;
}

const cartao = (i, tom) => html`<article class="ap-cartao ap-cartao--${tom}"><h3>${i.titulo}</h3>${i.grupo ? html`<p class="ap-tema">${nomeGrupo(i.grupo)}</p>` : ''}<div class="ap-texto">${mdParaHtml(i.descricao)}</div></article>`;

const slides = [];
const add = (titulo, corpo, classe = '') => slides.push({ titulo, corpo, classe });

// 1. capa
add('Capa', html`${marcaTopo}<div class="ap-capa"><p class="ap-sobre">Relatório de desempenho</p><h1>${s.empresa}</h1>
  <p class="ap-sub">${s.titulo}${s.periodo ? ` · ${s.periodo}` : ''}${s.publicado_em ? ` · ${formatarData(s.publicado_em)}` : ''}</p></div>`, 'ap-slide--capa');

// 2. resultado geral + radar
const series = [{ nome: 'Atual', tipo: 'atual', valores: s.grupos.map((g) => g.nota) }];
if (s.grupos.some((g) => g.anterior !== null)) series.push({ nome: 'Avaliação anterior', tipo: 'anterior', valores: s.grupos.map((g) => g.anterior) });
if (s.grupos.some((g) => g.meta !== null)) series.push({ nome: 'Meta', tipo: 'meta', valores: s.grupos.map((g) => g.meta) });
if (s.grupos.some((g) => g.media !== null)) series.push({ nome: 'Média das empresas', tipo: 'media', valores: s.grupos.map((g) => g.media) });
add('Resultado geral', html`<div class="ap-duas"><div class="ap-coluna-centro"><p class="ap-sobre">Nota geral</p>
    <div class="ap-nota num">${s.geral.nota === null ? '—' : formatarNota(s.geral.nota)}</div><p class="ap-de">de 10</p>${chipFaixa(s.geral.faixaId)}
    ${s.variacao ? html`<p class="ap-variacao ${s.variacao.geral >= 0 ? 'ap-variacao--sobe' : 'ap-variacao--desce'}">${icone(s.variacao.geral >= 0 ? 'sobe' : 'desce')} ${s.variacao.geral >= 0 ? '+' : '−'}${formatarNota(Math.abs(s.variacao.geral))} desde a avaliação anterior</p>` : ''}</div>
  <div class="ap-radar">${radar(s.grupos.map((g) => g.nomeCurto), series, { animar: true })}</div></div>`);

// 3. resumo
if (c.resumo_executivo?.trim()) add('Em resumo', html`<p class="ap-sobre">Em resumo</p><div class="ap-resumo">${mdParaHtml(c.resumo_executivo)}</div>`);

// 4. temas do maior para o menor
const ordenados = [...s.grupos].filter((g) => g.nota !== null).sort((a, b) => b.nota - a.nota);
add('Notas por tema', html`<h2>Como cada tema se saiu</h2><div class="ap-barras">${ordenados.map((g) => barra(g.nome, g.nota, g.faixaId, g.meta))}</div>
  ${ordenados.some((g) => g.meta != null) ? html`<p class="ap-legenda"><span class="ap-meta-amostra"></span> marca a meta do tema</p>` : ''}`);

// 5. evolução
const comAnterior = s.grupos.filter((g) => g.anterior !== null && g.nota !== null);
if (comAnterior.length) {
  add('Evolução', html`<h2>Evolução desde a última avaliação</h2><div class="ap-barras">${comAnterior.map((g) => {
    const d = g.nota - g.anterior;
    return html`<div class="ap-evolucao ${d >= 0 ? 'ap-evolucao--sobe' : 'ap-evolucao--desce'}">${barra(g.nome, g.nota, g.faixaId, null, g.anterior)}<span class="ap-delta num">${d >= 0 ? '+' : '−'}${formatarNota(Math.abs(d))}</span></div>`;
  })}</div><p class="ap-legenda"><span class="ap-ant-amostra"></span> avaliação anterior</p>`);
}

// 6 e 7. destaques
const fortes = (c.pontos_fortes ?? []).filter(() => !oculta('pontos_fortes'));
const atencao = (c.pontos_de_atencao ?? []).filter(() => !oculta('pontos_de_atencao'));
if (fortes.length) add('Onde se destaca', html`<h2>Onde a empresa se destaca</h2><div class="ap-cartoes">${fortes.slice(0, 4).map((i) => cartao(i, 'forte'))}</div>`);
if (atencao.length) add('Onde melhorar', html`<h2>Onde precisa melhorar</h2><div class="ap-cartoes">${atencao.slice(0, 4).map((i) => cartao(i, 'atencao'))}</div>`);

// 8. um slide por tema
s.grupos.forEach((g, i) => {
  const texto = oculta('analise_por_grupo') ? '' : (c.analise_por_grupo ?? []).find((a) => a.grupo === g.id)?.texto;
  add(g.nome, html`<p class="ap-sobre">Tema ${i + 1} de ${s.grupos.length}</p><div class="ap-tema-cab"><h2>${g.nome}</h2>
    <div class="ap-tema-nota"><span class="ap-nota-media num faixa--${g.faixaId ?? ''}">${g.nota === null ? '—' : formatarNota(g.nota)}</span>${chipFaixa(g.faixaId)}
      <span class="ap-meta-info">${g.meta != null ? `Meta ${formatarNota(g.meta)}` : ''}${g.anterior != null ? ` · Antes ${formatarNota(g.anterior)}` : ''}${g.media != null ? ` · Média ${formatarNota(g.media)}` : ''}</span></div></div>
    <div class="ap-tema-corpo"><div class="ap-perguntas">${g.perguntas.map((p) => barra(p.enunciado, p.nota, p.faixaId))}</div>
    ${texto ? html`<div class="ap-analise ap-texto">${mdParaHtml(texto)}</div>` : ''}</div>`, 'ap-slide--tema');
});

// 9. recomendações
const recs = [...(c.recomendacoes ?? [])].filter(() => !oculta('recomendacoes')).sort((a, b) => (ORDEM[a.prioridade] ?? 3) - (ORDEM[b.prioridade] ?? 3));
for (let i = 0; i < recs.length; i += 3) {
  const lote = recs.slice(i, i + 3);
  add('O que fazer', html`<h2>O que fazer${recs.length > 3 ? html` <span class="ap-pag">${Math.floor(i / 3) + 1}/${Math.ceil(recs.length / 3)}</span>` : ''}</h2>
    <div class="ap-recs">${lote.map((r) => html`<article class="ap-rec ap-rec--${r.prioridade}"><div class="ap-rec-meta"><span>${ROTULO_PRIO[r.prioridade] ?? ''}</span><span>${ROTULO_HOR[r.horizonte] ?? ''}</span></div>
      <h3>${r.titulo}</h3><div class="ap-texto">${mdParaHtml(r.descricao)}</div>${r.impacto_esperado ? html`<p class="ap-impacto"><b>Impacto:</b> ${r.impacto_esperado}</p>` : ''}</article>`)}</div>`);
}

// 10. plano por horizonte
if (recs.length) {
  add('Plano de ação', html`<h2>Plano de ação</h2><div class="ap-horizontes">${['curto', 'medio', 'longo'].map((h) => html`<section class="ap-horizonte"><h3>${ROTULO_HOR[h]}</h3>
    <ul>${recs.filter((r) => r.horizonte === h).map((r) => html`<li class="ap-hor-${r.prioridade}">${r.titulo}</li>`)}</ul>${recs.some((r) => r.horizonte === h) ? '' : html`<p class="ap-vazio-h">Sem ações neste prazo.</p>`}</section>`)}</div>`);
}

// 11. evitar
const evitar = (c.o_que_evitar ?? []).filter(() => !oculta('o_que_evitar'));
if (evitar.length) add('O que evitar', html`<h2>O que evitar</h2><div class="ap-cartoes">${evitar.slice(0, 4).map((i) => cartao(i, 'atencao'))}</div>`);

// 12. próximos passos
const passos = (c.proximos_passos ?? []).filter(() => !oculta('proximos_passos'));
if (passos.length || (c.consideracoes_finais && !oculta('consideracoes_finais'))) {
  add('Próximos passos', html`<h2>Próximos passos</h2>${passos.length ? html`<ol class="ap-passos">${passos.map((p) => html`<li>${p}</li>`)}</ol>` : ''}
    ${c.consideracoes_finais && !oculta('consideracoes_finais') ? html`<div class="ap-final ap-texto">${mdParaHtml(c.consideracoes_finais)}</div>` : ''}`);
}

// 13. encerramento
add('Encerramento', html`${marcaTopo}<div class="ap-capa"><h1>Obrigado</h1><p class="ap-sub">${s.empresa}</p><p class="ap-rodape">${rodape ?? ''}</p></div>`, 'ap-slide--capa');

/* ---------- desenho e navegação ---------- */
main.innerHTML = String(html`<div class="ap" id="ap" tabindex="-1">
  <div class="ap-palco">${slides.map((sl, i) => html`<section class="ap-slide ${sl.classe}" id="slide-${i}" aria-roledescription="slide" aria-label="${sl.titulo}: slide ${i + 1} de ${slides.length}">${sl.corpo}</section>`)}</div>
  <div class="ap-progresso" aria-hidden="true"><span id="ap-barra"></span></div>
  <nav class="ap-controles" aria-label="Controles da apresentação">
    <a class="btn btn--ghost btn--icone" href="avaliacao.html?id=${av.id}" aria-label="Sair da apresentação" title="Sair (Esc)">${icone('x')}</a>
    <button class="btn btn--ghost btn--icone" id="ap-ant" aria-label="Slide anterior" title="Anterior (←)">${icone('esq')}</button>
    <span class="ap-contador num" id="ap-contador" aria-hidden="true"></span>
    <button class="btn btn--ghost btn--icone" id="ap-prox" aria-label="Próximo slide" title="Próximo (→)">${icone('dir')}</button>
    <button class="btn btn--ghost btn--icone" id="ap-tela" aria-label="Tela cheia" title="Tela cheia (F)">${icone('monitor')}</button>
  </nav>
  <p class="sr-only" role="status" aria-live="polite" id="ap-anuncio"></p></div>`);
document.title = `Apresentação — ${s.empresa}`;

const els = [...document.querySelectorAll('.ap-slide')];
let atual = Math.min(Math.max(Number(location.hash.slice(1)) - 1 || 0, 0), els.length - 1);

function ir(n, { anunciar = true } = {}) {
  atual = Math.min(Math.max(n, 0), els.length - 1);
  els.forEach((el, i) => {
    el.classList.toggle('ativo', i === atual);
    el.classList.toggle('passado', i < atual);
    el.inert = i !== atual;
  });
  document.getElementById('ap-barra').style.width = `${((atual + 1) / els.length) * 100}%`;
  document.getElementById('ap-contador').textContent = `${atual + 1} / ${els.length}`;
  document.getElementById('ap-ant').disabled = atual === 0;
  document.getElementById('ap-prox').disabled = atual === els.length - 1;
  history.replaceState(null, '', `#${atual + 1}`);
  if (anunciar) document.getElementById('ap-anuncio').textContent = `${slides[atual].titulo}: slide ${atual + 1} de ${els.length}`;
}

const telaCheia = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.().catch(() => {}));
document.getElementById('ap-ant').addEventListener('click', () => ir(atual - 1));
document.getElementById('ap-prox').addEventListener('click', () => ir(atual + 1));
document.getElementById('ap-tela').addEventListener('click', telaCheia);

addEventListener('keydown', (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const k = e.key;
  if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(k)) {
    if (k === 'Enter' && document.activeElement?.closest?.('a, button')) return;
    e.preventDefault();
    ir(atual + 1);
  } else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(k)) {
    e.preventDefault();
    ir(atual - 1);
  } else if (k === 'Home') ir(0);
  else if (k === 'End') ir(els.length - 1);
  else if (k === 'f' || k === 'F') telaCheia();
  else if (k === 'Escape' && !document.fullscreenElement) location.href = `avaliacao.html?id=${av.id}`;
});

// Deslizar no toque
let inicioX = null;
const palco = document.querySelector('.ap-palco');
palco.addEventListener('pointerdown', (e) => {
  inicioX = e.pointerType === 'touch' ? e.clientX : null;
});
palco.addEventListener('pointerup', (e) => {
  if (inicioX === null) return;
  const dx = e.clientX - inicioX;
  if (Math.abs(dx) > 60) ir(atual + (dx < 0 ? 1 : -1));
  inicioX = null;
});

// Os controles somem quando o mouse fica parado (voltam ao mover ou ao focar).
const ap = document.getElementById('ap');
let escondeTimer = null;
const mostrarControles = () => {
  ap.classList.remove('ap--quieto');
  clearTimeout(escondeTimer);
  escondeTimer = setTimeout(() => ap.classList.add('ap--quieto'), 3000);
};
addEventListener('mousemove', mostrarControles);
addEventListener('keydown', mostrarControles);
document.addEventListener('fullscreenchange', () => document.getElementById('ap-tela').setAttribute('aria-pressed', String(Boolean(document.fullscreenElement))));
mostrarControles();
ir(atual, { anunciar: false });
ap.focus();
