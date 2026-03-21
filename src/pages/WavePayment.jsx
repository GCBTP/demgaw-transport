import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Bus, Calendar, CheckCircle2, Clock, Loader2, Ticket, Waves } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { getBookingById, payBooking } from '../supabase/bookings'
import { formatTripDateLabel, formatXOF } from '../data/trips'
import { useAuth } from '../hooks/useAuth'
import { isPaidStatus, needsPayment } from '../utils/bookingPayment'

const COMPANY_NAME = 'Guindo Construction BTP'
const WAVE_ACCOUNT = 'SN 64 37 56 11'

export function WavePayment() {
  const { bookingId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [busy, setBusy] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [success, setSuccess] = useState(false)
  const [payError, setPayError] = useState(null)

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
          setError(e?.message ?? 'Erreur de chargement.')
          setBooking(null)
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

  const paid = useMemo(() => (booking ? isPaidStatus(booking.status) : false), [booking])
  const awaitingPay = useMemo(
    () => (booking ? needsPayment(booking.status) : false),
    [booking],
  )

  async function handleConfirmPaid() {
    if (!bookingId || !booking) return
    setBusy(true)
    setVerifying(true)
    setSuccess(false)
    setPayError(null)
    try {
      await payBooking(bookingId)
      setSuccess(true)
      setTimeout(() => {
        navigate(`/booking/confirmation/${bookingId}`, { replace: true })
      }, 1200)
    } catch (e) {
      setPayError(e?.message ?? 'Paiement impossible.')
      setVerifying(false)
    } finally {
      setBusy(false)
    }
  }

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

  if (paid) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <Card className="border-emerald-100 bg-emerald-50/50">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Paiement confirmé
              </h1>
              <p className="mt-2 text-slate-600">
                Votre billet numérique est disponible.
              </p>
              <div className="mt-4">
                <Link to={`/booking/confirmation/${booking.id}`}>
                  <Button size="lg">Voir mon billet</Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (verifying) {
    return (
      <div className="mx-auto max-w-xl space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Vérification du paiement
          </h1>
          <p className="mt-2 text-slate-600">
            Your payment is being verified. Your ticket will be available
            shortly.
          </p>
        </div>

        <Card className="border-slate-200 bg-white">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-100 text-brand-800">
              <Ticket className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Référence</p>
              <p className="mt-1 break-all font-mono text-sm text-slate-600">
                {booking.id}
              </p>
              <p className="mt-3 text-sm text-slate-600">
                Patientez pendant que le statut est mis à jour.
              </p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-warm-100 text-warm-700">
          <Waves className="h-9 w-9" strokeWidth={2} aria-hidden />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Paiement Wave (manuel)
        </h1>
        <p className="mt-2 text-slate-600">
          Finalisez le paiement puis confirmez.
        </p>
      </div>

      <Card className="border-amber-100 bg-amber-50/40">
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Société
              </p>
              <p className="mt-1 truncate text-lg font-bold text-slate-900">
                {COMPANY_NAME}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Compte Wave
              </p>
              <p className="mt-1 break-all font-mono text-sm font-bold text-slate-900">
                {WAVE_ACCOUNT}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200/80 bg-white/70 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-900/70">
              Amount to pay
            </p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-amber-900">
              {formatXOF(booking.price)}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Instructions :
              <br />
              <span className="font-semibold text-slate-900">
                Please send the payment via Wave and click confirm after payment
              </span>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-4">
            <p className="text-sm font-semibold text-slate-900">Votre trajet</p>
            <div className="mt-3 flex items-start gap-3">
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
            <p className="mt-3 text-sm text-slate-600">
              Siège : <span className="font-semibold text-slate-900">{booking.seatNumber}</span>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Ticket className="h-4 w-4" aria-hidden />
              Référence : <span className="font-mono text-slate-700">{booking.id}</span>
            </p>

            {payError ? (
              <p
                className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800"
                role="alert"
              >
                {payError}
              </p>
            ) : null}

            {success ? (
              <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                Paiement reçu. Redirection vers votre billet…
              </p>
            ) : null}

            <Button
              type="button"
              variant="accent"
              size="lg"
              className="mt-4 w-full"
              disabled={!awaitingPay || busy || success}
              onClick={handleConfirmPaid}
            >
              {busy ? 'Confirmation…' : 'I have paid'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

