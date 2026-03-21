import { useCallback, useEffect, useMemo, useState } from 'react'
import { Calendar, Loader2, QrCode } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../supabase/client'

function todayYmd() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function DriverQuick() {
  const { user } = useAuth()
  const op = user?.driverOperator?.trim() ?? ''

  const [tripsToday, setTripsToday] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const todayStr = useMemo(() => todayYmd(), [])

  const loadTrips = useCallback(async () => {
    if (!op) {
      setTripsToday([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('trips')
      .select('id, departure_city, destination_city, date, time, available_seats, operator')
      .eq('date', todayStr)
      .eq('operator', op)
      .order('time', { ascending: true })

    if (error) {
      setTripsToday([])
      setError(error.message)
    } else {
      setTripsToday(data ?? [])
    }
    setLoading(false)
  }, [op, todayStr])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (cancelled) return
      await loadTrips()
    })()
    return () => {
      cancelled = true
    }
  }, [loadTrips])

  if (!user?.driverOperator?.trim()) {
    return (
      <Card className="border-amber-100 bg-amber-50/50 p-6">
        <p className="font-semibold text-amber-950">Opérateur non configuré</p>
        <p className="mt-2 text-sm text-amber-900">
          Contactez un administrateur pour associer un libellé opérateur à votre
          compte chauffeur.
        </p>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-4">
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
          Scan Ticket
        </span>
      </Link>

      <div className="flex gap-2">
        <Link to="/chauffeur/gestion" className="flex-1">
          <Button type="button" variant="secondary" size="lg" className="w-full">
            Gestion (recherche)
          </Button>
        </Link>
        <Link to="/chauffeur/badge" className="flex-1">
          <Button type="button" variant="secondary" size="lg" className="w-full">
            Mon badge
          </Button>
        </Link>
      </div>

      <section aria-labelledby="today-trips-heading">
        <h2
          id="today-trips-heading"
          className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500"
        >
          <Calendar className="h-4 w-4" aria-hidden />
          Trajets aujourd’hui
        </h2>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-brand-600" aria-hidden />
            <span className="text-sm font-medium">Chargement…</span>
          </div>
        ) : error ? (
          <Card className="border-red-100 bg-red-50/40 p-4 text-sm text-red-800">
            {error}
          </Card>
        ) : tripsToday.length === 0 ? (
          <Card className="p-5 text-center text-slate-600">
            Aucun trajet prévu aujourd’hui pour votre ligne.
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {tripsToday.map((t) => (
              <li key={t.id}>
                <Card className="p-4">
                  <p className="text-lg font-bold text-slate-900">
                    {t.departure_city} → {t.destination_city}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-brand-800">
                    {t.time}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Places restantes :{' '}
                    <span className="font-semibold text-slate-900">
                      {t.available_seats ?? 0}
                    </span>
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

