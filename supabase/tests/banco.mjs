/**
 * Testa migrations, RLS e RPCs num Postgres em memória (PGlite), sem Docker e sem tocar no Supabase.
 * Simula só o que o Supabase fornece (schemas auth/storage, papéis anon/authenticated).
 * Rode: npm run test:banco
 */
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const db = new PGlite({ extensions: { pgcrypto } });
let falhas = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FALHA ') + m); if (!c) falhas++; };
const q = async (sql, params) => (await db.query(sql, params)).rows;
const erro = async (sql, params) => { try { await db.query(sql, params); return null; } catch (e) { return e.message; } };
const num = async (sql, params) => Number((await q(sql, params))[0].n);

await db.exec(`
  create schema extensions;
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant usage on schema public, auth, extensions to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`);
for (const f of readdirSync(`${raiz}/migrations`).sort()) await db.exec(readFileSync(`${raiz}/migrations/${f}`, 'utf8'));
console.log('migrations aplicadas');
await db.exec(readFileSync(`${raiz}/seed.sql`, 'utf8'));
console.log('seed aplicado');

const cont = (t) => num(`select count(*)::int n from public.${t}`);
ok((await cont('questionarios')) === 1 && (await cont('grupos')) === 6 && (await cont('perguntas')) === 30, 'seed: 1 questionário, 6 grupos, 30 perguntas');
ok((await cont('empresas')) === 3 && (await cont('avaliacoes')) === 4, 'seed: 3 empresas, 4 avaliações');
ok((await cont('avaliacao_perguntas')) === 120, 'snapshot: 4 x 30 perguntas copiadas');
ok((await cont('respostas')) === 30 * 3 + 12, 'seed: respostas 3 completas + 12 de rascunho');
const avs = await q(`select a.token_resposta tr, a.token_relatorio tl, a.status from public.avaliacoes a order by a.criado_em`);
const [av1, av2, av3, av4] = avs;
ok(av1.tr.length === 32 && /^[A-Za-z0-9_-]+$/.test(av1.tr), 'token com 32 chars base64url (192 bits)');

await db.exec(`set role anon`);
for (const t of ['empresas', 'avaliacoes', 'respostas', 'relatorios', 'configuracoes', 'perfis', 'grupos'])
  ok((await erro(`select * from public.${t}`))?.includes('permission denied'), `anon não lê ${t}`);
ok((await erro(`select public.regenerar_token(gen_random_uuid(),'resposta')`))?.includes('permission denied'), 'anon não executa regenerar_token');
ok((await erro(`select public.criar_avaliacao(gen_random_uuid(),gen_random_uuid(),'x')`))?.includes('permission denied'), 'anon não executa criar_avaliacao');
ok((await erro(`select public.eh_admin()`))?.includes('permission denied'), 'anon não executa eh_admin');
ok((await q(`select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and has_function_privilege('anon', p.oid, 'execute') and p.proname not in ('obter_marca','obter_formulario','salvar_respostas','obter_relatorio')`))[0].n === 0, 'anon só executa as 4 RPCs públicas (verificação por has_function_privilege)');
const marca = (await q(`select public.obter_marca() m`))[0].m;
ok(marca.cor_destaque === '#2B4ACB', 'obter_marca funciona para anon');

const f4 = (await q(`select public.obter_formulario($1) f`, [av4.tr]))[0].f;
ok(f4.grupos.length === 6 && f4.grupos[0].perguntas.length === 5, 'obter_formulario: 6 grupos x 5 perguntas');
const txt = JSON.stringify(f4);
ok(!txt.includes('peso') && !txt.includes('escala_invertida') && !txt.includes('"meta"'), 'obter_formulario não expõe pesos, metas nem escala invertida');
ok(f4.respostas.length === 12, 'obter_formulario devolve o rascunho salvo (12)');
ok(f4.grupos[0].perguntas[0].rotulo_min === 'Discordo totalmente', 'rótulo padrão da escala aplicado');
ok((await q(`select public.obter_formulario('token-inexistente') f`))[0].f === null, 'token inexistente → null');

const ids = f4.grupos.flatMap((g) => g.perguntas.map((p) => p.id));
const resp = (n) => ids.map((id) => ({ pergunta_id: id, nota: n }));
const salvar = (tok, payload, fin = false) => erro(`select public.salvar_respostas($1,$2,${fin})`, [tok, JSON.stringify(payload)]);
ok((await salvar(av4.tr, { respostas: [{ pergunta_id: ids[0], nota: 11 }] }))?.includes('nota_invalida'), 'rejeita nota 11');
ok((await salvar(av4.tr, { respostas: [{ pergunta_id: ids[0], nota: -1 }] }))?.includes('nota_invalida'), 'rejeita nota negativa');
ok((await salvar(av4.tr, { respostas: [{ pergunta_id: '00000000-0000-0000-0000-000000000000', nota: 5 }] }))?.includes('pergunta_invalida'), 'rejeita pergunta de outra avaliação');
ok((await salvar(av1.tr, { respostas: [] }))?.includes('avaliacao_indisponivel'), 'não salva em avaliação já respondida/publicada');
const outra = (await q(`select public.obter_formulario($1) f`, [av1.tr]))[0].f;
ok(outra.status === 'publicada' && outra.respostas.length === 30, 'link de avaliação publicada mostra respostas em leitura');
ok((await salvar(av4.tr, { respostas: [] }, true))?.includes('respostas_incompletas'), 'finalizar exige todas as perguntas');
ok((await salvar(av4.tr, { respostas: [{ pergunta_id: ids[0], nota: 5, comentario: 'x'.repeat(2001) }] }))?.includes('comentario_invalido'), 'rejeita comentário longo');
const r1 = (await q(`select public.salvar_respostas($1,$2,false) r`, [av4.tr, JSON.stringify({ respondente: { nome: 'Sérgio', cargo: 'Dono', email: '' }, respostas: resp(6) })]))[0].r;
ok(r1.respondidas === 30 && r1.status === 'aguardando_resposta', 'salva rascunho completo sem finalizar');
const r2 = (await q(`select public.salvar_respostas($1,$2,true) r`, [av4.tr, JSON.stringify({ respostas: [] })]))[0].r;
ok(r2.status === 'respondida', 'finaliza → respondida');
ok((await salvar(av4.tr, { respostas: resp(1) }))?.includes('avaliacao_indisponivel'), 'após finalizar, não aceita novas respostas');

