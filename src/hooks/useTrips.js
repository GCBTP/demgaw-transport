import { useEffect, useState } from 'react'
import { subscribeTrips } from '../supabase/trips'

/**
 * @param {number | undefined} limitCount
 */
export function useTrips(limitCount) {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const options =
      typeof limitCount === 'number' ? { limitCount } : undefined
    const unsub = subscribeTrips(
      (list) => {
        setTrips(list)
        setLoading(false)
        setError(null)
      },
      (err) => {
        setError(err.message ?? 'Erreur Supabase')
        setTrips([])
        setLoading(false)
      },
      options,
    )
    return () => unsub()
  }, [limitCount])

  return { trips, loading, error }
}
