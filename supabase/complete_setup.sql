-- À exécuter dans Supabase → SQL Editor → Run (corrige la RPC + remplit les trajets démo)
-- Idempotent : fonction en CREATE OR REPLACE, trajets en ON CONFLICT.

-- 1) Fonction de réservation atomique (si elle manquait, PostgREST renvoie 404 sur /rpc/create_booking)
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

revoke all on function public.create_booking(text, text) from public;
grant execute on function public.create_booking(text, text) to authenticated;

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

-- 2) Données démo (villes Dakar, Thiès, Saint-Louis, Kaolack, …)
insert into public.trips (id, departure_city, destination_city, date, time, sort_key, price, available_seats, operator, duration, booked_seats)
values
  ('demo_dkr_thies_matin', 'Dakar', 'Thiès', '2026-03-22', '08:00', '2026-03-22T08:00', 2500, 14, 'Teranga Bus', '1 h', '{}'),
  ('demo_dkr_thies_soir', 'Dakar', 'Thiès', '2026-03-22', '17:30', '2026-03-22T17:30', 2800, 10, 'DemGaw Express', '1 h', '{}'),
  ('demo_dkr_saintlouis', 'Dakar', 'Saint-Louis', '2026-03-23', '07:00', '2026-03-23T07:00', 8500, 6, 'Ndiaga Ndiaye', '4 h 30', '{}'),
  ('demo_dkr_kaolack', 'Dakar', 'Kaolack', '2026-03-23', '09:30', '2026-03-23T09:30', 6200, 9, 'DemGaw Express', '3 h', '{}'),
  ('demo_thies_dakar', 'Thiès', 'Dakar', '2026-03-22', '18:15', '2026-03-22T18:15', 2500, 16, 'Teranga Bus', '1 h', '{}'),
  ('demo_saintlouis_dakar', 'Saint-Louis', 'Dakar', '2026-03-24', '06:00', '2026-03-24T06:00', 8000, 5, 'Ndiaga Ndiaye', '4 h 30', '{}'),
  ('demo_kaolack_dakar', 'Kaolack', 'Dakar', '2026-03-24', '10:00', '2026-03-24T10:00', 6000, 11, 'DemGaw Express', '3 h', '{}'),
  ('demo_thies_kaolack', 'Thiès', 'Kaolack', '2026-03-25', '11:00', '2026-03-25T11:00', 4500, 8, 'Alhamdoulillah', '2 h 15', '{}')
on conflict (id) do update set
  departure_city = excluded.departure_city,
  destination_city = excluded.destination_city,
  date = excluded.date,
  time = excluded.time,
  sort_key = excluded.sort_key,
  price = excluded.price,
  available_seats = excluded.available_seats,
  operator = excluded.operator,
  duration = excluded.duration,
  booked_seats = excluded.booked_seats;

-- 3) Temps réel : dans le tableau Supabase → Database → Publications → supabase_realtime → ajoutez `trips`.
