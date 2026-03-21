-- Validation chauffeur : marquer le billet comme utilisé (anti-réutilisation)
alter table public.bookings
  add column if not exists used_at timestamptz null;

create or replace function public.driver_validate_and_use_ticket_qr_payload(
  p_booking_id uuid,
  p_user_id uuid,
  p_timestamp bigint,
  p_signature text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_secret text;
  v_msg text;
  v_expected text;
  v_booking record;
  v_ts timestamptz;
  v_driver_operator text;
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

  select id, user_id, status, used_at, operator, departure_city, destination_city, "date", "time", seat_number
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
  set
    status = 'used',
    used_at = now()
  where id = p_booking_id
    and user_id = p_user_id;

  return jsonb_build_object(
    'valid', true,
    'status', 'used',
    'used_at', (select b.used_at from public.bookings b where b.id = p_booking_id),
    'booking_id', p_booking_id
  );
end;
$$;

revoke all on function public.driver_validate_and_use_ticket_qr_payload(uuid, uuid, bigint, text) from public;
grant execute on function public.driver_validate_and_use_ticket_qr_payload(uuid, uuid, bigint, text) to authenticated;
