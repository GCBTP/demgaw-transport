import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Bus,
  Calendar,
  Clock,
  Loader2,
  MapPin,
} from 'lucide-react'
import { createBooking } from '../supabase/bookings'
import { getTripById } from '../supabase/trips'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { formatTripDateLabel, formatXOF } from '../data/trips'
import { useAuth } from '../hooks/useAuth'
import { getFreeSeatOptions } from '../utils/seats'

export function BookTrip() {
  const { tripId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [seatNumber, setSeatNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const t = await getTripById(tripId)
        if (cancelled) return
        if (!t) {
          setLoadError('Ce trajet n’existe pas ou a été retiré.')
          setTrip(null)
        } else {
          setTrip(t)
          const free = getFreeSeatOptions(t)
          setSeatNumber(free[0] ?? '')
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e.message ?? 'Impossible de charger le trajet.')
          setTrip(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (tripId) load()
    return () => {
      cancelled = true
    }
  }, [tripId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!user || !trip || !seatNumber) return
    setFormError(null)
    setSubmitting(true)
    try {
      const id = await createBooking(user.uid, trip.id, seatNumber)
      navigate(`/booking/confirmation/${id}`, { replace: true })
    } catch (err) {
      setFormError(err.message ?? 'La réservation a échoué.')
    } finally {
      setSubmitting(false)
    }
  }

  const freeSeats = trip ? getFreeSeatOptions(trip) : []

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500">
        <Loader2 className="h-9 w-9 animate-spin text-brand-600" aria-hidden />
        <p className="text-sm font-medium">Chargement du trajet…</p>
      </div>
    )
  }

  if (loadError || !trip) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <Card className="border-amber-100 bg-amber-50/50">
          <div className="flex gap-3">
            <AlertCircle className="h-6 w-6 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold text-slate-900">Trajet indisponible</p>
              <p className="mt-1 text-sm text-slate-600">
                {loadError ?? 'Trajet introuvable.'}
              </p>
            </div>
          </div>
        </Card>
        <Link to="/trips">
          <Button variant="secondary" className="gap-2">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Retour aux trajets
          </Button>
        </Link>
      </div>
    )
  }

  if (freeSeats.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <Card>
          <p className="font-semibold text-slate-900">Complet</p>
          <p className="mt-2 text-sm text-slate-600">
            Il n’y a plus de sièges disponibles sur ce départ.
          </p>
        </Card>
        <Link to="/trips">
          <Button variant="secondary">Voir d’autres trajets</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Link
        to="/trips"
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-800 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour aux trajets
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Réserver ce trajet
        </h1>
        <p className="mt-1 text-slate-600">
          Choisissez votre siège puis confirmez. Vous serez redirigé vers la
          page de confirmation.
        </p>
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-100 text-brand-800">
              <Bus className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-lg font-bold text-slate-900">
                {trip.departureCity}{' '}
                <span className="font-normal text-slate-400">→</span>{' '}
                {trip.destinationCity}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-brand-600" aria-hidden />
                  {formatTripDateLabel(trip.date)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-brand-600" aria-hidden />
                  {trip.time}
                </span>
                {trip.operator ? (
                  <span className="text-slate-500">{trip.operator}</span>
                ) : null}
              </div>
            </div>
          </div>
          <p className="text-right">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Prix
            </span>
            <span className="block text-2xl font-bold text-brand-700">
              {formatXOF(trip.price)}
            </span>
          </p>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          {formError ? (
            <p
              className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              {formError}
            </p>
          ) : null}

          <div>
            <label
              htmlFor="seat"
              className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"
            >
              <MapPin className="h-4 w-4 text-brand-600" aria-hidden />
              Siège
            </label>
            <select
              id="seat"
              value={seatNumber}
              onChange={(e) => setSeatNumber(e.target.value)}
              className="w-full rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 text-base font-semibold text-slate-900 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
              required
            >
              {freeSeats.map((s) => (
                <option key={s} value={s}>
                  Siège {s}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              {freeSeats.length} siège{freeSeats.length > 1 ? 's' : ''} libre
              {freeSeats.length > 1 ? 's' : ''} sur ce départ.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Compte :{' '}
            <span className="font-semibold text-slate-900">
              {user?.email ?? user?.uid}
            </span>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full sm:w-auto"
            disabled={submitting || !seatNumber}
          >
            {submitting ? 'Confirmation…' : 'Confirmer la réservation'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
