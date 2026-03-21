-- =============================================================================
-- Admin tools (MVP)
-- =============================================================================
-- Objectif :
--   - gérer les trajets (upsert + delete)
--   - lister toutes les réservations (admin)
--   - marquer une réservation comme payée (et générer qr_payload)
--   - lister / modifier les rôles des utilisateurs
--
-- Note :
--   - Ces fonctions sont `security definer` et vérifient `profiles.role`.
--   - Les opérations critiques passent par ces RPC pour éviter les écarts de RLS.
-- =============================================================================

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

-- -----------------------------------------------------------------------------
-- Paiement admin : marque une réservation comme payée + calcule qr_payload
-- -----------------------------------------------------------------------------
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
  v_sig := encode(extensions.digest(v_msg || '|' || v_secret, 'sha256'), 'hex');

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

-- -----------------------------------------------------------------------------
-- Lister les réservations (admin)
-- -----------------------------------------------------------------------------
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

  -- Qualifier tqs.id : sinon « id » est ambigu avec la colonne OUT id du RETURNS TABLE (42702).
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
            encode(extensions.digest(
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

-- -----------------------------------------------------------------------------
-- CRUD trajets (admin)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Gestion utilisateurs (admin)
-- -----------------------------------------------------------------------------
drop function if exists public.admin_list_users();

create or replace function public.admin_list_users()
returns table(
  id uuid,
  email text,
  role text
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
    u.email,
    coalesce(p.role, 'client') as role
  from auth.users u
  left join public.profiles p on p.id = u.id
  order by u.created_at desc;
end;
$$;

create or replace function public.admin_set_user_role(
  p_user_id uuid,
  p_role text
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

  if p_role not in ('admin', 'client') then
    raise exception 'INVALID_ROLE';
  end if;

  insert into public.profiles (id, role)
  values (p_user_id, p_role)
  on conflict (id) do update
  set role = excluded.role;
end;
$$;

-- -----------------------------------------------------------------------------
-- Grants (RPC uniquement)
-- -----------------------------------------------------------------------------
revoke all on function public.admin_pay_booking(uuid) from public;
grant execute on function public.admin_pay_booking(uuid) to authenticated;

revoke all on function public.admin_list_bookings() from public;
grant execute on function public.admin_list_bookings() to authenticated;

revoke all on function public.admin_upsert_trip(
  text, text, text, text, text, integer, integer, text, text
) from public;
grant execute on function public.admin_upsert_trip(
  text, text, text, text, text, integer, integer, text, text
) to authenticated;

revoke all on function public.admin_delete_trip(text) from public;
grant execute on function public.admin_delete_trip(text) to authenticated;

revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;

revoke all on function public.admin_set_user_role(uuid, text) from public;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

