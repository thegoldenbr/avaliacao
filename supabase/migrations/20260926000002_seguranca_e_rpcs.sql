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
