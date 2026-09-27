-- Modo de apresentação para o cliente: uma segunda liberação, só possível depois que o dashboard já
-- foi liberado. Revogar o dashboard também revoga a apresentação (não faria sentido uma sem a outra).
alter table public.avaliacoes add column apresentacao_liberada_em timestamptz;

create or replace function public.liberar_relatorio(p_avaliacao_id uuid, p_liberar boolean) returns timestamptz
language plpgsql security invoker set search_path = ''
as $$
declare
  v_em timestamptz;
begin
  if p_liberar then
    update public.avaliacoes set relatorio_liberado_em = coalesce(relatorio_liberado_em, now())
      where id = p_avaliacao_id and status = 'publicada' returning relatorio_liberado_em into v_em;
    if not found then
      raise exception 'avaliacao_nao_publicada' using errcode = 'P0001';
    end if;
    return v_em;
  end if;
  update public.avaliacoes set relatorio_liberado_em = null, apresentacao_liberada_em = null where id = p_avaliacao_id;
  return null;
end;
$$;

create function public.liberar_apresentacao_cliente(p_avaliacao_id uuid, p_liberar boolean) returns timestamptz
language plpgsql security invoker set search_path = ''
as $$
declare
  v_em timestamptz;
begin
  if p_liberar then
    update public.avaliacoes set apresentacao_liberada_em = coalesce(apresentacao_liberada_em, now())
      where id = p_avaliacao_id and relatorio_liberado_em is not null returning apresentacao_liberada_em into v_em;
    if not found then
      raise exception 'relatorio_nao_liberado' using errcode = 'P0001';
    end if;
    return v_em;
  end if;
  update public.avaliacoes set apresentacao_liberada_em = null where id = p_avaliacao_id;
  return null;
end;
$$;
revoke execute on function public.liberar_apresentacao_cliente(uuid, boolean) from public, anon, authenticated;
grant execute on function public.liberar_apresentacao_cliente(uuid, boolean) to authenticated;

-- obter_relatorio agora também informa se o cliente pode abrir o modo de apresentação.
create or replace function public.obter_relatorio(p_token text, p_senha text default null) returns jsonb
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

  if v_av.relatorio_liberado_em is null then
    return jsonb_build_object('liberado', false, 'marca', v_marca);
  end if;

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
    'conteudo', v_rel.conteudo_publicado,
    'apresentacao_liberada', v_av.apresentacao_liberada_em is not null
  );
end;
$$;
