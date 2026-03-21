-- =============================================================================
-- Payload QR stocké sur la ligne `bookings` (évite l’appel REST /rpc/create_ticket_qr_payload)
-- =============================================================================
-- Prérequis : migrations 005 (ticket_qr_secrets, pgcrypto).
-- Au passage en `paid`, `pay_booking` calcule la même signature que create_ticket_qr_payload
-- et remplit `bookings.qr_payload`. Le client lit la colonne via select classique.
-- =============================================================================

alter table public.bookings
  add column if not exists qr_payload jsonb null;

create or replace function public.pay_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
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

revoke all on function public.pay_booking(uuid) from public;
grant execute on function public.pay_booking(uuid) to authenticated;

-- Billets déjà payés avant cette migration
do $$
declare
  r record;
  v_secret text;
  v_ts bigint;
  v_msg text;
  v_sig text;
  v_payload jsonb;
begin
  select secret into v_secret from public.ticket_qr_secrets where id = 1;
  if v_secret is null or length(v_secret) < 10 then
    raise notice 'booking qr backfill skipped: TICKET_QR_SECRET not set';
    return;
  end if;

  for r in
    select id, user_id from public.bookings
    where status = 'paid' and qr_payload is null
  loop
    v_ts := extract(epoch from clock_timestamp())::bigint;
    v_msg := r.id::text || '|' || r.user_id::text || '|' || v_ts::text;
    v_sig := encode(digest(v_msg || '|' || v_secret, 'sha256'), 'hex');
    v_payload := jsonb_build_object(
      'booking_id', r.id,
      'user_id', r.user_id,
      'timestamp', v_ts,
      'signature', v_sig
    );
    update public.bookings set qr_payload = v_payload where id = r.id;
  end loop;
end $$;
