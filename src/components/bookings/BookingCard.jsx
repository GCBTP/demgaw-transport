import { Link, useNavigate } from 'react-router-dom'
import {
  Armchair,
  Bus,
  Calendar,
  Clock,
  CreditCard,
  QrCode,
  ReceiptText,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { formatTripDateLabel, formatXOF } from '../../data/trips'
import { isPaidStatus, needsPayment } from '../../utils/bookingPayment'

function bookingStatusMeta(status) {
  if (isPaidStatus(status)) {
    return {
      label: 'Payé',
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
    label: status || 'Statut inconnu',
    className: 'bg-slate-100 text-slate-800 ring-slate-200/80',
  }
}

function ticketStatusMeta(status) {
  if (isPaidStatus(status)) {
    return {
      label: 'Billet actif',
      hint: 'QR prêt pour l’embarquement',
      className: 'bg-brand-50 text-brand-900 ring-brand-200/80',
    }
  }
  return {
    label: 'Billet verrouillé',
    hint: 'Payez pour débloquer le billet',
    className: 'bg-slate-100 text-slate-700 ring-slate-200/80',
  }
}

/**
 * @param {{
 *   booking: object
 *   onOpenTicket: () => void
 * }} props
 */
export function BookingCard({ booking, onOpenTicket }) {
  const b = bookingStatusMeta(booking.status)
  const t = ticketStatusMeta(booking.status)
  const shortRef = booking.id?.slice(0, 8)?.toUpperCase() ?? '—'
  const paid = isPaidStatus(booking.status)
  const paymentUrl = `/booking/payment/${booking.id}`
  const confirmationUrl = `/booking/confirmation/${booking.id}`
  const navigate = useNavigate()

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-100/90 bg-white shadow-[0_4px_24px_-4px_rgba(15,23,42,0.08),0_2px_8px_-2px_rgba(15,23,42,0.04)] transition-shadow duration-300 hover:shadow-[0_12px_40px_-8px_rgba(15,23,42,0.12)]">
      <div className="h-1.5 bg-gradient-to-r from-brand-600 via-brand-500 to-warm-500" />

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${b.className}`}
          >
            {b.label}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${t.className}`}
          >
            {t.label}
          </span>
        </div>
        <p className="mt-1.5 text-xs text-slate-500">{t.hint}</p>

        <div className="mt-5 flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-800">
            <Bus className="h-6 w-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold leading-snug tracking-tight text-slate-900 sm:text-xl">
              {booking.departureCity}{' '}
              <span className="font-normal text-slate-300">→</span>{' '}
              {booking.destinationCity}
            </h3>
            {booking.operator ? (
              <p className="mt-1 truncate text-sm text-slate-500">
                {booking.operator}
              </p>
            ) : null}
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50/90 p-4 ring-1 ring-slate-100">
          <div className="flex gap-2">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Date
              </dt>
              <dd className="text-sm font-semibold text-slate-900">
                {formatTripDateLabel(booking.date)}
              </dd>
            </div>
          </div>
          <div className="flex gap-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Départ
              </dt>
              <dd className="text-sm font-semibold text-slate-900">
                {booking.time}
              </dd>
            </div>
          </div>
          <div className="flex gap-2">
            <Armchair className="mt-0.5 h-4 w-4 shrink-0 text-warm-600" />
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Siège
              </dt>
              <dd className="text-sm font-semibold tabular-nums text-slate-900">
                {booking.seatNumber}
              </dd>
            </div>
          </div>
          <div className="flex gap-2">
            <ReceiptText className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Tarif
              </dt>
              <dd className="text-sm font-bold text-brand-800">
                {formatXOF(booking.price)}
              </dd>
            </div>
          </div>
        </dl>

        <p className="mt-4 font-mono text-[11px] text-slate-400">
          Réf. <span className="font-semibold text-slate-600">{shortRef}</span>
          <span className="text-slate-300"> · </span>
          <span className="break-all text-slate-500">{booking.id}</span>
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {!paid ? (
            <Button
              type="button"
              variant="accent"
              size="md"
              className="w-full gap-2 sm:flex-1"
              onClick={() => navigate(paymentUrl)}
            >
              <CreditCard className="h-4 w-4" aria-hidden />
              Paiement Wave
            </Button>
          ) : null}
          <Button
            type="button"
            size="md"
            variant={paid ? 'primary' : 'secondary'}
            className="w-full sm:w-auto sm:flex-1"
            onClick={onOpenTicket}
            disabled={!paid}
          >
            <QrCode className="h-4 w-4" aria-hidden />
            Voir &amp; télécharger
          </Button>
          <Link
            to={paid ? confirmationUrl : paymentUrl}
            className="inline-flex w-full min-h-10 items-center justify-center gap-2 rounded-full border border-slate-200/90 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] transition-all duration-200 hover:bg-slate-50 sm:w-auto sm:flex-1"
          >
            <ReceiptText className="h-4 w-4 shrink-0" aria-hidden />
            {paid ? 'Reçu complet' : 'Instructions Wave'}
          </Link>
        </div>
      </div>
    </article>
  )
}
