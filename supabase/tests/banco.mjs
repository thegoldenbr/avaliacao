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
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, created_at timestamptz default now(), raw_user_meta_data jsonb);
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

ok(
  (await erro(`insert into public.avaliacoes (empresa_id, titulo, status) select id, 'x', 'arquivada' from public.empresas limit 1`))?.includes('avaliacoes_status_check'),
  '"arquivada" não é mais um status válido (sem arquivar/desarquivar nem exclusão direta)',
);
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

ok((await q(`select public.obter_relatorio($1) r`, [av2.tl]))[0].r.liberado === false, 'relatório não liberado ao cliente: link só informa que está travado');
await db.exec(`reset role`);
await db.exec(`update public.avaliacoes set relatorio_liberado_em = now() where token_relatorio = '${av2.tl}'`);
await db.exec(`set role anon`);
const rel = (await q(`select public.obter_relatorio($1) r`, [av2.tl]))[0].r;
ok(rel.disponivel === true && rel.conteudo.seed === true && rel.empresa === 'Serra Azul', 'obter_relatorio devolve o snapshot publicado');
ok((await q(`select public.obter_relatorio($1) r`, [av3.tl]))[0].r.disponivel !== true, 'relatório não publicado nem liberado → não disponível');
ok((await q(`select public.obter_relatorio('nada') r`))[0].r === null, 'token de relatório inexistente → null');
await db.exec(`reset role`);
ok((await num(`select visualizacoes n from public.avaliacoes where token_relatorio=$1`, [av2.tl])) === 1, 'visualização registrada');

const admin = (await q(`insert into auth.users(email) values ('a@x') returning id`))[0].id;
const analista = (await q(`insert into auth.users(email) values ('b@x') returning id`))[0].id;
const semperfil = (await q(`insert into auth.users(email) values ('c@x') returning id`))[0].id;
ok((await q(`select papel from public.perfis where id='${admin}'`))[0]?.papel === 'admin', 'primeiro usuário criado vira admin automaticamente');
ok((await num(`select count(*)::int n from public.perfis where id in ('${analista}','${semperfil}')`)) === 0, 'usuários seguintes NÃO ganham perfil sozinhos');
await db.exec(`insert into public.perfis(id,nome,email,papel) values ('${analista}','Beto','b@x','analista')`);
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
await como(analista);
const dup = (await q(`select public.duplicar_questionario($1) id`, [qid]))[0].id;
ok((await num(`select count(*)::int n from public.grupos where questionario_id=$1`, [dup])) === 6 && (await num(`select count(*)::int n from public.perguntas p join public.grupos g on g.id=p.grupo_id where g.questionario_id=$1`, [dup])) === 30, 'duplicar_questionario copia 6 grupos e 30 perguntas');
ok((await q(`select titulo t from public.questionarios where id=$1`, [dup]))[0].t.endsWith('(cópia)'), 'duplicata recebe o sufixo (cópia)');
ok((await erro(`select public.duplicar_questionario(gen_random_uuid())`))?.includes('questionario_nao_encontrado'), 'duplicar questionário inexistente falha com código claro');
await como(admin);
await db.exec(`delete from public.empresas where id='${emp}'`);
await db.exec(`reset role`);
ok((await cont('empresas')) === 2 && (await cont('avaliacoes')) === 3, 'admin exclui empresa e avaliações em cascata (congelamento não bloqueia)');
ok((await cont('avaliacao_perguntas')) === 90 && (await cont('respostas')) === 90, 'perguntas e respostas da empresa excluída sumiram');


// ===== Usuários sem e-mail, PIN e senha do relatório (migration 5) =====
await db.exec(`reset role`);
const userPin = (await q(`insert into auth.users(email) values ('paula@x') returning id`))[0].id;
await db.exec(`insert into public.perfis(id,nome,email,papel,usuario) values ('${userPin}','Paula Souza','paula@x','analista','paula.souza')`);

