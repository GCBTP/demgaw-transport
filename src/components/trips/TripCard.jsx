import { Link } from 'react-router-dom'
import { Calendar, Clock, Users } from 'lucide-react'
import { Button } from '../ui/Button'
import { formatTripDateLabel, formatXOF } from '../../data/trips'

export function TripCard({ trip, className = '' }) {
  return (
    <article
      className={`group rounded-3xl border border-slate-100/90 bg-white p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.08),0_2px_8px_-2px_rgba(15,23,42,0.04)] transition-shadow duration-300 hover:shadow-[0_12px_40px_-8px_rgba(15,23,42,0.12),0_4px_12px_-4px_rgba(15,23,42,0.06)] sm:p-6 ${className}`}
    >
      <div className="flex gap-4">
        <div className="flex flex-col items-center pt-0.5">
          <span
            className="h-3 w-3 shrink-0 rounded-full border-[3px] border-brand-500 bg-white shadow-sm ring-2 ring-brand-100"
            aria-hidden
          />
          <span className="my-1 w-px flex-1 min-h-[28px] bg-gradient-to-b from-brand-200 to-slate-200" />
          <span
            className="h-3 w-3 shrink-0 rounded-full bg-warm-500 shadow-sm ring-2 ring-orange-100"
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Départ
              </p>
              <p className="text-lg font-bold leading-tight text-slate-900">
                {trip.departureCity}
              </p>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Arrivée
              </p>
              <p className="text-lg font-bold leading-tight text-slate-900">
                {trip.destinationCity}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Prix
              </p>
              <p className="text-2xl font-bold tabular-nums text-brand-700">
                {formatXOF(trip.price)}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-brand-600" strokeWidth={2} aria-hidden />
              {formatTripDateLabel(trip.date)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-brand-600" strokeWidth={2} aria-hidden />
              {trip.time}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4 text-slate-400" strokeWidth={2} aria-hidden />
              {trip.availableSeats} places
            </span>
            {trip.duration ? (
              <span className="text-slate-400">{trip.duration}</span>
            ) : null}
            {trip.operator ? (
              <span className="text-slate-400">{trip.operator}</span>
            ) : null}
          </div>

          <Link to={`/book/${trip.id}`} className="mt-5 block">
            <Button variant="primary" size="lg" className="w-full sm:w-auto">
              Book now
            </Button>
          </Link>
        </div>
      </div>
    </article>
  )
}
