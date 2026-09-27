---
name: publicar
description: Valida, faz commit e (só com a sua confirmação) push das mudanças para o GitHub, disparando o deploy no GitHub Pages. Use quando o usuário digitar /publicar ou pedir para "commitar e enviar".
disable-model-invocation: true
---

# Publicar mudanças (commit + push com confirmação)

O projeto vive no GitHub (`origin/main`), é servido pelo GitHub Pages e usa o Supabase como backend. Um push na `main` dispara o deploy.

1. `git status --short` e `git diff --stat`. Se não houver mudanças, avise e pare.
2. Confira que nada secreto vai junto: `.env` (local) fica fora do git; só `.env.production` (valores públicos) é versionado. Se aparecer `service_role`, chave de IA ou senha em qualquer arquivo, pare e avise.
3. Rode `npm run build`, `npm test` e `npm run test:banco`. Se algo falhar, corrija ou avise; não faça commit quebrado.
4. Se as migrations mudaram, rode `npm run sql:tudo` para regenerar `supabase/instalar_tudo.sql`.
5. Faça o commit (mensagem em português, curta e objetiva, terminando com a linha de coautoria configurada na sessão). Nunca use `--no-verify` nem `--amend` sem pedido.
6. **Pergunte ao usuário (AskUserQuestion) se pode enviar agora**, resumindo o que vai no push e que ele publica o site. Só execute `git push` se a resposta for sim. O push também exige aprovação nas permissões do projeto.
7. Depois do push, diga que o deploy roda em Actions e o endereço do site.
