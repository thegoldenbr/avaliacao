# Radar de Desempenho

Sistema para uma empresa avaliadora medir o desempenho de outras empresas com questionários de nota 0 a 10 e entregar a cada uma um dashboard individual.

**Arquitetura:** código no GitHub · site **estático em HTML + JavaScript** (sem React, sem build) servido pelo **GitHub Pages** · banco, autenticação, storage e Edge Functions no **Supabase**. Não há servidor próprio.

- **Páginas:** cada tela é um arquivo `.html` na raiz (`index.html`, `empresas.html`, `questionario.html`…) com um módulo em `js/pages/`. O GitHub Pages serve os arquivos como estão; abrir a pasta com qualquer servidor estático já basta para desenvolver.
- **Sem CDN:** as bibliotecas (`vendor/supabase.js`, `vendor/sortable.min.js`) e a fonte Figtree (`fonts/`) ficam no repositório. `npm run vendor` recopia de `node_modules` quando você atualizar versões.
- **Segredos:** no navegador entram **apenas** a URL do projeto e a chave publishable (`js/config.js`). A chave da IA e a `service_role` ficam nos *secrets* das Edge Functions. Toda regra de acesso é garantida por RLS e RPCs no banco.
- **Links públicos:** o token vai no fragmento da URL (`responder.html#TOKEN`, `relatorio.html#TOKEN`; o dashboard do cliente baixa PDF A4 e PNG do radar, gerados no navegador), que o navegador não envia ao servidor. O formulário salva sozinho (aparelho + servidor), retoma pelo mesmo link e reenvia quando a internet volta.
- **Segurança de HTML:** as telas são montadas com o template `html```(`js/html.js`), que escapa tudo que vem do banco (proteção contra XSS).
- **Design:** [PROJECT_STYLE.md](PROJECT_STYLE.md), [docs/design-system.md](docs/design-system.md) e `css/app.css`. Mockups da Fase 0 em `mockups/` (publicados em `/mockups/`).

> Status: Todas as fases (0 a 7) concluídas em HTML puro. Veja [docs/arquitetura.md](docs/arquitetura.md) para o mapa do código e a segurança.

## Desenvolvimento local

```bash
npm install                 # só para testes e para recopiar vendor/
npm run servir              # servidor estático com compressão; abra http://localhost:5173/ (ou qualquer servidor estático)
```

| Comando | O que faz |
|---|---|
| `npm run servir [porta]` | Servidor estático local com Brotli/gzip, parecido com o GitHub Pages |
| `npm test` | Testes unitários das bibliotecas (`node --test`): CNPJ, máscaras, pesos, faixas, cor, escape de HTML |
| `npm run test:banco` | Testa migrations, RLS e RPCs num Postgres em memória (PGlite), sem Docker e sem tocar no Supabase |
| `npm run paginas` | Regenera os `.html` a partir de `scripts/gerar-paginas.mjs` |
| `npm run sql:tudo` | Regenera `supabase/instalar_tudo.sql` (migrations + seed) |
| `npm run compartilhar` | Copia o cálculo de indicadores (`js/lib/indicadores.js`) para `supabase/functions/_shared/` (usado pela Edge Function; um teste confere que são idênticos) |
| `npm run vendor` | Recopia as bibliotecas e a fonte de `node_modules` |

## Colocar no ar (3 passos)

1. **Banco:** no Supabase, abra *SQL Editor > New query*, cole todo o conteúdo de [`supabase/instalar_tudo.sql`](supabase/instalar_tudo.sql) e clique em **Run** (uma única vez). Ele cria tabelas, RLS, RPCs e os dados de exemplo. (Gerado por `npm run sql:tudo` a partir de `supabase/migrations/` e `seed.sql`.)
2. **Administrador:** em *Authentication > Users > Add user > Create new user*, informe e-mail e senha (marque *Auto Confirm User*). **O primeiro usuário criado vira administrador automaticamente.** Os seguintes só entram por convite do admin (Fase 2); sem perfil, um usuário não enxerga dado nenhum.
3. **GitHub Pages:** no repositório, *Settings > Pages > Source: **GitHub Actions***. A cada push na `main`, o workflow [deploy.yml](.github/workflows/deploy.yml) roda os testes e publica em `https://thegoldenbr.github.io/avaliacao/` (mockups em `/mockups/`). Como o site é HTML puro, *Deploy from a branch (raiz)* também funciona.

A URL do projeto e a chave publishable (públicas) já estão em `js/config.js`, então não é preciso cadastrar variáveis no GitHub.

**Antes de convidar usuários (Fase 2):** em *Authentication > Sign In / Providers*, desative **Allow new users to sign up**, e em *URL Configuration* defina **Site URL** = `https://thegoldenbr.github.io/avaliacao/` e inclua também em **Redirect URLs** esse endereço e `http://localhost:5173/`. Mesmo com o cadastro aberto, quem se cadastra não acessa nada (não tem perfil), mas o correto é desligá-lo.

