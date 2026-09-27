/**
 * Gráfico radar em SVG. Eixos = grupos, escala SEMPRE fixa de 0 a 10 (nunca automática).
 * Séries: atual (sólida), anterior (tracejada), meta (pontilhada), média (traço-ponto): diferenciadas
 * também pelo estilo da linha, não só pela cor. Inclui legenda e tabela equivalente para leitores de tela.
 * Com menos de 3 eixos, usa barras horizontais.
 */
import { esc, html, raw } from './html.js';
import { formatarNota } from './lib/formatacao.js';

const ESTILOS = {
  atual: { classe: 'serie--atual', tracejado: '', cor: 'var(--color-primary)' },
  anterior: { classe: 'serie--anterior', tracejado: '7 5', cor: 'var(--serie-anterior)' },
  meta: { classe: 'serie--meta', tracejado: '2 5', cor: 'var(--serie-meta)' },
  media: { classe: 'serie--media', tracejado: '10 4 2 4', cor: 'var(--serie-media)' },
};

const CENTRO = 200;
const RAIO = 128;

function legenda(series) {
  return html`<ul class="legenda">${series.map((s) => html`<li><svg viewBox="0 0 32 8" aria-hidden="true"><line x1="0" y1="4" x2="32" y2="4" stroke="${ESTILOS[s.tipo].cor}" stroke-width="3" stroke-dasharray="${ESTILOS[s.tipo].tracejado}"/></svg>${s.nome}</li>`)}</ul>`;
}

function tabelaParaLeitores(rotulos, series) {
  return html`<div class="sr-only"><table><caption>Notas por grupo (escala de 0 a 10)</caption>
    <thead><tr><th>Grupo</th>${series.map((s) => html`<th>${s.nome}</th>`)}</tr></thead>
    <tbody>${rotulos.map((r, i) => html`<tr><th>${r}</th>${series.map((s) => html`<td>${s.valores[i] == null ? 'sem dado' : formatarNota(s.valores[i])}</td>`)}</tr>`)}</tbody></table></div>`;
}

function barras(rotulos, series) {
  const atual = series.find((s) => s.tipo === 'atual') ?? series[0];
  return html`<div class="pilha" role="img" aria-label="Notas por grupo, escala de 0 a 10">${rotulos.map((r, i) => {
    const v = atual.valores[i];
    return html`<div class="barra-pergunta"><p class="texto">${r}</p><div class="trilho"><div class="preenchido" style="--nota:${v ?? 0};background:var(--color-primary)"></div></div><span class="valor num">${v == null ? '—' : formatarNota(v)}</span></div>`;
  })}</div>`;
}

/**
 * @param {string[]} rotulos nomes curtos dos grupos
 * @param {{nome:string,tipo:'atual'|'anterior'|'meta'|'media',valores:(number|null)[]}[]} series
 * @param {{animar?:boolean,titulo?:string,semLegenda?:boolean}} opcoes
 */
