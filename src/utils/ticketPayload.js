/**
 * Valeur QR (scanner) :
 * booking_id|user_id|timestamp|signature
 *
 * La signature est une preuve cryptographique générée par Supabase
 * (colonne `bookings.qr_payload` au paiement, ou RPC `create_ticket_qr_payload`)
 * et validée par Supabase (RPC `validate_ticket_qr_payload`).
 *
 * @param {{
 *   booking_id: string,
 *   user_id: string,
 *   timestamp: number|string,
 *   signature: string
 * }} payload
 */
export function buildTicketQrValue(payload) {
  return [
    payload.booking_id,
    payload.user_id,
    String(payload.timestamp),
    payload.signature,
  ].join('|')
}
