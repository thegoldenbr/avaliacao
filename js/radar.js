/**
 * Gráfico radar em SVG. Eixos = grupos, escala SEMPRE fixa de 0 a 10 (nunca automática).
 * Séries: atual (sólida), anterior (tracejada), meta (pontilhada), média (traço-ponto): diferenciadas
 * também pelo estilo da linha, não só pela cor. Inclui legenda e tabela equivalente para leitores de tela.
 * Com menos de 3 eixos, usa barras horizontais.
 */
import { html, raw } from './html.js';
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
    ? atual.valores.map((v, i) => (v == null ? '' : `<circle class="ponto" cx="${ponto(i, v)[0].toFixed(1)}" cy="${ponto(i, v)[1].toFixed(1)}" r="6"><title>${rotulos[i].replace(/[<>&"]/g, '')}: ${formatarNota(v)}</title></circle>`)).join('')
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
  const svg = `<svg class="radar${animar ? ' radar--anima' : ''}" viewBox="0 0 400 400" role="img" aria-label="${titulo}">${aneis}${eixos}${escala}${formas}${pontos}${textos}</svg>`;
  return html`${raw(svg)}${semLegenda ? '' : legenda(series)}${tabelaParaLeitores(rotulos, series)}`;
}
