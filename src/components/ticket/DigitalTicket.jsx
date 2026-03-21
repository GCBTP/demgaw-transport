import { useCallback, useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Download, FileImage, FileText, Loader2, Phone } from 'lucide-react'
import { Button } from '../ui/Button'
import { formatTripDateLabel, formatXOF } from '../../data/trips'
import { exportTicketAsPdf, exportTicketAsPng } from '../../utils/ticketExport'
import { buildTicketQrValue } from '../../utils/ticketPayload'
import { createTicketQrPayload } from '../../supabase/tickets'
import { loadTicketCache, saveTicketCache } from '../../utils/ticketStorage'

/**
 * @param {{
 *   booking: object
 *   passengerName: string
 *   showTitle?: boolean
 *   showSaveHint?: boolean
 * }} props
 */
export function DigitalTicket({
  booking,
  passengerName,
  showTitle = true,
  showSaveHint = true,
}) {
  const captureRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [exportError, setExportError] = useState(null)

  const [qrPayload, setQrPayload] = useState(null)
  const [qrLoading, setQrLoading] = useState(true)
  const [qrError, setQrError] = useState(null)

  const shortId = booking.id?.slice(0, 8)?.toUpperCase() ?? '—'

  const safeName = (passengerName || 'Passager').trim() || 'Passager'

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!booking?.id) return
      const cached = loadTicketCache(booking.id)
      const paid = booking.status === 'paid' || booking.status === 'used'

      // Hors-ligne : si on a déjà un QR signé en cache, on l’utilise.
      if (cached?.qrPayload && paid) {
        setQrPayload(cached.qrPayload)
        setQrError(null)
        setQrLoading(false)
        return
      }

      // Si pas payé : pas de génération QR.
      if (!paid) {
        setQrPayload(null)
        setQrError(null)
        setQrLoading(false)
        return
      }

      // Fourni par la base au paiement (colonne qr_payload) — pas d’appel RPC nécessaire.
      if (booking.qrPayload && typeof booking.qrPayload === 'object') {
        setQrPayload(booking.qrPayload)
        setQrError(null)
        setQrLoading(false)
        return
      }

      setQrLoading(true)
      setQrError(null)
      try {
        const p = await createTicketQrPayload(booking.id)
        if (cancelled) return
        setQrPayload(p)
      } catch (e) {
        if (cancelled) return
        setQrError(e?.message ?? 'Impossible de générer le QR.')
        setQrPayload(null)
      } finally {
        if (!cancelled) setQrLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [booking?.id, booking?.status, booking?.qrPayload])

  // Mettre en cache le billet (utile pour l’offline).
  useEffect(() => {
    if (!booking?.id) return
    // Si billet non payé : on stocke au minimum les infos pour afficher le statut.
    if (booking.status !== 'paid' && booking.status !== 'used') {
      saveTicketCache(booking.id, {
        passengerName,
        booking,
        qrPayload: null,
        qrValue: null,
      })
      return
    }
    // Billet payé : on stocke dès qu’on a le QR signé.
    if (!qrPayload) return
    saveTicketCache(booking.id, {
      passengerName,
      booking,
      qrPayload,
      qrValue: buildTicketQrValue(qrPayload),
    })
  }, [booking, passengerName, qrPayload])

  const qrValue = qrPayload ? buildTicketQrValue(qrPayload) : ''

  const departureStationName =
    booking.departureStationName || booking.departureCity || ''
  const arrivalStationName =
    booking.arrivalStationName || booking.destinationCity || ''

  const operatorPhone = booking.operatorPhone || ''
  const busNumber = booking.busNumber || null

  const paid = booking.status === 'paid' || booking.status === 'used'
  const used = booking.status === 'used'
  const pending = booking.status === 'pending_payment' || booking.status === 'confirmed'

  const qrTimestampMs = qrPayload?.timestamp
    ? Number(qrPayload.timestamp) * 1000
    : null

  const expired = paid && qrTimestampMs ? Date.now() > qrTimestampMs + 24 * 60 * 60 * 1000 : false

  const ticketStatus = used ? 'used' : pending ? 'pending' : expired ? 'expired' : 'confirmed'

  const ticketStatusMeta =
    ticketStatus === 'confirmed'
      ? { label: 'Confirmé', className: 'bg-emerald-100 text-emerald-900' }
      : ticketStatus === 'used'
        ? { label: 'Embarqué', className: 'bg-emerald-100 text-emerald-900' }
        : ticketStatus === 'pending'
          ? { label: 'En attente', className: 'bg-amber-100 text-amber-900' }
          : { label: 'Expiré', className: 'bg-red-100 text-red-900' }

  const runExport = useCallback(async (kind) => {
    const el = captureRef.current
    if (!el) return
    setExportError(null)
    setBusy(true)
    const base = `demgaw-billet-${shortId}`
    try {
      if (kind === 'png') {
        await exportTicketAsPng(el, `${base}.png`)
      } else {
        await exportTicketAsPdf(el, `${base}.pdf`)
      }
    } catch (e) {
      setExportError(e?.message ?? 'Export impossible.')
    } finally {
      setBusy(false)
    }
  }, [shortId])

  return (
    <div className="space-y-4">
      {showTitle ? (
        <h2 className="text-center text-lg font-bold tracking-tight text-slate-900">
          Votre billet numérique
        </h2>
      ) : null}

      <div className="flex justify-center px-1">
        <div
          ref={captureRef}
          id="demgaw-digital-ticket"
          className="relative w-full max-w-[360px] overflow-hidden rounded-sm border border-slate-900/10 bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.25)]"
          style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
        >
          {/* bandeau opérateur */}
          <div
            className="relative flex items-center justify-between px-4 py-3"
            style={{
              background:
                'linear-gradient(135deg, #047857 0%, #059669 45%, #ea580c 100%)',
            }}
          >
            <div className="text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-90">
                Transport interurbain
              </p>
              <p className="text-xl font-black tracking-tight">DemGaw</p>
            </div>
            <div className="rounded bg-white/15 px-2 py-1 text-right text-[10px] font-bold uppercase tracking-wider text-white">
              E-billet
            </div>
          </div>

          {/* motif sécurité léger */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `repeating-linear-gradient(
                -12deg,
                #065f46 0px,
                #065f46 1px,
                transparent 1px,
                transparent 8px
              )`,
            }}
            aria-hidden
          />

          <div className="relative px-5 pb-5 pt-4">
            <div className="flex items-start justify-between gap-3 border-b border-dashed border-slate-300 pb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Passager
                </p>
                <p className="mt-0.5 max-w-[200px] text-lg font-bold leading-tight text-slate-900">
                  {safeName}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${ticketStatusMeta.className}`}
                >
                  {ticketStatusMeta.label}
                </span>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Réf. billet
                </p>
                <p className="mt-0.5 font-mono text-sm font-bold text-brand-800">
                  {shortId}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-1">
              <p className="text-center text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                Trajet
              </p>
              <div className="flex items-center justify-center gap-2 text-center">
                <span className="max-w-[42%] text-xl font-black leading-tight text-slate-900">
                  {departureStationName}
                </span>
                <span
                  className="shrink-0 text-2xl font-light text-warm-500"
                  aria-hidden
                >
                  →
                </span>
                <span className="max-w-[42%] text-xl font-black leading-tight text-slate-900">
                  {arrivalStationName}
                </span>
              </div>

              <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {booking.departureCity} → {booking.destinationCity}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Date
                </p>
                <p className="mt-0.5 text-sm font-bold text-slate-900">
                  {formatTripDateLabel(booking.date)}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Départ
                </p>
                <p className="mt-0.5 text-sm font-bold text-slate-900">
                  {booking.time}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Siège
                </p>
                <p className="mt-0.5 text-lg font-black tabular-nums text-brand-800">
                  {booking.seatNumber}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Tarif
                </p>
                <p className="mt-0.5 text-sm font-bold text-slate-900">
                  {formatXOF(booking.price)}
                </p>
              </div>
            </div>

            {booking.operator || operatorPhone || busNumber ? (
              <div className="mt-3 space-y-1 text-center">
                {booking.operator ? (
                  <p className="text-xs font-medium text-slate-500">
                    Opérateur :{' '}
                    <span className="text-slate-800">{booking.operator}</span>
                  </p>
                ) : null}
                {operatorPhone ? (
                  <p className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
                    <Phone className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                    <span className="text-slate-800">{operatorPhone}</span>
                  </p>
                ) : null}
                {busNumber ? (
                  <p className="text-xs font-medium text-slate-500">
                    Bus :{' '}
                    <span className="text-slate-800">{busNumber}</span>
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4 flex items-end justify-between gap-4 border-t border-dashed border-slate-300 pt-4">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  ID réservation (unique)
                </p>
                <p className="mt-1 break-all font-mono text-[10px] leading-snug text-slate-600">
                  {booking.id}
                </p>
              </div>
              <div className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                {qrLoading ? (
                  <div className="flex h-[104px] w-[104px] items-center justify-center">
                    <Loader2
                      className="h-6 w-6 animate-spin text-brand-600"
                      aria-hidden
                    />
                  </div>
                ) : qrError ? (
                  <div className="flex h-[104px] w-[104px] flex-col items-center justify-center gap-1 p-2 text-center">
                    <p className="text-[10px] font-semibold text-red-600">
                      QR indisponible
                    </p>
                    <p className="text-[8px] text-red-500">Erreur</p>
                  </div>
                ) : (
                  qrValue ? (
                    <QRCodeSVG
                      value={qrValue}
                      size={104}
                      level="M"
                      includeMargin={false}
                      fgColor="#064e3b"
                      bgColor="#ffffff"
                    />
                  ) : (
                    <div className="flex h-[104px] w-[104px] flex-col items-center justify-center gap-1 p-2 text-center">
                      <p className="text-[10px] font-semibold text-slate-600">
                        Paiement requis
                      </p>
                      <p className="text-[8px] text-slate-500">QR indisponible</p>
                    </div>
                  )
                )}
              </div>
            </div>

            <p className="mt-3 text-center text-[9px] leading-relaxed text-slate-500">
              Présentez ce billet à l’embarquement · Scan pour validation
            </p>
          </div>

          {/* talon visuel */}
          <div
            className="flex h-3 items-center justify-center gap-1 border-t border-slate-200 bg-slate-50"
            aria-hidden
          >
            {Array.from({ length: 24 }).map((_, i) => (
              <span key={i} className="h-1 w-1 rounded-full bg-slate-300" />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="w-full sm:w-auto"
          disabled={busy || qrLoading || !qrValue}
          onClick={() => runExport('png')}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <FileImage className="h-4 w-4" aria-hidden />
          )}
          Image (PNG)
        </Button>
        <Button
          type="button"
          variant="accent"
          size="md"
          className="w-full sm:w-auto"
          disabled={busy || qrLoading || !qrValue}
          onClick={() => runExport('pdf')}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <FileText className="h-4 w-4" aria-hidden />
          )}
          PDF
        </Button>
      </div>

      {exportError ? (
        <p className="text-center text-sm text-red-600" role="alert">
          {exportError}
        </p>
      ) : null}

      {showSaveHint ? (
        <p className="flex items-center justify-center gap-1 text-center text-xs text-slate-500">
          <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Enregistrez le billet sur votre téléphone avant le départ.
        </p>
      ) : null}
    </div>
  )
}
