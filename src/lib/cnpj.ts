/**
 * CNPJ numérico e alfanumérico (Receita Federal): 12 caracteres [0-9A-Z] + 2 dígitos verificadores numéricos.
 * No cálculo do DV, cada caractere vale seu código ASCII − 48 (dígitos 0–9, letras A=17 … Z=42).
 */

const PESOS_DV1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_DV2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/** Remove máscara e coloca em maiúsculas; mantém só [0-9A-Z]. */
export function limparCnpj(valor: string): string {
  return valor.toUpperCase().replace(/[^0-9A-Z]/g, '');
}

function digito(caracteres: string, pesos: number[]): number {
  let soma = 0;
  for (let i = 0; i < pesos.length; i++) soma += (caracteres.charCodeAt(i) - 48) * (pesos[i] ?? 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/** Calcula os 2 dígitos verificadores de uma base de 12 caracteres. */
export function calcularDigitos(base: string): string {
  const d1 = digito(base, PESOS_DV1);
  const d2 = digito(base + d1, PESOS_DV2);
  return `${d1}${d2}`;
}

export function cnpjValido(valor: string): boolean {
  const cnpj = limparCnpj(valor);
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(cnpj)) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false; // 00000000000000, 11111111111111…
  return calcularDigitos(cnpj.slice(0, 12)) === cnpj.slice(12);
}

/** Máscara progressiva: 12.ABC.345/01DE-35 */
export function mascararCnpj(valor: string): string {
  const c = limparCnpj(valor).slice(0, 14);
  let saida = c.slice(0, 2);
  if (c.length > 2) saida += '.' + c.slice(2, 5);
  if (c.length > 5) saida += '.' + c.slice(5, 8);
  if (c.length > 8) saida += '/' + c.slice(8, 12);
  if (c.length > 12) saida += '-' + c.slice(12, 14);
  return saida;
}
