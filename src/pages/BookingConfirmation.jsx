import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Bus,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Ticket,
} from 'lucide-react'
import { getBookingById } from '../supabase/bookings'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { DigitalTicket } from '../components/ticket/DigitalTicket'
import { formatTripDateLabel, formatXOF } from '../data/trips'
import { useAuth } from '../hooks/useAuth'
import { isPaidStatus, needsPayment } from '../utils/bookingPayment'
import { loadTicketCache } from '../utils/ticketStorage'

function statusBadge(status) {
  if (status === 'paid') {
    return {
      label: 'Payé',
      className: 'bg-emerald-100 text-emerald-900',
    }
  }
  if (status === 'pending_payment') {
    return {
      label: 'Paiement en attente',
      className: 'bg-amber-100 text-amber-900',
    }
  }
  if (status === 'confirmed') {
    return {
      label: 'À payer',
      className: 'bg-amber-100 text-amber-900',
    }
  }
  return {
    label: status || '—',
    className: 'bg-slate-100 text-slate-800',
  }
}

export function BookingConfirmation() {
  const { bookingId } = useParams()
  const { user } = useAuth()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [ticketPassengerName, setTicketPassengerName] = useState(null)

  const loadBooking = useCallback(async () => {
    if (!bookingId) return null
    const b = await getBookingById(bookingId)
    return b
  }, [bookingId])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      setTicketPassengerName(null)

      const cached =
        bookingId && typeof window !== 'undefined'
          ? loadTicketCache(String(bookingId))
          : null

      if (cached?.booking) {
        const cachedBooking = {
          ...cached.booking,
          createdAt:
            cached.booking.createdAt instanceof Date
              ? cached.booking.createdAt
              : cached.booking.createdAt
                ? new Date(cached.booking.createdAt)
                : null,
        }

        if (user && cachedBooking.userId !== user.uid) {
          setError('Cette réservation n’appartient pas à votre compte.')
          setBooking(null)
          setLoading(false)
          return
        }

        if (!cancelled) {
          setBooking(cachedBooking)
          setTicketPassengerName(cached.passengerName ?? null)
        }

        // Hors-ligne : on s’arrête ici pour laisser le billet s’afficher.
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          setLoading(false)
          return
        }
      }
      try {
        const b = await loadBooking()
        if (cancelled) return
        if (!b) {
          setError('Réservation introuvable.')
          setBooking(null)
          return
        }
        if (user && b.userId !== user.uid) {
          setError('Cette réservation n’appartient pas à votre compte.')
          setBooking(null)
          return
        }
        setBooking(b)
      } catch (e) {
        if (!cancelled) {
          if (!cached?.booking) {
            setError(e?.message ?? 'Erreur de chargement.')
            setBooking(null)
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (bookingId && user) load()
    return () => {
      cancelled = true
    }
  }, [bookingId, user, loadBooking])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500">
        <Loader2 className="h-9 w-9 animate-spin text-brand-600" aria-hidden />
        <p className="text-sm font-medium">Chargement…</p>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="mx-auto max-w-lg space-y-6 text-center">
        <p className="text-slate-700">{error ?? 'Réservation introuvable.'}</p>
        <Link to="/compte">
          <Button variant="secondary">Mon compte</Button>
        </Link>
      </div>
    )
  }

  const paid = isPaidStatus(booking.status)
  const awaitingPay = needsPayment(booking.status)
  const badge = statusBadge(booking.status)

  const createdLabel =
    booking.createdAt instanceof Date
      ? booking.createdAt.toLocaleString('fr-SN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : null

  const passengerName =
    ticketPassengerName ||
    user?.displayName?.trim() ||
    user?.email?.split('@')[0] ||
    'Passager'

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div className="text-center">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
          }`}
        >
          {paid ? (
            <CheckCircle2 className="h-9 w-9" strokeWidth={2} aria-hidden />
          ) : (
            <Ticket className="h-9 w-9" strokeWidth={2} aria-hidden />
          )}
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {paid ? 'Réservation confirmée' : 'Siège réservé'}
        </h1>
        <p className="mt-2 text-slate-600">
          {paid
            ? 'Votre paiement est enregistré. Téléchargez votre billet ou retrouvez-le sur le tableau de bord.'
            : 'Finalisez le paiement pour activer votre billet numérique.'}
        </p>
      </div>

      <Card className="border-emerald-100/80 bg-gradient-to-b from-emerald-50/40 to-white">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-emerald-800">
          <Ticket className="h-4 w-4 shrink-0" aria-hidden />
          Statut :{' '}
          <span className={`rounded-full px-2.5 py-0.5 ${badge.className}`}>
            {badge.label}
          </span>
        </div>
        <p className="mt-4 font-mono text-xs text-slate-500">
          Référence : <span className="font-semibold text-slate-700">{booking.id}</span>
        </p>
        {createdLabel ? (
          <p className="mt-1 text-xs text-slate-500">Émis le {createdLabel}</p>
        ) : null}

        <div className="mt-6 space-y-4 border-t border-slate-100 pt-6">
          <div className="flex items-start gap-3">
            <Bus className="mt-0.5 h-5 w-5 text-brand-600" aria-hidden />
            <div>
              <p className="font-bold text-slate-900">
                {booking.departureCity} → {booking.destinationCity}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" aria-hidden />
                  {formatTripDateLabel(booking.date)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" aria-hidden />
                  {booking.time}
                </span>
              </div>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-slate-500">Siège</dt>
              <dd className="font-semibold text-slate-900">{booking.seatNumber}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Montant</dt>
              <dd className="font-semibold text-brand-800">
                {formatXOF(booking.price)}
              </dd>
            </div>
          </dl>
          {booking.operator ? (
            <p className="text-sm text-slate-500">{booking.operator}</p>
          ) : null}
        </div>
      </Card>

      {paid ? (
        <DigitalTicket booking={booking} passengerName={passengerName} />
      ) : awaitingPay ? (
        <Card className="border-amber-100 bg-amber-50/40">
          <div className="space-y-4">
            <p className="text-sm font-semibold text-amber-900">
              Paiement requis
            </p>
            <p className="text-sm text-slate-600">
              Envoyez le paiement via Wave puis revenez ici après validation.
              Cliquez sur le bouton ci-dessous pour ouvrir la page Wave.
            </p>
            <div className="rounded-2xl border border-amber-200/80 bg-white/70 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-900/70">
                Amount to pay
              </p>
              <p className="mt-1 text-2xl font-extrabold tracking-tight text-amber-900">
                {formatXOF(booking.price)}
              </p>
            </div>
            <Link to={`/booking/payment/${booking.id}`}>
              <Button variant="accent" size="lg" className="w-full sm:w-auto">
                Paiement via Wave
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="border-slate-200 bg-slate-50/80">
          <p className="text-sm text-slate-600">
            Votre billet sera disponible après paiement.
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link to="/compte" className="sm:w-auto">
          <Button size="lg" className="w-full">
            Mon compte
          </Button>
        </Link>
        <Link to="/trips" className="sm:w-auto">
          <Button variant="secondary" size="lg" className="w-full">
            Autres trajets
          </Button>
        </Link>
      </div>
    </div>
  )
}
