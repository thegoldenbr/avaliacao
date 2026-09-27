-- Radar de Desempenho: instalação completa (gerado por `npm run sql:tudo`; não edite).
-- Cole tudo no SQL Editor do Supabase e clique em Run. Pode ser executado uma única vez.

-- ===== migrations/20260926000001_schema.sql =====
-- Radar de Desempenho — schema base.
-- Tabelas e colunas em português. Regras de acesso ficam na migration seguinte (RLS e RPCs).

create extension if not exists pgcrypto with schema extensions;

-- Funções novas não ficam executáveis por padrão: cada uma recebe GRANT explícito.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
-- Tabelas novas também não são acessíveis pelo papel anon.
alter default privileges in schema public revoke all on tables from anon;

-- ---------------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------------

-- Token de 24 bytes (192 bits) em base64url, sem preenchimento.
create function public.gerar_token() returns text
language sql volatile set search_path = ''
as $$
  select translate(rtrim(encode(extensions.gen_random_bytes(24), 'base64'), '='), '+/', '-_');
$$;

create function public.atualizar_timestamp() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Perfis e configurações
-- ---------------------------------------------------------------------------

create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null,
  papel text not null default 'analista' check (papel in ('admin', 'analista')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Linha única: a chave booleana com check garante que só existe uma.
create table public.configuracoes (
  id boolean primary key default true check (id),
  nome_empresa text not null default 'Minha empresa',
  logo_url text,
  cor_destaque text not null default '#2B4ACB' check (cor_destaque ~ '^#[0-9A-Fa-f]{6}$'),
  texto_apresentacao text not null default 'Este questionário ajuda a entender onde sua empresa está forte e onde pode evoluir.',
  texto_privacidade text not null default 'Usamos seu nome e cargo apenas para identificar quem respondeu. As notas e comentários servem para elaborar o relatório da sua empresa e não são compartilhados com terceiros.',
  texto_rodape text not null default 'Relatório confidencial, destinado à empresa avaliada.',
  rotulo_escala_min text not null default 'Discordo totalmente',
  rotulo_escala_max text not null default 'Concordo totalmente',
  faixas jsonb not null default '[
    {"id":"critico","rotulo":"Crítico","de":0,"ate":4.9},
    {"id":"atencao","rotulo":"Atenção","de":5.0,"ate":6.9},
    {"id":"bom","rotulo":"Bom","de":7.0,"ate":8.4},
    {"id":"excelente","rotulo":"Excelente","de":8.5,"ate":10}
  ]'::jsonb,
  atualizado_em timestamptz not null default now()
);
insert into public.configuracoes (id) values (true);
create trigger configuracoes_timestamp before update on public.configuracoes
  for each row execute function public.atualizar_timestamp();

-- ---------------------------------------------------------------------------
-- Empresas avaliadas
-- ---------------------------------------------------------------------------

create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  nome_fantasia text,
  -- Só caracteres, sem máscara: 12 alfanuméricos (maiúsculas) + 2 dígitos verificadores numéricos.
  -- O dígito verificador é validado no aplicativo (formatos numérico e alfanumérico).
  cnpj text not null unique check (cnpj ~ '^[0-9A-Z]{12}[0-9]{2}$'),
  segmento text,
  porte text,
  municipio text,
  uf char(2) check (uf ~ '^[A-Z]{2}$'),
  responsavel_nome text,
  responsavel_cargo text,
  responsavel_email text,
  responsavel_telefone text,
  observacoes text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger empresas_timestamp before update on public.empresas
  for each row execute function public.atualizar_timestamp();

-- ---------------------------------------------------------------------------
-- Questionários (modelos reutilizáveis)
-- ---------------------------------------------------------------------------

create table public.questionarios (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  arquivado boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger questionarios_timestamp before update on public.questionarios
  for each row execute function public.atualizar_timestamp();

create table public.grupos (
  id uuid primary key default gen_random_uuid(),
  questionario_id uuid not null references public.questionarios (id) on delete cascade,
  nome text not null,
  nome_curto text not null,
  descricao text,
  peso numeric(8, 2) not null default 1 check (peso > 0),
  meta numeric(3, 1) check (meta between 0 and 10),
  ordem integer not null default 0
);
create index grupos_questionario_idx on public.grupos (questionario_id, ordem);

create table public.perguntas (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupos (id) on delete cascade,
  enunciado text not null,
  texto_apoio text,
  peso numeric(8, 2) not null default 1 check (peso > 0),
  ordem integer not null default 0,
  escala_invertida boolean not null default false,
  rotulo_min text,
  rotulo_max text,
  permite_comentario boolean not null default true
);
create index perguntas_grupo_idx on public.perguntas (grupo_id, ordem);

-- ---------------------------------------------------------------------------
-- Avaliações e cópia (snapshot) do modelo
-- ---------------------------------------------------------------------------

create table public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  questionario_origem_id uuid references public.questionarios (id) on delete set null,
  avaliacao_anterior_id uuid references public.avaliacoes (id) on delete set null,
  titulo text not null,
  periodo_referencia text,
  status text not null default 'rascunho'
    check (status in ('rascunho', 'aguardando_resposta', 'respondida', 'em_analise', 'publicada', 'arquivada')),
  token_resposta text not null unique default public.gerar_token(),
  token_relatorio text not null unique default public.gerar_token(),
  prazo timestamptz,
  mensagem_apresentacao text,
  respondente_nome text,
  respondente_cargo text,
  respondente_email text,
  criado_em timestamptz not null default now(),
  enviado_em timestamptz,
  respondido_em timestamptz,
  publicado_em timestamptz,
  visualizacoes integer not null default 0,
  ultima_visualizacao timestamptz,
  atualizado_em timestamptz not null default now()
);
create index avaliacoes_empresa_idx on public.avaliacoes (empresa_id, criado_em desc);
create index avaliacoes_status_idx on public.avaliacoes (status);
create trigger avaliacoes_timestamp before update on public.avaliacoes
  for each row execute function public.atualizar_timestamp();

