-- DemGaw : schéma + RPC + trajets démo (une seule exécution dans Supabase → SQL Editor → Run)
-- Idempotent (CREATE OR REPLACE, ON CONFLICT).

-- ========== Schéma (voir aussi migrations/001_demgaw_schema.sql) ==========

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

-- ========== RPC réservation ==========

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

-- ========== Profils (rôles admin / client) ==========

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'client' check (role in ('admin', 'client')),
  created_at timestamptz not null default now()
);

-- Rôle chauffeur + opérateur (aligné migrations 009)
alter table public.profiles
  add column if not exists driver_operator text null;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'client', 'driver'));

alter table public.profiles drop constraint if exists profiles_driver_operator_ck;
alter table public.profiles
  add constraint profiles_driver_operator_ck check (
    role <> 'driver'
    or (driver_operator is not null and length(trim(driver_operator)) > 0)
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

-- ========== Admin tools (paiement admin) ==========

create extension if not exists "pgcrypto";

alter table public.bookings
  add column if not exists qr_payload jsonb null;

create table if not exists public.ticket_qr_secrets (
  id integer primary key default 1,
  secret text not null
);

insert into public.ticket_qr_secrets (id, secret)
values (1, 'CHANGE_ME_TICKET_QR_SECRET')
on conflict (id) do nothing;

create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_role text;
begin
  select p.role into v_role
  from public.profiles p
  where p.id = auth.uid()
  limit 1;

  return v_role = 'admin';
end;
$$;

create or replace function public.admin_pay_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_b record;
  v_secret text;
  v_ts bigint;
  v_msg text;
  v_sig text;
  v_payload jsonb;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select id, user_id, status into v_b
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'BOOKING_NOT_PAYABLE';
  end if;

  if v_b.status = 'paid' then
    return;
  end if;

  if v_b.status not in ('pending_payment', 'confirmed') then
    raise exception 'BOOKING_NOT_PAYABLE';
  end if;

  select tqs.secret into v_secret
  from public.ticket_qr_secrets tqs
  where tqs.id = 1;

  if v_secret is null or length(v_secret) < 10 then
    raise exception 'TICKET_QR_SECRET_NOT_SET';
  end if;

  v_ts := extract(epoch from now())::bigint;
  v_msg := v_b.id::text || '|' || v_b.user_id::text || '|' || v_ts::text;
  v_sig := encode(digest(v_msg || '|' || v_secret, 'sha256'), 'hex');

  v_payload := jsonb_build_object(
    'booking_id', v_b.id,
    'user_id', v_b.user_id,
    'timestamp', v_ts,
    'signature', v_sig
  );

  update public.bookings
  set
    status = 'paid',
    qr_payload = v_payload
  where id = p_booking_id;
end;
$$;

revoke all on function public.admin_pay_booking(uuid) from public;
grant execute on function public.admin_pay_booking(uuid) to authenticated;

create or replace function public.admin_list_bookings()
returns table(
  id uuid,
  user_id uuid,
  trip_id text,
  seat_number text,
  status text,
  departure_city text,
  destination_city text,
  "date" text,
  "time" text,
  price integer,
  operator text,
  created_at timestamptz,
  qr_payload jsonb
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_secret text;
  v_ts bigint;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  -- Qualifier tqs.id : sinon « id » entre en conflit avec la colonne OUT id du RETURNS TABLE (42702 → 400 REST).
  select tqs.secret into v_secret
  from public.ticket_qr_secrets tqs
  where tqs.id = 1;

  if v_secret is null or length(v_secret) < 10 then
    raise exception 'TICKET_QR_SECRET_NOT_SET';
  end if;

  v_ts := extract(epoch from now())::bigint;

  return query
  select
    b.id,
    b.user_id,
    b.trip_id,
    b.seat_number,
    b.status,
    b.departure_city,
    b.destination_city,
    b.date,
    b.time,
    b.price,
    b.operator,
    b.created_at,
    case
      when b.status = 'paid' and b.qr_payload is not null then b.qr_payload
      when b.status = 'paid' then
        jsonb_build_object(
          'booking_id', b.id,
          'user_id', b.user_id,
          'timestamp', v_ts,
          'signature',
            encode(digest(
              (b.id::text || '|' || b.user_id::text || '|' || v_ts::text) || '|' || v_secret,
              'sha256'
            ), 'hex')
        )
      else b.qr_payload
    end as qr_payload
  from public.bookings b
  order by b.created_at desc;
end;
$$;

revoke all on function public.admin_list_bookings() from public;
grant execute on function public.admin_list_bookings() to authenticated;

create or replace function public.admin_upsert_trip(
  p_id text,
  p_departure_city text,
  p_destination_city text,
  p_date text,
  p_time text,
  p_price integer,
  p_available_seats integer,
  p_operator text,
  p_duration text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if p_operator is null then
    p_operator := '';
  end if;
  if p_duration is null then
    p_duration := '';
  end if;

  insert into public.trips (
    id,
    departure_city,
    destination_city,
    "date",
    "time",
    sort_key,
    price,
    available_seats,
    operator,
    duration
  )
  values (
    p_id,
    p_departure_city,
    p_destination_city,
    p_date,
    p_time,
    p_date || 'T' || p_time,
    p_price,
    p_available_seats,
    p_operator,
    p_duration
  )
  on conflict (id) do update
  set
    departure_city = excluded.departure_city,
    destination_city = excluded.destination_city,
    "date" = excluded."date",
    "time" = excluded."time",
    sort_key = excluded.sort_key,
    price = excluded.price,
    available_seats = excluded.available_seats,
    operator = excluded.operator,
    duration = excluded.duration;
end;
$$;

create or replace function public.admin_delete_trip(p_trip_id text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  delete from public.trips
  where id = p_trip_id;
end;
$$;

revoke all on function public.admin_upsert_trip(
  text, text, text, text, text, integer, integer, text, text
) from public;
grant execute on function public.admin_upsert_trip(
  text, text, text, text, text, integer, integer, text, text
) to authenticated;

revoke all on function public.admin_delete_trip(text) from public;
grant execute on function public.admin_delete_trip(text) to authenticated;

-- -----------------------------------------------------------------------------
-- Gestion utilisateurs (admin) — liste + rôles (client | admin | driver)
-- -----------------------------------------------------------------------------
create or replace function public.is_driver()
returns boolean
language plpgsql
security definer
set search_path = public, auth
stable
as $$
declare
  v_role text;
begin
  select p.role into v_role
  from public.profiles p
  where p.id = auth.uid()
  limit 1;

  return v_role = 'driver';
end;
$$;

revoke all on function public.is_driver() from public;
grant execute on function public.is_driver() to authenticated;

drop function if exists public.admin_list_users();

create function public.admin_list_users()
returns table(
  id uuid,
  email text,
  profile_role text,
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
    coalesce(p.role, 'client')::text,
    p.driver_operator::text
  from auth.users u
  left join public.profiles p on p.id = u.id
  order by u.created_at desc;
end;
$$;

revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;

drop function if exists public.admin_set_user_role(uuid, text);
drop function if exists public.admin_set_user_role(uuid, text, text);

create or replace function public.admin_set_user_role(
  p_user_id uuid,
  p_role text,
  p_driver_operator text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_op text;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if p_role not in ('admin', 'client', 'driver') then
    raise exception 'INVALID_ROLE';
  end if;

  if p_role = 'driver' then
    v_op := nullif(trim(both from coalesce(p_driver_operator, '')), '');
    if v_op is null then
      raise exception 'DRIVER_OPERATOR_REQUIRED';
    end if;
  else
    v_op := null;
  end if;

  insert into public.profiles (id, role, driver_operator)
  values (p_user_id, p_role, v_op)
  on conflict (id) do update
  set
    role = excluded.role,
    driver_operator = excluded.driver_operator;
end;
$$;

revoke all on function public.admin_set_user_role(uuid, text, text) from public;
grant execute on function public.admin_set_user_role(uuid, text, text) to authenticated;

-- ========== Données démo ==========

insert into public.trips (id, departure_city, destination_city, date, time, sort_key, price, available_seats, operator, duration, booked_seats)
values
  ('demo_dkr_thies_matin', 'Dakar', 'Thiès', '2026-03-22', '08:00', '2026-03-22T08:00', 2500, 14, 'Teranga Bus', '1 h', '{}'),
  ('demo_dkr_thies_soir', 'Dakar', 'Thiès', '2026-03-22', '17:30', '2026-03-22T17:30', 2800, 10, 'DemGaw Express', '1 h', '{}'),
  ('demo_dkr_saintlouis', 'Dakar', 'Saint-Louis', '2026-03-23', '07:00', '2026-03-23T07:00', 8500, 6, 'Ndiaga Ndiaye', '4 h 30', '{}'),
  ('demo_dkr_kaolack', 'Dakar', 'Kaolack', '2026-03-23', '09:30', '2026-03-23T09:30', 6200, 9, 'DemGaw Express', '3 h', '{}'),
  ('demo_thies_dakar', 'Thiès', 'Dakar', '2026-03-22', '18:15', '2026-03-22T18:15', 2500, 16, 'Teranga Bus', '1 h', '{}'),
  ('demo_saintlouis_dakar', 'Saint-Louis', 'Dakar', '2026-03-24', '06:00', '2026-03-24T06:00', 8000, 5, 'Ndiaga Ndiaye', '4 h 30', '{}'),
  ('demo_kaolack_dakar', 'Kaolack', 'Dakar', '2026-03-24', '10:00', '2026-03-24T10:00', 6000, 11, 'DemGaw Express', '3 h', '{}'),
  ('demo_thies_kaolack', 'Thiès', 'Kaolack', '2026-03-25', '11:00', '2026-03-25T11:00', 4500, 8, 'Alhamdoulillah', '2 h 15', '{}')
on conflict (id) do update set
  departure_city = excluded.departure_city,
  destination_city = excluded.destination_city,
  date = excluded.date,
  time = excluded.time,
  sort_key = excluded.sort_key,
  price = excluded.price,
  available_seats = excluded.available_seats,
  operator = excluded.operator,
  duration = excluded.duration,
  booked_seats = excluded.booked_seats;

-- Temps réel : Database → Publications → supabase_realtime → ajoutez la table `trips`.

-- ========== Référentiel Sénégal : régions + gares routières ==========

create table if not exists public.regions (
  id bigserial primary key,
  code smallint not null unique check (code between 1 and 14),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.bus_stations (
  id bigserial primary key,
  region_id bigint not null references public.regions(id) on delete cascade,
  name text not null,
  slug text not null unique,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  unique (region_id, name)
);

create index if not exists bus_stations_region_id_idx
  on public.bus_stations(region_id);

alter table public.regions enable row level security;
alter table public.bus_stations enable row level security;

drop policy if exists "regions_select_all" on public.regions;
create policy "regions_select_all"
  on public.regions for select
  using (true);

drop policy if exists "bus_stations_select_all" on public.bus_stations;
create policy "bus_stations_select_all"
  on public.bus_stations for select
  using (true);

insert into public.regions (code, name, slug)
values
  (1, 'Dakar', 'dakar'),
  (2, 'Thiès', 'thies'),
  (3, 'Diourbel', 'diourbel'),
  (4, 'Louga', 'louga'),
  (5, 'Kaolack', 'kaolack'),
  (6, 'Kaffrine', 'kaffrine'),
  (7, 'Fatick', 'fatick'),
  (8, 'Ziguinchor', 'ziguinchor'),
  (9, 'Kolda', 'kolda'),
  (10, 'Sédhiou', 'sedhiou'),
  (11, 'Tambacounda', 'tambacounda'),
  (12, 'Kédougou', 'kedougou'),
  (13, 'Saint-Louis', 'saint-louis'),
  (14, 'Matam', 'matam')
on conflict (code) do update set
  name = excluded.name,
  slug = excluded.slug;

insert into public.bus_stations (region_id, name, slug, is_primary)
select r.id, s.name, s.slug, true
from (
  values
  ('Dakar', 'Gare Routière de Pompiers (Dakar Plateau)', 'dakar-pompiers'),
  ('Dakar', 'Gare Routière de Petersen', 'dakar-petersen'),
  ('Dakar', 'Gare Routière de Colobane', 'dakar-colobane'),
  ('Dakar', 'Gare Routière de Parcelles Assainies', 'dakar-parcelles-assainies'),
  ('Dakar', 'Gare Routière de Liberté 6', 'dakar-liberte-6'),
  ('Dakar', 'Gare Routière de Yoff / Aéroport', 'dakar-yoff-aeroport'),
  ('Dakar', 'Gare Routière de Pikine', 'dakar-pikine'),
  ('Dakar', 'Gare Routière de Guédiawaye', 'dakar-guediawaye'),
  ('Dakar', 'Gare Routière de Rufisque', 'dakar-rufisque'),
  ('Dakar', 'Gare de Thiaroye', 'dakar-thiaroye'),
  ('Dakar', 'Gare de Bargny', 'dakar-bargny'),
  ('Thiès', 'Gare Routière de Thiès (principale)', 'thies-principale'),
  ('Thiès', 'Gare Routière de Mbour', 'thies-mbour'),
  ('Thiès', 'Gare Routière de Tivaouane', 'thies-tivaouane'),
  ('Thiès', 'Gare Routière de Khombole', 'thies-khombole'),
  ('Thiès', 'Gare de Pout', 'thies-pout'),
  ('Thiès', 'Gare de Joal-Fadiouth', 'thies-joal-fadiouth'),
  ('Diourbel', 'Gare Routière de Diourbel', 'diourbel-principale'),
  ('Diourbel', 'Gare Routière de Touba', 'diourbel-touba'),
  ('Diourbel', 'Gare Routière de Mbacké', 'diourbel-mbacke'),
  ('Diourbel', 'Gare de Bambey', 'diourbel-bambey'),
  ('Louga', 'Gare Routière de Louga', 'louga-principale'),
  ('Louga', 'Gare Routière de Linguère', 'louga-linguere'),
  ('Louga', 'Gare de Kébémer', 'louga-kebemer'),
  ('Louga', 'Gare de Dahra', 'louga-dahra'),
  ('Kaolack', 'Gare Routière de Kaolack (Léoné)', 'kaolack-leone'),
  ('Kaolack', 'Gare Routière de Nioro du Rip', 'kaolack-nioro-du-rip'),
  ('Kaolack', 'Gare de Guinguinéo', 'kaolack-guinguineo'),
  ('Kaolack', 'Gare de Kaffrine', 'kaolack-kaffrine'),
  ('Kaffrine', 'Gare Routière de Kaffrine', 'kaffrine-principale'),
  ('Kaffrine', 'Gare de Koungheul', 'kaffrine-koungheul'),
  ('Kaffrine', 'Gare de Birkelane', 'kaffrine-birkelane'),
  ('Kaffrine', 'Gare de Malem-Hodar', 'kaffrine-malem-hodar'),
  ('Fatick', 'Gare Routière de Fatick', 'fatick-principale'),
  ('Fatick', 'Gare Routière de Foundiougne', 'fatick-foundiougne'),
  ('Fatick', 'Gare de Gossas', 'fatick-gossas'),
  ('Fatick', 'Gare de Sokone', 'fatick-sokone'),
  ('Ziguinchor', 'Gare Routière de Ziguinchor', 'ziguinchor-principale'),
  ('Ziguinchor', 'Gare de Bignona', 'ziguinchor-bignona'),
  ('Ziguinchor', 'Gare d''Oussouye', 'ziguinchor-oussouye'),
  ('Ziguinchor', 'Gare de Kafountine', 'ziguinchor-kafountine'),
  ('Kolda', 'Gare Routière de Kolda', 'kolda-principale'),
  ('Kolda', 'Gare de Vélingara', 'kolda-velingara'),
  ('Kolda', 'Gare de Médina Yoro Foulah', 'kolda-medina-yoro-foulah'),
  ('Sédhiou', 'Gare Routière de Sédhiou', 'sedhiou-principale'),
  ('Sédhiou', 'Gare de Goudomp', 'sedhiou-goudomp'),
  ('Sédhiou', 'Gare de Marsassoum', 'sedhiou-marsassoum'),
  ('Tambacounda', 'Gare Routière de Tambacounda', 'tambacounda-principale'),
  ('Tambacounda', 'Gare de Bakel', 'tambacounda-bakel'),
  ('Tambacounda', 'Gare de Goudiry', 'tambacounda-goudiry'),
  ('Tambacounda', 'Gare de Koumpentoum', 'tambacounda-koumpentoum'),
  ('Kédougou', 'Gare Routière de Kédougou', 'kedougou-principale'),
  ('Kédougou', 'Gare de Saraya', 'kedougou-saraya'),
  ('Kédougou', 'Gare de Salémata', 'kedougou-salemata'),
  ('Saint-Louis', 'Gare Routière de Saint-Louis', 'saint-louis-principale'),
  ('Saint-Louis', 'Gare de Podor', 'saint-louis-podor'),
  ('Saint-Louis', 'Gare de Richard-Toll', 'saint-louis-richard-toll'),
  ('Saint-Louis', 'Gare de Dagana', 'saint-louis-dagana'),
  ('Saint-Louis', 'Gare de Rosso-Sénégal', 'saint-louis-rosso-senegal'),
  ('Matam', 'Gare Routière de Matam', 'matam-principale'),
  ('Matam', 'Gare de Kanel', 'matam-kanel'),
  ('Matam', 'Gare de Ranérou', 'matam-ranerou'),
  ('Matam', 'Gare d''Ourossogui', 'matam-ourossogui')
) as s(region_name, name, slug)
join public.regions r on r.name = s.region_name
on conflict (region_id, name) do update set
  slug = excluded.slug,
  is_primary = excluded.is_primary;
