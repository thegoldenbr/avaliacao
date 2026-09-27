# Radar de Desempenho

Sistema para uma empresa avaliadora medir o desempenho de outras empresas com questionários de nota 0 a 10 e entregar a cada uma um dashboard individual.

**Arquitetura:** código no GitHub · front estático no **GitHub Pages** · banco, autenticação, storage e Edge Functions no **Supabase**. Não há servidor próprio.

- Front: Vite + React + TypeScript (strict) + Tailwind, com **HashRouter** (`/#/...`), então links profundos funcionam no Pages e o token dos links públicos fica no fragmento da URL, que o navegador não envia ao servidor.
- Segredos: no navegador entram **apenas** a URL do projeto e a chave publishable. A chave da IA e a `service_role` ficam nos *secrets* das Edge Functions. Toda regra de acesso é garantida por RLS e RPCs no banco.
- Design: [PROJECT_STYLE.md](PROJECT_STYLE.md) e [docs/design-system.md](docs/design-system.md). Mockups em `mockups/` (publicados em `/mockups/`).

> Status: Fase 1 (base) concluída. Veja o plano completo de fases no documento de especificação.

## Desenvolvimento local

```bash
npm install
cp .env.example .env   # preencha URL e chave publishable do Supabase
npm run dev
```

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Checagem de tipos e build de produção (`dist/`) |
| `npm test` | Testes unitários (Vitest) |
| `npm run test:banco` | Testa migrations, RLS e RPCs num Postgres em memória (PGlite), sem Docker e sem tocar no Supabase |
| `npm run sql:tudo` | Regenera `supabase/instalar_tudo.sql` (migrations + seed) |
| `npm run tipos` | Regenera `src/lib/database.types.ts` a partir do projeto (precisa de `npx supabase login` e `link`) |

## Colocar no ar (3 passos)

1. **Banco:** no Supabase, abra *SQL Editor > New query*, cole todo o conteúdo de [`supabase/instalar_tudo.sql`](supabase/instalar_tudo.sql) e clique em **Run** (uma única vez). Ele cria tabelas, RLS, RPCs e os dados de exemplo. (Gerado por `npm run sql:tudo` a partir de `supabase/migrations/` e `seed.sql`.)
2. **Administrador:** em *Authentication > Users > Add user > Create new user*, informe e-mail e senha (marque *Auto Confirm User*). **O primeiro usuário criado vira administrador automaticamente.** Os seguintes só entram por convite do admin (Fase 2); sem perfil, um usuário não enxerga dado nenhum.
3. **GitHub Pages:** no repositório, *Settings > Pages > Source: **GitHub Actions***. A cada push na `main`, o workflow [deploy.yml](.github/workflows/deploy.yml) testa, compila e publica em `https://thegoldenbr.github.io/avaliacao/` (mockups em `/mockups/`).

A URL do projeto e a chave publishable (públicas) já estão em `.env.production`, então não é preciso cadastrar variáveis no GitHub.

**Antes de convidar usuários (Fase 2):** em *Authentication > Sign In / Providers*, desative **Allow new users to sign up**, e em *URL Configuration* defina **Site URL** = `https://thegoldenbr.github.io/avaliacao/` e inclua também em **Redirect URLs** esse endereço e `http://localhost:5173/`. Mesmo com o cadastro aberto, quem se cadastra não acessa nada (não tem perfil), mas o correto é desligá-lo.

**Chave da IA (Fase 5):** você mesmo cadastra em *Edge Functions > Secrets* (`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`); nunca no repositório.

Por CLI (já usado neste projeto): `npx supabase login` (terminal interativo), `npx supabase link --project-ref rbefxbmfyvoaiubpmfwg`, `npx supabase db push` para migrations novas e `npx supabase db query --linked -f supabase/seed.sql` para o seed. Depois de mudar o banco, rode `npm run tipos`.

## Segurança do banco (resumo)

- Papel `anon` **sem acesso a nenhuma tabela**. O acesso público é só pelas RPCs `obter_marca`, `obter_formulario`, `salvar_respostas` e `obter_relatorio`; as três últimas exigem token válido.
- Tokens de 192 bits (base64url), regeneráveis para revogar um link vazado.
- Usuários internos ativos acessam os dados operacionais; configurações, perfis e exclusão de empresa são só do administrador.
- A cópia (snapshot) das perguntas de uma avaliação congela após o envio; editar o modelo não altera avaliações existentes.
- `npm run test:banco` verifica esses pontos, inclusive que `anon` só executa as 4 RPCs públicas.
