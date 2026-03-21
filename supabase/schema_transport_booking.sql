-- =============================================================================
-- Schéma transport / réservations (nouveau modèle)
-- =============================================================================
-- Utilisateurs : Supabase Auth (`auth.users`) — pas de table `public.users`.
-- Exécuter sur une base vide ou après sauvegarde si vous remplacez un ancien schéma.
--
-- Tables : `trips`, `bookings`
-- =============================================================================

-- UUID pour gen_random_uuid()
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Trajets
-- -----------------------------------------------------------------------------
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  departure_city text not null,
  destination_city text not null,
  date date not null,
  time text not null,
  price numeric(14, 2) not null default 0
    check (price >= 0),
  available_seats integer not null default 0
    check (available_seats >= 0),
  created_at timestamptz not null default now()
);

comment on table public.trips is 'Catalogue de trajets interurbains.';
comment on column public.trips.date is 'Jour du départ (type date SQL).';
comment on column public.trips.time is 'Heure affichée (ex. 08:30).';

create index if not exists trips_date_idx on public.trips (date);
create index if not exists trips_departure_destination_idx
  on public.trips (departure_city, destination_city);

-- -----------------------------------------------------------------------------
-- Réservations
-- Relations :
--   bookings.user_id → auth.users (id)
--   bookings.trip_id → trips (id)
-- -----------------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    references auth.users (id) on delete cascade,
  trip_id uuid not null
    references public.trips (id) on delete restrict,
  seat_number integer not null
    check (seat_number >= 1),
  status text not null default 'pending'
    check (status in ('pending', 'paid')),
  created_at timestamptz not null default now(),
  constraint bookings_trip_seat_unique unique (trip_id, seat_number)
);

comment on table public.bookings is 'Réservations liées aux comptes Auth et aux trajets.';
comment on column public.bookings.status is 'pending | paid';

create index if not exists bookings_user_id_idx on public.bookings (user_id);
create index if not exists bookings_trip_id_idx on public.bookings (trip_id);
create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_created_at_idx on public.bookings (created_at desc);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.trips enable row level security;
alter table public.bookings enable row level security;

-- Trips : lecture publique (catalogue), écriture réservée aux utilisateurs connectés
drop policy if exists "trips_select_all" on public.trips;
create policy "trips_select_all"
  on public.trips for select
  using (true);

drop policy if exists "trips_insert_authenticated" on public.trips;
create policy "trips_insert_authenticated"
  on public.trips for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "trips_update_authenticated" on public.trips;
create policy "trips_update_authenticated"
  on public.trips for update
  using (auth.role() = 'authenticated');

-- Bookings : chaque utilisateur ne voit que ses lignes
drop policy if exists "bookings_select_own" on public.bookings;
create policy "bookings_select_own"
  on public.bookings for select
  using (auth.uid() = user_id);

-- Insert / update : à adapter selon votre logique (RPC recommandée pour réservation atomique)
drop policy if exists "bookings_insert_own" on public.bookings;
create policy "bookings_insert_own"
  on public.bookings for insert
  with check (auth.uid() = user_id);

drop policy if exists "bookings_update_own" on public.bookings;
create policy "bookings_update_own"
  on public.bookings for update
  using (auth.uid() = user_id);

-- Optionnel : pas de delete client direct (décommentez si besoin)
-- create policy "bookings_delete_own" on public.bookings for delete using (auth.uid() = user_id);
