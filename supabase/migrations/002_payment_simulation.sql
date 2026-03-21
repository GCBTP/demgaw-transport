-- Paiement simulé : réservation en attente de paiement, puis statut `paid` via RPC.

-- Nouvelles réservations : en attente de paiement
create or replace function public.create_booking(p_trip_id text, p_seat_number text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  t record;
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED';
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

-- Simulation : passage à payé (idempotent si déjà payé)
create or replace function public.pay_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_n int;
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  update public.bookings
  set status = 'paid'
  where id = p_booking_id
    and user_id = v_user
    and status in ('pending_payment', 'confirmed');

  get diagnostics v_n = row_count;
  if v_n > 0 then
    return;
  end if;

  if exists (
    select 1 from public.bookings
    where id = p_booking_id and user_id = v_user and status = 'paid'
  ) then
    return;
  end if;

  raise exception 'BOOKING_NOT_PAYABLE';
end;
$$;

revoke all on function public.pay_booking(uuid) from public;
grant execute on function public.pay_booking(uuid) to authenticated;