await db.exec(`set role service_role`);
ok((await erro(`select public.definir_pin($1,'12345')`, [userPin]))?.includes('pin_invalido'), 'PIN precisa ter 6 dígitos');
await q(`select public.definir_pin($1,'482913')`, [userPin]);
ok((await q(`select public.verificar_pin('Paula.Souza','482913') id`))[0].id === userPin, 'PIN correto devolve o usuário (usuário sem diferenciar maiúsculas)');
ok((await q(`select public.verificar_pin('paula.souza','000000') id`))[0].id === null, 'PIN errado devolve null');
ok((await q(`select public.verificar_pin('ninguem.aqui','482913') id`))[0].id === null, 'usuário inexistente devolve null (sem revelar)');
for (let i = 0; i < 4; i++) await q(`select public.verificar_pin('paula.souza','111111') id`);
ok((await erro(`select public.verificar_pin('paula.souza','482913')`))?.includes('pin_bloqueado'), '5 PINs errados bloqueiam, até o PIN certo');
await db.exec(`reset role`);
ok((await num(`select count(*)::int n from public.pins where pin_hash like '$2%'`)) === 1, 'PIN guardado com hash bcrypt, nunca em texto');
await db.exec(`update public.pins set bloqueado_ate = null`);
await db.exec(`set role service_role`);
ok((await q(`select public.verificar_pin('paula.souza','482913') id`))[0].id === userPin, 'após o bloqueio expirar o PIN certo volta a funcionar');
await q(`select public.remover_pin($1)`, [userPin]);
ok((await q(`select public.verificar_pin('paula.souza','482913') id`))[0].id === null, 'PIN removido não funciona mais');
for (const papel of ['anon', 'authenticated']) {
  await db.exec(`reset role`); await db.exec(`set role ${papel}`);
  ok((await erro(`select public.verificar_pin('paula.souza','482913')`))?.includes('permission denied'), `${papel} não executa verificar_pin`);
  ok((await erro(`select * from public.pins`))?.includes('permission denied'), `${papel} não lê a tabela de PINs`);
}

await db.exec(`reset role`);
const userForcado = (await q(`insert into auth.users(email) values ('forcado@x') returning id`))[0].id;
await db.exec(`insert into public.perfis(id,nome,email,papel,usuario,precisa_trocar_senha) values ('${userForcado}','Joao Lima','forcado@x','admin','joao.lima',true)`);
await como(userForcado);
ok((await num(`select count(*)::int n from public.empresas`)) === 0, 'senha inicial pendente: não enxerga dados (RLS)');
ok((await q(`select precisa_trocar_senha p from public.perfis where id='${userForcado}'`))[0].p === true, 'mas consegue ler o próprio perfil para ser redirecionado');
ok((await erro(`insert into public.empresas(razao_social,cnpj) values ('X','11222333000181')`)) !== null, 'senha inicial pendente: não altera dados');
await db.exec(`update public.configuracoes set nome_empresa='hack'`);
await db.exec(`reset role`);
ok((await q(`select nome_empresa n from public.configuracoes`))[0].n !== 'hack', 'senha inicial pendente: nem admin altera configurações');

