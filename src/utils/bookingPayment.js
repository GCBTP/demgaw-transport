/** Réservation créée mais pas encore payée (simulation). */
export function needsPayment(status) {
  return status === 'pending_payment' || status === 'confirmed'
}

export function isPaidStatus(status) {
  return status === 'paid'
}

export function isUsedStatus(status) {
  return status === 'used'
}

/** Un billet “valide” pour QR si status=paid ou utilisé=used. */
export function isTicketValidStatus(status) {
  return status === 'paid' || status === 'used'
}