create table public.avaliacao_grupos (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references public.avaliacoes (id) on delete cascade,
  grupo_origem_id uuid references public.grupos (id) on delete set null,
  nome text not null,
  nome_curto text not null,
  descricao text,
  peso numeric(8, 2) not null default 1 check (peso > 0),
  meta numeric(3, 1) check (meta between 0 and 10),
  ordem integer not null default 0
);
create index avaliacao_grupos_idx on public.avaliacao_grupos (avaliacao_id, ordem);
create index avaliacao_grupos_origem_idx on public.avaliacao_grupos (grupo_origem_id);

create table public.avaliacao_perguntas (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references public.avaliacoes (id) on delete cascade,
  avaliacao_grupo_id uuid not null references public.avaliacao_grupos (id) on delete cascade,
  pergunta_origem_id uuid references public.perguntas (id) on delete set null,
  enunciado text not null,
  texto_apoio text,
  peso numeric(8, 2) not null default 1 check (peso > 0),
  ordem integer not null default 0,
  escala_invertida boolean not null default false,
  rotulo_min text,
  rotulo_max text,
  permite_comentario boolean not null default true
);
create index avaliacao_perguntas_grupo_idx on public.avaliacao_perguntas (avaliacao_grupo_id, ordem);
create index avaliacao_perguntas_avaliacao_idx on public.avaliacao_perguntas (avaliacao_id);
create index avaliacao_perguntas_origem_idx on public.avaliacao_perguntas (pergunta_origem_id);

-- A cópia só pode ser ajustada enquanto a avaliação é rascunho; depois do envio fica congelada.
create function public.congelar_copia_apos_envio() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_avaliacao uuid := coalesce(new.avaliacao_id, old.avaliacao_id);
  v_status text;
begin
  select status into v_status from public.avaliacoes where id = v_avaliacao;
  -- Sem a avaliação (exclusão em cascata) não há o que proteger.
  if found and v_status <> 'rascunho' then
    raise exception 'copia_congelada' using errcode = 'P0001',
      hint = 'As perguntas de uma avaliação já enviada não podem ser alteradas.';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger avaliacao_grupos_congelar before insert or update or delete on public.avaliacao_grupos
  for each row execute function public.congelar_copia_apos_envio();
create trigger avaliacao_perguntas_congelar before insert or update or delete on public.avaliacao_perguntas
  for each row execute function public.congelar_copia_apos_envio();

create table public.respostas (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references public.avaliacoes (id) on delete cascade,
  pergunta_id uuid not null references public.avaliacao_perguntas (id) on delete cascade,
  nota smallint not null check (nota between 0 and 10),
  comentario text check (char_length(comentario) <= 2000),
  atualizado_em timestamptz not null default now(),
  unique (avaliacao_id, pergunta_id)
);
create trigger respostas_timestamp before update on public.respostas
  for each row execute function public.atualizar_timestamp();

-- ---------------------------------------------------------------------------
-- Relatórios
-- ---------------------------------------------------------------------------

create table public.relatorios (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null unique references public.avaliacoes (id) on delete cascade,
  conteudo_ia jsonb,          -- saída original da IA; nunca sobrescrita pela edição
  conteudo_rascunho jsonb,    -- versão em edição
  conteudo_publicado jsonb,   -- snapshot que o cliente vê
  opcoes jsonb not null default '{}'::jsonb,
  modelo_ia text,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  gerado_em timestamptz,
  publicado_em timestamptz
);

create function public.registrar_edicao_relatorio() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
create trigger relatorios_edicao before update on public.relatorios
  for each row execute function public.registrar_edicao_relatorio();

-- ===== migrations/20260926000002_seguranca_e_rpcs.sql =====
-- Radar de Desempenho — RLS, funções de acesso e RPCs públicas.
--
-- Modelo de acesso:
--   * authenticated com perfil ativo: dados operacionais; configurações e perfis só admin altera.
--   * anon: NENHUMA tabela. Só as RPCs públicas ao final deste arquivo.

-- ---------------------------------------------------------------------------
-- Funções auxiliares das políticas
-- ---------------------------------------------------------------------------

create function public.eh_usuario_ativo() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.perfis where id = (select auth.uid()) and ativo);
$$;

create function public.eh_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.perfis where id = (select auth.uid()) and ativo and papel = 'admin');
$$;

-- Estas funções rodam dentro das políticas e do DEFAULT das colunas, com o papel de quem consulta.
grant execute on function public.eh_usuario_ativo() to authenticated;
grant execute on function public.eh_admin() to authenticated;
grant execute on function public.gerar_token() to authenticated;

-- ---------------------------------------------------------------------------
-- Privilégios de tabela: anon fora, authenticated dentro (RLS decide o resto)
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
-- Linha única de configurações: nunca inserida nem apagada pela aplicação.
revoke insert, delete on public.configuracoes from authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.perfis enable row level security;
alter table public.configuracoes enable row level security;
alter table public.empresas enable row level security;
alter table public.questionarios enable row level security;
alter table public.grupos enable row level security;
alter table public.perguntas enable row level security;
alter table public.avaliacoes enable row level security;
alter table public.avaliacao_grupos enable row level security;
alter table public.avaliacao_perguntas enable row level security;
alter table public.respostas enable row level security;
alter table public.relatorios enable row level security;

