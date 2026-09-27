/**
 * Regras de usuários sem e-mail: usuário = nome.sobrenome, senha inicial, e-mail interno, senha e PIN válidos.
 * Copiado para supabase/functions/_shared/usuarios.js por `npm run compartilhar` (a Edge Function usa a mesma regra).
 */

export const SENHA_INICIAL = '123456';
/** O Supabase Auth exige e-mail: quem não tem usa um e-mail interno que nunca recebe mensagens. */
export const DOMINIO_USUARIOS = 'radar.local';
export const TAMANHO_MINIMO_SENHA = 8;

const semAcentos = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');

/** "João da Silva" → ["joao", "da", "silva"] (só letras e números, minúsculas). */
export function palavrasDoNome(nome) {
  return semAcentos(nome)
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .replace(/['-]/g, '')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Gera "nome.sobrenome" (primeiro e último nome). Devolve null se faltar sobrenome.
 * Se já existir, acrescenta um número: joao.silva, joao.silva2, joao.silva3…
 */
export function gerarUsuario(nomeCompleto, existentes = []) {
  const p = palavrasDoNome(nomeCompleto);
  if (p.length < 2) return null;
  const base = `${p[0]}.${p[p.length - 1]}`.slice(0, 55);
  const usados = new Set([...existentes].map((u) => String(u).toLowerCase()));
  if (!usados.has(base)) return base;
  for (let n = 2; n < 1000; n++) if (!usados.has(`${base}${n}`)) return `${base}${n}`;
  return null;
}

export const emailInterno = (usuario) => `${String(usuario).trim().toLowerCase()}@${DOMINIO_USUARIOS}`;
export const ehEmail = (texto) => String(texto ?? '').includes('@');

/** O que a pessoa digitou no login (e-mail ou usuário) → e-mail usado no Supabase Auth. */
export function entradaParaEmail(texto) {
  const t = String(texto ?? '').trim().toLowerCase();
  return ehEmail(t) ? t : emailInterno(t);
}

/** Problemas da nova senha (lista vazia = válida). */
export function problemasDaSenha(senha, { usuario = '' } = {}) {
  const p = [];
  const s = String(senha ?? '');
  if (s.length < TAMANHO_MINIMO_SENHA) p.push(`Use pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`);
  if (s === SENHA_INICIAL) p.push('A nova senha precisa ser diferente da senha inicial.');
  if (usuario && s.toLowerCase() === String(usuario).toLowerCase()) p.push('A senha não pode ser igual ao usuário.');
  if (/^(.)\1+$/.test(s)) p.push('Evite repetir o mesmo caractere.');
  return p;
}

/** PIN de exatamente 6 dígitos, sem sequências óbvias (000000, 111111, 123456, 654321). */
export function problemasDoPin(pin) {
  const s = String(pin ?? '');
  if (!/^[0-9]{6}$/.test(s)) return ['O PIN precisa ter exatamente 6 dígitos.'];
  const d = [...s].map(Number);
  const igual = d.every((x) => x === d[0]);
  const sobe = d.every((x, i) => i === 0 || x === d[i - 1] + 1);
  const desce = d.every((x, i) => i === 0 || x === d[i - 1] - 1);
  return igual || sobe || desce ? ['Escolha um PIN menos previsível (sem repetir nem seguir sequência).'] : [];
}
