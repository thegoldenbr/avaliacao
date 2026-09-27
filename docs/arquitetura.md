# Arquitetura — Radar de Desempenho

Site **estático** (HTML + JavaScript com módulos ES, sem build) publicado no **GitHub Pages**, com **Supabase** como backend (Postgres, Auth, Storage e Edge Functions). Não existe servidor próprio.

## Mapa do repositório

```
*.html                    uma página por tela (geradas por scripts/gerar-paginas.mjs; CSP incluída)
css/app.css               tokens de design (claro/escuro) e componentes
js/
  config.js               URL do projeto e chave publishable do Supabase (públicas)
  supabase.js             cliente (vendor/supabase.js via <script>, sem CDN)
  shell.js auth.js        moldura da área interna, sessão, perfil, tema, marca
  html.js                 template html`` que ESCAPA tudo (proteção contra XSS)
  ui.js forms.js          toast, diálogos, campos com erro, máscaras
  radar.js radar-export.js relatorio-vista.js pdf.js markdown.js qr.js escala-nota.js
  lib/                    regras puras e testadas (cnpj, indicadores, snapshot, relatorio-ia, csv…)
  pages/                  lógica de cada tela (um módulo por página; _arquivos são partes)
vendor/ fonts/            bibliotecas e fonte Figtree versionadas (sem CDN)
supabase/
  migrations/             schema, RLS, RPCs (aplicadas com `supabase db push`)
  seed.sql                dados de exemplo
  functions/              convidar-usuario, gerar-relatorio e _shared (cópia de js/lib)
  tests/banco.mjs         testa migrations, RLS e RPCs num Postgres em memória
mockups/                  mockups da Fase 0 (publicados em /mockups/)
```

## Fluxo do produto

1. **Empresas e questionários** (área interna): a empresa avaliadora cadastra empresas e monta os questionários (grupos e perguntas com pesos). Nada é fixo no sistema.
2. **Avaliação**: `criar_avaliacao` (RPC) copia o questionário (snapshot). A cópia é editável só até o envio; editar o modelo nunca altera avaliações existentes.
3. **Formulário público** `responder.html#TOKEN`: RPCs `obter_formulario` / `salvar_respostas`. Salva no aparelho e no servidor, retoma pelo mesmo link.
4. **Indicadores** (`js/lib/indicadores.js`): cálculo determinístico no código; a IA nunca calcula notas.
5. **Relatório** (`relatorio-editor.html`): a Edge Function `gerar-relatorio` escreve o texto; o analista edita e publica um **snapshot autocontido** (`lib/snapshot.js`).
6. **Dashboard do cliente** `relatorio.html#TOKEN`: RPC `obter_relatorio` devolve só o snapshot publicado. PDF A4 e PNG do radar são gerados no navegador.

## Segurança

- **Sem segredo no front.** Só a URL e a chave publishable. `service_role` e a chave da IA existem apenas nos secrets das Edge Functions.
- **RLS em todas as tabelas.** O papel `anon` não lê nenhuma tabela; só executa 4 RPCs (`obter_marca`, `obter_formulario`, `salvar_respostas`, `obter_relatorio`), e as três últimas exigem token válido (192 bits, regenerável). Verificado por `npm run test:banco`.
- **Perfis:** usuários ativos operam os dados; configurações, perfis e exclusão de empresa são só do administrador. Sem perfil, um usuário autenticado não vê nada.
- **Tokens no fragmento (`#`)** dos links públicos: o navegador não os envia ao servidor.
- **XSS:** toda interpolação passa por `html``; o markdown do relatório escapa HTML antes de formatar e não aceita links nem imagens.
- **CSP** por `<meta>`: scripts só do próprio site; conexões e imagens só do próprio site e do Supabase; sem `object`.
- **Edge Functions:** validam o JWT e o perfil; leem os dados com o JWT do usuário (RLS vale); CORS restrito ao domínio do Pages e ao `localhost`; `convidar-usuario` só aceita administradores e endereços de `APP_URLS`.
- **Contas e PIN:** senha inicial pendente bloqueia todo acesso a dados por RLS (`eh_usuario_ativo` exige `not precisa_trocar_senha`); PIN só existe em tabela sem acesso do navegador (`pins`), com bcrypt e bloqueio por tentativas, acessado apenas pela Edge Function `usuarios` (service_role).
- **Senha do dashboard:** código numérico aleatório por avaliação, verificado no banco (`obter_relatorio`), com contagem de tentativas e bloqueio; sem a senha o RPC não devolve nenhum conteúdo.
- **LGPD:** aviso de privacidade no formulário; nenhum dado pessoal do respondente vai para a IA; exclusão de empresa apaga tudo, com confirmação por digitação.

## Como testar

| Comando | Cobertura |
|---|---|
| `npm test` | CNPJ, máscaras, pesos, faixas, cor/contraste, escape de HTML, indicadores (caso obrigatório da especificação), snapshot, markdown, CSV, contexto/validação da IA, regras das avaliações |
| `npm run test:banco` | Migrations, RLS por papel, RPCs públicas, validações de nota e prazo, snapshot congelado, cascata, primeiro admin |

A interface foi exercitada com um cliente Supabase simulado (dados em memória) e uma auditoria automática de acessibilidade (axe-core, WCAG 2.1 AA) nos dois temas e em largura de celular e desktop.

## Como adicionar uma tela

1. Crie `js/pages/minha-tela.js` (comece com `const { main, perfil } = await iniciarPagina({ ativo: 'inicio' })`).
2. Registre a página em `scripts/gerar-paginas.mjs` e rode `npm run paginas`.
3. Monte o HTML sempre com `html``; use `String(html`...`)` ao atribuir a `innerHTML`.
4. Atributos booleanos ARIA precisam de texto explícito: `aria-checked="${String(valor)}"` (o template descarta `false`).
