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
