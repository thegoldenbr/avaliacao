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
| `npm run tipos` | Regenera `src/lib/database.types.ts` a partir do projeto (precisa de `npx supabase login`) |

## Configurar o Supabase

1. **Projeto:** `https://rbefxbmfyvoaiubpmfwg.supabase.co` (já criado).
2. **Aplicar o banco.** Escolha um caminho:
   - *SQL Editor* (mais simples): abra cada arquivo de `supabase/migrations/` em ordem e execute; depois, se quiser dados de exemplo, execute `supabase/seed.sql`.
   - *CLI:* `npx supabase login`, `npx supabase link --project-ref rbefxbmfyvoaiubpmfwg`, `npx supabase db push` (a CLI não aplica o seed no projeto remoto; use o SQL Editor para isso).
3. **Auth:** em *Authentication > Sign In / Providers*, desative **Allow new users to sign up** (cadastro público desligado). Em *URL Configuration*, defina **Site URL** e **Redirect URLs** com o endereço do GitHub Pages (ex.: `https://thegoldenbr.github.io/avaliacao/`) e `http://localhost:5173/`.
4. **Primeiro administrador:** em *Authentication > Users > Add user*, crie o usuário com e-mail e senha e copie o UUID. No SQL Editor:

   ```sql
   insert into public.perfis (id, nome, email, papel)
   values ('UUID-DO-USUARIO', 'Seu Nome', 'seu@email.com', 'admin');
   ```

5. **Secrets das Edge Functions** (Fases 2 e 5; a chave da IA você cadastra, sem colar no chat): *Edge Functions > Secrets* ou `npx supabase secrets set ANTHROPIC_API_KEY=... ANTHROPIC_MODEL=...`.

## Publicar no GitHub Pages

1. No repositório: *Settings > Pages > Source: **GitHub Actions***.
2. *Settings > Secrets and variables > Actions > aba **Variables***: crie `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (são valores públicos).
3. Faça push na `main`: o workflow [deploy.yml](.github/workflows/deploy.yml) roda os testes, compila e publica em `https://thegoldenbr.github.io/avaliacao/` (mockups em `/mockups/`).

## Segurança do banco (resumo)

- Papel `anon` **sem acesso a nenhuma tabela**. O acesso público é só pelas RPCs `obter_marca`, `obter_formulario`, `salvar_respostas` e `obter_relatorio`; as três últimas exigem token válido.
- Tokens de 192 bits (base64url), regeneráveis para revogar um link vazado.
- Usuários internos ativos acessam os dados operacionais; configurações, perfis e exclusão de empresa são só do administrador.
- A cópia (snapshot) das perguntas de uma avaliação congela após o envio; editar o modelo não altera avaliações existentes.
- `npm run test:banco` verifica esses pontos, inclusive que `anon` só executa as 4 RPCs públicas.
