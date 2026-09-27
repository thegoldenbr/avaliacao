/**
 * PDF A4 do relatório, gerado no navegador (funciona no celular): capa com marca, nota geral e faixa, radar,
 * tabela por tema, análises, recomendações e próximos passos, com numeração de páginas.
 * O jsPDF (vendor/) só é carregado quando o usuário pede o PDF, para não pesar a página.
 */
import { radarSvgIndependente, svgParaPng } from './radar-export.js';
import { mdParaTexto } from './markdown.js';
import { formatarData, formatarNota } from './lib/formatacao.js';

const COR_FAIXA = { critico: [185, 28, 28], atencao: [180, 83, 9], bom: [77, 124, 15], excelente: [4, 120, 87] };
const COR_PRIORIDADE = { alta: [185, 28, 28], media: [180, 83, 9], baixa: [100, 116, 139] };
const ROTULO_PRIORIDADE = { alta: 'Prioridade alta', media: 'Prioridade média', baixa: 'Prioridade baixa' };
const ROTULO_HORIZONTE = { curto: 'Curto prazo', medio: 'Médio prazo', longo: 'Longo prazo' };
const AZUL = [43, 74, 203];
const TEXTO = [15, 23, 42];
const MUDO = [83, 96, 116];
const M = 18; // margem (mm)
const LARGURA = 210 - 2 * M;

/** Helvetica padrão só cobre Latin-1/WinAnsi: troca símbolos que ficariam quebrados. */
export function limparTexto(t) {
  return mdParaTexto(String(t ?? ''))
    .replace(/[−–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/[▲▼]/g, '')
    .replace(/[^\u0009\u000A -~ -ÿ]/g, '');
}

function carregarJsPdf() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = new URL('vendor/jspdf.umd.min.js', document.baseURI).href;
    s.onload = () => (window.jspdf?.jsPDF ? resolve(window.jspdf.jsPDF) : reject(new Error('jsPDF indisponível.')));
    s.onerror = () => reject(new Error('Não foi possível carregar o gerador de PDF. Verifique sua conexão.'));
    document.head.appendChild(s);
  });
}

function seriesDoSnapshot(s) {
  const lista = [{ nome: 'Atual', tipo: 'atual', valores: s.grupos.map((g) => g.nota) }];
  if (s.grupos.some((g) => g.anterior !== null)) lista.push({ nome: 'Avaliação anterior', tipo: 'anterior', valores: s.grupos.map((g) => g.anterior) });
  if (s.grupos.some((g) => g.meta !== null)) lista.push({ nome: 'Meta', tipo: 'meta', valores: s.grupos.map((g) => g.meta) });
  if (s.grupos.some((g) => g.media !== null)) lista.push({ nome: 'Média das empresas', tipo: 'media', valores: s.grupos.map((g) => g.media) });
  return lista;
}

export function radarDoSnapshot(s) {
  return radarSvgIndependente(s.grupos.map((g) => g.nomeCurto), seriesDoSnapshot(s));
}

