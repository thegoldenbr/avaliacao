/** Utilitários de cor para aplicar a cor de destaque configurável mantendo o contraste AA. */

type Rgb = [number, number, number];

export function hexParaRgb(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m?.[1]) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbParaHex([r, g, b]: Rgb): string {
  return '#' + [r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('');
}

function luminancia([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

export function contraste(a: Rgb, b: Rgb): number {
  const [la, lb] = [luminancia(a), luminancia(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const BRANCO: Rgb = [255, 255, 255];
const ESCURO: Rgb = [11, 18, 48];

/** Cor do texto sobre a cor de destaque: a que tiver maior contraste. */
export function corSobre(fundo: Rgb): Rgb {
  return contraste(fundo, BRANCO) >= contraste(fundo, ESCURO) ? BRANCO : ESCURO;
}

function misturar(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Aproxima a cor de `alvo` até atingir contraste mínimo com `fundo` (para usá-la como texto/borda). */
export function garantirContraste(cor: Rgb, fundo: Rgb, alvo: Rgb, minimo = 4.5): Rgb {
  let atual = cor;
  for (let passo = 1; passo <= 20 && contraste(atual, fundo) < minimo; passo++) {
    atual = misturar(cor, alvo, passo / 20);
  }
  return atual;
}

export interface VariaveisMarca {
  '--color-primary': string;
  '--color-primary-hover': string;
  '--color-on-primary': string;
  '--color-primary-soft': string;
}

const FUNDO_CLARO: Rgb = [248, 250, 252];
const FUNDO_ESCURO: Rgb = [30, 41, 59];

/**
 * Gera as variáveis CSS da cor de destaque para o tema atual.
 * No tema claro a cor é escurecida se precisar; no escuro, clareada, sempre com contraste AA sobre o fundo.
 */
export function variaveisDaMarca(hex: string, tema: 'claro' | 'escuro'): VariaveisMarca | null {
  const base = hexParaRgb(hex);
  if (!base) return null;
  const escuro = tema === 'escuro';
  const primaria = escuro ? garantirContraste(base, FUNDO_ESCURO, BRANCO) : garantirContraste(base, FUNDO_CLARO, ESCURO);
  const hover = escuro ? misturar(primaria, BRANCO, 0.2) : misturar(primaria, ESCURO, 0.2);
  const suave = escuro ? misturar(FUNDO_ESCURO, primaria, 0.22) : misturar(BRANCO, primaria, 0.1);
  return {
    '--color-primary': rgbParaHex(primaria),
    '--color-primary-hover': rgbParaHex(hover),
    '--color-on-primary': rgbParaHex(corSobre(primaria)),
    '--color-primary-soft': rgbParaHex(suave),
  };
}
