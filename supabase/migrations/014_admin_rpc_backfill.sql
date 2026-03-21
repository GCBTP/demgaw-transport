-- =============================================================================
-- Backfill RPC admin (pour bases initialisées via all_in_one.sql)
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

revoke all on function public.admin_pay_booking(uuid) from public;
grant execute on function public.admin_pay_booking(uuid) to authenticated;
