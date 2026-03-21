-- Profils : rôle par utilisateur (auth.users)
-- Rôles de base : admin | client (étendu driver + driver_operator dans 009_three_roles_driver_access.sql)

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'client' check (role in ('admin', 'client')),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Profil applicatif ; rôle pour contrôle d’accès (admin / client).';

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- Pas d’insert/update côté client : création par trigger + promotion admin en SQL (tableau).

-- Lignes manquantes pour comptes existants (à exécuter une fois après déploiement)
insert into public.profiles (id, role)
select id, 'client' from auth.users
on conflict (id) do nothing;

-- Nouveaux comptes : profil avec rôle client
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'client')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();
