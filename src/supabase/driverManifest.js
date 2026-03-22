import { supabase } from './client'

/**
 * @param {{ tripDate?: string | null, search?: string | null }} opts
 *   tripDate : YYYY-MM-DD (ex. trajet du jour), null = toutes dates
 *   search : nom, e-mail ou fragment d’UUID réservation
 */
export async function fetchDriverManifest({ tripDate = null, search = null } = {}) {
  const { data, error } = await supabase.rpc('driver_manifest_for_operator', {
    p_trip_date: tripDate || null,
    p_search: search?.trim() ? search.trim() : null,
  })
  if (error) throw new Error(error.message)
  return data ?? []
}

/**
 * @param {string} qrRaw — contenu scanné ou collé (booking_id|user_id|timestamp|signature)
 */
export async function validateTicketQrFromScan(qrRaw) {
  const line = String(qrRaw ?? '').trim()
  const parts = line.split('|').map((s) => s.trim())
  if (parts.length < 4) {
    throw new Error('QR invalide : format attendu avec 4 segments séparés par |')
  }
  const [bookingId, userId, tsStr, signature] = parts
  const ts = Number(tsStr)
  if (!bookingId || !userId || !Number.isFinite(ts) || !signature) {
    throw new Error('QR invalide : données incomplètes')
  }

  const { data, error } = await supabase.rpc('validate_ticket_qr_payload', {
    p_booking_id: bookingId,
    p_user_id: userId,
    p_timestamp: ts,
    p_signature: signature,
  })

  if (error) throw new Error(error.message)
  if (!data || typeof data !== 'object') {
    throw new Error('Réponse de validation inattendue')
  }

  const valid = data.valid === true
  const reason = data.reason ?? null
  return { valid, reason, bookingId, userId, ts, signature }
}

/**
 * Valide et consomme le billet côté chauffeur (status => used).
 * @param {{ bookingId: string, userId: string, ts: number, signature: string }} scan
 */
export async function consumeTicketFromScan(scan) {
  const { data, error } = await supabase.rpc(
    'driver_validate_and_use_ticket_qr_payload',
    {
      p_booking_id: scan.bookingId,
      p_user_id: scan.userId,
      p_timestamp: scan.ts,
      p_signature: scan.signature,
    },
  )

  if (error) throw new Error(error.message)
  if (!data || typeof data !== 'object') {
    throw new Error('Réponse de validation inattendue')
  }

  return {
    valid: data.valid === true,
    reason: data.reason ?? null,
    used_at: data.used_at ?? null,
    status: data.status ?? null,
    booking_id: data.booking_id ?? null,
    departure_city: data.departure_city ?? null,
    destination_city: data.destination_city ?? null,
    seat_number: data.seat_number ?? null,
    date: data.date ?? null,
    time: data.time ?? null,
  }
}

/**
 * Validation manuelle chauffeur par `booking_id` (sans QR payload).
 * @param {string} bookingId
 * @returns {Promise<{valid:boolean, reason:string|null, usedAt: string|null, status: string|null}>}
 */
export async function validateTicketManuallyByBookingId(bookingId) {
  const { data, error } = await supabase.rpc(
    'driver_validate_ticket_by_booking_id',
    { p_booking_id: bookingId },
  )

  if (error) throw new Error(error.message)
  if (!data || typeof data !== 'object') {
    throw new Error('Réponse de validation inattendue')
  }

  return {
    valid: data.valid === true,
    reason: data.reason ?? null,
    usedAt: data.used_at ?? null,
    status: data.status ?? null,
  }
}

/**
 * Validation manuelle par référence courte (ex: A1B2C3D4) ou UUID complet.
 * @param {string} ref
 * @returns {Promise<{valid:boolean, reason:string|null, usedAt: string|null, bookingId: string|null}>}
 */
export async function validateTicketByRef(ref) {
  const { data, error } = await supabase.rpc(
    'driver_validate_ticket_by_ref',
    { p_ref: ref.trim() },
  )

  if (error) throw new Error(error.message)
  if (!data || typeof data !== 'object') {
    throw new Error('Réponse de validation inattendue')
  }

  return {
    valid: data.valid === true,
    reason: data.reason ?? null,
    used_at: data.used_at ?? null,
    booking_id: data.booking_id ?? null,
    departure_city: data.departure_city ?? null,
    destination_city: data.destination_city ?? null,
    seat_number: data.seat_number ?? null,
    date: data.date ?? null,
    time: data.time ?? null,
  }
}
