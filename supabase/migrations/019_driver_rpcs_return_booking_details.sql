-- =============================================================================
-- Fix driver RPCs: return full booking details + add driver_validate_ticket_by_ref
-- =============================================================================

-- 1. driver_validate_and_use_ticket_qr_payload — return booking details on success
create or replace function public.driver_validate_and_use_ticket_qr_payload(
  p_booking_id uuid,
  p_user_id uuid,
  p_timestamp bigint,
  p_signature text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_secret text;
  v_msg text;
  v_expected text;
  v_booking record;
  v_ts timestamptz;
  v_driver_operator text;
  v_used_at timestamptz;
begin
  if not public.is_driver() then
    return jsonb_build_object('valid', false, 'reason', 'NOT_AUTHORIZED');
  end if;

  select trim(both from p.driver_operator) into v_driver_operator
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'driver'
  limit 1;

  if v_driver_operator is null or length(v_driver_operator) = 0 then
    return jsonb_build_object('valid', false, 'reason', 'DRIVER_OPERATOR_NOT_SET');
  end if;

  select secret into v_secret
  from public.ticket_qr_secrets
  where id = 1;

  if v_secret is null or length(v_secret) < 10 then
    return jsonb_build_object('valid', false, 'reason', 'TICKET_QR_SECRET_NOT_SET');
  end if;

  v_msg := p_booking_id::text || '|' || p_user_id::text || '|' || p_timestamp::text;
  v_expected := encode(digest(v_msg || '|' || v_secret, 'sha256'), 'hex');

  if v_expected <> p_signature then
    return jsonb_build_object('valid', false, 'reason', 'BAD_SIGNATURE');
  end if;

  v_ts := to_timestamp(p_timestamp);
  if now() < v_ts - interval '1 hour' then
    return jsonb_build_object('valid', false, 'reason', 'TIMESTAMP_NOT_IN_RANGE');
  end if;
  if now() > v_ts + interval '24 hours' then
    return jsonb_build_object('valid', false, 'reason', 'EXPIRED');
  end if;

  select id, user_id, status, used_at, operator,
         departure_city, destination_city, "date", "time", seat_number
  into v_booking
  from public.bookings
  where id = p_booking_id
    and user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('valid', false, 'reason', 'BOOKING_NOT_FOUND');
  end if;

  if lower(trim(both from coalesce(v_booking.operator, ''))) <> lower(trim(both from v_driver_operator)) then
    return jsonb_build_object('valid', false, 'reason', 'NOT_AUTHORIZED');
  end if;

  if v_booking.status = 'used' then
    return jsonb_build_object(
      'valid', false,
      'reason', 'ALREADY_USED',
      'used_at', v_booking.used_at
    );
  end if;

  if v_booking.status <> 'paid' then
    return jsonb_build_object('valid', false, 'reason', 'NOT_PAID');
  end if;

  update public.bookings
  set status = 'used', used_at = now()
  where id = p_booking_id
    and user_id = p_user_id
  returning used_at into v_used_at;

  return jsonb_build_object(
    'valid', true,
    'status', 'used',
    'used_at', v_used_at,
    'booking_id', p_booking_id,
    'departure_city', v_booking.departure_city,
    'destination_city', v_booking.destination_city,
    'seat_number', v_booking.seat_number,
    'date', v_booking."date",
    'time', v_booking."time"
  );
end;
$$;

revoke all on function public.driver_validate_and_use_ticket_qr_payload(uuid, uuid, bigint, text) from public;
grant execute on function public.driver_validate_and_use_ticket_qr_payload(uuid, uuid, bigint, text) to authenticated;


-- 2. driver_validate_ticket_by_booking_id — return booking details on success
create or replace function public.driver_validate_ticket_by_booking_id(
  p_booking_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_driver_operator text;
  v_booking record;
  v_ts timestamptz := now();
  v_used_at timestamptz;
begin
  if not public.is_driver() then
    return jsonb_build_object('valid', false, 'reason', 'NOT_AUTHORIZED');
  end if;

  select trim(both from driver_operator) into v_driver_operator
  from public.profiles
  where id = auth.uid()
    and role = 'driver'
  limit 1;

  if v_driver_operator is null or length(v_driver_operator) = 0 then
    return jsonb_build_object('valid', false, 'reason', 'DRIVER_OPERATOR_NOT_SET');
  end if;

  select id, user_id, status, used_at, operator,
         departure_city, destination_city, "date", "time", seat_number
  into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    return jsonb_build_object('valid', false, 'reason', 'BOOKING_NOT_FOUND');
  end if;

  if lower(trim(both from coalesce(v_booking.operator, ''))) <>
     lower(trim(both from v_driver_operator)) then
    return jsonb_build_object('valid', false, 'reason', 'NOT_AUTHORIZED');
  end if;

  if v_booking.status = 'used' then
    return jsonb_build_object(
      'valid', false,
      'reason', 'ALREADY_USED',
      'used_at', v_booking.used_at
    );
  end if;

  if v_booking.status <> 'paid' then
    return jsonb_build_object('valid', false, 'reason', 'NOT_PAID');
  end if;

  update public.bookings
  set status = 'used', used_at = v_ts
  where id = p_booking_id
    and user_id = v_booking.user_id
    and status = 'paid'
  returning used_at into v_used_at;

  return jsonb_build_object(
    'valid', true,
    'status', 'used',
    'used_at', coalesce(v_used_at, v_ts),
    'booking_id', p_booking_id,
    'departure_city', v_booking.departure_city,
    'destination_city', v_booking.destination_city,
    'seat_number', v_booking.seat_number,
    'date', v_booking."date",
    'time', v_booking."time"
  );
end;
$$;

revoke all on function public.driver_validate_ticket_by_booking_id(uuid) from public;
grant execute on function public.driver_validate_ticket_by_booking_id(uuid) to authenticated;


-- 3. driver_validate_ticket_by_ref — lookup by short ref (8 chars) OR full UUID
create or replace function public.driver_validate_ticket_by_ref(
  p_ref text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_driver_operator text;
  v_booking record;
  v_ts timestamptz := now();
  v_used_at timestamptz;
  v_clean text;
  v_booking_id uuid;
begin
  if not public.is_driver() then
    return jsonb_build_object('valid', false, 'reason', 'NOT_AUTHORIZED');
  end if;

  select trim(both from driver_operator) into v_driver_operator
  from public.profiles
  where id = auth.uid()
    and role = 'driver'
  limit 1;

  if v_driver_operator is null or length(v_driver_operator) = 0 then
    return jsonb_build_object('valid', false, 'reason', 'DRIVER_OPERATOR_NOT_SET');
  end if;

  v_clean := upper(trim(both from coalesce(p_ref, '')));

  if v_clean = '' then
    return jsonb_build_object('valid', false, 'reason', 'BOOKING_NOT_FOUND');
  end if;

  -- Try full UUID first
  begin
    v_booking_id := v_clean::uuid;
  exception when others then
    v_booking_id := null;
  end;

  if v_booking_id is not null then
    select id, user_id, status, used_at, operator,
           departure_city, destination_city, "date", "time", seat_number
    into v_booking
    from public.bookings
    where id = v_booking_id
    for update;
  else
    -- Short ref: first 8 chars of UUID (without dashes), case-insensitive
    select id, user_id, status, used_at, operator,
           departure_city, destination_city, "date", "time", seat_number
    into v_booking
    from public.bookings
    where upper(replace(id::text, '-', '')) like (v_clean || '%')
    order by created_at desc
    limit 1
    for update;
  end if;

  if not found then
    return jsonb_build_object('valid', false, 'reason', 'BOOKING_NOT_FOUND');
  end if;

  if lower(trim(both from coalesce(v_booking.operator, ''))) <>
     lower(trim(both from v_driver_operator)) then
    return jsonb_build_object('valid', false, 'reason', 'NOT_AUTHORIZED');
  end if;

  if v_booking.status = 'used' then
    return jsonb_build_object(
      'valid', false,
      'reason', 'ALREADY_USED',
      'used_at', v_booking.used_at,
      'booking_id', v_booking.id
    );
  end if;

  if v_booking.status <> 'paid' then
    return jsonb_build_object('valid', false, 'reason', 'NOT_PAID');
  end if;

  update public.bookings
  set status = 'used', used_at = v_ts
  where id = v_booking.id
    and user_id = v_booking.user_id
    and status = 'paid'
  returning used_at into v_used_at;

  return jsonb_build_object(
    'valid', true,
    'status', 'used',
    'used_at', coalesce(v_used_at, v_ts),
    'booking_id', v_booking.id,
    'departure_city', v_booking.departure_city,
    'destination_city', v_booking.destination_city,
    'seat_number', v_booking.seat_number,
    'date', v_booking."date",
    'time', v_booking."time"
  );
end;
$$;

revoke all on function public.driver_validate_ticket_by_ref(text) from public;
grant execute on function public.driver_validate_ticket_by_ref(text) to authenticated;

-- notify PostgREST to reload schema
notify pgrst, 'reload schema';
