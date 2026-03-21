-- DemGaw : trajets + réservations + RPC atomique
-- Exécuter dans Supabase → SQL Editor (ou via CLI supabase db push)

create table if not exists public.trips (
  id text primary key,
  departure_city text not null,
  destination_city text not null,
  date text not null,
  time text not null,
  sort_key text not null,
  price integer not null default 0 check (price >= 0),
  available_seats integer not null default 0 check (available_seats >= 0),
  operator text not null default '',
  duration text not null default '',
  booked_seats text[] not null default '{}'
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  trip_id text not null references public.trips (id),
  seat_number text not null,
  status text not null default 'pending_payment',
  departure_city text not null default '',
  destination_city text not null default '',
  date text not null default '',
  time text not null default '',
  price integer not null default 0,
  operator text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists bookings_user_id_idx on public.bookings (user_id);
create index if not exists bookings_created_at_idx on public.bookings (created_at desc);

alter table public.trips enable row level security;
alter table public.bookings enable row level security;

drop policy if exists "trips_select_all" on public.trips;
create policy "trips_select_all" on public.trips for select using (true);

drop policy if exists "trips_insert_auth" on public.trips;
create policy "trips_insert_auth" on public.trips
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "trips_update_auth" on public.trips;
create policy "trips_update_auth" on public.trips
  for update using (auth.role() = 'authenticated');

drop policy if exists "bookings_select_own" on public.bookings;
create policy "bookings_select_own" on public.bookings
  for select using (auth.uid() = user_id);

-- Pas d’insert direct sur bookings : uniquement via la fonction ci-dessous

create or replace function public.create_booking(p_trip_id text, p_seat_number text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  t record;
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into t from public.trips where id = p_trip_id for update;
  if not found then
    raise exception 'TRIP_NOT_FOUND';
  end if;

  if t.available_seats < 1 then
    raise exception 'NO_SEATS';
  end if;

  if p_seat_number = any (t.booked_seats) then
    raise exception 'SEAT_TAKEN';
  end if;

  update public.trips
  set
    available_seats = available_seats - 1,
    booked_seats = array_append(booked_seats, p_seat_number)
  where id = p_trip_id;

  insert into public.bookings (
    user_id, trip_id, seat_number, status,
    departure_city, destination_city, date, time, price, operator
  )
  values (
    v_user, p_trip_id, p_seat_number, 'pending_payment',
    t.departure_city, t.destination_city, t.date, t.time, t.price, coalesce(t.operator, '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_booking(text, text) from public;
grant execute on function public.create_booking(text, text) to authenticated;

-- Paiement simulé (voir aussi migrations/002_payment_simulation.sql pour mise à jour seule)
create or replace function public.pay_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_n int;
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  update public.bookings
  set status = 'paid'
  where id = p_booking_id
    and user_id = v_user
    and status in ('pending_payment', 'confirmed');

  get diagnostics v_n = row_count;
  if v_n > 0 then
    return;
  end if;

  if exists (
    select 1 from public.bookings
    where id = p_booking_id and user_id = v_user and status = 'paid'
  ) then
    return;
  end if;

  raise exception 'BOOKING_NOT_PAYABLE';
end;
$$;

revoke all on function public.pay_booking(uuid) from public;
grant execute on function public.pay_booking(uuid) to authenticated;

-- Profils (rôles) — voir aussi migrations/004_profiles_roles.sql seul
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'client' check (role in ('admin', 'client')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

insert into public.profiles (id, role)
select id, 'client' from auth.users
on conflict (id) do nothing;

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

-- Temps réel : dans le tableau Supabase → Database → Publications → supabase_realtime,
-- ajoutez la table `trips` (sinon la liste se met à jour au rechargement uniquement).