// Senha do relatório
await como(admin);
const avPub = (await q(`select id from public.avaliacoes where token_relatorio=$1`, [av2.tl]))[0].id;
const codigo = (await q(`select public.definir_senha_relatorio($1,true) c`, [avPub]))[0].c;
ok(/^[0-9]{6}$/.test(codigo), 'gera código numérico de 6 dígitos');
ok((await q(`select public.definir_senha_relatorio($1,true) c`, [avPub]))[0].c === codigo, 'ativar de novo mantém o mesmo código');
await db.exec(`reset role`); await db.exec(`set role anon`);
const rel1 = (await q(`select public.obter_relatorio($1) r`, [av2.tl]))[0].r;
ok(rel1.protegido === true && !('conteudo' in rel1) && rel1.marca, 'sem senha: só informa que é protegido (sem conteúdo)');
const errada = codigo === '000000' ? '111111' : '000000';
ok((await q(`select public.obter_relatorio($1,$2) r`, [av2.tl, errada]))[0].r.erro === 'senha_incorreta', 'senha errada é recusada');
const rel2 = (await q(`select public.obter_relatorio($1,$2) r`, [av2.tl, codigo]))[0].r;
ok(rel2.disponivel === true && rel2.conteudo.seed === true, 'senha correta libera o relatório');
for (let i = 0; i < 4; i++) await q(`select public.obter_relatorio($1,$2) r`, [av2.tl, errada]);
ok((await q(`select public.obter_relatorio($1,$2) r`, [av2.tl, errada]))[0].r.bloqueado === true, '5 erros bloqueiam o link');
ok((await q(`select public.obter_relatorio($1,$2) r`, [av2.tl, codigo]))[0].r.bloqueado === true, 'durante o bloqueio nem a senha certa entra');
ok((await erro(`select public.definir_senha_relatorio($1,true)`, [avPub]))?.includes('permission denied'), 'anon não gera senha');
await db.exec(`reset role`);
await db.exec(`update public.avaliacoes set relatorio_bloqueado_ate = null where id='${avPub}'`);
await como(admin);
const novoCodigo = (await q(`select public.definir_senha_relatorio($1,true,true) c`, [avPub]))[0].c;
ok(novoCodigo !== codigo && /^[0-9]{6}$/.test(novoCodigo), 'gerar novo código troca o número');
await db.exec(`reset role`); await db.exec(`set role anon`);
ok((await q(`select public.obter_relatorio($1,$2) r`, [av2.tl, codigo]))[0].r.erro === 'senha_incorreta', 'o código antigo para de funcionar');
ok((await q(`select public.obter_relatorio($1,$2) r`, [av2.tl, novoCodigo]))[0].r.disponivel === true, 'o código novo funciona');
await como(admin);
ok((await q(`select public.definir_senha_relatorio($1,false) c`, [avPub]))[0].c === null, 'desligar remove a senha');
await db.exec(`reset role`); await db.exec(`set role anon`);
ok((await q(`select public.obter_relatorio($1) r`, [av2.tl]))[0].r.disponivel === true, 'sem senha configurada o link abre direto, como antes');
ok((await q(`select public.obter_relatorio('nada') r`))[0].r === null, 'token inexistente continua devolvendo null');
await como(admin);
ok((await q(`select public.liberar_relatorio($1,false) t`, [avPub]))[0].t === null, 'operador revoga a liberação');
ok((await q(`select public.liberar_relatorio($1,true) t`, [avPub]))[0].t !== null, 'operador libera de novo');
ok((await q(`select public.liberar_relatorio($1,false) t`, [avPub]))[0].t === null, 'e revoga outra vez');
await db.exec(`reset role`); await db.exec(`set role anon`);
ok((await q(`select public.obter_relatorio($1) r`, [av2.tl]))[0].r.liberado === false, 'depois de revogar, o link volta a ficar travado');

// Modo de apresentação para o cliente: só pode ser liberado depois que o dashboard foi liberado e o
// operador já abriu o modo de apresentação (apresentacao_realizada_em); revogar o dashboard revoga os dois.
await como(admin);
let apErro = null;
try { await q(`select public.liberar_apresentacao_cliente($1,true) t`, [avPub]); } catch (e) { apErro = e; }
ok(apErro?.message?.includes('nao_liberavel'), 'não dá para liberar a apresentação antes do dashboard nem de apresentar');
await q(`select public.liberar_relatorio($1,true) t`, [avPub]);
apErro = null;
try { await q(`select public.liberar_apresentacao_cliente($1,true) t`, [avPub]); } catch (e) { apErro = e; }
ok(apErro?.message?.includes('nao_liberavel'), 'com o dashboard liberado mas sem ter apresentado ainda, continua bloqueado');
await db.exec(`update public.avaliacoes set apresentacao_realizada_em = now() where id = '${avPub}'`);
ok((await q(`select public.liberar_apresentacao_cliente($1,true) t`, [avPub]))[0].t !== null, 'com o dashboard liberado e já tendo apresentado, a apresentação pode ser liberada');
await db.exec(`reset role`); await db.exec(`set role anon`);
ok((await q(`select public.obter_relatorio($1) r`, [av2.tl]))[0].r.apresentacao_liberada === true, 'o link público informa que a apresentação está liberada');
await como(admin);
ok((await q(`select public.liberar_apresentacao_cliente($1,false) t`, [avPub]))[0].t === null, 'operador revoga só a apresentação, mantendo o dashboard');
await db.exec(`reset role`); await db.exec(`set role anon`);
ok((await q(`select public.obter_relatorio($1) r`, [av2.tl]))[0].r.apresentacao_liberada === false, 'revogada a apresentação, o dashboard continua liberado');
await como(admin);
ok((await q(`select public.liberar_apresentacao_cliente($1,true) t`, [avPub]))[0].t !== null, 'libera a apresentação de novo');
await q(`select public.liberar_relatorio($1,false) t`, [avPub]);
ok((await q(`select apresentacao_liberada_em from public.avaliacoes where id=$1`, [avPub]))[0].apresentacao_liberada_em === null, 'revogar o dashboard revoga a apresentação junto');
await db.exec(`reset role`);

