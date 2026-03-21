-- =============================================================================
-- Hotfix: admin_list_bookings() "column reference id is ambiguous" (42702)
-- =============================================================================
-- Cause:
-- - The function returns TABLE(..., id uuid, ...), so `id` is also an OUT variable.
-- - In PL/pgSQL, `where id = 1` can become ambiguous between OUT variable `id`
--   and table column `ticket_qr_secrets.id`.
-- Fix:
-- - Qualify column with table alias (`tqs.id`).
-- - Use `extensions.digest(...)` explicitly so function resolution does not
--   depend on search_path.
-- =============================================================================

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

