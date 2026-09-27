/** CSV pronto para o Excel em português: UTF-8 com BOM, separador ";" e vírgula decimal. */

const formatoDecimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4, useGrouping: false });

function celula(valor) {
  if (valor === null || valor === undefined) return '';
  let texto = typeof valor === 'number' ? formatoDecimal.format(valor) : String(valor);
  // Evita que o Excel interprete texto como fórmula (=, +, -, @) em campos livres.
  if (typeof valor === 'string' && /^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function paraCsv(linhas) {
  return '﻿' + linhas.map((l) => l.map(celula).join(';')).join('\r\n') + '\r\n';
}

export function baixarCsv(nomeDoArquivo, linhas) {
  const blob = new Blob([paraCsv(linhas)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeDoArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Nome de arquivo seguro (sem acentos nem símbolos). */
export function nomeDeArquivo(texto) {
  return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'arquivo';
}