export async function gerarPdf(s, { marca, rodape }) {
  const JsPdf = await carregarJsPdf();
  const doc = new JsPdf({ unit: 'mm', format: 'a4', compress: true });
  const c = s.conteudo ?? {};
  const oculta = (k) => s.opcoes?.ocultar?.[k];
  const faixa = (id) => s.faixas.find((f) => f.id === id);
  let y = M;

  const cor = (rgb) => doc.setTextColor(...rgb);
  const fonte = (estilo, tamanho) => (doc.setFont('helvetica', estilo), doc.setFontSize(tamanho));
  const espaco = (altura) => {
    if (y + altura > 297 - 24) {
      doc.addPage();
      y = M;
    }
  };
  function texto(t, { tamanho = 10.5, estilo = 'normal', rgb = TEXTO, x = M, largura = LARGURA, respiro = 1.4 } = {}) {
    fonte(estilo, tamanho);
    cor(rgb);
    const linhas = doc.splitTextToSize(limparTexto(t), largura);
    const alturaLinha = tamanho * 0.3528 * 1.35;
    for (const l of linhas) {
      espaco(alturaLinha);
      doc.text(l, x, y + tamanho * 0.3528);
      y += alturaLinha;
    }
    y += respiro;
  }
  const titulo = (t) => {
    espaco(16);
    y += 4;
    texto(t, { tamanho: 15, estilo: 'bold', respiro: 2 });
    doc.setDrawColor(226, 232, 240);
    doc.line(M, y - 1, M + LARGURA, y - 1);
    y += 2;
  };
  const marcador = (rgb, t, descricao) => {
    espaco(14);
    doc.setFillColor(...rgb);
    const y0 = y;
    texto(t, { estilo: 'bold', x: M + 4, largura: LARGURA - 4, respiro: 0.6 });
    if (descricao) texto(descricao, { rgb: MUDO, x: M + 4, largura: LARGURA - 4, respiro: 0.5 });
    if (y > y0) doc.rect(M, y0, 1.2, y - y0 - 0.5, 'F');
    y += 2.5;
  };

  /* ---------- capa ---------- */
  fonte('bold', 12);
  cor(AZUL);
  doc.text(limparTexto(marca?.nome ?? ''), M, y + 4);
  y += 26;
  texto('Relatório de desempenho', { tamanho: 12, rgb: MUDO, respiro: 1 });
  texto(s.empresa, { tamanho: 26, estilo: 'bold', respiro: 2 });
  texto(`${s.titulo}${s.periodo ? ` - ${s.periodo}` : ''}${s.publicado_em ? ` - publicado em ${formatarData(s.publicado_em)}` : ''}`, { rgb: MUDO, respiro: 6 });

  const yNota = y;
  fonte('bold', 54);
  cor(TEXTO);
  doc.text(s.geral.nota === null ? '-' : formatarNota(s.geral.nota), M, yNota + 22);
  fonte('normal', 12);
  cor(MUDO);
  doc.text('de 10', M + 44, yNota + 22);
  const f = faixa(s.geral.faixaId);
  if (f) {
    fonte('bold', 13);
    cor(COR_FAIXA[f.id]);
    doc.text(limparTexto(f.rotulo), M, yNota + 32);
  }
  if (s.variacao) {
    fonte('normal', 10.5);
    cor(s.variacao.geral >= 0 ? COR_FAIXA.excelente : COR_FAIXA.critico);
    doc.text(`${s.variacao.geral >= 0 ? '+' : '-'}${formatarNota(Math.abs(s.variacao.geral))} desde a avaliação anterior`, M, yNota + 39);
  }
  try {
    const radar = radarDoSnapshot(s);
    const png = await svgParaPng(radar, 3);
    const largura = 92;
    doc.addImage(png.dataUrl, 'PNG', 210 - M - largura, yNota - 4, largura, (largura * radar.altura) / radar.largura);
    y = yNota - 4 + (largura * radar.altura) / radar.largura + 6;
  } catch {
    y = yNota + 46;
  }

  // tabela por tema
  fonte('bold', 10);
  cor(MUDO);
  doc.text('Tema', M, y);
  doc.text('Nota', M + 84, y, { align: 'right' });
  doc.text('Faixa', M + 92, y);
  doc.text('Anterior', M + LARGURA, y, { align: 'right' });
  doc.setDrawColor(203, 213, 225);
  doc.line(M, y + 1.8, M + LARGURA, y + 1.8);
  y += 6.5;
  for (const g of s.grupos) {
    espaco(7);
    fonte('normal', 10.5);
    cor(TEXTO);
    doc.text(limparTexto(g.nome), M, y);
    doc.text(g.nota === null ? '-' : formatarNota(g.nota), M + 84, y, { align: 'right' });
    const fg = faixa(g.faixaId);
    if (fg) {
      cor(COR_FAIXA[fg.id]);
      doc.text(limparTexto(fg.rotulo), M + 92, y);
    }
    cor(MUDO);
    doc.text(g.anterior === null ? '-' : formatarNota(g.anterior), M + LARGURA, y, { align: 'right' });
    y += 6.5;
  }

  /* ---------- conteúdo ---------- */
  if (c.resumo_executivo) {
    doc.addPage();
    y = M;
    titulo('Resumo executivo');
    texto(c.resumo_executivo);
  }
  const nomeGrupo = (id) => s.grupos.find((g) => g.id === id)?.nome ?? '';
  if (!oculta('pontos_fortes') && c.pontos_fortes?.length) {
    titulo('Onde a empresa se destaca');
    c.pontos_fortes.forEach((i) => marcador(COR_FAIXA.excelente, i.titulo, i.descricao));
  }
  if (!oculta('pontos_de_atencao') && c.pontos_de_atencao?.length) {
    titulo('Onde precisa melhorar');
    c.pontos_de_atencao.forEach((i) => marcador(COR_FAIXA.atencao, i.titulo, i.descricao));
  }
  if (!oculta('analise_por_grupo') && c.analise_por_grupo?.some((a) => a.texto)) {
    titulo('Análise por tema');
    for (const a of c.analise_por_grupo.filter((x) => x.texto)) {
      const g = s.grupos.find((x) => x.id === a.grupo);
      texto(`${nomeGrupo(a.grupo)}${g?.nota != null ? ` - ${formatarNota(g.nota)}` : ''}`, { estilo: 'bold', respiro: 0.6 });
      texto(a.texto, { respiro: 3 });
    }
  }
  if (!oculta('recomendacoes') && c.recomendacoes?.length) {
    titulo('O que fazer');
    const ordem = { alta: 0, media: 1, baixa: 2 };
    for (const r of [...c.recomendacoes].sort((a, b) => (ordem[a.prioridade] ?? 3) - (ordem[b.prioridade] ?? 3))) {
      espaco(24);
      const y0 = y;
      texto(`${ROTULO_PRIORIDADE[r.prioridade] ?? ''} | ${ROTULO_HORIZONTE[r.horizonte] ?? ''}${r.grupo ? ` | ${nomeGrupo(r.grupo)}` : ''}`, { tamanho: 9, rgb: COR_PRIORIDADE[r.prioridade] ?? MUDO, x: M + 4, largura: LARGURA - 4, respiro: 0.4 });
      texto(r.titulo, { estilo: 'bold', x: M + 4, largura: LARGURA - 4, respiro: 0.6 });
      texto(r.descricao, { x: M + 4, largura: LARGURA - 4, respiro: 0.6 });
      if (r.impacto_esperado) texto(`Impacto esperado: ${r.impacto_esperado}`, { rgb: MUDO, x: M + 4, largura: LARGURA - 4, respiro: 0.5 });
      doc.setFillColor(...(COR_PRIORIDADE[r.prioridade] ?? MUDO));
      if (y > y0) doc.rect(M, y0, 1.2, y - y0 - 0.5, 'F');
      y += 3;
    }
  }
  if (!oculta('o_que_evitar') && c.o_que_evitar?.length) {
    titulo('O que evitar');
    c.o_que_evitar.forEach((i) => marcador(COR_FAIXA.atencao, i.titulo, i.descricao));
  }
  if (!oculta('proximos_passos') && c.proximos_passos?.length) {
    titulo('Próximos passos');
    c.proximos_passos.forEach((p, i) => texto(`${i + 1}. ${p}`, { respiro: 1 }));
  }
  if (!oculta('consideracoes_finais') && c.consideracoes_finais) {
    y += 2;
    texto(c.consideracoes_finais, { respiro: 2 });
  }

  /* ---------- rodapé e numeração ---------- */
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    fonte('normal', 8.5);
    cor(MUDO);
    doc.setDrawColor(226, 232, 240);
    doc.line(M, 297 - 15, M + LARGURA, 297 - 15);
    doc.text(limparTexto(rodape ?? ''), M, 297 - 10);
    doc.text(`${p} de ${total}`, M + LARGURA, 297 - 10, { align: 'right' });
  }
  return doc;
}
