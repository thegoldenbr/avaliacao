// Gera as páginas HTML do app a partir de uma tabela (evita repetir o cabeçalho em cada arquivo).
// Rode: npm run paginas. As páginas geradas são versionadas; o site não precisa de build.
import { writeFileSync } from 'node:fs';

const PAGINAS = [
  { arquivo: 'index.html', titulo: 'Início', js: 'inicio' },
  { arquivo: 'login.html', titulo: 'Entrar', js: 'login' },
  { arquivo: 'esqueci-senha.html', titulo: 'Esqueci minha senha', js: 'esqueci-senha' },
  { arquivo: 'redefinir-senha.html', titulo: 'Nova senha', js: 'redefinir-senha' },
  { arquivo: 'aceitar-convite.html', titulo: 'Convite', js: 'aceitar-convite' },
  { arquivo: 'empresas.html', titulo: 'Empresas', js: 'empresas' },
  { arquivo: 'empresa.html', titulo: 'Empresa', js: 'empresa' },
  { arquivo: 'empresa-form.html', titulo: 'Cadastro de empresa', js: 'empresa-form' },
  { arquivo: 'questionarios.html', titulo: 'Questionários', js: 'questionarios' },
  { arquivo: 'questionario.html', titulo: 'Editor de questionário', js: 'questionario', sortable: true },
  { arquivo: 'questionario-previa.html', titulo: 'Pré-visualização', js: 'questionario-previa' },
  { arquivo: 'avaliacoes.html', titulo: 'Avaliações', js: 'avaliacoes' },
  { arquivo: 'avaliacao.html', titulo: 'Avaliação', js: 'avaliacao', qr: true },
  { arquivo: 'relatorio-editor.html', titulo: 'Relatório', js: 'relatorio-editor', qr: true },
  { arquivo: 'avaliacao-nova.html', titulo: 'Nova avaliação', js: 'avaliacao-nova' },
  { arquivo: 'responder.html', titulo: 'Responder avaliação', js: 'responder' },
  { arquivo: 'configuracoes.html', titulo: 'Configurações', js: 'configuracoes' },
  { arquivo: 'mais.html', titulo: 'Mais', js: 'mais' },
];

const pagina = ({ titulo, js, sortable, qr }) => `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="color-scheme" content="light dark">
<title>${titulo} — Radar de Desempenho</title>
<script src="js/tema-cedo.js"></script>
<link rel="icon" href="data:,">
<link rel="stylesheet" href="css/app.css">
</head>
<body>
<main id="conteudo">
  <div class="carregando" aria-busy="true"><div class="skeleton sk-titulo"></div><div class="skeleton sk-linha"></div><div class="skeleton sk-linha"></div></div>
  <noscript><p>Este sistema precisa de JavaScript ativado para funcionar.</p></noscript>
</main>
<script src="vendor/supabase.js"></script>
${sortable ? '<script src="vendor/sortable.min.js"></script>\n' : ''}${qr ? '<script src="vendor/qrcode.js"></script>\n' : ''}<script type="module" src="js/pages/${js}.js"></script>
</body>
</html>
`;

for (const p of PAGINAS) writeFileSync(new URL(`../${p.arquivo}`, import.meta.url), pagina(p));

writeFileSync(
  new URL('../404.html', import.meta.url),
  `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Página não encontrada — Radar de Desempenho</title>
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:1rem;background:#f8fafc;color:#0f172a}@media(prefers-color-scheme:dark){body{background:#0f172a;color:#f1f5f9}a{color:#8ea2ff}}main{max-width:420px}a{color:#2b4acb}</style>
</head>
<body><main><h1>Página não encontrada</h1><p>O endereço não existe ou foi digitado incompleto.</p><p><a href="./">Ir para o início</a></p></main></body>
</html>
`,
);
console.log(`${PAGINAS.length} páginas geradas.`);
