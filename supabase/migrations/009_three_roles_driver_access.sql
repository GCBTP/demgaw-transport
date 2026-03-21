-- =============================================================================
-- Rôles : admin | client | driver
-- =============================================================================
-- - Chaque utilisateur a une ligne dans profiles (trigger existant → rôle client).
-- - Seul un admin peut attribuer le rôle driver (RPC admin_set_user_role + opérateur).
-- - Les drivers ne peuvent pas réserver ni payer (flux client) ; accès lecture
--   aux réservations dont bookings.operator correspond à profiles.driver_operator.
-- =============================================================================

alter table public.profiles
  add column if not exists driver_operator text null;

comment on column public.profiles.driver_operator is
  'Libellé opérateur (aligné sur trips/bookings.operator) ; obligatoire si role = driver.';

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'client', 'driver'));

alter table public.profiles drop constraint if exists profiles_driver_operator_ck;
alter table public.profiles
  add constraint profiles_driver_operator_ck check (
    role <> 'driver'
    or (driver_operator is not null and length(trim(driver_operator)) > 0)
  );

comment on table public.profiles is
  'Profil applicatif ; rôle admin | client | driver (driver_operator si driver).';

-- -----------------------------------------------------------------------------
-- Helpers rôle (pour RLS / app)
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

-- -----------------------------------------------------------------------------
-- Admin : attribution du rôle driver (opérateur requis)
-- -----------------------------------------------------------------------------
drop function if exists public.admin_set_user_role(uuid, text);

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

-- -----------------------------------------------------------------------------
-- Flux client : interdit aux drivers
-- -----------------------------------------------------------------------------
create or replace function public.create_booking(p_trip_id text, p_seat_number text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_role text;
  v_id uuid;
  t record;
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select p.role into v_role from public.profiles p where p.id = v_user limit 1;
  if coalesce(v_role, 'client') = 'driver' then
    raise exception 'NOT_AUTHORIZED';
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

create or replace function public.pay_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_role text;
  v_b record;
  v_secret text;
  v_ts bigint;
  v_msg text;
  v_sig text;
  v_payload jsonb;
  v_n int;
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select p.role into v_role from public.profiles p where p.id = v_user limit 1;
  if coalesce(v_role, 'client') = 'driver' then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select id, user_id, status into v_b
  from public.bookings
  where id = p_booking_id and user_id = v_user
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

  select secret into v_secret
  from public.ticket_qr_secrets
  where id = 1;

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
  where id = p_booking_id and user_id = v_user;

  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'BOOKING_NOT_PAYABLE';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS : drivers lisent les réservations de leur opérateur (dashboard chauffeur)
-- -----------------------------------------------------------------------------
drop policy if exists "bookings_select_driver_manifest" on public.bookings;
create policy "bookings_select_driver_manifest"
  on public.bookings for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'driver'
        and p.driver_operator is not null
        and length(trim(p.driver_operator)) > 0
        and lower(trim(both from p.driver_operator)) = lower(trim(both from bookings.operator))
    )
  );

-- -----------------------------------------------------------------------------
-- Liste admin : inclure driver_operator (gestion des chauffeurs)
-- -----------------------------------------------------------------------------
-- Impossible de changer le type de retour (OUT) avec CREATE OR REPLACE seul.
drop function if exists public.admin_list_users();

-- Éviter le nom de colonne « role » : en PL/pgSQL il devient une variable OUT et
-- entre en conflit avec p.role → erreur « structure of query does not match function result type ».
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
