-- =============================================================================
-- Admin RPC stabilization pack (prod safe)
-- =============================================================================
-- Objectif:
-- - Aligner admin_list_users avec le front (profile_role + driver_operator)
-- - Garder une seule signature pour admin_set_user_role
-- - Revalider admin_list_bookings (id ambigu + digest explicite)
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) Nettoyage des anciennes signatures
-- ---------------------------------------------------------------------------
drop function if exists public.admin_list_users();
drop function if exists public.admin_set_user_role(uuid, text);
drop function if exists public.admin_set_user_role(uuid, text, text);

-- ---------------------------------------------------------------------------
-- 2) admin_list_users (format attendu par le front)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 3) admin_set_user_role (signature unique + support driver)
-- ---------------------------------------------------------------------------
create function public.admin_set_user_role(
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

-- ---------------------------------------------------------------------------
-- 4) admin_list_bookings hotfix (id ambigu + digest explicite)
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

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

revoke all on function public.admin_list_bookings() from public;
grant execute on function public.admin_list_bookings() to authenticated;

commit;
