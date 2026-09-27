// Copia as bibliotecas de terceiros para vendor/ e fonts/ (o site não usa CDN nem build).
// Rode depois de atualizar as versões: npm run vendor
import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync('vendor', { recursive: true });
mkdirSync('fonts', { recursive: true });
copyFileSync('node_modules/@supabase/supabase-js/dist/umd/supabase.js', 'vendor/supabase.js');
copyFileSync('node_modules/sortablejs/Sortable.min.js', 'vendor/sortable.min.js');
for (const peso of [400, 500, 600, 700]) {
  copyFileSync(`node_modules/@fontsource/figtree/files/figtree-latin-${peso}-normal.woff2`, `fonts/figtree-latin-${peso}-normal.woff2`);
}
console.log('vendor/ e fonts/ atualizados.');