-- Perfis: todo usuário ativo enxerga a equipe; só admin altera.
create policy perfis_ler on public.perfis for select to authenticated
  using (public.eh_usuario_ativo() or id = (select auth.uid()));
create policy perfis_inserir on public.perfis for insert to authenticated with check (public.eh_admin());
create policy perfis_atualizar on public.perfis for update to authenticated
  using (public.eh_admin()) with check (public.eh_admin());
create policy perfis_excluir on public.perfis for delete to authenticated using (public.eh_admin());

-- Configurações: leitura para ativos, alteração só admin.
create policy configuracoes_ler on public.configuracoes for select to authenticated using (public.eh_usuario_ativo());
create policy configuracoes_atualizar on public.configuracoes for update to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

-- Empresas: excluir (com todos os dados) só admin.
create policy empresas_ler on public.empresas for select to authenticated using (public.eh_usuario_ativo());
create policy empresas_inserir on public.empresas for insert to authenticated with check (public.eh_usuario_ativo());
create policy empresas_atualizar on public.empresas for update to authenticated
  using (public.eh_usuario_ativo()) with check (public.eh_usuario_ativo());
create policy empresas_excluir on public.empresas for delete to authenticated using (public.eh_admin());

-- Demais tabelas operacionais: qualquer usuário ativo.
create policy questionarios_todos on public.questionarios for all to authenticated
  using (public.eh_usuario_ativo()) with check (public.eh_usuario_ativo());
create policy grupos_todos on public.grupos for all to authenticated
  using (public.eh_usuario_ativo()) with check (public.eh_usuario_ativo());
create policy perguntas_todos on public.perguntas for all to authenticated
  using (public.eh_usuario_ativo()) with check (public.eh_usuario_ativo());
create policy avaliacoes_todos on public.avaliacoes for all to authenticated
  using (public.eh_usuario_ativo()) with check (public.eh_usuario_ativo());
create policy avaliacao_grupos_todos on public.avaliacao_grupos for all to authenticated
  using (public.eh_usuario_ativo()) with check (public.eh_usuario_ativo());
create policy avaliacao_perguntas_todos on public.avaliacao_perguntas for all to authenticated
  using (public.eh_usuario_ativo()) with check (public.eh_usuario_ativo());
create policy respostas_todos on public.respostas for all to authenticated
  using (public.eh_usuario_ativo()) with check (public.eh_usuario_ativo());
create policy relatorios_todos on public.relatorios for all to authenticated
  using (public.eh_usuario_ativo()) with check (public.eh_usuario_ativo());

-- ---------------------------------------------------------------------------
-- Storage: logo da empresa principal (leitura pública, escrita só admin)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marca', 'marca', true, 1048576, array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'])
on conflict (id) do nothing;

create policy marca_inserir on storage.objects for insert to authenticated
  with check (bucket_id = 'marca' and public.eh_admin());
create policy marca_atualizar on storage.objects for update to authenticated
  using (bucket_id = 'marca' and public.eh_admin()) with check (bucket_id = 'marca' and public.eh_admin());
create policy marca_excluir on storage.objects for delete to authenticated
  using (bucket_id = 'marca' and public.eh_admin());

-- ---------------------------------------------------------------------------
-- Criação de avaliação com cópia (snapshot) do modelo — security invoker: vale a RLS de quem chama
-- ---------------------------------------------------------------------------

