import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL;
const chavePublica = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !chavePublica) {
  throw new Error(
    'Faltam VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY. Copie .env.example para .env (local) ou cadastre as variáveis no GitHub (deploy).',
  );
}

/**
 * Cliente do navegador: usa só a URL e a chave pública (publishable).
 * A service_role e a chave da IA nunca entram aqui; ficam nos secrets das Edge Functions.
 */
export const supabase = createClient<Database>(url, chavePublica, {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true },
});
