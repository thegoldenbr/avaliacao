/**
 * Radar como imagem: SVG independente (sem variáveis CSS, fundo branco, legenda embutida) e conversão para PNG.
 * Usado no "Baixar radar (PNG)" e na capa do PDF. Sempre em cores claras, independentemente do tema da tela.
 */
import { esc } from './html.js';
import { formatarNota } from './lib/formatacao.js';

const COR = { atual: '#2B4ACB', anterior: '#64748B', meta: '#B45309', media: '#7C3AED' };
const TRACEJADO = { atual: '', anterior: '7 5', meta: '2 5', media: '10 4 2 4' };
const CENTRO = 200;
const RAIO = 128;

function barras(rotulos, series) {
  const atual = series.find((s) => s.tipo === 'atual') ?? series[0];
  const linhas = rotulos.map((r, i) => {
    const v = atual.valores[i];
    const y = 60 + i * 70;
    return `<text x="20" y="${y}" font-size="20" fill="#0F172A">${esc(r)}</text><rect x="20" y="${y + 12}" width="300" height="18" rx="9" fill="#E2E8F0"/><rect x="20" y="${y + 12}" width="${(300 * (v ?? 0)) / 10}" height="18" rx="9" fill="${COR.atual}"/><text x="335" y="${y + 28}" font-size="20" font-weight="600" fill="#0F172A">${v == null ? '—' : formatarNota(v)}</text>`;
  });
  return { corpo: linhas.join(''), altura: 60 + rotulos.length * 70 };
}

/** @returns {{svg:string,largura:number,altura:number}} */
export function radarSvgIndependente(rotulos, series, titulo = 'Radar de desempenho') {
  const n = rotulos.length;
  let corpo;
  let altura;
  if (n < 3) {
    ({ corpo, altura } = barras(rotulos, series));
  } else {
    const ponto = (i, v) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
      return [CENTRO + Math.cos(a) * RAIO * (v / 10), CENTRO + Math.sin(a) * RAIO * (v / 10)];
    };
    const poligono = (fn) => rotulos.map((_, i) => ponto(i, fn(i)).map((c) => c.toFixed(1)).join(',')).join(' ');
    const aneis = [2, 4, 6, 8, 10].map((v) => `<polygon points="${poligono(() => v)}" fill="none" stroke="${v === 10 ? '#CBD5E1' : '#E2E8F0'}" stroke-width="1"/>`).join('');
    const eixos = rotulos.map((_, i) => `<line x1="${CENTRO}" y1="${CENTRO}" x2="${ponto(i, 10)[0].toFixed(1)}" y2="${ponto(i, 10)[1].toFixed(1)}" stroke="#E2E8F0"/>`).join('');
    const escala = [0, 5, 10].map((v) => `<text x="${CENTRO + 4}" y="${CENTRO - (RAIO * v) / 10 + 4}" font-size="11" fill="#536074">${v}</text>`).join('');
    const ordem = ['media', 'meta', 'anterior', 'atual'];
    const formas = [...series]
      .sort((a, b) => ordem.indexOf(a.tipo) - ordem.indexOf(b.tipo))
      .map((s) => `<polygon points="${poligono((i) => s.valores[i] ?? 0)}" fill="${s.tipo === 'atual' ? 'rgba(43,74,203,.2)' : 'none'}" stroke="${COR[s.tipo]}" stroke-width="${s.tipo === 'atual' ? 2.5 : 2}" stroke-dasharray="${TRACEJADO[s.tipo]}" stroke-linecap="round"/>`)
      .join('');
    const atual = series.find((s) => s.tipo === 'atual');
    const pontos = atual ? atual.valores.map((v, i) => (v == null ? '' : `<circle cx="${ponto(i, v)[0].toFixed(1)}" cy="${ponto(i, v)[1].toFixed(1)}" r="5" fill="${COR.atual}" stroke="#fff" stroke-width="2"/>`)).join('') : '';
    const textos = rotulos.map((r, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
      const x = CENTRO + Math.cos(a) * (RAIO + 22);
      const y = CENTRO + Math.sin(a) * (RAIO + 22) + 5;
      const ancora = Math.abs(Math.cos(a)) < 0.2 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end';
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${ancora}" font-size="14" fill="#0F172A">${esc(r)}</text>`;
    }).join('');
    corpo = aneis + eixos + escala + formas + pontos + textos;
    altura = 400;
  }
  // Legenda embutida (linha de cada série + nome)
  const legenda = series.map((s, i) => `<line x1="20" y1="${altura + 22 + i * 22}" x2="52" y2="${altura + 22 + i * 22}" stroke="${COR[s.tipo]}" stroke-width="3" stroke-dasharray="${TRACEJADO[s.tipo]}"/><text x="60" y="${altura + 27 + i * 22}" font-size="14" fill="#0F172A">${esc(s.nome)}</text>`).join('');
  const total = altura + 20 + series.length * 22 + 10;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="${total}" viewBox="-70 0 540 ${total}" font-family="Arial, Helvetica, sans-serif" role="img" aria-label="${esc(titulo)}"><rect x="-70" width="540" height="${total}" fill="#FFFFFF"/>${corpo}${legenda}</svg>`;
  return { svg, largura: 540, altura: total };
}

/** SVG → PNG (data URL) usando canvas. `escala` 2 gera imagem nítida. */
export function svgParaPng({ svg, largura, altura }, escala = 3) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = largura * escala;
      canvas.height = altura * escala;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve({ dataUrl: canvas.toDataURL('image/png'), largura: canvas.width, altura: canvas.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível gerar a imagem do radar.'));
    };
    img.src = url;
  });
}

export function baixarDataUrl(dataUrl, nome) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