create function public.criar_avaliacao(
  p_empresa_id uuid,
  p_questionario_id uuid,
  p_titulo text,
  p_periodo text default null,
  p_prazo timestamptz default null,
  p_mensagem text default null,
  p_anterior_id uuid default null
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_id uuid;
  v_grupo record;
  v_novo_grupo uuid;
begin
  insert into public.avaliacoes
    (empresa_id, questionario_origem_id, avaliacao_anterior_id, titulo, periodo_referencia, prazo, mensagem_apresentacao)
  values
    (p_empresa_id, p_questionario_id, p_anterior_id, p_titulo, p_periodo, p_prazo, p_mensagem)
  returning id into v_id;

  for v_grupo in
    select * from public.grupos where questionario_id = p_questionario_id order by ordem, id
  loop
    insert into public.avaliacao_grupos (avaliacao_id, grupo_origem_id, nome, nome_curto, descricao, peso, meta, ordem)
    values (v_id, v_grupo.id, v_grupo.nome, v_grupo.nome_curto, v_grupo.descricao, v_grupo.peso, v_grupo.meta, v_grupo.ordem)
    returning id into v_novo_grupo;

    insert into public.avaliacao_perguntas
      (avaliacao_id, avaliacao_grupo_id, pergunta_origem_id, enunciado, texto_apoio, peso, ordem,
       escala_invertida, rotulo_min, rotulo_max, permite_comentario)
    select v_id, v_novo_grupo, p.id, p.enunciado, p.texto_apoio, p.peso, p.ordem,
           p.escala_invertida, p.rotulo_min, p.rotulo_max, p.permite_comentario
    from public.perguntas p
    where p.grupo_id = v_grupo.id
    order by p.ordem, p.id;
  end loop;

  return v_id;
end;
$$;
grant execute on function public.criar_avaliacao(uuid, uuid, text, text, timestamptz, text, uuid) to authenticated;

-- Regenera um token para revogar um link vazado. p_qual: 'resposta' | 'relatorio'.
create function public.regenerar_token(p_avaliacao_id uuid, p_qual text) returns text
language plpgsql security invoker set search_path = ''
as $$
declare
  v_token text := public.gerar_token();
begin
  if p_qual = 'resposta' then
    update public.avaliacoes set token_resposta = v_token where id = p_avaliacao_id;
  elsif p_qual = 'relatorio' then
    update public.avaliacoes set token_relatorio = v_token where id = p_avaliacao_id;
  else
    raise exception 'tipo_de_token_invalido' using errcode = 'P0001';
  end if;
  if not found then
    raise exception 'avaliacao_nao_encontrada' using errcode = 'P0001';
  end if;
  return v_token;
end;
$$;
grant execute on function public.regenerar_token(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPCs públicas (anon). security definer + search_path vazio; devolvem só o necessário.
-- ---------------------------------------------------------------------------

-- Marca da empresa principal: login e tema.
create function public.obter_marca() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('nome', nome_empresa, 'logo_url', logo_url, 'cor_destaque', cor_destaque)
  from public.configuracoes;
$$;

-- Formulário de resposta. Não expõe pesos, metas nem escala invertida.
-- Devolve null quando o token não existe ou a avaliação ainda não foi enviada / foi arquivada.
create function public.obter_formulario(p_token text) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_av public.avaliacoes%rowtype;
  v_cfg public.configuracoes%rowtype;
  v_empresa text;
  v_grupos jsonb;
  v_respostas jsonb;
begin
  select * into v_av from public.avaliacoes where token_resposta = p_token;
  if not found or v_av.status in ('rascunho', 'arquivada') then
    return null;
  end if;
  select * into v_cfg from public.configuracoes;
  select coalesce(nome_fantasia, razao_social) into v_empresa from public.empresas where id = v_av.empresa_id;

  select coalesce(jsonb_agg(g order by (g ->> 'ordem')::int), '[]'::jsonb) into v_grupos
  from (
    select jsonb_build_object(
      'id', ag.id, 'nome', ag.nome, 'nome_curto', ag.nome_curto, 'descricao', ag.descricao, 'ordem', ag.ordem,
      'perguntas', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', ap.id, 'enunciado', ap.enunciado, 'texto_apoio', ap.texto_apoio, 'ordem', ap.ordem,
          'rotulo_min', coalesce(ap.rotulo_min, v_cfg.rotulo_escala_min),
          'rotulo_max', coalesce(ap.rotulo_max, v_cfg.rotulo_escala_max),
          'permite_comentario', ap.permite_comentario) order by ap.ordem, ap.id)
        from public.avaliacao_perguntas ap where ap.avaliacao_grupo_id = ag.id), '[]'::jsonb)
    ) as g
    from public.avaliacao_grupos ag where ag.avaliacao_id = v_av.id
  ) t;

  select coalesce(jsonb_agg(jsonb_build_object('pergunta_id', r.pergunta_id, 'nota', r.nota, 'comentario', r.comentario)), '[]'::jsonb)
  into v_respostas from public.respostas r where r.avaliacao_id = v_av.id;

  return jsonb_build_object(
    'status', v_av.status,
    'encerrada', (v_av.status = 'aguardando_resposta' and v_av.prazo is not null and v_av.prazo < now()),
    'prazo', v_av.prazo,
    'titulo', v_av.titulo,
    'periodo_referencia', v_av.periodo_referencia,
    'mensagem', coalesce(v_av.mensagem_apresentacao, v_cfg.texto_apresentacao),
    'empresa', v_empresa,
    'respondido_em', v_av.respondido_em,
    'respondente', jsonb_build_object('nome', v_av.respondente_nome, 'cargo', v_av.respondente_cargo, 'email', v_av.respondente_email),
    'marca', jsonb_build_object('nome', v_cfg.nome_empresa, 'logo_url', v_cfg.logo_url, 'cor_destaque', v_cfg.cor_destaque),
    'textos', jsonb_build_object('privacidade', v_cfg.texto_privacidade),
    'grupos', v_grupos,
    'respostas', v_respostas
  );
end;
$$;

-- Salva rascunho ou finaliza. p_payload:
--   { "respondente": {"nome","cargo","email"}, "respostas": [{"pergunta_id","nota","comentario"}] }
-- Erros (mensagem = código estável, lido pelo frontend): avaliacao_indisponivel, prazo_encerrado,
-- payload_invalido, nota_invalida, pergunta_invalida, comentario_invalido, dados_respondente_invalidos, respostas_incompletas.
create function public.salvar_respostas(p_token text, p_payload jsonb, p_finalizar boolean default false) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_av public.avaliacoes%rowtype;
  v_item jsonb;
  v_resp jsonb;
  v_nota int;
  v_coment text;
  v_pergunta uuid;
  v_permite boolean;
  v_total int;
  v_respondidas int;
  v_nome text;
  v_cargo text;
  v_email text;
