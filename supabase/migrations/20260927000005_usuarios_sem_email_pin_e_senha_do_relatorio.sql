-- 1) Usuários sem e-mail (nome.sobrenome), troca de senha obrigatória e PIN de 6 dígitos.
-- 2) Senha opcional (código numérico aleatório) para o dashboard do cliente.

-- ---------------------------------------------------------------------------
-- Perfis: usuário, troca de senha obrigatória, estado do PIN
-- ---------------------------------------------------------------------------

alter table public.perfis
  add column usuario text unique check (usuario ~ '^[a-z0-9][a-z0-9._-]{1,59}$'),
  add column precisa_trocar_senha boolean not null default false,
  -- nenhum: sem oferta · segundo_login: perguntar no próximo login · ofertado: já perguntado · ativo: tem PIN
  add column pin_estado text not null default 'nenhum' check (pin_estado in ('nenhum', 'segundo_login', 'ofertado', 'ativo'));

-- Enquanto a senha inicial não for trocada, o usuário não enxerga nem altera nenhum dado (RLS),
-- mesmo que chame a API direto. O perfil dele continua legível (política perfis_ler) para o app redirecionar.
create or replace function public.eh_usuario_ativo() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.perfis where id = (select auth.uid()) and ativo and not precisa_trocar_senha);
$$;

create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.perfis where id = (select auth.uid()) and ativo and not precisa_trocar_senha and papel = 'admin');
$$;

-- ---------------------------------------------------------------------------
-- PINs: tabela sem nenhum acesso do navegador; só as funções abaixo (service_role, via Edge Function)
-- ---------------------------------------------------------------------------

create table public.pins (
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  pin_hash text not null,
  tentativas integer not null default 0,
  bloqueado_ate timestamptz
);
alter table public.pins enable row level security;
revoke all on public.pins from anon, authenticated;

