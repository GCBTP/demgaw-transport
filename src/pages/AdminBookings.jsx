import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Loader2, QrCode, RefreshCcw, Ticket, Clock } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { TicketModal } from '../components/ticket/TicketModal'
import { adminListBookings, adminPayBooking, subscribeBookings } from '../supabase/bookings'
import { formatTripDateLabel, formatXOF } from '../data/trips'
import { isPaidStatus, isTicketValidStatus, isUsedStatus, needsPayment } from '../utils/bookingPayment'

function bookingStatusMeta(status) {
  if (isPaidStatus(status)) {
    return {
      label: 'Payé',
      className: 'bg-emerald-100 text-emerald-900 ring-emerald-200/80',
    }
  }
  if (isUsedStatus(status)) {
    return {
      label: 'Embarqué',
      className: 'bg-emerald-100 text-emerald-900 ring-emerald-200/80',
    }
  }
  if (needsPayment(status)) {
    return {
      label: 'Paiement en attente',
      className: 'bg-amber-100 text-amber-900 ring-amber-200/80',
    }
  }
  return {
    label: status || '—',
    className: 'bg-slate-100 text-slate-800 ring-slate-200/80',
  }
}

const statusFilters = [
  { id: 'all', label: 'Tous' },
  { id: 'pending', label: 'En attente' },
  { id: 'paid', label: 'Payés' },
  { id: 'used', label: 'Embarqués' },
]

export function AdminBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [filter, setFilter] = useState('all')
  const [payingId, setPayingId] = useState(null)
  const [ticketBooking, setTicketBooking] = useState(null)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const list = await adminListBookings()
      setBookings(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()

    let mounted = true
    let debounce = null

    const unsubscribe = subscribeBookings(
      () => {
        if (!mounted) return
        // Debounce simple pour éviter refresh trop fréquent.
        clearTimeout(debounce)
        debounce = setTimeout(() => {
          void refresh()
        }, 400)
      },
      (e) => {
        if (!mounted) return
        setError(e instanceof Error ? e.message : String(e))
      },
    )

    return () => {
      mounted = false
      clearTimeout(debounce)
      unsubscribe()
    }
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'paid') return bookings.filter((b) => isPaidStatus(b.status))
    if (filter === 'pending')
      return bookings.filter((b) => needsPayment(b.status) && !isPaidStatus(b.status))
    if (filter === 'used') return bookings.filter((b) => isUsedStatus(b.status))
    return bookings
  }, [bookings, filter])

  async function handleMarkPaid(bookingId) {
    if (!bookingId) return
    setPayingId(bookingId)
    try {
      await adminPayBooking(bookingId)
      setTicketBooking(null)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setPayingId(null)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Réservations & paiements
          </h1>
          <p className="mt-1 text-slate-600">
            Contrôlez toutes les réservations et marquez les paiements (RPC admin).
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Filtre</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-2xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
            >
              {statusFilters.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" variant="secondary" className="gap-2" onClick={refresh} disabled={loading}>
            <RefreshCcw className="h-4 w-4" aria-hidden />
            Actualiser
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" aria-hidden />
          <p className="text-sm font-medium">Chargement des réservations…</p>
        </div>
      ) : error ? (
        <Card className="border-red-100 bg-red-50/40">
          <p className="text-sm font-semibold text-red-900">Erreur</p>
          <p className="mt-2 text-sm text-red-800">{error}</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="font-semibold text-slate-900">Aucune réservation</p>
          <p className="mt-2 text-sm text-slate-600">
            Ajuste le filtre ou vérifie que les réservations ont bien été créées côté client.
          </p>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {filtered.map((b) => {
            const s = bookingStatusMeta(b.status)
            const paid = isPaidStatus(b.status)
            const validTicket = isTicketValidStatus(b.status)

            return (
              <Card key={b.id} className="p-5">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${s.className}`}
                    >
                      {s.label}
                    </span>
                    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide bg-slate-100 text-slate-700 ring-1 ring-inset">
                      Réf. {String(b.id).slice(0, 8).toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-slate-900">
                      {b.departureCity} → {b.destinationCity}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <Clock className="h-4 w-4 text-brand-600" aria-hidden />
                        {formatTripDateLabel(b.date)} · {b.time}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-brand-600" aria-hidden />
                        Siège {b.seatNumber}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-warm-600" aria-hidden />
                        {formatXOF(b.price)}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-500 break-all">
                      Client (auth uid) : {b.userId}
                    </p>
                  </div>

                  <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                      {!paid && needsPayment(b.status) ? (
                        <Button
                          type="button"
                          variant="accent"
                          className="gap-2"
                          disabled={payingId === b.id}
                          onClick={() => handleMarkPaid(b.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" aria-hidden />
                          {payingId === b.id ? 'Traitement…' : 'Marquer payé'}
                        </Button>
                      ) : null}

                      {validTicket ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="gap-2"
                          onClick={() => setTicketBooking(b)}
                        >
                          <QrCode className="h-4 w-4" aria-hidden />
                          Voir billet
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <TicketModal
        open={Boolean(ticketBooking)}
        onClose={() => setTicketBooking(null)}
        booking={ticketBooking}
        passengerName={ticketBooking?.userId ?? ''}
      />
    </div>
  )
}

