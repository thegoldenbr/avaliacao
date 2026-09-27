/** Cliente do Supabase. A biblioteca vem de vendor/supabase.js (carregada antes por <script>, sem CDN). */
import { SUPABASE_URL, SUPABASE_CHAVE_PUBLICA } from './config.js';

if (!window.supabase?.createClient) {
  throw new Error('vendor/supabase.js não foi carregado. Confira o <script src="vendor/supabase.js"> da página.');
}

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA, {
  // PKCE: os links de e-mail trazem ?code=... na query, que o cliente troca por sessão sozinho.
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/** Lança o erro do Supabase, se houver, e devolve os dados. */
export function dados({ data, error }) {
  if (error) throw error;
  return data;
}

/** Endereço absoluto de outra página do site (funciona no subcaminho do GitHub Pages e no localhost). */
export function urlDaPagina(pagina) {
  return new URL(pagina, location.href).href;
}

/** Endereço base do site (pasta atual), com barra no fim. */
export function urlBase() {
  return new URL('./', location.href).href;
}
