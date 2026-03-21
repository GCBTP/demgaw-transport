-- =============================================================================
-- Détails billet "réel" + population depuis les trajets
-- =============================================================================
-- Ajoute :
--  - departure_station_name / arrival_station_name
--  - operator_phone
--  - bus_number (optionnel)
--
-- Et met à jour la fonction create_booking pour copier ces champs dans bookings.
-- =============================================================================

-- Colonnes côté trajets
alter table public.trips
  add column if not exists departure_station_name text not null default '',
  add column if not exists arrival_station_name text not null default '',
  add column if not exists operator_phone text not null default '',
  add column if not exists bus_number text null default null;

-- Colonnes côté réservations
alter table public.bookings
  add column if not exists departure_station_name text not null default '',
  add column if not exists arrival_station_name text not null default '',
  add column if not exists operator_phone text not null default '',
  add column if not exists bus_number text null default null;

-- Remplissage des données démo (idempotent)
update public.trips
set departure_station_name = case
  when departure_city = 'Dakar' then 'Dakar - Gare Centrale'
  when departure_city = 'Thiès' then 'Thiès - Gare Routière'
  when departure_city = 'Saint-Louis' then 'Saint-Louis - Gare Routière'
  when departure_city = 'Kaolack' then 'Kaolack - Gare Routière'
  else departure_city
end,
arrival_station_name = case
  when destination_city = 'Dakar' then 'Dakar - Gare Centrale'
  when destination_city = 'Thiès' then 'Thiès - Gare Routière'
  when destination_city = 'Saint-Louis' then 'Saint-Louis - Gare Routière'
  when destination_city = 'Kaolack' then 'Kaolack - Gare Routière'
  else destination_city
end
where departure_station_name = '' or arrival_station_name = '';

update public.trips
set operator_phone = case operator
  when 'Teranga Bus' then '77 123 45 67'
  when 'DemGaw Express' then '76 111 22 33'
  when 'Ndiaga Ndiaye' then '78 987 65 43'
  when 'Alhamdoulillah' then '70 222 33 44'
  else operator_phone
end
where operator_phone = '';

update public.trips
set bus_number = case id
  when 'demo_dkr_thies_matin' then 'BUS-DKR-01'
  when 'demo_dkr_thies_soir' then 'BUS-DKR-02'
  when 'demo_dkr_saintlouis' then 'BUS-DKR-03'
  when 'demo_dkr_kaolack' then 'BUS-DKR-04'
  when 'demo_thies_dakar' then 'BUS-THIES-01'
  when 'demo_saintlouis_dakar' then 'BUS-SL-01'
  when 'demo_kaolack_dakar' then 'BUS-KLC-01'
  when 'demo_thies_kaolack' then 'BUS-THIES-02'
  else bus_number
end
where bus_number is null;

-- Mettre à jour create_booking pour copier les détails
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
    departure_city, destination_city,
    departure_station_name, arrival_station_name,
    operator_phone, bus_number,
    date, time, price, operator
  )
  values (
    v_user, p_trip_id, p_seat_number, 'pending_payment',
    t.departure_city, t.destination_city,
    coalesce(t.departure_station_name, ''),
    coalesce(t.arrival_station_name, ''),
    coalesce(t.operator_phone, ''),
    t.bus_number,
    t.date, t.time, t.price, coalesce(t.operator, '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

