-- Remove o status "arquivada" e a exclusão direta de avaliações: o ciclo de vida fica só em
-- rascunho -> aguardando_resposta -> respondida (-> em_analise) -> publicada. Linhas antigas com
-- status='arquivada' voltam para respondida (se já tinham resposta) ou rascunho.
update public.avaliacoes set status = case when respondido_em is not null then 'respondida' else 'rascunho' end
  where status = 'arquivada';

alter table public.avaliacoes drop constraint avaliacoes_status_check;
alter table public.avaliacoes add constraint avaliacoes_status_check
  check (status in ('rascunho', 'aguardando_resposta', 'respondida', 'em_analise', 'publicada'));

create or replace function public.obter_formulario(p_token text) returns jsonb
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
  if not found or v_av.status = 'rascunho' then
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

-- Modo de apresentação para o cliente: só libera depois que o operador já abriu o modo de apresentação
-- pelo menos uma vez (apresentou de fato) E o dashboard já está liberado.
alter table public.avaliacoes add column apresentacao_realizada_em timestamptz;

create or replace function public.liberar_apresentacao_cliente(p_avaliacao_id uuid, p_liberar boolean) returns timestamptz
language plpgsql security invoker set search_path = ''
as $$
declare
  v_em timestamptz;
begin
  if p_liberar then
    update public.avaliacoes set apresentacao_liberada_em = coalesce(apresentacao_liberada_em, now())
      where id = p_avaliacao_id and relatorio_liberado_em is not null and apresentacao_realizada_em is not null
      returning apresentacao_liberada_em into v_em;
    if not found then
      raise exception 'nao_liberavel' using errcode = 'P0001';
    end if;
    return v_em;
  end if;
  update public.avaliacoes set apresentacao_liberada_em = null where id = p_avaliacao_id;
  return null;
end;
$$;