**Convites:** o admin gera o link em *Configurações > Usuários > Convidar usuário* e o envia por WhatsApp ou e-mail (a função `convidar-usuario` não depende do envio de e-mails do Supabase, que tem limite baixo). Para publicar a função: `npx supabase functions deploy convidar-usuario --use-api`. O link aponta para `aceitar-convite.html`. Ela só aceita os endereços de `APP_URLS` (padrão: o do GitHub Pages e `http://localhost:5173/`); para outro domínio, `npx supabase secrets set APP_URLS="https://seu-dominio/,http://localhost:5173/"`.

**Chave da IA:** você mesmo cadastra, sem colar no chat nem no repositório: *Edge Functions > Secrets* no painel do Supabase, ou no terminal `npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-... ANTHROPIC_MODEL=claude-sonnet-5`. Sem a chave, o botão “Gerar com IA” mostra uma mensagem clara e o relatório pode ser escrito à mão. As funções `usuarios`, `convidar-usuario` e `gerar-relatorio` já estão publicadas (`npx supabase functions deploy gerar-relatorio --use-api` para atualizar).

Por CLI (já usado neste projeto): `npx supabase login` (terminal interativo), `npx supabase link --project-ref rbefxbmfyvoaiubpmfwg`, `npx supabase db push` para migrations novas e `npx supabase db query --linked -f supabase/seed.sql` para o seed. 

## Usuários, senhas e PIN

- **Sem e-mail:** em *Configurações > Usuários > Novo usuário*, digite nome e sobrenome. O sistema gera o usuário `nome.sobrenome` (com número se já existir) e a senha inicial `123456`. Passe os dados à pessoa (há botão de copiar e de WhatsApp).
- **Primeiro acesso:** quem entra com a senha inicial é obrigado a criar uma senha nova (mínimo de 8 caracteres, diferente de `123456`). Até trocar, o banco não deixa ver nem alterar nenhum dado (regra de RLS), mesmo chamando a API direto.
- **PIN:** no segundo login o sistema pergunta se a pessoa quer cadastrar um PIN de 6 dígitos (sem sequências óbvias). Com PIN, entra com usuário + PIN pela opção “Entrar com PIN”. O PIN é guardado com hash bcrypt e 5 erros bloqueiam o PIN por 15 minutos (a senha continua funcionando). Gerencie em *Mais > Cadastrar/Gerenciar PIN*.
- **Redefinir:** o administrador pode voltar a senha de qualquer usuário sem e-mail para `123456` (apaga o PIN e exige nova troca).
- **Com e-mail:** o convite por link continua disponível na mesma tela.
- O Supabase Auth exige e-mail; quem não tem usa um endereço interno `usuario@radar.local` que nunca recebe mensagens. A senha mínima do projeto no Supabase deve ser 6 ou menos (padrão).

## Senha do dashboard do cliente

No editor do relatório, em *Acesso do cliente*, ligue “Exigir senha”. O sistema gera um código **aleatório de 6 dígitos** (aparece para você copiar e já entra no texto do WhatsApp/e-mail). “Gerar nova senha” troca o número e **a anterior para de funcionar**; o dashboard público volta a pedir a nova senha. 5 erros seguidos bloqueiam o link por 10 minutos. Desligando, o link abre direto.

## Segurança do banco (resumo)

- Papel `anon` **sem acesso a nenhuma tabela**. O acesso público é só pelas RPCs `obter_marca`, `obter_formulario`, `salvar_respostas` e `obter_relatorio`; as três últimas exigem token válido.
- Tokens de 192 bits (base64url), regeneráveis para revogar um link vazado.
- Usuários internos ativos acessam os dados operacionais; configurações, perfis e exclusão de empresa são só do administrador.
- A cópia (snapshot) das perguntas de uma avaliação congela após o envio; editar o modelo não altera avaliações existentes.
- `npm run test:banco` verifica esses pontos, inclusive que `anon` só executa as 4 RPCs públicas.

## Qualidade verificada

- **Testes:** `npm test` (36 testes das regras puras, incluindo o caso obrigatório da especificação) e `npm run test:banco` (RLS, RPCs, snapshot, cascata) passam a cada push (workflow de deploy).
- **Acessibilidade:** auditoria automática com axe-core (WCAG 2.1 A e AA) em todas as 19 telas, nos temas claro e escuro, em 390 px e 1280 px: **0 violações**. Sem rolagem horizontal em 320, 360 e 768 px.
- **Lighthouse (mobile, páginas públicas):** desempenho 94, acessibilidade 100, boas práticas 100 (o SEO é menor de propósito: o site é `noindex`).
- **Segurança:** CSP por `<meta>`, sem segredo no front, RLS/RPC no banco e escape de HTML em toda interpolação (ver [docs/arquitetura.md](docs/arquitetura.md)).
- **Limite da verificação:** as telas da área interna foram exercitadas com um cliente Supabase simulado, sem criar contas no seu projeto. O primeiro teste ponta a ponta com login real é seu; se algo falhar, anote a tela e a mensagem.
