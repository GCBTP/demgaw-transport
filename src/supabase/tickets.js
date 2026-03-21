import { supabase } from './client'

/**
 * Secours si `booking.qr_payload` est absent (préférer la colonne remplie par `pay_booking`).
 * RPC : `create_ticket_qr_payload(p_booking_id uuid)` — peut renvoyer 404 si PostgREST ne l’expose pas.
 *
 * @param {string} bookingId
 * @returns {Promise<{booking_id:string,user_id:string,timestamp:number,signature:string}>}
 */
export async function createTicketQrPayload(bookingId) {
  const { data, error } = await supabase.rpc('create_ticket_qr_payload', {
    p_booking_id: bookingId,
  })

  if (error) {
    throw new Error(error.message ?? 'Impossible de générer le QR.')
  }
  if (!data) {
    throw new Error('Impossible de générer le QR (données vides).')
  }

  return data
}

