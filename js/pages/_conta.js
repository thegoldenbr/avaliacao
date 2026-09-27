/** Chamadas à Edge Function `usuarios` (senha, PIN, criação de contas sem e-mail). */
import { supabase } from '../supabase.js';

export async function chamarUsuarios(acao, corpo = {}) {
  const { data, error } = await supabase.functions.invoke('usuarios', { body: { acao, ...corpo } });
  if (error) {
    const resposta = await error.context?.json?.().catch(() => null);
    throw new Error(resposta?.erro ?? 'Sem conexão com o servidor. Verifique sua internet e tente de novo.');
  }
  return data;
}

/** Abre a sessão de um login por PIN: a função confere o PIN e devolve um token de uso único. */
export async function entrarComPin(usuario, pin) {
  const { token_hash } = await chamarUsuarios('login-pin', { usuario, pin });
  const { error } = await supabase.auth.verifyOtp({ token_hash, type: 'magiclink' });
  if (error) throw new Error('Não foi possível entrar agora. Tente de novo.');
}
