-- Liste des chauffeurs (admin) : métadonnées Auth + profil opérateur
create or replace function public.admin_list_drivers()
returns table(
  id uuid,
  email text,
  full_name text,
  phone text,
  driver_operator text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  return query
  select
    u.id,
    u.email::text,
    coalesce(u.raw_user_meta_data->>'full_name', '')::text,
    coalesce(u.raw_user_meta_data->>'phone', '')::text,
    p.driver_operator::text
  from auth.users u
  inner join public.profiles p on p.id = u.id
  where p.role = 'driver'
  order by u.created_at desc;
end;
$$;

revoke all on function public.admin_list_drivers() from public;
grant execute on function public.admin_list_drivers() to authenticated;
