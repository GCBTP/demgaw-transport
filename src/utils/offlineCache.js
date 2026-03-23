const BOOKINGS_KEY = 'demgaw_bookings_cache'
const MANIFEST_KEY = 'demgaw_manifest_cache'

export function saveBookingsCache(userId, bookings) {
  try {
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify({ userId, bookings, at: Date.now() }))
  } catch {}
}

export function loadBookingsCache(userId) {
  try {
    const raw = localStorage.getItem(BOOKINGS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed.userId !== userId) return null
    return parsed.bookings ?? null
  } catch {
    return null
  }
}

export function saveManifestCache(manifest) {
  try {
    localStorage.setItem(MANIFEST_KEY, JSON.stringify({ manifest, at: Date.now() }))
  } catch {}
}

export function loadManifestCache() {
  try {
    const raw = localStorage.getItem(MANIFEST_KEY)
    if (!raw) return null
    return JSON.parse(raw).manifest ?? null
  } catch {
    return null
  }
}
