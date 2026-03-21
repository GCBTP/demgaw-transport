-- =============================================================================
-- Backfill trips: region names -> "Gare - Region" labels
-- =============================================================================
-- Purpose:
-- - Normalize old trips where departure_city / destination_city only contain
--   a region name (e.g. "Dakar") into a station label (e.g.
--   "Gare Routiere de Pompiers (Dakar Plateau) - Dakar").
-- - Keep already normalized values unchanged.
-- =============================================================================

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
)
update public.trips t
set departure_city = rs.station_label
from region_station rs
where lower(
  trim(
    translate(
      t.departure_city,
      'àáâäãåèéêëìíîïòóôöõùúûüýÿçñ',
      'aaaaaaeeeeiiiiooooouuuuyycn'
    )
  )
) = rs.region_key;

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
)
update public.trips t
set destination_city = rs.station_label
from region_station rs
where lower(
  trim(
    translate(
      t.destination_city,
      'àáâäãåèéêëìíîïòóôöõùúûüýÿçñ',
      'aaaaaaeeeeiiiiooooouuuuyycn'
    )
  )
) = rs.region_key;
