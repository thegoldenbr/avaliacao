export const somenteDigitos = (valor) => String(valor ?? '').replace(/\D/g, '');

/** (54) 99999-0000 (celular) ou (54) 9999-0000 (fixo), conforme o usuário digita. */
export function mascararTelefone(valor) {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  if (resto.length <= 4) return `(${ddd}) ${resto}`;
  if (d.length <= 10) return `(${ddd}) ${resto.slice(0, 4)}-${resto.slice(4)}`;
  return `(${ddd}) ${resto.slice(0, 5)}-${resto.slice(5)}`;
}

/** 10 ou 11 dígitos com DDD. Vazio é válido (campo opcional). */
export function telefoneValido(valor) {
  const d = somenteDigitos(valor);
  return d.length === 0 || d.length === 10 || d.length === 11;
}

export const emailValido = (valor) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(valor ?? '').trim());

export const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
export const PORTES = ['Microempresa', 'Pequena empresa', 'Média empresa', 'Grande empresa'];