create function public.definir_pin(p_usuario_id uuid, p_pin text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_pin is null or p_pin !~ '^[0-9]{6}$' then
    raise exception 'pin_invalido' using errcode = 'P0001';
  end if;
  insert into public.pins (usuario_id, pin_hash, tentativas, bloqueado_ate)
  values (p_usuario_id, extensions.crypt(p_pin, extensions.gen_salt('bf', 8)), 0, null)
  on conflict (usuario_id) do update set pin_hash = excluded.pin_hash, tentativas = 0, bloqueado_ate = null;
end;
$$;

create function public.remover_pin(p_usuario_id uuid) returns void
language sql security definer set search_path = ''
as $$
  delete from public.pins where usuario_id = p_usuario_id;
$$;

-- Devolve o id do usuário se usuário+PIN conferem; null se não. 5 erros bloqueiam por 15 minutos.
create function public.verificar_pin(p_usuario text, p_pin text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_pin public.pins%rowtype;
  v_falhas integer;
begin
  select id into v_id from public.perfis where usuario = lower(coalesce(p_usuario, '')) and ativo and not precisa_trocar_senha;
  if not found then
    perform extensions.crypt(coalesce(p_pin, ''), extensions.gen_salt('bf', 8)); -- tempo parecido, sem revelar se o usuário existe
    return null;
  end if;
  select * into v_pin from public.pins where usuario_id = v_id for update;
  if not found then
    return null;
  end if;
  if v_pin.bloqueado_ate is not null and v_pin.bloqueado_ate > now() then
    raise exception 'pin_bloqueado' using errcode = 'P0001';
  end if;
  if p_pin is not null and v_pin.pin_hash = extensions.crypt(p_pin, v_pin.pin_hash) then
    update public.pins set tentativas = 0, bloqueado_ate = null where usuario_id = v_id;
    return v_id;
  end if;
  v_falhas := v_pin.tentativas + 1;
  if v_falhas >= 5 then
    update public.pins set tentativas = 0, bloqueado_ate = now() + interval '15 minutes' where usuario_id = v_id;
  else
    update public.pins set tentativas = v_falhas where usuario_id = v_id;
  end if;
  return null;
end;
$$;

revoke execute on function public.definir_pin(uuid, text), public.remover_pin(uuid), public.verificar_pin(text, text) from public, anon, authenticated;
grant execute on function public.definir_pin(uuid, text), public.remover_pin(uuid), public.verificar_pin(text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Senha do dashboard do cliente (opcional)
-- ---------------------------------------------------------------------------

alter table public.avaliacoes
  add column relatorio_senha text check (relatorio_senha ~ '^[0-9]{6}$'),  -- null = sem senha
  add column relatorio_tentativas integer not null default 0,
  add column relatorio_bloqueado_ate timestamptz;

-- Liga/desliga a senha e/ou gera um novo código aleatório (o anterior deixa de funcionar).
-- security invoker: vale a RLS de quem chama. Devolve o código atual (ou null se sem senha).
create function public.definir_senha_relatorio(p_avaliacao_id uuid, p_ativar boolean, p_renovar boolean default false) returns text
language plpgsql security invoker set search_path = ''
as $$
declare
  v_atual text;
  v_novo text;
  v_bytes bytea;
begin
  select relatorio_senha into v_atual from public.avaliacoes where id = p_avaliacao_id;
  if not found then
    raise exception 'avaliacao_nao_encontrada' using errcode = 'P0001';
  end if;
  if not p_ativar then
    update public.avaliacoes set relatorio_senha = null, relatorio_tentativas = 0, relatorio_bloqueado_ate = null where id = p_avaliacao_id;
    return null;
  end if;
  if v_atual is not null and not p_renovar then
    return v_atual;
  end if;
  loop
    v_bytes := extensions.gen_random_bytes(4);
    v_novo := lpad(((get_byte(v_bytes, 0)::bigint * 16777216 + get_byte(v_bytes, 1) * 65536 + get_byte(v_bytes, 2) * 256 + get_byte(v_bytes, 3)) % 1000000)::text, 6, '0');
    exit when v_novo is distinct from v_atual;
  end loop;
  update public.avaliacoes set relatorio_senha = v_novo, relatorio_tentativas = 0, relatorio_bloqueado_ate = null where id = p_avaliacao_id;
  return v_novo;
end;
$$;
revoke execute on function public.definir_senha_relatorio(uuid, boolean, boolean) from public, anon, authenticated;
grant execute on function public.definir_senha_relatorio(uuid, boolean, boolean) to authenticated;

-- obter_relatorio agora aceita a senha. Sem senha configurada, funciona como antes.
-- Com senha: sem p_senha devolve só {"protegido": true}; senha errada conta tentativa (5 erros = 10 min de bloqueio).
drop function public.obter_relatorio(text);

create function public.obter_relatorio(p_token text, p_senha text default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_av public.avaliacoes%rowtype;
  v_rel public.relatorios%rowtype;
  v_cfg public.configuracoes%rowtype;
  v_marca jsonb;
  v_falhas integer;
begin
  select * into v_av from public.avaliacoes where token_relatorio = p_token for update;
  if not found then
    return null;
  end if;
  select * into v_cfg from public.configuracoes;
  v_marca := jsonb_build_object('nome', v_cfg.nome_empresa, 'logo_url', v_cfg.logo_url, 'cor_destaque', v_cfg.cor_destaque);

  if v_av.relatorio_senha is not null then
    if v_av.relatorio_bloqueado_ate is not null and v_av.relatorio_bloqueado_ate > now() then
      return jsonb_build_object('protegido', true, 'bloqueado', true, 'marca', v_marca);
    end if;
    if p_senha is null or p_senha = '' then
      return jsonb_build_object('protegido', true, 'marca', v_marca);
    end if;
    if p_senha <> v_av.relatorio_senha then
      v_falhas := v_av.relatorio_tentativas + 1;
      if v_falhas >= 5 then
        update public.avaliacoes set relatorio_tentativas = 0, relatorio_bloqueado_ate = now() + interval '10 minutes' where id = v_av.id;
        return jsonb_build_object('protegido', true, 'bloqueado', true, 'marca', v_marca);
      end if;
      update public.avaliacoes set relatorio_tentativas = v_falhas where id = v_av.id;
      return jsonb_build_object('protegido', true, 'erro', 'senha_incorreta', 'marca', v_marca);
    end if;
    if v_av.relatorio_tentativas > 0 then
      update public.avaliacoes set relatorio_tentativas = 0 where id = v_av.id;
    end if;
  end if;

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
revoke execute on function public.obter_relatorio(text, text) from public, anon, authenticated;
grant execute on function public.obter_relatorio(text, text) to anon, authenticated;
