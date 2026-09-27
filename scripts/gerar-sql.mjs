// Junta as migrations e o seed em um único arquivo para colar no SQL Editor do Supabase.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const dir = new URL('../supabase/', import.meta.url);
const migrations = readdirSync(new URL('migrations/', dir)).filter((f) => f.endsWith('.sql')).sort();
const partes = [
  '-- Radar de Desempenho: instalação completa (gerado por `npm run sql:tudo`; não edite).',
  '-- Cole tudo no SQL Editor do Supabase e clique em Run. Pode ser executado uma única vez.',
  '',
  ...migrations.map((f) => `-- ===== migrations/${f} =====\n${readFileSync(new URL(`migrations/${f}`, dir), 'utf8')}`),
  `-- ===== seed.sql (dados de exemplo) =====\n${readFileSync(new URL('seed.sql', dir), 'utf8')}`,
];
writeFileSync(new URL('instalar_tudo.sql', dir), partes.join('\n'));
console.log(`instalar_tudo.sql gerado (${migrations.length} migrations + seed).`);
