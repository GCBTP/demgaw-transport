import { supabase } from './client'

function translateRpcError(message) {
  if (!message) return 'Réservation impossible.'
  const m = String(message)
  if (m.includes('NO_SEATS')) return 'Plus de places disponibles sur ce trajet.'
  if (m.includes('SEAT_TAKEN')) return 'Ce siège est déjà réservé.'
  if (m.includes('TRIP_NOT_FOUND')) return 'Trajet introuvable.'
  if (m.includes('NOT_AUTHENTICATED')) return 'Vous devez être connecté.'
  return m
}

export function mapBookingRow(row) {
  if (!row) return null
  const created = row.created_at ? new Date(row.created_at) : null
  return {
    id: row.id,
    userId: row.user_id ?? '',
    tripId: row.trip_id ?? '',
    seatNumber: row.seat_number ?? '',
    status: row.status ?? '',
    createdAt: created,
    departureCity: row.departure_city ?? '',
    destinationCity: row.destination_city ?? '',
    departureStationName: row.departure_station_name ?? row.departure_city ?? '',
    arrivalStationName: row.arrival_station_name ?? row.destination_city ?? '',
    date: row.date ?? '',
    time: row.time ?? '',
    price: typeof row.price === 'number' ? row.price : 0,
    operator: row.operator ?? '',
    operatorPhone: row.operator_phone ?? '',
    busNumber: row.bus_number ?? null,
    qrPayload: row.qr_payload ?? null,
  }
}

/**
 * @returns {Promise<string>} UUID de la réservation
 */
export async function createBooking(userId, tripId, seatNumber) {
  void userId
  const { data, error } = await supabase.rpc('create_booking', {
    p_trip_id: tripId,
    p_seat_number: seatNumber,
  })
  if (error) throw new Error(translateRpcError(error.message))
  if (!data) throw new Error('Réservation impossible.')
  return String(data)
}

export async function getBookingById(bookingId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapBookingRow(data) : null
}

export async function fetchBookingsForUser(userId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapBookingRow)
}

function translatePayError(message) {
  if (!message) return 'Paiement impossible.'
  const m = String(message)
  if (m.includes('admin_pay_booking') && m.includes('Could not find the function')) {
    return 'RPC admin manquante. Exécutez les migrations Supabase (incluant 014_admin_rpc_backfill.sql).'
  }
  if (m.includes('BOOKING_NOT_PAYABLE')) {
    return 'Ce billet ne peut pas être payé (déjà payé ou indisponible).'
  }
  if (m.includes('NOT_AUTHORIZED')) {
    return 'Accès refusé : rôle administrateur requis.'
  }
  if (m.includes('NOT_AUTHENTICATED')) return 'Vous devez être connecté.'
  return m
}

function translateAdminListError(message) {
  if (!message) return 'Chargement des reservations impossible.'
  const m = String(message)
  if (m.includes('admin_list_bookings') && m.includes('Could not find the function')) {
    return 'RPC admin_list_bookings manquante. Executez les migrations Supabase (008_admin_tools.sql puis 016_fix_admin_list_bookings_ambiguous_id.sql).'
  }
  return m
}

/** Simulation de paiement : passe le statut à `paid` côté base (RPC). */
export async function payBooking(bookingId) {
  const { error } = await supabase.rpc('pay_booking', {
    p_booking_id: bookingId,
  })
  if (error) throw new Error(translatePayError(error.message))
}

/**
 * MVP admin : liste toutes les réservations (sécurisé par RPC).
 * @returns {Promise<ReturnType<typeof mapBookingRow>[]>}
 */
export async function adminListBookings() {
  const { data, error } = await supabase.rpc('admin_list_bookings')
  if (error) throw new Error(translateAdminListError(error.message))
  return (data ?? []).map(mapBookingRow).filter(Boolean)
}

/**
 * MVP admin : marque une réservation comme payée.
 * @param {string} bookingId
 */
export async function adminPayBooking(bookingId) {
  const { error } = await supabase.rpc('admin_pay_booking', {
    p_booking_id: bookingId,
  })
  if (error) throw new Error(translatePayError(error.message))
}

/**
 * Realtime : notifie quand `bookings` change (emplacements used/paid/etc.)
 * @param {() => void} onChange
 * @param {(err: Error) => void} onError
 */
export function subscribeBookings(onChange, onError) {
  const channel = supabase
    .channel('demgaw-bookings')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bookings' },
      () => onChange(),
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        onError(new Error('Erreur canal temps réel — vérifiez publications sur `bookings`.'))
      }
    })

  return () => {
    supabase.removeChannel(channel)
  }
}