await db.exec(`reset role`);
await db.exec(`update public.avaliacoes set status='aguardando_resposta', prazo = now() - interval '1 day' where token_resposta = '${av4.tr}'`);
await db.exec(`set role anon`);
ok((await salvar(av4.tr, { respostas: resp(1) }))?.includes('prazo_encerrado'), 'prazo encerrado bloqueia gravação');
ok((await q(`select public.obter_formulario($1) f`, [av4.tr]))[0].f.encerrada === true, 'formulário sinaliza encerrada');

const rel = (await q(`select public.obter_relatorio($1) r`, [av2.tl]))[0].r;
ok(rel.disponivel === true && rel.conteudo.seed === true && rel.empresa === 'Serra Azul', 'obter_relatorio devolve o snapshot publicado');
ok((await q(`select public.obter_relatorio($1) r`, [av3.tl]))[0].r.disponivel === false, 'relatório não publicado → disponivel=false');
ok((await q(`select public.obter_relatorio('nada') r`))[0].r === null, 'token de relatório inexistente → null');
await db.exec(`reset role`);
ok((await num(`select visualizacoes n from public.avaliacoes where token_relatorio=$1`, [av2.tl])) === 1, 'visualização registrada');

const admin = (await q(`insert into auth.users(email) values ('a@x') returning id`))[0].id;
const analista = (await q(`insert into auth.users(email) values ('b@x') returning id`))[0].id;
const semperfil = (await q(`insert into auth.users(email) values ('c@x') returning id`))[0].id;
await db.exec(`insert into public.perfis(id,nome,email,papel) values ('${admin}','Ana','a@x','admin'),('${analista}','Beto','b@x','analista')`);
const como = async (uid) => { await db.exec(`reset role`); await db.exec(`select set_config('test.uid','${uid}',false)`); await db.exec(`set role authenticated`); };

await como(semperfil);
ok((await num(`select count(*)::int n from public.empresas`)) === 0, 'usuário sem perfil não vê empresas (RLS)');
await como(analista);
ok((await num(`select count(*)::int n from public.empresas`)) === 3, 'analista vê empresas');
ok((await num(`select count(*)::int n from public.configuracoes`)) === 1, 'analista lê configurações');
await db.exec(`update public.configuracoes set nome_empresa='Hack'`);
await db.exec(`reset role`);
ok((await q(`select nome_empresa n from public.configuracoes`))[0].n === 'Minha empresa', 'analista NÃO altera configurações (RLS filtra)');
await como(admin);
await db.exec(`update public.configuracoes set nome_empresa='Vértice Consultoria'`);
ok((await q(`select nome_empresa n from public.configuracoes`))[0].n === 'Vértice Consultoria', 'admin altera configurações');
ok((await erro(`insert into public.configuracoes(id) values (false)`)) !== null, 'ninguém insere 2ª linha em configurações');

await como(analista);
const emp = (await q(`select id from public.empresas where nome_fantasia='Pão Nobre'`))[0].id;
const qid = (await q(`select id from public.questionarios`))[0].id;
const nova = (await q(`select public.criar_avaliacao($1,$2,'Rodada 2','2027') id`, [emp, qid]))[0].id;
ok((await num(`select count(*)::int n from public.avaliacao_perguntas where avaliacao_id=$1`, [nova])) === 30, 'criar_avaliacao copia 30 perguntas para o snapshot');
await db.exec(`update public.avaliacao_perguntas set peso = 5 where avaliacao_id='${nova}'`);
ok(true, 'snapshot editável em rascunho');
await db.exec(`update public.avaliacoes set status='aguardando_resposta' where id='${nova}'`);
ok((await erro(`update public.avaliacao_perguntas set peso = 9 where avaliacao_id='${nova}'`))?.includes('copia_congelada'), 'snapshot congelado após o envio');
await db.exec(`update public.perguntas set enunciado='MUDOU', peso=99`);
ok((await num(`select count(*)::int n from public.avaliacao_perguntas where enunciado='MUDOU'`)) === 0, 'editar o modelo não altera avaliações existentes');
const t0 = (await q(`select token_resposta t from public.avaliacoes where id=$1`, [nova]))[0].t;
const t1 = (await q(`select public.regenerar_token($1,'resposta') t`, [nova]))[0].t;
ok(t0 !== t1 && t1.length === 32, 'regenerar_token gera novo token');
await db.exec(`delete from public.empresas where id='${emp}'`);
ok((await num(`select count(*)::int n from public.empresas`)) === 3, 'analista NÃO exclui empresa (RLS)');
await como(admin);
await db.exec(`delete from public.empresas where id='${emp}'`);
await db.exec(`reset role`);
ok((await cont('empresas')) === 2 && (await cont('avaliacoes')) === 3, 'admin exclui empresa e avaliações em cascata (congelamento não bloqueia)');
ok((await cont('avaliacao_perguntas')) === 90 && (await cont('respostas')) === 90, 'perguntas e respostas da empresa excluída sumiram');

console.log(falhas ? `\n${falhas} falha(s)` : '\ntodos os testes passaram');
process.exit(falhas ? 1 : 0);
