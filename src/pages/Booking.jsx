import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CalendarDays, MapPin, User } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { formatXOF } from '../data/trips'
import {
  DEFAULT_ROUTE,
  formatStationLabel,
  getStationOptionsByRegion,
  isKnownStationValue,
  SENEGAL_REGIONS_WITH_STATIONS,
} from '../data/locations'

function routeFromState(state) {
  if (isKnownStationValue(state?.from) && isKnownStationValue(state?.to)) {
    return {
      from: state.from,
      to: state.to,
      tripDate: state.tripDate ?? '',
      tripTime: state.tripTime ?? '',
      suggestedPrice:
        typeof state.suggestedPrice === 'number'
          ? state.suggestedPrice
          : undefined,
    }
  }
  return {
    from: DEFAULT_ROUTE.from,
    to: DEFAULT_ROUTE.to,
    tripDate: '',
    tripTime: '',
    suggestedPrice: undefined,
  }
}

function BookingForm({
  initialFrom,
  initialTo,
  initialTripDate,
  initialTripTime,
  suggestedPrice,
}) {
  const navigate = useNavigate()
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  const [date, setDate] = useState(initialTripDate)
  const [passengers, setPassengers] = useState('1')

  const estimate = useMemo(() => {
    const base = suggestedPrice ?? 5000
    const n = Math.max(1, Number.parseInt(passengers, 10) || 1)
    return base * n
  }, [suggestedPrice, passengers])

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <Card>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            navigate('/trips', { state: { from, to, date, passengers: Number(passengers) } })
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                <MapPin className="h-4 w-4 text-brand-600" aria-hidden />
                Départ
              </label>
              <select
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 text-slate-900 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
              >
                {SENEGAL_REGIONS_WITH_STATIONS.map((entry) => (
                  <optgroup key={entry.region} label={entry.region}>
                    {getStationOptionsByRegion(entry.region).map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.station}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                <MapPin className="h-4 w-4 text-warm-500" aria-hidden />
                Arrivée
              </label>
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 text-slate-900 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] focus:border-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-500/25"
              >
                {SENEGAL_REGIONS_WITH_STATIONS.map((entry) => (
                  <optgroup key={entry.region} label={entry.region}>
                    {getStationOptionsByRegion(entry.region).map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.station}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                <CalendarDays className="h-4 w-4 text-brand-600" aria-hidden />
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 text-slate-900 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                <User className="h-4 w-4 text-brand-600" aria-hidden />
                Passagers
              </label>
              <select
                value={passengers}
                onChange={(e) => setPassengers(e.target.value)}
                className="w-full rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 text-slate-900 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {initialTripTime ? (
            <p className="text-sm text-slate-600">
              Créneau sélectionné :{' '}
              <span className="font-semibold text-slate-900">
                {initialTripTime}
              </span>
            </p>
          ) : null}

          <Input
            name="contact"
            type="tel"
            label="Téléphone (confirmation)"
            placeholder="+221 77 000 00 00"
            required
          />

          <Button type="submit" size="lg" className="w-full sm:w-auto">
            Voir les trajets disponibles
          </Button>
        </form>
      </Card>

      <Card className="h-fit border-brand-100/80 bg-gradient-to-b from-brand-50/90 to-white">
        <h2 className="text-lg font-semibold text-slate-900">Récapitulatif</h2>
        <p className="mt-1 text-sm text-slate-600">
          {suggestedPrice != null
            ? 'Prix basé sur le trajet choisi (× passagers).'
            : 'Estimation indicative si aucun trajet catalogue n’est lié.'}
        </p>
        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">Trajet</dt>
            <dd className="font-medium text-slate-900">
              {formatStationLabel(from)} → {formatStationLabel(to)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">Passagers</dt>
            <dd className="font-medium text-slate-900">{passengers}</dd>
          </div>
          <div className="border-t border-slate-200 pt-3">
            <div className="flex justify-between text-base">
              <dt className="font-semibold text-slate-900">Total estimé</dt>
              <dd className="font-bold text-brand-700">{formatXOF(estimate)}</dd>
            </div>
          </div>
        </dl>
      </Card>
    </div>
  )
}

export function Booking() {
  const location = useLocation()
  const parsed = routeFromState(location.state)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Réserver un trajet
        </h1>
        <p className="mt-1 text-slate-600">
          Indiquez votre départ, votre arrivée et la date souhaitée.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Pour réserver un trajet du catalogue (siège + confirmation Supabase),{' '}
          <Link to="/trips" className="font-semibold text-brand-800 hover:underline">
            choisissez un trajet
          </Link>
          .
        </p>
      </div>

      <BookingForm
        key={location.key}
        initialFrom={parsed.from}
        initialTo={parsed.to}
        initialTripDate={parsed.tripDate}
        initialTripTime={parsed.tripTime}
        suggestedPrice={parsed.suggestedPrice}
      />
    </div>
  )
}
