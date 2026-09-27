/**
 * Markdown básico e SEGURO para os textos do relatório: negrito, itálico, listas e parágrafos.
 * Todo o HTML digitado é escapado antes de qualquer transformação (sem HTML bruto, sem links, sem imagens),
 * então as páginas públicas não ficam expostas a XSS.
 */
import { esc, raw } from './html.js';

function inline(texto) {
  let t = esc(texto);
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*(?![\s*])(.+?)(?<![\s*])\*(?!\*)/g, '$1<em>$2</em>');
  return t;
}

/** Converte o texto em HTML seguro (resultado de raw()). */
export function mdParaHtml(texto) {
  const blocos = String(texto ?? '').replace(/\r\n?/g, '\n').trim().split(/\n{2,}/).filter(Boolean);
  const partes = blocos.map((bloco) => {
    const linhas = bloco.split('\n');
    if (linhas.every((l) => /^\s*[-*•]\s+/.test(l))) return `<ul>${linhas.map((l) => `<li>${inline(l.replace(/^\s*[-*•]\s+/, ''))}</li>`).join('')}</ul>`;
    if (linhas.every((l) => /^\s*\d+[.)]\s+/.test(l))) return `<ol>${linhas.map((l) => `<li>${inline(l.replace(/^\s*\d+[.)]\s+/, ''))}</li>`).join('')}</ol>`;
    return `<p>${linhas.map(inline).join('<br>')}</p>`;
  });
  return raw(partes.join(''));
}

/** Texto puro (sem marcação), para prévias curtas e contagem de palavras. */
export function mdParaTexto(texto) {
  return String(texto ?? '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/^\s*[-*•]\s+/gm, '').trim();
}
