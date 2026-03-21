const STORAGE_PREFIX = 'demgaw_ticket_cache_v1_'

function safeLocalStorage() {
  try {
    if (typeof window === 'undefined') return null
    if (!window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

function keyForBookingId(bookingId) {
  return `${STORAGE_PREFIX}${bookingId}`
}

/**
 * @param {string} bookingId
 * @returns {null | {
 *   passengerName?: string,
 *   booking: any,
 *   qrPayload?: any,
 *   qrValue?: string,
 *   savedAt?: string
 * }}
 */
export function loadTicketCache(bookingId) {
  if (!bookingId) return null
  const ls = safeLocalStorage()
  if (!ls) return null
  try {
    const raw = ls.getItem(keyForBookingId(bookingId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.booking?.createdAt && typeof parsed.booking.createdAt === 'string') {
      parsed.booking.createdAt = new Date(parsed.booking.createdAt)
    }
    return parsed ?? null
  } catch {
    return null
  }
}

/**
 * @param {string} bookingId
 * @param {{
 *   passengerName?: string,
 *   booking: any,
 *   qrPayload?: any,
 *   qrValue?: string
 * }} value
 */
export function saveTicketCache(bookingId, value) {
  if (!bookingId || !value?.booking) return
  const ls = safeLocalStorage()
  if (!ls) return

  // JSON-friendly booking (createdAt -> ISO string)
  const bookingToSave = { ...value.booking }
  if (bookingToSave.createdAt instanceof Date) {
    bookingToSave.createdAt = bookingToSave.createdAt.toISOString()
  }

  const payload = {
    passengerName: value.passengerName ?? '',
    booking: bookingToSave,
    qrPayload: value.qrPayload ?? null,
    qrValue: value.qrValue ?? null,
    savedAt: new Date().toISOString(),
  }

  try {
    ls.setItem(keyForBookingId(bookingId), JSON.stringify(payload))
  } catch {
    // ignore quota errors
  }
}