// Liberação programada (opcional): agenda uma data/hora e a ativação acontece sozinha no primeiro acesso depois dela.
// Aqui, avPub está sem liberação (revogada acima) e já com apresentacao_realizada_em setado.
await como(admin);
await q(`select public.agendar_relatorio($1, now() + interval '1 hour') t`, [avPub]);
await db.exec(`reset role`); await db.exec(`set role anon`);
ok((await q(`select public.obter_relatorio($1) r`, [av2.tl]))[0].r.liberado === false, 'agendado para o futuro, o link continua travado até a hora chegar');
await como(admin);
ok((await q(`select public.agendar_apresentacao($1, now() + interval '1 hour') t`, [avPub]))[0].t !== null, 'também dá para agendar o modo de apresentação');
await q(`select public.agendar_relatorio($1, now() - interval '1 minute') t`, [avPub]);
await q(`select public.agendar_apresentacao($1, now() - interval '1 minute') t`, [avPub]);
await db.exec(`reset role`); await db.exec(`set role anon`);
const rAg = (await q(`select public.obter_relatorio($1) r`, [av2.tl]))[0].r;
ok(rAg.disponivel === true && rAg.apresentacao_liberada === true, 'passada a hora agendada, o primeiro acesso libera dashboard e apresentação sozinho');
await como(admin);
const linhaAg = (await q(`select relatorio_liberado_em, relatorio_agendado_para, apresentacao_liberada_em, apresentacao_agendado_para from public.avaliacoes where id=$1`, [avPub]))[0];
ok(linhaAg.relatorio_liberado_em !== null && linhaAg.relatorio_agendado_para === null && linhaAg.apresentacao_liberada_em !== null && linhaAg.apresentacao_agendado_para === null, 'os agendamentos somem depois de efetivados');
ok((await q(`select public.liberar_relatorio($1,false) t`, [avPub]))[0].t === null, 'revoga tudo de novo para o próximo teste');
await q(`select public.agendar_relatorio($1, now() + interval '2 hours') t`, [avPub]);
ok((await q(`select * from public.efetivar_agendamentos($1)`, [avPub]))[0].out_relatorio_liberado_em === null, 'efetivar_agendamentos não antecipa um agendamento que ainda não chegou');
await q(`select public.agendar_relatorio($1, now() - interval '2 hours') t`, [avPub]);
ok((await q(`select * from public.efetivar_agendamentos($1)`, [avPub]))[0].out_relatorio_liberado_em !== null, 'efetivar_agendamentos ativa um agendamento vencido (usado ao reabrir a avaliação, sem depender do cliente acessar)');
let agErro = null;
try { await q(`select public.agendar_relatorio($1, now() + interval '1 hour') t`, [avPub]); } catch (e) { agErro = e; }
ok(agErro?.message?.includes('avaliacao_nao_agendavel'), 'não dá para agendar de novo depois de já liberado');
await db.exec(`reset role`);

console.log(falhas ? `\n${falhas} falha(s)` : '\ntodos os testes passaram');
process.exit(falhas ? 1 : 0);
