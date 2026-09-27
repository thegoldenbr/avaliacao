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

const hexParaRgb = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '');
  return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null;
};
const clarear = (rgb, t) => rgb.map((v) => Math.round(v + (255 - v) * t));
const CLARO = [241, 245, 249];
const BORDA = [226, 232, 240];
const BRANCO = [255, 255, 255];

/** Logo em PNG/JPEG para o PDF; qualquer falha (CORS, formato) só omite o logo. */
async function logoParaPdf(url) {
  if (!url) return null;
  try {
    const resposta = await fetch(url);
    const blob = await resposta.blob();
    const bmp = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    canvas.getContext('2d').drawImage(bmp, 0, 0);
    return { dataUrl: canvas.toDataURL('image/png'), largura: bmp.width, altura: bmp.height };
  } catch {
    return null;
  }
}

/**
 * Documento completo, como se a empresa avaliadora o tivesse produzido para o cliente:
 * capa, sumário, metodologia, resultado geral, análise de cada tema com todas as perguntas,
 * pontos fortes e de atenção, plano de ação por prazo, o que evitar e considerações finais.
 */
export async function gerarPdf(s, { marca, rodape }) {
  const JsPdf = await carregarJsPdf();
  const doc = new JsPdf({ unit: 'mm', format: 'a4', compress: true });
  const c = s.conteudo ?? {};
  const oculta = (k) => s.opcoes?.ocultar?.[k];
  const faixa = (id) => s.faixas.find((f) => f.id === id);
  const nomeGrupo = (id) => s.grupos.find((g) => g.id === id)?.nome ?? '';
  const P = hexParaRgb(marca?.cor_destaque) ?? AZUL;
  const P_SUAVE = clarear(P, 0.9);
  const logo = await logoParaPdf(marca?.logo_url);
  const ALTURA = 297;
  const BASE = ALTURA - 22; // limite inferior do conteúdo
  const TOPO = 24; // início do conteúdo nas páginas internas
  let y = TOPO;
  const secoes = []; // { titulo, pagina } para o sumário

  const cor = (rgb) => doc.setTextColor(...rgb);
  const preencher = (rgb) => doc.setFillColor(...rgb);
  const fonte = (estilo, tamanho) => (doc.setFont('helvetica', estilo), doc.setFontSize(tamanho));
  const novaPagina = () => {
    doc.addPage();
    y = TOPO;
  };
  const espaco = (altura) => {
    if (y + altura > BASE) novaPagina();
  };
  const desenharLogo = (x, yy, altura) => {
    if (!logo) return 0;
    const largura = Math.min((altura * logo.largura) / logo.altura, 40);
    doc.addImage(logo.dataUrl, 'PNG', x, yy, largura, (largura * logo.altura) / logo.largura);
    return largura;
  };

  function texto(t, { tamanho = 10.5, estilo = 'normal', rgb = TEXTO, x = M, largura = LARGURA, respiro = 1.4, alinhar } = {}) {
    fonte(estilo, tamanho);
    cor(rgb);
    const linhas = doc.splitTextToSize(limparTexto(t), largura);
    const alturaLinha = tamanho * 0.3528 * 1.4;
    for (const l of linhas) {
      espaco(alturaLinha);
      doc.text(l, alinhar === 'centro' ? x + largura / 2 : x, y + tamanho * 0.3528, alinhar === 'centro' ? { align: 'center' } : undefined);
      y += alturaLinha;
    }
    y += respiro;
  }
  const alturaTexto = (t, tamanho, largura) => {
    fonte('normal', tamanho);
    return doc.splitTextToSize(limparTexto(t), largura).length * tamanho * 0.3528 * 1.4;
  };

  function secao(t, { nova = true } = {}) {
    if (nova) novaPagina();
    else espaco(30);
    secoes.push({ titulo: t, pagina: doc.getNumberOfPages() });
    preencher(P);
    doc.rect(M, y, 10, 1.4, 'F');
    y += 5;
    texto(t, { tamanho: 20, estilo: 'bold', respiro: 5 });
  }
  const subtitulo = (t, rgb = TEXTO) => {
    espaco(14);
    y += 2;
    texto(t, { tamanho: 13, estilo: 'bold', rgb, respiro: 2 });
  };

  /** Barra 0-10 com faixa colorida, marca de meta e valor. */
  function barra(rotulo, nota, faixaId, { meta = null, anterior = null, x = M, largura = LARGURA, tamanho = 10 } = {}) {
    const rotuloLargura = largura * 0.44;
    const trilhoX = x + rotuloLargura + 2;
    const trilhoL = largura - rotuloLargura - 2 - 12;
    fonte('normal', tamanho);
    const linhas = doc.splitTextToSize(limparTexto(rotulo), rotuloLargura);
    const altura = Math.max(linhas.length * tamanho * 0.3528 * 1.35, 5);
    espaco(altura + 2);
    cor(TEXTO);
    doc.text(linhas, x, y + tamanho * 0.3528);
    const meio = y + Math.min(altura, 5) / 2;
    const rgb = COR_FAIXA[faixaId] ?? P;
    preencher(CLARO);
    doc.roundedRect(trilhoX, meio - 1.6, trilhoL, 3.2, 1.6, 1.6, 'F');
    if (anterior != null) {
      preencher([148, 163, 184]);
      doc.roundedRect(trilhoX, meio - 0.5, Math.max((trilhoL * anterior) / 10, 1), 1, 0.5, 0.5, 'F');
    }
    if (nota != null && nota > 0) {
      preencher(rgb);
      doc.roundedRect(trilhoX, meio - 1.6, Math.max((trilhoL * nota) / 10, 3.2), 3.2, 1.6, 1.6, 'F');
    }
    if (meta != null) {
      preencher(COR_FAIXA.atencao);
      doc.rect(trilhoX + (trilhoL * meta) / 10 - 0.3, meio - 2.4, 0.6, 4.8, 'F');
    }
    fonte('bold', tamanho);
    cor(nota == null ? MUDO : rgb);
    doc.text(nota == null ? '-' : formatarNota(nota), x + largura, y + tamanho * 0.3528, { align: 'right' });
    y += altura + 2;
  }

  /** Cartão com barra lateral colorida, título e descrição. */
  function cartao(rgb, titulo, descricao, { etiqueta, rodapeTexto } = {}) {
    const x = M + 5;
    const l = LARGURA - 10;
    const altura = (etiqueta ? 5 : 0) + alturaTexto(titulo, 11, l) * 1.05 + (descricao ? alturaTexto(descricao, 10, l) : 0) + (rodapeTexto ? alturaTexto(rodapeTexto, 9.5, l) : 0) + 8;
    espaco(Math.min(altura, 60));
    const y0 = y;
    y += 3.5;
    if (etiqueta) texto(etiqueta, { tamanho: 8.5, estilo: 'bold', rgb, x, largura: l, respiro: 0.8 });
    texto(titulo, { tamanho: 11, estilo: 'bold', x, largura: l, respiro: 1 });
    if (descricao) texto(descricao, { x, largura: l, respiro: 0.8 });
    if (rodapeTexto) texto(rodapeTexto, { tamanho: 9.5, rgb: MUDO, x, largura: l, respiro: 0.8 });
    y += 2;
    // fundo desenhado por baixo do texto já escrito: usa retângulos só nas bordas (barra lateral + linha de base)
    preencher(rgb);
    doc.rect(M, y0, 1.4, y - y0, 'F');
    doc.setDrawColor(...BORDA);
    doc.line(M + 1.4, y, M + LARGURA, y);
    y += 3.5;
  }

  /* ============ CAPA ============ */
  preencher(P);
  doc.rect(0, 0, 210, 150, 'F');
  preencher(clarear(P, 0.12));
  doc.circle(190, 20, 60, 'F');
  preencher(clarear(P, 0.06));
  doc.circle(20, 140, 45, 'F');
  const larguraLogo = logo ? desenharLogo(M, 20, 14) : 0;
  fonte('bold', 13);
  cor(BRANCO);
  doc.text(limparTexto(marca?.nome ?? ''), M + (larguraLogo ? larguraLogo + 4 : 0), 30);
  fonte('normal', 12);
  cor(clarear(P, 0.75));
  doc.text('RELATÓRIO DE DESEMPENHO', M, 78, { charSpace: 0.8 });
  fonte('bold', 34);
  cor(BRANCO);
  const linhasEmpresa = doc.splitTextToSize(limparTexto(s.empresa), LARGURA);
  doc.text(linhasEmpresa, M, 92);
  fonte('normal', 13);
  cor(clarear(P, 0.85));
  doc.text(doc.splitTextToSize(limparTexto(`${s.titulo}${s.periodo ? ` - ${s.periodo}` : ''}`), LARGURA), M, 92 + linhasEmpresa.length * 13 + 4);

  // cartão com a nota geral
  preencher(BRANCO);
  doc.setDrawColor(...BORDA);
  doc.roundedRect(M, 138, LARGURA, 40, 3, 3, 'FD');
  const notaTexto = s.geral.nota === null ? '-' : formatarNota(s.geral.nota);
  fonte('bold', 44);
  cor(TEXTO);
  doc.text(notaTexto, M + 8, 165);
  const larguraNota = doc.getTextWidth(notaTexto);
  fonte('normal', 11);
  cor(MUDO);
  doc.text('de 10', M + 8 + larguraNota + 3, 165);
  const fg = faixa(s.geral.faixaId);
  if (fg) {
    fonte('bold', 13);
    cor(COR_FAIXA[fg.id]);
    doc.text(limparTexto(fg.rotulo), M + LARGURA - 8, 152, { align: 'right' });
  }
  fonte('normal', 10);
  cor(MUDO);
  doc.text('Nota geral da avaliação', M + LARGURA - 8, 159, { align: 'right' });
  if (s.variacao) {
    cor(s.variacao.geral >= 0 ? COR_FAIXA.excelente : COR_FAIXA.critico);
    doc.text(`${s.variacao.geral >= 0 ? '+' : '-'}${formatarNota(Math.abs(s.variacao.geral))} desde a avaliação anterior`, M + LARGURA - 8, 166, { align: 'right' });
  }

  fonte('normal', 10.5);
  cor(MUDO);
  const dataTexto = s.publicado_em ? `Emitido em ${formatarData(s.publicado_em)}` : '';
  doc.text('Preparado para', M, 200);
  fonte('bold', 14);
  cor(TEXTO);
  doc.text(limparTexto(s.empresa), M, 207);
  fonte('normal', 10.5);
  cor(MUDO);
  doc.text(dataTexto, M, 214);
  doc.setDrawColor(...P);
  doc.setLineWidth(0.6);
  doc.line(M, 258, M + 16, 258);
  doc.setLineWidth(0.2);
  fonte('bold', 10.5);
  cor(TEXTO);
  doc.text(limparTexto(marca?.nome ?? ''), M, 265);
  fonte('normal', 9);
  cor(MUDO);
  doc.text(doc.splitTextToSize(limparTexto(rodape ?? ''), LARGURA), M, 270);

  /* ============ SUMÁRIO (preenchido no fim) ============ */
  novaPagina();
  const paginaSumario = doc.getNumberOfPages();

  /* ============ COMO LER ESTE RELATÓRIO ============ */
  secao('Como ler este relatório');
  texto(`Este relatório apresenta o resultado da avaliação "${s.titulo}" realizada em ${s.empresa}${s.periodo ? ` (${s.periodo})` : ''}. As perguntas estão organizadas em ${s.grupos.length} temas e cada resposta recebeu uma nota de 0 a 10. A nota de cada tema é a média das perguntas, ponderada pelo peso que cada uma tem na avaliação, e a nota geral combina os temas segundo a importância de cada um.`, { respiro: 4 });
  subtitulo('Faixas de desempenho');
  for (const f of s.faixas) {
    espaco(9);
    preencher(COR_FAIXA[f.id] ?? P);
    doc.roundedRect(M, y, 4, 4, 1, 1, 'F');
    fonte('bold', 10.5);
    cor(TEXTO);
    doc.text(limparTexto(f.rotulo), M + 7, y + 3.3);
    fonte('normal', 10.5);
    cor(MUDO);
    doc.text(`de ${formatarNota(f.de ?? f.min ?? 0)} a ${formatarNota(f.ate ?? f.max ?? 10)}`, M + 50, y + 3.3);
    y += 7;
  }
  y += 3;
  subtitulo('Legenda dos gráficos');
  texto('As barras mostram a nota de 0 a 10. Quando existe, um traço laranja marca a meta definida para o tema e uma linha cinza fina mostra a nota da avaliação anterior. No radar, a linha cheia é o resultado atual; as demais linhas comparam com a avaliação anterior, com a meta e com a média das empresas avaliadas.', { respiro: 2 });
  if (!oculta('resumo_executivo') && c.resumo_executivo) {
    y += 2;
  }

  /* ============ RESULTADO GERAL ============ */
  secao('Resultado geral');
  if (c.resumo_executivo && !oculta('resumo_executivo')) {
    preencher(P_SUAVE);
    const alturaResumo = alturaTexto(c.resumo_executivo, 10.5, LARGURA - 10) + 10;
    if (alturaResumo < 80) {
      doc.roundedRect(M, y, LARGURA, alturaResumo, 2, 2, 'F');
      y += 5;
      texto(c.resumo_executivo, { x: M + 5, largura: LARGURA - 10, respiro: 5 });
    } else {
      texto(c.resumo_executivo, { respiro: 4 });
    }
  }
  try {
    const radar = radarDoSnapshot(s);
    const png = await svgParaPng(radar, 3);
    const largura = 110;
    const altura = (largura * radar.altura) / radar.largura;
    espaco(altura + 4);
    doc.addImage(png.dataUrl, 'PNG', M + (LARGURA - largura) / 2, y, largura, altura);
    y += altura + 4;
  } catch {
    // sem radar no PDF: o restante continua completo
  }
  subtitulo('Nota por tema');
  const ordenados = [...s.grupos].sort((a, b) => (b.nota ?? -1) - (a.nota ?? -1));
  for (const g of ordenados) barra(g.nome, g.nota, g.faixaId, { meta: g.meta, anterior: g.anterior });

  /* ============ EVOLUÇÃO ============ */
  const comAnterior = s.grupos.filter((g) => g.anterior !== null && g.nota !== null);
  if (comAnterior.length) {
    secao('Evolução desde a última avaliação', { nova: false });
    for (const g of comAnterior) {
      const d = g.nota - g.anterior;
      espaco(9);
      fonte('normal', 10.5);
      cor(TEXTO);
      doc.text(limparTexto(g.nome), M, y + 3.3);
      cor(MUDO);
      doc.text(`${formatarNota(g.anterior)}  >  ${formatarNota(g.nota)}`, M + 100, y + 3.3, { align: 'right' });
      fonte('bold', 10.5);
      cor(d >= 0 ? COR_FAIXA.excelente : COR_FAIXA.critico);
      doc.text(`${d >= 0 ? '+' : '-'}${formatarNota(Math.abs(d))}`, M + LARGURA, y + 3.3, { align: 'right' });
      doc.setDrawColor(...BORDA);
      doc.line(M, y + 6, M + LARGURA, y + 6);
      y += 8;
    }
  }

  /* ============ DESTAQUES ============ */
  if (!oculta('pontos_fortes') && c.pontos_fortes?.length) {
    secao('Onde a empresa se destaca');
    c.pontos_fortes.forEach((i) => cartao(COR_FAIXA.excelente, i.titulo, i.descricao, { etiqueta: i.grupo ? nomeGrupo(i.grupo).toUpperCase() : undefined }));
  }
  if (!oculta('pontos_de_atencao') && c.pontos_de_atencao?.length) {
    secao('Onde precisa melhorar', { nova: !(!oculta('pontos_fortes') && c.pontos_fortes?.length) || y > 150 });
    c.pontos_de_atencao.forEach((i) => cartao(COR_FAIXA.atencao, i.titulo, i.descricao, { etiqueta: i.grupo ? nomeGrupo(i.grupo).toUpperCase() : undefined }));
  }

  /* ============ UM CAPÍTULO POR TEMA ============ */
  secao('Análise detalhada por tema');
  texto('A seguir, cada tema com a nota de todas as perguntas respondidas e a análise correspondente.', { rgb: MUDO, respiro: 4 });
  s.grupos.forEach((g, idx) => {
    espaco(46);
    const yCab = y;
    preencher(P_SUAVE);
    doc.roundedRect(M, yCab, LARGURA, 20, 2, 2, 'F');
    fonte('bold', 8.5);
    cor(P);
    doc.text(`TEMA ${idx + 1} DE ${s.grupos.length}`, M + 5, yCab + 6);
    fonte('bold', 14);
    cor(TEXTO);
    doc.text(doc.splitTextToSize(limparTexto(g.nome), LARGURA - 50), M + 5, yCab + 14);
    const rgb = COR_FAIXA[g.faixaId] ?? P;
    fonte('bold', 22);
    cor(rgb);
    doc.text(g.nota === null ? '-' : formatarNota(g.nota), M + LARGURA - 5, yCab + 11, { align: 'right' });
    const fgr = faixa(g.faixaId);
    fonte('bold', 9);
    doc.text(limparTexto(fgr?.rotulo ?? ''), M + LARGURA - 5, yCab + 17, { align: 'right' });
    y = yCab + 24;
    const notas = [g.meta != null ? `Meta ${formatarNota(g.meta)}` : null, g.anterior != null ? `Avaliação anterior ${formatarNota(g.anterior)}` : null, g.media != null ? `Média das empresas ${formatarNota(g.media)}` : null].filter(Boolean);
    if (notas.length) texto(notas.join('   |   '), { tamanho: 9.5, rgb: MUDO, respiro: 2 });
    for (const p of g.perguntas) barra(p.enunciado, p.nota, p.faixaId, { tamanho: 9.5 });
    const analise = !oculta('analise_por_grupo') ? c.analise_por_grupo?.find((a) => a.grupo === g.id)?.texto : null;
    if (analise) {
      y += 2;
      espaco(22);
      texto('Análise', { tamanho: 10, estilo: 'bold', rgb: P, respiro: 0.8 });
      texto(analise, { respiro: 2 });
    }
    y += 7;
  });

  /* ============ PLANO DE AÇÃO ============ */
  const ordem = { alta: 0, media: 1, baixa: 2 };
  const recs = !oculta('recomendacoes') ? [...(c.recomendacoes ?? [])].sort((a, b) => (ordem[a.prioridade] ?? 3) - (ordem[b.prioridade] ?? 3)) : [];
  if (recs.length) {
    secao('Plano de ação');
    texto('As recomendações abaixo estão ordenadas por prioridade e organizadas por prazo de execução.', { rgb: MUDO, respiro: 3 });
    for (const h of ['curto', 'medio', 'longo']) {
      const lista = recs.filter((r) => r.horizonte === h);
      if (!lista.length) continue;
      subtitulo(ROTULO_HORIZONTE[h], P);
      lista.forEach((r) => cartao(COR_PRIORIDADE[r.prioridade] ?? MUDO, r.titulo, r.descricao, {
        etiqueta: `${ROTULO_PRIORIDADE[r.prioridade] ?? ''}${r.grupo ? `  |  ${nomeGrupo(r.grupo)}` : ''}`.toUpperCase(),
        rodapeTexto: r.impacto_esperado ? `Impacto esperado: ${r.impacto_esperado}` : undefined,
      }));
    }
  }
  if (!oculta('o_que_evitar') && c.o_que_evitar?.length) {
    secao('O que evitar', { nova: y > 170 });
    c.o_que_evitar.forEach((i) => cartao(COR_FAIXA.critico, i.titulo, i.descricao));
  }

  /* ============ PRÓXIMOS PASSOS E ENCERRAMENTO ============ */
  const passos = !oculta('proximos_passos') ? (c.proximos_passos ?? []) : [];
  const consideracoes = !oculta('consideracoes_finais') ? c.consideracoes_finais : '';
  if (passos.length || consideracoes) {
    secao('Próximos passos', { nova: y > 170 });
    passos.forEach((p, i) => {
      const l = LARGURA - 12;
      espaco(alturaTexto(p, 10.5, l) + 4);
      preencher(P);
      doc.circle(M + 4, y + 3, 3.2, 'F');
      fonte('bold', 9);
      cor(BRANCO);
      doc.text(String(i + 1), M + 4, y + 4.2, { align: 'center' });
      texto(p, { x: M + 11, largura: l, respiro: 3 });
    });
    if (consideracoes) {
      y += 3;
      subtitulo('Considerações finais');
      texto(consideracoes, { respiro: 2 });
    }
  }
  espaco(30);
  y += 8;
  doc.setDrawColor(...P);
  doc.setLineWidth(0.6);
  doc.line(M, y, M + 16, y);
  doc.setLineWidth(0.2);
  y += 5;
  texto(`Relatório elaborado por ${marca?.nome ?? ''}.`, { estilo: 'bold', respiro: 0.5 });
  if (rodape) texto(rodape, { tamanho: 9.5, rgb: MUDO });

  /* ============ SUMÁRIO ============ */
  doc.setPage(paginaSumario);
  y = TOPO;
  preencher(P);
  doc.rect(M, y, 10, 1.4, 'F');
  y += 5;
  texto('Sumário', { tamanho: 20, estilo: 'bold', respiro: 6 });
  secoes.forEach((sc, i) => {
    fonte('normal', 11.5);
    cor(TEXTO);
    const rotulo = `${i + 1}.  ${limparTexto(sc.titulo)}`;
    doc.text(rotulo, M, y + 4);
    const larguraRotulo = doc.getTextWidth(rotulo);
    const numero = String(sc.pagina);
    cor(MUDO);
    doc.text(numero, M + LARGURA, y + 4, { align: 'right' });
    doc.setDrawColor(...BORDA);
    doc.setLineDashPattern([0.4, 1.2], 0);
    doc.line(M + larguraRotulo + 3, y + 4, M + LARGURA - doc.getTextWidth(numero) - 3, y + 4);
    doc.setLineDashPattern([], 0);
    doc.link(M, y, LARGURA, 6.5, { pageNumber: sc.pagina });
    y += 10;
  });

  /* ============ CABEÇALHO, RODAPÉ E NUMERAÇÃO ============ */
  const total = doc.getNumberOfPages();
  for (let p = 2; p <= total; p++) {
    doc.setPage(p);
    preencher(P);
    doc.rect(0, 0, 210, 3, 'F');
    fonte('bold', 8.5);
    cor(P);
    doc.text(limparTexto(marca?.nome ?? ''), M, 12);
    fonte('normal', 8.5);
    cor(MUDO);
    doc.text(limparTexto(`${s.empresa} - ${s.titulo}`), M + LARGURA, 12, { align: 'right' });
    doc.setDrawColor(...BORDA);
    doc.line(M, 15, M + LARGURA, 15);
    doc.line(M, ALTURA - 15, M + LARGURA, ALTURA - 15);
    doc.text(limparTexto(rodape ?? ''), M, ALTURA - 10);
    doc.text(`Página ${p} de ${total}`, M + LARGURA, ALTURA - 10, { align: 'right' });
  }
  doc.setProperties({ title: `${s.titulo} - ${s.empresa}`, subject: 'Relatório de desempenho', author: marca?.nome ?? '' });
  return doc;
}