export function radar(rotulos, series, { animar = false, titulo = 'Radar de desempenho por grupo, escala de 0 a 10', semLegenda = false } = {}) {
  if (rotulos.length < 3) return html`${barras(rotulos, series)}${semLegenda ? '' : legenda(series)}${tabelaParaLeitores(rotulos, series)}`;

  const n = rotulos.length;
  const ponto = (i, v) => {
    const angulo = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [CENTRO + Math.cos(angulo) * RAIO * (v / 10), CENTRO + Math.sin(angulo) * RAIO * (v / 10)];
  };
  const poligono = (v) => rotulos.map((_, i) => ponto(i, v).map((c) => c.toFixed(1)).join(',')).join(' ');
  const aneis = [2, 4, 6, 8, 10].map((v) => `<polygon class="anel${v === 10 ? ' anel--fora' : ''}" points="${poligono(v)}"/>`).join('');
  const eixos = rotulos.map((_, i) => { const [x, y] = ponto(i, 10); return `<line class="eixo" x1="${CENTRO}" y1="${CENTRO}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('');
  const escala = [0, 5, 10].map((v) => `<text class="escala-txt" x="${CENTRO + 4}" y="${CENTRO - (RAIO * v) / 10 + 4}">${v}</text>`).join('');
  // Desenha a meta e a média por baixo e a série atual por cima.
  const ordem = ['media', 'meta', 'anterior', 'atual'];
  const desenhadas = [...series].sort((a, b) => ordem.indexOf(a.tipo) - ordem.indexOf(b.tipo));
  const formas = desenhadas
    .map((s) => `<polygon class="serie ${ESTILOS[s.tipo].classe}" points="${s.valores.map((v, i) => ponto(i, v ?? 0).map((c) => c.toFixed(1)).join(',')).join(' ')}"/>`)
    .join('');
  const atual = series.find((s) => s.tipo === 'atual');
  const pontos = atual
    ? atual.valores.map((v, i) => (v == null ? '' : `<circle class="ponto" cx="${ponto(i, v)[0].toFixed(1)}" cy="${ponto(i, v)[1].toFixed(1)}" r="6"/>`)).join('')
    : '';
  const textos = rotulos
    .map((r, i) => {
      const angulo = -Math.PI / 2 + (2 * Math.PI * i) / n;
      const x = CENTRO + Math.cos(angulo) * (RAIO + 22);
      const y = CENTRO + Math.sin(angulo) * (RAIO + 22) + 5;
      const ancora = Math.abs(Math.cos(angulo)) < 0.2 ? 'middle' : Math.cos(angulo) > 0 ? 'start' : 'end';
      return html`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${ancora}">${r}</text>`.toString();
    })
    .join('');
  // Um alvo invisível (bem maior que o ponto) em cada vértice: passar o mouse (ou tocar) mostra a nota
  // de cada série naquele eixo. Os dados vão codificados no atributo (URI, não HTML) para não precisar
  // escapar aspas/HTML dentro do atributo.
  const alvos = rotulos
    .map((r, i) => {
      const [x, y] = ponto(i, 10);
      const info = series.filter((s) => s.valores[i] != null).map((s) => ({ nome: s.nome, valor: formatarNota(s.valores[i]), cor: ESTILOS[s.tipo].cor }));
      if (!info.length) return '';
      const dados = encodeURIComponent(JSON.stringify({ rotulo: r, info }));
      return `<circle class="radar-alvo" data-info="${dados}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="26" aria-hidden="true"/>`;
    })
    .join('');
  const svg = `<svg class="radar${animar ? ' radar--anima' : ''}" viewBox="-70 0 540 400" role="img" aria-label="${titulo}">${aneis}${eixos}${escala}${formas}${pontos}${textos}${alvos}</svg>`;
  return html`<div class="radar-caixa">${raw(svg)}<div class="radar-dica" role="tooltip" hidden></div></div>${semLegenda ? '' : legenda(series)}${tabelaParaLeitores(rotulos, series)}`;
}

let ligado = false;

/** Liga a interação do radar (mostrar a nota de cada série ao passar o mouse/tocar/focar um eixo). */
function ativar() {
  if (ligado) return;
  ligado = true;

  function mostrar(alvo) {
    const caixa = alvo.closest('.radar-caixa');
    const dica = caixa?.querySelector('.radar-dica');
    if (!dica) return;
    const { rotulo, info } = JSON.parse(decodeURIComponent(alvo.dataset.info));
    dica.innerHTML = `<b>${esc(rotulo)}</b><ul>${info.map((i) => `<li><span class="radar-dica-cor" style="background:${esc(i.cor)}"></span>${esc(i.nome)}: <b class="num">${esc(i.valor)}</b></li>`).join('')}</ul>`;
    const rCaixa = caixa.getBoundingClientRect();
    const rAlvo = alvo.getBoundingClientRect();
    dica.hidden = false;
    const cx = rAlvo.left + rAlvo.width / 2 - rCaixa.left;
    const cy = rAlvo.top + rAlvo.height / 2 - rCaixa.top;
    dica.style.left = `${Math.min(Math.max(cx, 70), rCaixa.width - 70)}px`;
    dica.style.top = `${cy}px`;
    dica.classList.toggle('radar-dica--baixo', cy < 70);
  }
  function esconder(caixa) {
    const dica = caixa?.querySelector?.('.radar-dica');
    if (dica) dica.hidden = true;
  }

  document.addEventListener('pointerover', (e) => {
    const alvo = e.target.closest('.radar-alvo');
    if (alvo) mostrar(alvo);
  });
  document.addEventListener('pointerout', (e) => {
    const alvo = e.target.closest('.radar-alvo');
    if (alvo && !alvo.contains(e.relatedTarget)) esconder(alvo.closest('.radar-caixa'));
  });
  // Toque: no primeiro toque num alvo mostra a dica; tocar fora de qualquer alvo esconde.
  document.addEventListener('pointerdown', (e) => {
    const alvo = e.target.closest('.radar-alvo');
    if (alvo) return mostrar(alvo);
    document.querySelectorAll('.radar-dica').forEach((d) => (d.hidden = true));
  });
}
ativar();
