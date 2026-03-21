-- =============================================================================
-- Validation chauffeur manuelle par booking_id
-- =============================================================================
-- Objectif :
-- - anti-réutilisation (status => used, used_at)
-- - anti-faux opérateur (booking.operator doit correspondre au driver_operator)
-- - requiert rôle driver
-- =============================================================================

alter table public.bookings
  add column if not exists used_at timestamptz null;

create or replace function public.driver_validate_ticket_by_booking_id(
  p_booking_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_driver_operator text;
  v_booking record;
  v_ts timestamptz := now();
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

  select id, user_id, status, used_at, operator
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
  set
    status = 'used',
    used_at = v_ts
  where id = p_booking_id
    and user_id = v_booking.user_id
    and status = 'paid';

  return jsonb_build_object(
    'valid', true,
    'status', 'used',
    'used_at', v_ts,
    'booking_id', p_booking_id
  );
end;
$$;

revoke all on function public.driver_validate_ticket_by_booking_id(uuid) from public;
grant execute on function public.driver_validate_ticket_by_booking_id(uuid) to authenticated;

