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
