import { supabase } from './client'
import { SAMPLE_TRIPS } from './sampleTrips'

export function mapTripRow(row) {
  if (!row) return null
  const booked = Array.isArray(row.booked_seats) ? row.booked_seats : []
  return {
    id: row.id,
    departureCity: row.departure_city ?? '',
    destinationCity: row.destination_city ?? '',
    date: row.date ?? '',
    time: row.time ?? '',
    price: typeof row.price === 'number' ? row.price : 0,
    availableSeats:
      typeof row.available_seats === 'number' ? row.available_seats : 0,
    operator: row.operator ?? '',
    duration: row.duration ?? '',
    sortKey: row.sort_key ?? `${row.date ?? ''}T${row.time ?? ''}`,
    bookedSeats: booked,
  }
}

export async function fetchTrips(options = {}) {
  let q = supabase.from('trips').select('*').order('sort_key', { ascending: true })
  if (options.limitCount && options.limitCount > 0) {
    q = q.limit(options.limitCount)
  }
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapTripRow)
}

export async function getTripById(tripId) {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapTripRow(data) : null
}

/**
 * @param {(trips: ReturnType<typeof mapTripRow>[]) => void} onNext
 * @param {(error: Error) => void} onError
 * @param {{ limitCount?: number }} [options]
 */
export function subscribeTrips(onNext, onError, options = {}) {
  async function pull() {
    try {
      const list = await fetchTrips(options)
      onNext(list)
    } catch (e) {
      onError(e instanceof Error ? e : new Error(String(e)))
    }
  }

  pull()

  const channel = supabase
    .channel('demgaw-trips')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'trips' },
      () => {
        pull()
      },
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        onError(new Error('Erreur canal temps réel — vérifiez la publication sur `trips`.'))
      }
    })

  return () => {
    supabase.removeChannel(channel)
  }
}

/** Upsert des trajets de démo (connexion requise par les politiques RLS). */
export async function seedSampleTrips() {
  const { error } = await supabase.from('trips').upsert(SAMPLE_TRIPS, {
    onConflict: 'id',
  })
  if (error) throw new Error(error.message)
}

/**
 * MVP admin : upsert un trajet (security via RPC côté Supabase).
 * @param {{
 *   id: string,
 *   departureCity: string,
 *   destinationCity: string,
 *   date: string,
 *   time: string,
 *   price: number,
 *   availableSeats: number,
 *   operator: string,
 *   duration: string
 * }} trip
 */
export async function adminUpsertTrip(trip) {
  const { error } = await supabase.rpc('admin_upsert_trip', {
    p_id: trip.id,
    p_departure_city: trip.departureCity,
    p_destination_city: trip.destinationCity,
    p_date: trip.date,
    p_time: trip.time,
    p_price: trip.price,
    p_available_seats: trip.availableSeats,
    p_operator: trip.operator ?? '',
    p_duration: trip.duration ?? '',
  })

  if (error) throw new Error(error.message)
}

/**
 * MVP admin : supprime un trajet.
 * @param {string} tripId
 */
export async function adminDeleteTrip(tripId) {
  const { error } = await supabase.rpc('admin_delete_trip', {
    p_trip_id: tripId,
  })
  if (error) throw new Error(error.message)
}
