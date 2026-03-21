import { useEffect } from 'react'
import { X } from 'lucide-react'
import { DigitalTicket } from './DigitalTicket'

/**
 * @param {{
 *   open: boolean
 *   onClose: () => void
 *   booking: object | null
 *   passengerName: string
 * }} props
 */
export function TicketModal({ open, onClose, booking, passengerName }) {
  useEffect(() => {
    if (!open) return undefined
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open || !booking) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticket-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div className="relative z-[101] flex max-h-[min(92dvh,880px)] w-full max-w-lg flex-col rounded-t-3xl border border-slate-200/80 bg-slate-50/95 shadow-[0_-8px_40px_rgba(15,23,42,0.18)] sm:rounded-3xl sm:shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-4 py-3 sm:rounded-t-3xl">
          <h2
            id="ticket-modal-title"
            className="text-base font-bold tracking-tight text-slate-900"
          >
            Mon billet
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5 sm:py-5">
          <DigitalTicket
            booking={booking}
            passengerName={passengerName}
            showTitle={false}
            showSaveHint
          />
        </div>
      </div>
    </div>
  )
}
