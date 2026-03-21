-- =============================================================================
-- Référentiel Sénégal : régions + gares routières principales
-- =============================================================================

create table if not exists public.regions (
  id bigserial primary key,
  code smallint not null unique check (code between 1 and 14),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.bus_stations (
  id bigserial primary key,
  region_id bigint not null references public.regions(id) on delete cascade,
  name text not null,
  slug text not null unique,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  unique (region_id, name)
);

create index if not exists bus_stations_region_id_idx
  on public.bus_stations(region_id);

alter table public.regions enable row level security;
alter table public.bus_stations enable row level security;

drop policy if exists "regions_select_all" on public.regions;
create policy "regions_select_all"
  on public.regions for select
  using (true);

drop policy if exists "bus_stations_select_all" on public.bus_stations;
create policy "bus_stations_select_all"
  on public.bus_stations for select
  using (true);

insert into public.regions (code, name, slug)
values
  (1, 'Dakar', 'dakar'),
  (2, 'Thiès', 'thies'),
  (3, 'Diourbel', 'diourbel'),
  (4, 'Louga', 'louga'),
  (5, 'Kaolack', 'kaolack'),
  (6, 'Kaffrine', 'kaffrine'),
  (7, 'Fatick', 'fatick'),
  (8, 'Ziguinchor', 'ziguinchor'),
  (9, 'Kolda', 'kolda'),
  (10, 'Sédhiou', 'sedhiou'),
  (11, 'Tambacounda', 'tambacounda'),
  (12, 'Kédougou', 'kedougou'),
  (13, 'Saint-Louis', 'saint-louis'),
  (14, 'Matam', 'matam')
on conflict (code) do update
set
  name = excluded.name,
  slug = excluded.slug;

insert into public.bus_stations (region_id, name, slug, is_primary)
select r.id, s.name, s.slug, true
from (
  values
  ('Dakar', 'Gare Routière de Pompiers (Dakar Plateau)', 'dakar-pompiers'),
  ('Dakar', 'Gare Routière de Petersen', 'dakar-petersen'),
  ('Dakar', 'Gare Routière de Colobane', 'dakar-colobane'),
  ('Dakar', 'Gare Routière de Parcelles Assainies', 'dakar-parcelles-assainies'),
  ('Dakar', 'Gare Routière de Liberté 6', 'dakar-liberte-6'),
  ('Dakar', 'Gare Routière de Yoff / Aéroport', 'dakar-yoff-aeroport'),
  ('Dakar', 'Gare Routière de Pikine', 'dakar-pikine'),
  ('Dakar', 'Gare Routière de Guédiawaye', 'dakar-guediawaye'),
  ('Dakar', 'Gare Routière de Rufisque', 'dakar-rufisque'),
  ('Dakar', 'Gare de Thiaroye', 'dakar-thiaroye'),
  ('Dakar', 'Gare de Bargny', 'dakar-bargny'),
  ('Thiès', 'Gare Routière de Thiès (principale)', 'thies-principale'),
  ('Thiès', 'Gare Routière de Mbour', 'thies-mbour'),
  ('Thiès', 'Gare Routière de Tivaouane', 'thies-tivaouane'),
  ('Thiès', 'Gare Routière de Khombole', 'thies-khombole'),
  ('Thiès', 'Gare de Pout', 'thies-pout'),
  ('Thiès', 'Gare de Joal-Fadiouth', 'thies-joal-fadiouth'),
  ('Diourbel', 'Gare Routière de Diourbel', 'diourbel-principale'),
  ('Diourbel', 'Gare Routière de Touba', 'diourbel-touba'),
  ('Diourbel', 'Gare Routière de Mbacké', 'diourbel-mbacke'),
  ('Diourbel', 'Gare de Bambey', 'diourbel-bambey'),
  ('Louga', 'Gare Routière de Louga', 'louga-principale'),
  ('Louga', 'Gare Routière de Linguère', 'louga-linguere'),
  ('Louga', 'Gare de Kébémer', 'louga-kebemer'),
  ('Louga', 'Gare de Dahra', 'louga-dahra'),
  ('Kaolack', 'Gare Routière de Kaolack (Léoné)', 'kaolack-leone'),
  ('Kaolack', 'Gare Routière de Nioro du Rip', 'kaolack-nioro-du-rip'),
  ('Kaolack', 'Gare de Guinguinéo', 'kaolack-guinguineo'),
  ('Kaolack', 'Gare de Kaffrine', 'kaolack-kaffrine'),
  ('Kaffrine', 'Gare Routière de Kaffrine', 'kaffrine-principale'),
  ('Kaffrine', 'Gare de Koungheul', 'kaffrine-koungheul'),
  ('Kaffrine', 'Gare de Birkelane', 'kaffrine-birkelane'),
  ('Kaffrine', 'Gare de Malem-Hodar', 'kaffrine-malem-hodar'),
  ('Fatick', 'Gare Routière de Fatick', 'fatick-principale'),
  ('Fatick', 'Gare Routière de Foundiougne', 'fatick-foundiougne'),
  ('Fatick', 'Gare de Gossas', 'fatick-gossas'),
  ('Fatick', 'Gare de Sokone', 'fatick-sokone'),
  ('Ziguinchor', 'Gare Routière de Ziguinchor', 'ziguinchor-principale'),
  ('Ziguinchor', 'Gare de Bignona', 'ziguinchor-bignona'),
  ('Ziguinchor', 'Gare d''Oussouye', 'ziguinchor-oussouye'),
  ('Ziguinchor', 'Gare de Kafountine', 'ziguinchor-kafountine'),
  ('Kolda', 'Gare Routière de Kolda', 'kolda-principale'),
  ('Kolda', 'Gare de Vélingara', 'kolda-velingara'),
  ('Kolda', 'Gare de Médina Yoro Foulah', 'kolda-medina-yoro-foulah'),
  ('Sédhiou', 'Gare Routière de Sédhiou', 'sedhiou-principale'),
  ('Sédhiou', 'Gare de Goudomp', 'sedhiou-goudomp'),
  ('Sédhiou', 'Gare de Marsassoum', 'sedhiou-marsassoum'),
  ('Tambacounda', 'Gare Routière de Tambacounda', 'tambacounda-principale'),
  ('Tambacounda', 'Gare de Bakel', 'tambacounda-bakel'),
  ('Tambacounda', 'Gare de Goudiry', 'tambacounda-goudiry'),
  ('Tambacounda', 'Gare de Koumpentoum', 'tambacounda-koumpentoum'),
  ('Kédougou', 'Gare Routière de Kédougou', 'kedougou-principale'),
  ('Kédougou', 'Gare de Saraya', 'kedougou-saraya'),
  ('Kédougou', 'Gare de Salémata', 'kedougou-salemata'),
  ('Saint-Louis', 'Gare Routière de Saint-Louis', 'saint-louis-principale'),
  ('Saint-Louis', 'Gare de Podor', 'saint-louis-podor'),
  ('Saint-Louis', 'Gare de Richard-Toll', 'saint-louis-richard-toll'),
  ('Saint-Louis', 'Gare de Dagana', 'saint-louis-dagana'),
  ('Saint-Louis', 'Gare de Rosso-Sénégal', 'saint-louis-rosso-senegal'),
  ('Matam', 'Gare Routière de Matam', 'matam-principale'),
  ('Matam', 'Gare de Kanel', 'matam-kanel'),
  ('Matam', 'Gare de Ranérou', 'matam-ranerou'),
  ('Matam', 'Gare d''Ourossogui', 'matam-ourossogui')
) as s(region_name, name, slug)
join public.regions r
  on r.name = s.region_name
on conflict (region_id, name) do update
set
  slug = excluded.slug,
  is_primary = excluded.is_primary;
