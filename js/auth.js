import { supabase, dados } from './supabase.js';

export async function sessaoAtual() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function perfilDe(usuarioId) {
  return dados(await supabase.from('perfis').select('*').eq('id', usuarioId).maybeSingle());
}

export async function entrar(email, senha) {
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) throw error;
}

export async function sair() {
  await supabase.auth.signOut();
  try {
    sessionStorage.clear();
  } catch {
    // ignorar
  }
  location.replace('login.html');
}

/** Só aceita voltar para uma página .html do próprio site (evita redirecionar para outro domínio). */
export function destinoSeguro(de) {
  return typeof de === 'string' && /^[a-z0-9-]+\.html(\?[\w=&.%-]*)?$/i.test(de) ? de : 'index.html';
}

export function paginaAtual() {
  return `${location.pathname.split('/').pop() || 'index.html'}${location.search}`;
}