begin
  select * into v_av from public.avaliacoes where token_resposta = p_token for update;
  if not found or v_av.status <> 'aguardando_resposta' then
    raise exception 'avaliacao_indisponivel' using errcode = 'P0001';
  end if;
  if v_av.prazo is not null and v_av.prazo < now() then
    raise exception 'prazo_encerrado' using errcode = 'P0001';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'payload_invalido' using errcode = 'P0001';
  end if;

  v_resp := coalesce(p_payload -> 'respostas', '[]'::jsonb);
  if jsonb_typeof(v_resp) <> 'array' or jsonb_array_length(v_resp) > 500 then
    raise exception 'payload_invalido' using errcode = 'P0001';
  end if;

  for v_item in select * from jsonb_array_elements(v_resp) loop
    if jsonb_typeof(v_item) <> 'object' or (v_item ->> 'nota') is null or (v_item ->> 'nota') !~ '^[0-9]{1,2}$' then
      raise exception 'nota_invalida' using errcode = 'P0001';
    end if;
    v_nota := (v_item ->> 'nota')::int;
    if v_nota not between 0 and 10 then
      raise exception 'nota_invalida' using errcode = 'P0001';
    end if;
    if (v_item ->> 'pergunta_id') is null or (v_item ->> 'pergunta_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'pergunta_invalida' using errcode = 'P0001';
    end if;
    v_pergunta := (v_item ->> 'pergunta_id')::uuid;
    select permite_comentario into v_permite
    from public.avaliacao_perguntas where id = v_pergunta and avaliacao_id = v_av.id;
    if not found then
      raise exception 'pergunta_invalida' using errcode = 'P0001';
    end if;
    v_coment := nullif(btrim(coalesce(v_item ->> 'comentario', '')), '');
    if v_coment is not null and (not v_permite or char_length(v_coment) > 2000) then
      raise exception 'comentario_invalido' using errcode = 'P0001';
    end if;

    insert into public.respostas (avaliacao_id, pergunta_id, nota, comentario)
    values (v_av.id, v_pergunta, v_nota, v_coment)
    on conflict (avaliacao_id, pergunta_id) do update set nota = excluded.nota, comentario = excluded.comentario;
  end loop;

  if p_payload ? 'respondente' then
    v_nome := nullif(btrim(coalesce(p_payload -> 'respondente' ->> 'nome', '')), '');
    v_cargo := nullif(btrim(coalesce(p_payload -> 'respondente' ->> 'cargo', '')), '');
    v_email := nullif(btrim(coalesce(p_payload -> 'respondente' ->> 'email', '')), '');
    if char_length(coalesce(v_nome, '')) > 120 or char_length(coalesce(v_cargo, '')) > 120
       or char_length(coalesce(v_email, '')) > 200
       or (v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
      raise exception 'dados_respondente_invalidos' using errcode = 'P0001';
    end if;
    update public.avaliacoes
    set respondente_nome = v_nome, respondente_cargo = v_cargo, respondente_email = v_email
    where id = v_av.id;
  end if;

  select count(*) into v_total from public.avaliacao_perguntas where avaliacao_id = v_av.id;
  select count(*) into v_respondidas from public.respostas where avaliacao_id = v_av.id;

  if p_finalizar then
    if v_respondidas < v_total then
      raise exception 'respostas_incompletas' using errcode = 'P0001';
    end if;
    select respondente_nome into v_nome from public.avaliacoes where id = v_av.id;
    if v_nome is null then
      raise exception 'dados_respondente_invalidos' using errcode = 'P0001';
    end if;
    update public.avaliacoes set status = 'respondida', respondido_em = now() where id = v_av.id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', case when p_finalizar then 'respondida' else 'aguardando_resposta' end,
    'total_perguntas', v_total,
    'respondidas', v_respondidas
  );
end;
$$;

-- Dashboard do cliente: só o snapshot publicado. Registra a visualização.
-- null = token inexistente; {"disponivel": false} = existe, mas não está publicado.
create function public.obter_relatorio(p_token text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_av public.avaliacoes%rowtype;
  v_rel public.relatorios%rowtype;
  v_cfg public.configuracoes%rowtype;
  v_marca jsonb;
begin
  select * into v_av from public.avaliacoes where token_relatorio = p_token;
  if not found then
    return null;
  end if;
  select * into v_cfg from public.configuracoes;
  v_marca := jsonb_build_object('nome', v_cfg.nome_empresa, 'logo_url', v_cfg.logo_url, 'cor_destaque', v_cfg.cor_destaque);

  select * into v_rel from public.relatorios where avaliacao_id = v_av.id;
  if v_av.status <> 'publicada' or not found or v_rel.conteudo_publicado is null then
    return jsonb_build_object('disponivel', false, 'marca', v_marca);
  end if;

  update public.avaliacoes set visualizacoes = visualizacoes + 1, ultima_visualizacao = now() where id = v_av.id;

  return jsonb_build_object(
    'disponivel', true,
    'titulo', v_av.titulo,
    'periodo_referencia', v_av.periodo_referencia,
    'publicado_em', v_rel.publicado_em,
    'empresa', (select coalesce(nome_fantasia, razao_social) from public.empresas where id = v_av.empresa_id),
    'rodape', v_cfg.texto_rodape,
    'marca', v_marca,
    'conteudo', v_rel.conteudo_publicado
  );
end;
$$;

grant execute on function public.obter_marca() to anon, authenticated;
grant execute on function public.obter_formulario(text) to anon, authenticated;
grant execute on function public.salvar_respostas(text, jsonb, boolean) to anon, authenticated;
grant execute on function public.obter_relatorio(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Revogação explícita de EXECUTE (o Supabase concede por padrão a anon/authenticated,
-- por mais de um papel dono; não basta alterar os default privileges).
-- Só as funções listadas nos GRANTs acima ficam acessíveis.
-- ---------------------------------------------------------------------------

revoke execute on function
  public.gerar_token(),
  public.atualizar_timestamp(),
  public.congelar_copia_apos_envio(),
  public.registrar_edicao_relatorio(),
  public.eh_usuario_ativo(),
  public.eh_admin(),
  public.criar_avaliacao(uuid, uuid, text, text, timestamptz, text, uuid),
  public.regenerar_token(uuid, text),
  public.obter_marca(),
  public.obter_formulario(text),
  public.salvar_respostas(text, jsonb, boolean),
  public.obter_relatorio(text)
from public, anon, authenticated;

grant execute on function public.gerar_token() to authenticated;
grant execute on function public.eh_usuario_ativo() to authenticated;
grant execute on function public.eh_admin() to authenticated;
grant execute on function public.criar_avaliacao(uuid, uuid, text, text, timestamptz, text, uuid) to authenticated;
grant execute on function public.regenerar_token(uuid, text) to authenticated;
grant execute on function public.obter_marca() to anon, authenticated;
grant execute on function public.obter_formulario(text) to anon, authenticated;
grant execute on function public.salvar_respostas(text, jsonb, boolean) to anon, authenticated;
grant execute on function public.obter_relatorio(text) to anon, authenticated;

-- ===== migrations/20260926000003_primeiro_admin.sql =====
-- O primeiro usuário criado em Authentication > Users vira administrador automaticamente.
-- Depois que existe qualquer perfil, novos usuários NÃO ganham acesso sozinhos: só entram
-- pelo convite do administrador (Edge Function convidar-usuario, Fase 2), que cria o perfil.
-- Sem perfil, o usuário não enxerga nenhum dado (RLS) mesmo que consiga se autenticar.

create function public.atribuir_admin_ao_primeiro_usuario() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.perfis) then
    insert into public.perfis (id, nome, email, papel)
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Administrador'),
      coalesce(new.email, ''),
      'admin'
    );
  end if;
  return new;
end;
$$;

create trigger primeiro_usuario_vira_admin after insert on auth.users
  for each row execute function public.atribuir_admin_ao_primeiro_usuario();

revoke execute on function public.atribuir_admin_ao_primeiro_usuario() from public, anon, authenticated;

-- Se o usuário já foi criado antes desta migration, promove o mais antigo (só quando ainda não há perfis).
insert into public.perfis (id, nome, email, papel)
select id, coalesce(nullif(split_part(coalesce(email, ''), '@', 1), ''), 'Administrador'), coalesce(email, ''), 'admin'
from auth.users
where not exists (select 1 from public.perfis)
order by created_at
limit 1;

-- ===== migrations/20260927000004_duplicar_questionario.sql =====
-- Duplica um questionário com todos os grupos e perguntas (security invoker: vale a RLS de quem chama).

create function public.duplicar_questionario(p_questionario_id uuid) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_novo uuid;
  v_grupo record;
  v_novo_grupo uuid;
begin
  insert into public.questionarios (titulo, descricao)
  select titulo || ' (cópia)', descricao from public.questionarios where id = p_questionario_id
  returning id into v_novo;

  if v_novo is null then
    raise exception 'questionario_nao_encontrado' using errcode = 'P0001';
  end if;

  for v_grupo in
    select * from public.grupos where questionario_id = p_questionario_id order by ordem, id
  loop
    insert into public.grupos (questionario_id, nome, nome_curto, descricao, peso, meta, ordem)
    values (v_novo, v_grupo.nome, v_grupo.nome_curto, v_grupo.descricao, v_grupo.peso, v_grupo.meta, v_grupo.ordem)
    returning id into v_novo_grupo;

    insert into public.perguntas
      (grupo_id, enunciado, texto_apoio, peso, ordem, escala_invertida, rotulo_min, rotulo_max, permite_comentario)
    select v_novo_grupo, p.enunciado, p.texto_apoio, p.peso, p.ordem, p.escala_invertida,
           p.rotulo_min, p.rotulo_max, p.permite_comentario
    from public.perguntas p
    where p.grupo_id = v_grupo.id;
  end loop;

  return v_novo;
end;
$$;

revoke execute on function public.duplicar_questionario(uuid) from public, anon, authenticated;
grant execute on function public.duplicar_questionario(uuid) to authenticated;

-- ===== seed.sql (dados de exemplo) =====
-- Dados de exemplo (não usar em produção com clientes reais).
-- Questionário "Maturidade de Gestão" (6 grupos x 5 perguntas) e 3 empresas fictícias:
--   Metalúrgica Serra Azul: duas avaliações publicadas (evolução);
--   Clínica Vida Plena: respondida, aguardando análise;
--   Padaria Pão Nobre: aguardando resposta (com 12 perguntas já salvas como rascunho).
-- É seguro rodar uma vez. Para repetir, apague as linhas com o CNPJ de exemplo ou use `supabase db reset`.

-- Função temporária (existe só nesta sessão): grava respostas a partir de uma matriz [grupo][pergunta]
-- de notas EFETIVAS. Para perguntas de escala invertida grava 10 - nota, como o respondente marcaria.
create function pg_temp.semear_respostas(p_av uuid, p_notas jsonb, p_limite int) returns void
language plpgsql as $f$
declare
  r record;
  n int := 0;
  v_eff int;
begin
  for r in
    select ap.id, ap.escala_invertida, ag.ordem as og, ap.ordem as op
    from public.avaliacao_perguntas ap
    join public.avaliacao_grupos ag on ag.id = ap.avaliacao_grupo_id
    where ap.avaliacao_id = p_av
    order by ag.ordem, ap.ordem
  loop
    exit when n >= p_limite;
    n := n + 1;
    v_eff := ((p_notas -> (r.og - 1)) ->> (r.op - 1))::int;
    insert into public.respostas (avaliacao_id, pergunta_id, nota)
    values (p_av, r.id, case when r.escala_invertida then 10 - v_eff else v_eff end);
  end loop;
end;
$f$;

do $$
declare
  v_q uuid;
  v_g uuid;
  v_grupo jsonb;
  v_perg jsonb;
  v_ordem_g int := 0;
  v_ordem_p int;
  v_serra uuid;
  v_clinica uuid;
  v_padaria uuid;
  v_av1 uuid;
  v_av2 uuid;
  v_av3 uuid;
  v_av4 uuid;
begin
  if exists (select 1 from public.questionarios where titulo = 'Maturidade de Gestão') then
    raise notice 'Seed já aplicado; nada a fazer.';
    return;
  end if;

  insert into public.questionarios (titulo, descricao)
  values ('Maturidade de Gestão', 'Avalia a maturidade da gestão da empresa em seis temas, com notas de 0 a 10.')
  returning id into v_q;

  for v_grupo in select * from jsonb_array_elements('[
    {"nome":"Estratégia e Governança","curto":"Estratégia","peso":2,"perguntas":[
      {"e":"A empresa tem metas anuais claras e conhecidas pela liderança?","p":3},
      {"e":"Com que frequência a diretoria revisa os resultados contra as metas?","p":2,"min":"Nunca","max":"Todo mês"},
      {"e":"Existe um planejamento estratégico escrito para os próximos 3 anos?","p":2},
      {"e":"Os papéis e as responsabilidades de cada área estão definidos?","p":2},
      {"e":"Decisões importantes dependem de uma única pessoa.","p":1,"inv":true}]},
    {"nome":"Finanças","curto":"Finanças","peso":3,"perguntas":[
      {"e":"O caixa é projetado para os próximos 3 meses?","p":3,"min":"Nunca","max":"Toda semana"},
      {"e":"A empresa separa as contas pessoais das contas da empresa?","p":2},
      {"e":"Existe controle de custos por produto ou serviço?","p":2},
      {"e":"A empresa conhece a margem de lucro de cada linha de negócio?","p":2},
      {"e":"Falta dinheiro em caixa para pagar contas em dia.","p":2,"inv":true}]},
    {"nome":"Pessoas e Liderança","curto":"Pessoas","peso":2,"perguntas":[
      {"e":"Cada pessoa da equipe conhece as metas do seu cargo?","p":2},
      {"e":"A liderança dá feedback regular à equipe?","p":2},
      {"e":"Há plano de desenvolvimento e treinamento para os colaboradores?","p":1},
      {"e":"A empresa consegue reter seus melhores profissionais?","p":2},
      {"e":"O clima de trabalho é de confiança e colaboração.","p":1}]},
    {"nome":"Processos e Qualidade","curto":"Processos","peso":2,"perguntas":[
      {"e":"As principais rotinas estão documentadas e são seguidas?","p":2},
      {"e":"Existem indicadores de qualidade acompanhados regularmente?","p":2},
      {"e":"Falhas e retrabalho são registrados e analisados?","p":2},
      {"e":"Os processos são revisados para ganhar eficiência?","p":1},
      {"e":"O conhecimento crítico está concentrado em poucas pessoas.","p":1,"inv":true}]},
    {"nome":"Comercial e Clientes","curto":"Comercial","peso":2,"perguntas":[
      {"e":"A empresa conhece o perfil dos seus melhores clientes?","p":2},
      {"e":"Há metas e acompanhamento do funil de vendas?","p":2},
      {"e":"Existe rotina de pós-venda e relacionamento com clientes?","p":2},
      {"e":"A satisfação dos clientes é medida?","p":1},
      {"e":"A maior parte do faturamento vem de poucos clientes.","p":2,"inv":true}]},
    {"nome":"Tecnologia e Inovação","curto":"Tecnologia","peso":1,"perguntas":[
      {"e":"Os sistemas da empresa são integrados entre as áreas?","p":2},
      {"e":"Os dados são usados para apoiar decisões?","p":2},
      {"e":"A empresa testa novas ideias, produtos ou serviços com frequência?","p":1},
      {"e":"Há proteção adequada para dados e acessos (cópias, senhas, permissões)?","p":2},
      {"e":"Boa parte das tarefas ainda é feita manualmente em planilhas.","p":1,"inv":true}]}
  ]'::jsonb)
  loop
    v_ordem_g := v_ordem_g + 1;
    insert into public.grupos (questionario_id, nome, nome_curto, peso, meta, ordem)
    values (v_q, v_grupo ->> 'nome', v_grupo ->> 'curto', (v_grupo ->> 'peso')::numeric, 8.0, v_ordem_g)
    returning id into v_g;

    v_ordem_p := 0;
    for v_perg in select * from jsonb_array_elements(v_grupo -> 'perguntas') loop
      v_ordem_p := v_ordem_p + 1;
      insert into public.perguntas (grupo_id, enunciado, peso, ordem, escala_invertida, rotulo_min, rotulo_max)
      values (v_g, v_perg ->> 'e', (v_perg ->> 'p')::numeric, v_ordem_p,
              coalesce((v_perg ->> 'inv')::boolean, false), v_perg ->> 'min', v_perg ->> 'max');
    end loop;
  end loop;

  insert into public.empresas (razao_social, nome_fantasia, cnpj, segmento, porte, municipio, uf,
                               responsavel_nome, responsavel_cargo, responsavel_email, responsavel_telefone, observacoes)
  values ('Metalúrgica Serra Azul S.A.', 'Serra Azul', '12345678000195', 'Indústria metalmecânica', 'Média empresa',
          'Caxias do Sul', 'RS', 'Roberto Menezes', 'Diretor administrativo', 'roberto@serraazul.example', '54999990001',
          'Cliente desde 2024. Prefere contato por WhatsApp.')
  returning id into v_serra;
  insert into public.empresas (razao_social, nome_fantasia, cnpj, segmento, porte, municipio, uf,
                               responsavel_nome, responsavel_cargo, responsavel_email, responsavel_telefone)
  values ('Clínica Vida Plena Ltda.', 'Vida Plena', '23456789000195', 'Saúde', 'Pequena empresa',
          'Belo Horizonte', 'MG', 'Dra. Camila Torres', 'Diretora clínica', 'camila@vidaplena.example', '31999990002')
  returning id into v_clinica;
  insert into public.empresas (razao_social, nome_fantasia, cnpj, segmento, porte, municipio, uf,
                               responsavel_nome, responsavel_cargo, responsavel_email, responsavel_telefone)
  values ('Padaria Pão Nobre Ltda.', 'Pão Nobre', '34567890000130', 'Alimentação', 'Microempresa',
          'Curitiba', 'PR', 'Sérgio Batista', 'Proprietário', 'sergio@paonobre.example', '41999990003')
  returning id into v_padaria;

  -- Serra Azul, 1º semestre: publicada.
  v_av1 := public.criar_avaliacao(v_serra, v_q, 'Maturidade de Gestão · 1º semestre 2026', 'Jan a jun de 2026',
                                  '2026-03-20 23:59:00-03', 'Olá, Roberto! Responda com sinceridade: não há resposta certa.');
  perform pg_temp.semear_respostas(v_av1, '[[7,7,6,8,7],[5,6,6,5,5],[8,7,8,7,8],[6,7,6,6,7],[7,7,7,6,7],[5,5,4,5,5]]'::jsonb, 30);
  update public.avaliacoes set status = 'publicada', respondente_nome = 'Roberto Menezes', respondente_cargo = 'Diretor administrativo',
    enviado_em = '2026-02-12 10:00:00-03', respondido_em = '2026-03-05 16:20:00-03', publicado_em = '2026-03-12 09:30:00-03'
  where id = v_av1;
  insert into public.relatorios (avaliacao_id, conteudo_rascunho, conteudo_publicado, gerado_em, publicado_em)
  values (v_av1, '{"resumo_executivo":"Exemplo de relatório do 1º semestre (dados de demonstração)."}'::jsonb,
          '{"resumo_executivo":"Exemplo de relatório do 1º semestre (dados de demonstração).","seed":true}'::jsonb,
          '2026-03-10 11:00:00-03', '2026-03-12 09:30:00-03');

  -- Serra Azul, 2º semestre: publicada, com a anterior para comparar.
  v_av2 := public.criar_avaliacao(v_serra, v_q, 'Maturidade de Gestão · 2º semestre 2026', 'Jul a dez de 2026',
                                  '2026-09-10 23:59:00-03', 'Olá, Roberto! Vamos medir a evolução desde o último semestre.', v_av1);
  perform pg_temp.semear_respostas(v_av2, '[[8,8,7,8,8],[2,9,7,6,7],[9,8,8,8,9],[7,8,7,7,7],[8,8,8,7,8],[6,6,5,6,6]]'::jsonb, 30);
  update public.avaliacoes set status = 'publicada', respondente_nome = 'Roberto Menezes', respondente_cargo = 'Diretor administrativo',
    enviado_em = '2026-09-03 10:00:00-03', respondido_em = '2026-09-18 15:05:00-03', publicado_em = '2026-09-22 09:00:00-03'
  where id = v_av2;
  insert into public.relatorios (avaliacao_id, conteudo_rascunho, conteudo_publicado, gerado_em, publicado_em)
  values (v_av2, '{"resumo_executivo":"Exemplo de relatório do 2º semestre (dados de demonstração)."}'::jsonb,
          '{"resumo_executivo":"Exemplo de relatório do 2º semestre (dados de demonstração).","seed":true}'::jsonb,
          '2026-09-21 11:00:00-03', '2026-09-22 09:00:00-03');

  -- Vida Plena: respondida, aguardando análise.
  v_av3 := public.criar_avaliacao(v_clinica, v_q, 'Maturidade de Gestão · 2º semestre 2026', 'Jul a dez de 2026',
                                  '2026-09-25 23:59:00-03', 'Olá, Dra. Camila! Este questionário leva cerca de 15 minutos.');
  perform pg_temp.semear_respostas(v_av3, '[[6,5,6,7,6],[6,7,5,6,6],[7,6,7,7,6],[5,6,6,5,6],[6,6,7,6,5],[4,5,5,6,4]]'::jsonb, 30);
  update public.avaliacoes set status = 'respondida', respondente_nome = 'Camila Torres', respondente_cargo = 'Diretora clínica',
    enviado_em = '2026-09-08 10:00:00-03', respondido_em = '2026-09-22 14:10:00-03'
  where id = v_av3;

  -- Pão Nobre: aguardando resposta, com rascunho parcial (12 de 30).
  v_av4 := public.criar_avaliacao(v_padaria, v_q, 'Maturidade de Gestão · 2º semestre 2026', 'Jul a dez de 2026',
                                  '2026-09-28 23:59:00-03', 'Olá, Sérgio! Responda com calma; suas respostas são salvas automaticamente.');
  perform pg_temp.semear_respostas(v_av4, '[[7,6,5,7,6],[5,6,7,5,6],[6,7,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]]'::jsonb, 12);
  update public.avaliacoes set status = 'aguardando_resposta', respondente_nome = 'Sérgio Batista', enviado_em = '2026-09-10 10:00:00-03'
  where id = v_av4;
end;
$$;
