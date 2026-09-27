// Copia o cálculo de indicadores (fonte única em js/lib) para a pasta compartilhada das Edge Functions.
// O navegador importa js/lib/indicadores.js; a Edge Function importa supabase/functions/_shared/indicadores.js.
import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync('supabase/functions/_shared', { recursive: true });
copyFileSync('js/lib/indicadores.js', 'supabase/functions/_shared/indicadores.js');
console.log('supabase/functions/_shared/indicadores.js atualizado.');
