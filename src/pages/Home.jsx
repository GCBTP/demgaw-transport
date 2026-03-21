import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRightLeft,
  BadgeCheck,
  Loader2,
  MapPin,
  Search,
  Shield,
  Sparkles,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { TripCard } from '../components/trips/TripCard'
import { useTrips } from '../hooks/useTrips'
import {
  DEFAULT_ROUTE,
  getStationOptionsByRegion,
  SENEGAL_REGIONS_WITH_STATIONS,
} from '../data/locations'

export function Home() {
  const navigate = useNavigate()
  const { trips: popularTrips, loading: tripsLoading, error: tripsError } =
    useTrips(4)
  const [from, setFrom] = useState(DEFAULT_ROUTE.from)
  const [to, setTo] = useState(DEFAULT_ROUTE.to)

  const swapPlaces = () => {
    setFrom(to)
    setTo(from)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    navigate('/booking', { state: { from, to } })
  }

  return (
    <div className="space-y-10 sm:space-y-14">
      <section className="text-center sm:text-left">
        <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/80 px-3 py-1.5 text-xs font-semibold text-brand-800 shadow-sm sm:mx-0">
          <Sparkles className="h-3.5 w-3.5 text-warm-500" aria-hidden />
          Transport interurbain · Sénégal
        </p>
        <h1 className="mt-4 text-[1.65rem] font-bold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem]">
          Où allez-vous{' '}
          <span className="text-brand-600">aujourd&apos;hui ?</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-slate-500 sm:mx-0 sm:text-lg">
          Réservez un siège en quelques secondes — tarifs clairs, trajets
          vérifiés, comme sur les apps de mobilité que vous connaissez.
        </p>
      </section>

      <Card className="relative overflow-hidden border-0 p-0 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12),0_2px_12px_-4px_rgba(15,23,42,0.06)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-brand-400 to-warm-500" />
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-100/50 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-orange-50/80 blur-3xl" />

        <form
          onSubmit={handleSearch}
          className="relative p-5 sm:p-8"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
              Rechercher un trajet
            </h2>
            <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 sm:inline">
              Aller simple
            </span>
          </div>

          <div className="mt-6 space-y-3">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <span className="flex h-2 w-2 rounded-full bg-brand-500 ring-2 ring-brand-100" />
                Départ
              </span>
              <div className="relative">
                <MapPin
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-600"
                  strokeWidth={2}
                  aria-hidden
                />
                <select
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full appearance-none rounded-2xl border border-slate-200/90 bg-white py-3.5 pl-12 pr-10 text-base font-semibold text-slate-900 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
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
            </label>

            <div className="flex justify-center py-0.5">
              <button
                type="button"
                onClick={swapPlaces}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 active:scale-95"
                aria-label="Échanger départ et arrivée"
              >
                <ArrowRightLeft className="h-4 w-4" />
              </button>
            </div>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <span className="flex h-2 w-2 rounded-full bg-warm-500 ring-2 ring-orange-100" />
                Destination
              </span>
              <div className="relative">
                <MapPin
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-warm-500"
                  strokeWidth={2}
                  aria-hidden
                />
                <select
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full appearance-none rounded-2xl border border-slate-200/90 bg-white py-3.5 pl-12 pr-10 text-base font-semibold text-slate-900 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] transition focus:border-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-500/25"
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
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="mt-8 w-full gap-2 shadow-[0_6px_24px_-4px_rgba(5,150,105,0.45)]"
          >
            <Search className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            Rechercher
          </Button>
        </form>
      </Card>

      <section>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
              Trajets populaires
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Prix indicatifs · places limitées
            </p>
          </div>
        </div>
        {tripsError ? (
          <p className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Impossible de charger les trajets depuis Supabase. Ouvrez la page{' '}
            <span className="font-semibold">Trajets</span> pour importer la démo
            ou vérifier la configuration.
          </p>
        ) : null}
        {tripsLoading ? (
          <div className="mt-8 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            <span className="text-sm">Chargement des trajets…</span>
          </div>
        ) : popularTrips.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">
            Aucun trajet à afficher. Consultez la page{' '}
            <strong>Trajets</strong> et importez les données de démonstration.
          </p>
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {popularTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: MapPin,
            title: 'Itinéraires clairs',
            text: 'De la prise en charge à l’arrivée, tout est affiché.',
          },
          {
            icon: Shield,
            title: 'Paiement fiable',
            text: 'Wave, Orange Money ou carte bancaire.',
          },
          {
            icon: BadgeCheck,
            title: 'Chauffeurs & bus vérifiés',
            text: 'Partenaires notés par la communauté.',
          },
        ].map((f) => (
          <Card
            key={f.title}
            className="border-slate-100/80 bg-white/90 p-5 sm:p-6"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <f.icon className="h-5 w-5" strokeWidth={2} aria-hidden />
            </div>
            <h3 className="mt-4 font-bold text-slate-900">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
              {f.text}
            </p>
          </Card>
        ))}
      </section>
    </div>
  )
}
