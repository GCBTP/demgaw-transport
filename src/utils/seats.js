/** Sièges libres : capacité = places restantes + sièges déjà réservés (comptage cohérent). */
export function getFreeSeatOptions(trip) {
  const booked = trip.bookedSeats ?? []
  const avail = trip.availableSeats ?? 0
  const capacity = avail + booked.length
  const options = []
  for (let n = 1; n <= capacity; n++) {
    const seat = String(n)
    if (!booked.includes(seat)) options.push(seat)
  }
  return options
}
