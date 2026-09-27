// Copia a lógica pura compartilhada (fonte única em js/lib) para a pasta das Edge Functions.
// O navegador importa js/lib/*.js; as Edge Functions importam supabase/functions/_shared/*.js.
// O import relativo './indicadores.js' de relatorio-ia.js funciona nas duas pastas.
import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync('supabase/functions/_shared', { recursive: true });
for (const arquivo of ['indicadores.js', 'relatorio-ia.js']) {
  copyFileSync(`js/lib/${arquivo}`, `supabase/functions/_shared/${arquivo}`);
}
console.log('supabase/functions/_shared atualizado (indicadores.js, relatorio-ia.js).');
