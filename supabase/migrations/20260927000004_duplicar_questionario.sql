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
