/** Peso relativo (%) de cada item dentro de uma lista de pesos. */
export function percentuais(pesos) {
  const soma = pesos.reduce((total, p) => total + p, 0);
  return pesos.map((p) => (soma > 0 ? (p / soma) * 100 : 0));
}

/** 16,7 → "17%". Arredonda para inteiro; abaixo de 1% mostra "<1%". */
export function formatarPercentual(valor) {
  if (valor > 0 && valor < 0.5) return '<1%';
  return `${Math.round(valor)}%`;
}
