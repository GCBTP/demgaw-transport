import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bus,
  Calendar,
  Loader2,
  QrCode,
  Search,
  User,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../supabase/client'
import { fetchDriverManifest, validateTicketManuallyByBookingId } from '../supabase/driverManifest'

const MANUAL_REASON_LABEL = {
  ALREADY_USED: 'Ticket already used',
  NOT_PAID: 'Billet non payé',
  BOOKING_NOT_FOUND: 'Réservation introuvable',
  NOT_AUTHORIZED: 'Accès refusé',
  DRIVER_OPERATOR_NOT_SET: 'Opérateur du chauffeur non défini',
}

function todayYmd() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function DriverDashboard() {
  const { user } = useAuth()
  const op = user?.driverOperator?.trim() ?? ''

  const [tripsToday, setTripsToday] = useState([])
  const [tripsLoading, setTripsLoading] = useState(true)
  const [tripsError, setTripsError] = useState(null)

  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [manifest, setManifest] = useState([])
  const [manifestLoading, setManifestLoading] = useState(true)
  const [manifestError, setManifestError] = useState(null)
  const [onlyToday, setOnlyToday] = useState(true)
  /** Billets payés par trajet (aujourd’hui) — indépendant de la recherche */
  const [paidTodayByTrip, setPaidTodayByTrip] = useState(() => new Map())

  const [manualBusyBookingId, setManualBusyBookingId] = useState(null)
  const [manualResult, setManualResult] = useState(null)

  const todayStr = useMemo(() => todayYmd(), [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  const loadTrips = useCallback(async () => {
    setTripsLoading(true)
    setTripsError(null)
    const { data, error } = await supabase
      .from('trips')
      .select(
        'id, departure_city, destination_city, date, time, available_seats, booked_seats, operator',
      )
      .eq('date', todayStr)
      .order('time', { ascending: true })
    if (error) {
      setTripsError(error.message)
      setTripsToday([])
    } else {
      setTripsToday(data ?? [])
    }
    setTripsLoading(false)
  }, [todayStr])

  const loadManifest = useCallback(async () => {
    setManifestLoading(true)
    setManifestError(null)
    try {
      const rows = await fetchDriverManifest({
        tripDate: onlyToday ? todayStr : null,
        search: debouncedSearch || null,
      })
      setManifest(rows)
    } catch (e) {
      setManifestError(e instanceof Error ? e.message : String(e))
      setManifest([])
    } finally {
      setManifestLoading(false)
    }
  }, [onlyToday, todayStr, debouncedSearch])

  useEffect(() => {
    void loadTrips()
  }, [loadTrips])

  useEffect(() => {
    void loadManifest()
  }, [loadManifest])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const rows = await fetchDriverManifest({
          tripDate: todayStr,
          search: null,
        })
        if (cancelled) return
        const m = new Map()
        for (const row of rows) {
          if (row.status !== 'paid') continue
          const tid = row.trip_id
          m.set(tid, (m.get(tid) ?? 0) + 1)
        }
        setPaidTodayByTrip(m)
      } catch {
        if (!cancelled) setPaidTodayByTrip(new Map())
      }
    })()
    return () => {
      cancelled = true
    }
  }, [todayStr])

  const handleManualValidate = useCallback(
    async (bookingId, currentStatus) => {
      setManualResult(null)
      if (!bookingId) return
      if (currentStatus === 'used') {
        setManualResult({ ok: false, label: 'Ticket already used' })
        return
      }

      setManualBusyBookingId(bookingId)
      try {
        const r = await validateTicketManuallyByBookingId(bookingId)
        if (!r.valid) {
          const label =
            (r.reason && MANUAL_REASON_LABEL[r.reason]) ||
            r.reason ||
            'Validation refusée'
          setManualResult({
            ok: false,
            label,
            usedAt: r.usedAt ? new Date(r.usedAt).toLocaleString() : null,
          })
          return
        }

        setManualResult({
          ok: true,
          label: 'Valid Ticket',
          usedAt: r.usedAt ? new Date(r.usedAt).toLocaleString() : null,
        })
        void loadManifest()
      } catch (e) {
        setManualResult({
          ok: false,
          label: e instanceof Error ? e.message : String(e),
        })
      } finally {
        setManualBusyBookingId(null)
      }
    },
    [loadManifest],
  )

  return (
    <div className="mx-auto max-w-lg space-y-8 pb-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Chauffeur
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {todayStr} · <span className="font-semibold text-slate-800">{op}</span>
        </p>
      </header>

      <Link to="/chauffeur/scan" className="block">
        <span className="flex min-h-[4.5rem] w-full items-center justify-center gap-3 rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 px-6 text-lg font-bold text-white shadow-lg shadow-brand-900/20 active:scale-[0.99]">
          <QrCode className="h-8 w-8 shrink-0" aria-hidden />
          Scanner billet
        </span>
      </Link>

      <section aria-labelledby="today-trips-heading">
        <h2
          id="today-trips-heading"
          className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500"
        >
          <Calendar className="h-4 w-4" aria-hidden />
          Trajets aujourd’hui
        </h2>
        {tripsLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-brand-600" aria-hidden />
            <span className="text-sm font-medium">Chargement…</span>
          </div>
        ) : tripsError ? (
          <Card className="border-red-100 bg-red-50/40 p-4 text-sm text-red-800">
            {tripsError}
          </Card>
        ) : tripsToday.length === 0 ? (
          <Card className="p-5 text-center text-slate-600">
            Aucun trajet prévu aujourd’hui pour votre ligne.
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {tripsToday.map((t) => {
              const booked = Array.isArray(t.booked_seats) ? t.booked_seats.length : 0
              const paidHere = paidTodayByTrip.get(t.id) ?? 0
              return (
                <li key={t.id}>
                  <Card className="p-4">
                    <p className="text-lg font-bold text-slate-900">
                      {t.departure_city} → {t.destination_city}
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-brand-800">
                      {t.time}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      Billets payés (liste){' '}
                      <span className="font-semibold text-slate-800">{paidHere}</span>
                      · Places réservées trajet {booked}
                    </p>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="search-heading">
        <h2
          id="search-heading"
          className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500"
        >
          <Search className="h-4 w-4" aria-hidden />
          Passagers
        </h2>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Nom, e-mail ou n° réservation"
            className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-base text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
            enterKeyHint="search"
            autoComplete="off"
          />
        </div>

        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            variant={onlyToday ? 'primary' : 'secondary'}
            size="lg"
            className="h-12 flex-1 text-sm font-semibold"
            onClick={() => setOnlyToday(true)}
          >
            Aujourd’hui
          </Button>
          <Button
            type="button"
            variant={!onlyToday ? 'primary' : 'secondary'}
            size="lg"
            className="h-12 flex-1 text-sm font-semibold"
            onClick={() => setOnlyToday(false)}
          >
            Toutes dates
          </Button>
        </div>

        {manifestLoading ? (
          <div className="mt-6 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-brand-600" aria-hidden />
            <span className="text-sm font-medium">Recherche…</span>
          </div>
        ) : manifestError ? (
          <Card className="mt-4 border-red-100 bg-red-50/40 p-4 text-sm text-red-800">
            {manifestError}
          </Card>
        ) : manifest.length === 0 ? (
          <Card className="mt-4 p-5 text-center text-sm text-slate-600">
            Aucun passager ne correspond à votre recherche.
          </Card>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {manifest.map((row) => (
              <li key={row.booking_id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                        <User className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-lg font-semibold text-slate-900">
                          {row.passenger_name?.trim() || 'Voyageur'}
                        </p>
                        <p className="truncate text-sm text-slate-600">
                          {row.passenger_email || '—'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                        row.status === 'paid'
                          ? 'bg-brand-100 text-brand-900'
                          : row.status === 'used'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {row.status}
                    </span>
                  </div>
                  <p className="mt-3 text-base text-slate-800">
                    {row.departure_city} → {row.destination_city}
                  </p>
                  <p className="text-sm text-slate-600">
                    {row.trip_date} · {row.trip_time} · Siège{' '}
                    <span className="font-bold text-slate-900">{row.seat_number}</span>
                  </p>
                  {row.status === 'used' && row.used_at ? (
                    <p className="mt-1 text-xs font-medium text-emerald-800">
                      Utilisé le{' '}
                      {new Date(row.used_at).toLocaleString()}
                    </p>
                  ) : null}
                  <p className="mt-2 font-mono text-[11px] text-slate-400">
                    {row.booking_id}
                  </p>

                  <Button
                    type="button"
                    size="lg"
                    className="mt-4 h-12 w-full text-base font-semibold"
                    disabled={
                      manualBusyBookingId === row.booking_id
                    }
                    onClick={() =>
                      void handleManualValidate(row.booking_id, row.status)
                    }
                  >
                    {row.status === 'used'
                      ? 'Ticket already used'
                      : manualBusyBookingId === row.booking_id
                        ? 'Validation…'
                        : 'Validate ticket'}
                  </Button>

                  {row.status === 'used' && row.used_at ? (
                    <p className="mt-2 text-xs font-medium text-emerald-800">
                      Utilisé le {new Date(row.used_at).toLocaleString()}
                    </p>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {manualResult ? (
        <Card
          className={`rounded-2xl p-4 ${
            manualResult.ok
              ? 'border-brand-100 bg-brand-50/40'
              : 'border-amber-100 bg-amber-50/50'
          }`}
        >
          <p className="text-sm font-bold text-slate-900">{manualResult.label}</p>
          {manualResult.usedAt ? (
            <p className="mt-1 text-xs text-slate-700">
              {manualResult.usedAt}
            </p>
          ) : null}
        </Card>
      ) : null}

      <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 py-3 text-xs text-slate-500">
        <Bus className="h-4 w-4" aria-hidden />
        Liste mise à jour automatiquement après recherche
      </div>
    </div>
  )
}
