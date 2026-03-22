-- Supprime le filtre opérateur du manifest : tout chauffeur voit tous les passagers

create or replace function public.driver_manifest_for_operator(
  p_trip_date text default null,
  p_search text default null
)
returns table(
  booking_id uuid,
  trip_id text,
  seat_number text,
  status text,
  departure_city text,
  destination_city text,
  trip_date text,
  trip_time text,
  operator text,
  price integer,
  created_at timestamptz,
  used_at timestamptz,
  user_id uuid,
  passenger_email text,
  passenger_name text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_search text;
begin
  if not public.is_driver() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  v_search := nullif(trim(both from coalesce(p_search, '')), '');

  return query
  select
    b.id,
    b.trip_id,
    b.seat_number,
    b.status,
    b.departure_city,
    b.destination_city,
    b.date as trip_date,
    b.time as trip_time,
    b.operator,
    b.price,
    b.created_at,
    b.used_at,
    b.user_id,
    u.email::text,
    coalesce(u.raw_user_meta_data->>'full_name', '')::text
  from public.bookings b
  inner join auth.users u on u.id = b.user_id
  where b.status in ('paid', 'used')
    and (p_trip_date is null or b.date = p_trip_date)
    and (
      v_search is null
      or b.id::text ilike '%' || v_search || '%'
      or u.email ilike '%' || v_search || '%'
      or coalesce(u.raw_user_meta_data->>'full_name', '') ilike '%' || v_search || '%'
    )
  order by b.date desc, b.time desc, b.created_at desc;
end;
$$;

revoke all on function public.driver_manifest_for_operator(text, text) from public;
grant execute on function public.driver_manifest_for_operator(text, text) to authenticated;

notify pgrst, 'reload schema';
