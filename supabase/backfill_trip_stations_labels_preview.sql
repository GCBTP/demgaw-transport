-- =============================================================================
-- DRY-RUN: preview rows impacted by 017_backfill_trip_stations_labels.sql
-- =============================================================================
-- Execute this file first to inspect changes safely.

with region_station(region_key, station_label) as (
  values
    ('dakar', 'Gare Routiere de Pompiers (Dakar Plateau) - Dakar'),
    ('thies', 'Gare Routiere de Thiès (principale) - Thiès'),
    ('diourbel', 'Gare Routiere de Diourbel - Diourbel'),
    ('louga', 'Gare Routiere de Louga - Louga'),
    ('kaolack', 'Gare Routiere de Kaolack (Leone) - Kaolack'),
    ('kaffrine', 'Gare Routiere de Kaffrine - Kaffrine'),
    ('fatick', 'Gare Routiere de Fatick - Fatick'),
    ('ziguinchor', 'Gare Routiere de Ziguinchor - Ziguinchor'),
    ('kolda', 'Gare Routiere de Kolda - Kolda'),
    ('sedhiou', 'Gare Routiere de Sedhiou - Sédhiou'),
    ('tambacounda', 'Gare Routiere de Tambacounda - Tambacounda'),
    ('kedougou', 'Gare Routiere de Kedougou - Kédougou'),
    ('saint-louis', 'Gare Routiere de Saint-Louis - Saint-Louis'),
    ('matam', 'Gare Routiere de Matam - Matam')
),
normalized as (
  select
    t.id,
    t.departure_city,
    t.destination_city,
    lower(trim(translate(t.departure_city, 'àáâäãåèéêëìíîïòóôöõùúûüýÿçñ', 'aaaaaaeeeeiiiiooooouuuuyycn'))) as dep_key,
    lower(trim(translate(t.destination_city, 'àáâäãåèéêëìíîïòóôöõùúûüýÿçñ', 'aaaaaaeeeeiiiiooooouuuuyycn'))) as dest_key
  from public.trips t
)
select
  n.id,
  n.departure_city as old_departure_city,
  rs_dep.station_label as new_departure_city,
  n.destination_city as old_destination_city,
  rs_dest.station_label as new_destination_city
from normalized n
left join region_station rs_dep on rs_dep.region_key = n.dep_key
left join region_station rs_dest on rs_dest.region_key = n.dest_key
where rs_dep.region_key is not null
   or rs_dest.region_key is not null
order by n.id;

-- Quick totals:
with region_station(region_key, station_label) as (
  values
    ('dakar', 'x'),
    ('thies', 'x'),
    ('diourbel', 'x'),
    ('louga', 'x'),
    ('kaolack', 'x'),
    ('kaffrine', 'x'),
    ('fatick', 'x'),
    ('ziguinchor', 'x'),
    ('kolda', 'x'),
    ('sedhiou', 'x'),
    ('tambacounda', 'x'),
    ('kedougou', 'x'),
    ('saint-louis', 'x'),
    ('matam', 'x')
)
select
  count(*) filter (
    where lower(trim(translate(t.departure_city, 'àáâäãåèéêëìíîïòóôöõùúûüýÿçñ', 'aaaaaaeeeeiiiiooooouuuuyycn')))
      in (select region_key from region_station)
  ) as departure_rows_to_update,
  count(*) filter (
    where lower(trim(translate(t.destination_city, 'àáâäãåèéêëìíîïòóôöõùúûüýÿçñ', 'aaaaaaeeeeiiiiooooouuuuyycn')))
      in (select region_key from region_station)
  ) as destination_rows_to_update
from public.trips t;
