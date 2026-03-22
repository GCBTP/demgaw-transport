import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Bus,
  Calendar,
  Loader2,
  LogOut,
  Sparkles,
  Ticket,
} from 'lucide-react'
import { fetchBookingsForUser, subscribeBookings } from '../supabase/bookings'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { BookingCard } from '../components/bookings/BookingCard'
import { TicketModal } from '../components/ticket/TicketModal'
import { formatTripDateLabel, formatXOF } from '../data/trips'
import { useAuth } from '../hooks/useAuth'
import { isPaidStatus, isTicketValidStatus, needsPayment } from '../utils/bookingPayment'

/** Espace voyageur : réservations et billets (tous les utilisateurs connectés). */
export function Account() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [showAdminDenied] = useState(() =>
    Boolean(location.state?.adminDenied),
  )
  const clearedAdminState = useRef(false)

  useEffect(() => {
    if (clearedAdminState.current) return
    if (location.state?.adminDenied) {
      clearedAdminState.current = true
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.pathname, location.state, navigate])
  const greetingName =
    user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'vous'

  const passengerDisplay =
    user?.displayName?.trim() ||
    user?.email?.split('@')[0] ||
    'Passager'

  const [bookings, setBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(true)
  const [bookingsError, setBookingsError] = useState(null)
  const [ticketBooking, setTicketBooking] = useState(null)

  useEffect(() => {
    if (!user?.uid) return undefined
    let cancelled = false

    async function load() {
      setBookingsLoading(true)
      setBookingsError(null)
      try {
        const list = await fetchBookingsForUser(user.uid)
        if (!cancelled) setBookings(list)
      } catch (e) {
        if (!cancelled) {
          setBookings([])
          setBookingsError(e?.message ?? 'Impossible de charger vos réservations.')
        }
      } finally {
        if (!cancelled) setBookingsLoading(false)
      }
    }

    load()
    const unsubscribe = subscribeBookings(
      () => { if (!cancelled) load() },
      () => {},
    )
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [user?.uid])

  const paidList = useMemo(
    () => bookings.filter((b) => isTicketValidStatus(b.status)),
    [bookings],
  )
  const pendingPayList = useMemo(
    () => bookings.filter((b) => needsPayment(b.status)),
    [bookings],
  )
  const nextBooking = bookings[0] ?? null

  return (
    <div className="space-y-10 pb-4">
      {showAdminDenied ? (
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          L’espace administrateur est réservé aux comptes{' '}
          <strong>admin</strong>. Vous êtes sur votre espace voyageur.
        </div>
      ) : null}
      <header className="relative overflow-hidden rounded-3xl border border-slate-100/90 bg-gradient-to-br from-brand-50/90 via-white to-warm-50/40 px-5 py-6 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.08)] sm:px-8 sm:py-8">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-brand-800 ring-1 ring-brand-100">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Espace voyageur
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Bonjour {greetingName}
            </h1>
            <p className="mt-2 text-base text-slate-600">
              Retrouvez vos trajets, le statut de vos billets et téléchargez-les
              en un geste.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:flex-col">
            <Link to="/trips" className="w-full sm:flex-1 lg:w-56">
              <Button size="lg" className="w-full gap-2">
                Réserver un trajet
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="lg"
              className="w-full gap-2 sm:flex-1 lg:w-56"
              onClick={() => logout()}
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <section aria-label="Résumé">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="flex items-center gap-4 border-slate-100/90">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-800">
              <Ticket className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium text-slate-500">Réservations</p>
              <p className="text-2xl font-bold tabular-nums text-slate-900">
                {bookingsLoading ? '…' : bookings.length}
              </p>
              <p className="text-xs text-slate-500">
                {bookingsLoading
                  ? ''
                  : `${paidList.length} payée(s) · ${pendingPayList.length} en attente de paiement`}
              </p>
            </div>
          </Card>
          <Card className="flex items-center gap-4 border-slate-100/90">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
              <Calendar className="h-6 w-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500">
                Prochain départ
              </p>
              <p className="truncate text-lg font-bold text-slate-900">
                {bookingsLoading
                  ? '…'
                  : nextBooking
                    ? `${formatTripDateLabel(nextBooking.date)} · ${nextBooking.time}`
                    : '—'}
              </p>
            </div>
          </Card>
          <Card className="flex items-center gap-4 border-slate-100/90">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-800">
              <Bus className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium text-slate-500">Dernier montant</p>
              <p className="text-lg font-bold text-brand-800">
                {bookingsLoading
                  ? '…'
                  : nextBooking
                    ? formatXOF(nextBooking.price)
                    : '—'}
              </p>
            </div>
          </Card>
        </div>
      </section>

      <section aria-labelledby="bookings-heading">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="bookings-heading"
              className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
            >
              Mes réservations
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Chaque carte regroupe le trajet, le statut du billet et les
              actions rapides.
            </p>
          </div>
          <Link to="/trips" className="shrink-0">
            <Button variant="secondary" size="sm" className="gap-2">
              Nouveau trajet
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
        </div>

        {bookingsLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 py-20 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            <p className="text-sm font-medium">Chargement de vos billets…</p>
          </div>
        ) : bookingsError ? (
          <Card className="border-red-100 bg-red-50/40">
            <p className="text-sm font-medium text-red-900">{bookingsError}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Réessayer
            </Button>
          </Card>
        ) : bookings.length === 0 ? (
          <Card className="border-slate-100 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <Ticket className="h-7 w-7" aria-hidden />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-900">
              Aucune réservation
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              Parcourez les trajets disponibles et réservez votre siège — votre
              billet apparaîtra ici avec QR et téléchargement.
            </p>
            <Link to="/trips" className="mt-6 inline-block">
              <Button size="lg">Voir les trajets</Button>
            </Link>
          </Card>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:gap-6">
            {bookings.map((b) => (
              <li key={b.id} className="min-w-0 list-none">
                <BookingCard
                  booking={b}
                  onOpenTicket={() => setTicketBooking(b)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <TicketModal
        open={Boolean(ticketBooking)}
        onClose={() => setTicketBooking(null)}
        booking={ticketBooking}
        passengerName={passengerDisplay}
      />
    </div>
  )
}
