-- =============================================================================
-- Sécurité QR billet : signature vérifiable côté Supabase
-- =============================================================================
-- Objectif :
--  - Le QR contient : booking_id | user_id | timestamp | signature
--  - La signature est un hash SHA256 basé sur un secret (côté serveur)
--  - Validation côté backend via RPC (par un poste opérateur / appli scanner)
--
-- Note sécurité (important) :
--  - Ce secret est stocké en base dans `public.ticket_qr_secrets`.
--  - Remplacez la valeur par un secret long et unique.
-- =============================================================================

create extension if not exists "pgcrypto";

-- Secret QR (à changer)
create table if not exists public.ticket_qr_secrets (
  id integer primary key default 1,
  secret text not null
);

insert into public.ticket_qr_secrets (id, secret)
values (1, 'CHANGE_ME_TICKET_QR_SECRET')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- RPC : créer le payload QR signé (côté client, pour afficher le billet)
-- Accessible aux utilisateurs authentifiés.
-- ---------------------------------------------------------------------------
create or replace function public.create_ticket_qr_payload(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_booking record;
  v_ts bigint;
  v_secret text;
  v_msg text;
  v_sig text;
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id;

  if not found then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  if v_booking.user_id <> v_user then
    raise exception 'FORBIDDEN';
  end if;

  -- On ne génère un QR valide que pour les billets payés.
  if v_booking.status <> 'paid' then
    raise exception 'TICKET_NOT_PAID';
  end if;

  select secret into v_secret
  from public.ticket_qr_secrets
  where id = 1;

  if v_secret is null or length(v_secret) < 10 then
    raise exception 'TICKET_QR_SECRET_NOT_SET';
  end if;

  v_ts := extract(epoch from now())::bigint;
  v_msg := v_booking.id::text || '|' || v_booking.user_id::text || '|' || v_ts::text;
  v_sig := encode(digest(v_msg || '|' || v_secret, 'sha256'), 'hex');

  return jsonb_build_object(
    'booking_id', v_booking.id,
    'user_id', v_booking.user_id,
    'timestamp', v_ts,
    'signature', v_sig
  );
end;
$$;

revoke all on function public.create_ticket_qr_payload(uuid) from public;
grant execute on function public.create_ticket_qr_payload(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC : valider un QR (côté scanner / backend)
-- Accessible publiquement (rôle `anon` typiquement).
-- ---------------------------------------------------------------------------
create or replace function public.validate_ticket_qr_payload(
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
begin
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

  -- Expiration (ex: 24h). Ajustez si besoin.
  v_ts := to_timestamp(p_timestamp);
  if now() < v_ts - interval '1 hour' then
    return jsonb_build_object('valid', false, 'reason', 'TIMESTAMP_NOT_IN_RANGE');
  end if;

  if now() > v_ts + interval '24 hours' then
    return jsonb_build_object('valid', false, 'reason', 'EXPIRED');
  end if;

  select id, user_id, status into v_booking
  from public.bookings
  where id = p_booking_id
    and user_id = p_user_id;

  if not found then
    return jsonb_build_object('valid', false, 'reason', 'BOOKING_NOT_FOUND');
  end if;

  if v_booking.status <> 'paid' then
    return jsonb_build_object('valid', false, 'reason', 'NOT_PAID');
  end if;

  return jsonb_build_object('valid', true);
end;
$$;

revoke all on function public.validate_ticket_qr_payload(uuid, uuid, bigint, text) from public;
grant execute on function public.validate_ticket_qr_payload(uuid, uuid, bigint, text) to anon;
grant execute on function public.validate_ticket_qr_payload(uuid, uuid, bigint, text) to authenticated;

