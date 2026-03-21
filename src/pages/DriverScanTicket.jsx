import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardPaste,
  Loader2,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { supabase } from '../supabase/client'
import {
  consumeTicketFromScan,
  validateTicketQrFromScan,
} from '../supabase/driverManifest'

const REASON_LABEL = {
  TICKET_QR_SECRET_NOT_SET: 'Configuration billet indisponible',
  BAD_SIGNATURE: 'Signature du billet invalide',
  TIMESTAMP_NOT_IN_RANGE: 'Horodatage du QR incohérent',
  EXPIRED: 'QR expiré (plus de 24 h)',
  BOOKING_NOT_FOUND: 'Réservation introuvable',
  NOT_PAID: 'Billet non payé',
  ALREADY_USED: 'Ticket already used',
}

export function DriverScanTicket() {
  const [pasteValue, setPasteValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [scanPayload, setScanPayload] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [scannerReady, setScannerReady] = useState(false)
  const [scannerActive, setScannerActive] = useState(false)
  const scannerRef = useRef(null)
  const validatingRef = useRef(false)

  const runValidate = useCallback(async (raw) => {
    setError(null)
    setResult(null)
    setConfirmation(null)
    setScanPayload(null)
    setBusy(true)
    try {
      const v = await validateTicketQrFromScan(raw)
      if (!v.valid) {
        setResult({
          ok: false,
          reason: v.reason,
          label:
            (v.reason && REASON_LABEL[v.reason]) || v.reason || 'Billet refusé',
        })
        return
      }

      const { data: booking, error: bErr } = await supabase
        .from('bookings')
        .select(
          'id, trip_id, seat_number, status, departure_city, destination_city, date, time, operator, price',
        )
        .eq('id', v.bookingId)
        .maybeSingle()

      if (bErr) throw new Error(bErr.message)
      setResult({ ok: true, booking })
      setScanPayload(v)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [])

  const handleConfirmUse = useCallback(async () => {
    if (!scanPayload || !result?.booking) return
    setError(null)
    setConfirmation(null)
    setConfirmBusy(true)
    try {
      const r = await consumeTicketFromScan(scanPayload)
      if (!r.valid) {
        if (r.reason === 'ALREADY_USED') {
          setConfirmation({
            ok: false,
            label: 'Ticket already used',
            usedAt: r.usedAt,
          })
          return
        }
        setConfirmation({
          ok: false,
          label:
            (r.reason && REASON_LABEL[r.reason]) ||
            r.reason ||
            'Validation refusée',
        })
        return
      }

      setConfirmation({
        ok: true,
        label: 'Valid Ticket',
        usedAt: r.usedAt,
      })
      setResult((prev) =>
        prev?.booking
          ? {
              ...prev,
              booking: {
                ...prev.booking,
                status: 'used',
                used_at: r.usedAt ?? prev.booking.used_at ?? null,
              },
            }
          : prev,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setConfirmBusy(false)
    }
  }, [scanPayload, result?.booking])

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current
    if (!scanner) return
    try {
      if (scanner.isScanning) {
        await scanner.stop()
      }
      await scanner.clear()
    } catch {
      // ignore stop errors from rapid navigation
    } finally {
      setScannerActive(false)
    }
  }, [])

  const startScanner = useCallback(async () => {
    setError(null)
    setResult(null)
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('driver-qr-reader')
      }
      const scanner = scannerRef.current
      const cameras = await Html5Qrcode.getCameras()
      if (!cameras?.length) {
        throw new Error('Aucune caméra détectée sur cet appareil.')
      }

      const preferredCamera = cameras.find((c) =>
        /back|rear|environment|arrière/i.test(c.label),
      )
      const cameraId = preferredCamera?.id ?? cameras[0].id

      await scanner.start(
        cameraId,
        {
          fps: 8,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.33,
        },
        async (decodedText) => {
          if (validatingRef.current) return
          validatingRef.current = true
          await runValidate(decodedText)
          validatingRef.current = false
        },
      )
      setScannerActive(true)
      setScannerReady(true)
    } catch (e) {
      setScannerActive(false)
      setScannerReady(false)
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [runValidate])

  useEffect(() => {
    void startScanner()
    return () => {
      void stopScanner()
    }
  }, [startScanner, stopScanner])

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/chauffeur"
          className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm active:scale-[0.98]"
          aria-label="Retour tableau de bord"
        >
          <ArrowLeft className="h-6 w-6" aria-hidden />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Scanner un billet
          </h1>
          <p className="text-sm text-slate-600">Vérification du QR payé</p>
        </div>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">Caméra QR</p>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              scannerActive
                ? 'bg-brand-100 text-brand-900'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {scannerActive ? 'ACTIVE' : 'ARRÊTÉE'}
          </span>
        </div>
        <div
          id="driver-qr-reader"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
        />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button
            type="button"
            size="lg"
            className="h-14 text-base font-semibold"
            disabled={busy || scannerActive}
            onClick={() => void startScanner()}
          >
            <Camera className="h-5 w-5" aria-hidden />
            Démarrer
          </Button>
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="h-14 text-base font-semibold"
            disabled={busy || !scannerActive}
            onClick={() => void stopScanner()}
          >
            Stop
          </Button>
        </div>
        {!scannerReady ? (
          <p className="mt-3 text-xs text-slate-500">
            Autorisez la caméra si le navigateur le demande.
          </p>
        ) : null}
      </Card>

      <Card className="p-5">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <ClipboardPaste className="h-4 w-4 text-brand-600" aria-hidden />
          Coller le contenu du QR
        </label>
        <textarea
          value={pasteValue}
          onChange={(e) => setPasteValue(e.target.value)}
          rows={4}
          placeholder="booking_id|user_id|timestamp|signature"
          className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-inner placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          autoComplete="off"
          spellCheck={false}
        />
        <Button
          type="button"
          size="lg"
          className="mt-4 h-14 w-full text-base font-semibold"
          disabled={busy || !pasteValue.trim()}
          onClick={() => void runValidate(pasteValue)}
        >
          {busy ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              Vérification…
            </>
          ) : (
            'Valider'
          )}
        </Button>
      </Card>

      {error ? (
        <Card className="border-red-100 bg-red-50/50 p-4">
          <p className="text-sm font-semibold text-red-900">{error}</p>
        </Card>
      ) : null}

      {result?.ok === false ? (
        <Card className="border-amber-100 bg-amber-50/60 p-5">
          <div className="flex items-start gap-3">
            <XCircle className="h-8 w-8 shrink-0 text-amber-700" aria-hidden />
            <div>
              <p className="font-bold text-amber-950">Billet non valide</p>
              <p className="mt-1 text-sm text-amber-900">{result.label}</p>
            </div>
          </div>
        </Card>
      ) : null}

      {result?.ok === true && result.booking ? (
        <Card className="border-brand-100 bg-brand-50/40 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2
              className="h-8 w-8 shrink-0 text-brand-700"
              aria-hidden
            />
            <div className="min-w-0 space-y-1">
              <p className="font-bold text-brand-950">Billet valide</p>
              <p className="text-lg font-semibold text-slate-900">
                {result.booking.departure_city} → {result.booking.destination_city}
              </p>
              <p className="text-base text-slate-700">
                {result.booking.date} · {result.booking.time}
              </p>
              <p className="text-base font-medium text-slate-800">
                Siège {result.booking.seat_number}
              </p>
              <p className="font-mono text-xs text-slate-500">
                {result.booking.id}
              </p>
              <p className="text-sm font-medium text-slate-700">
                Statut: {result.booking.status}
              </p>
            </div>
          </div>

          <Button
            type="button"
            size="lg"
            className="mt-4 h-14 w-full text-base font-semibold"
            disabled={confirmBusy || busy || !scanPayload}
            onClick={() => void handleConfirmUse()}
          >
            {confirmBusy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                Validation…
              </>
            ) : (
              <>
                <ShieldCheck className="h-5 w-5" aria-hidden />
                Confirmer embarquement
              </>
            )}
          </Button>
        </Card>
      ) : null}

      {confirmation?.ok === true ? (
        <Card className="border-brand-100 bg-brand-50/50 p-4">
          <p className="text-sm font-bold text-brand-900">{confirmation.label}</p>
          {confirmation.usedAt ? (
            <p className="mt-1 text-xs text-brand-800">
              used_at: {new Date(confirmation.usedAt).toLocaleString()}
            </p>
          ) : null}
        </Card>
      ) : null}

      {confirmation?.ok === false ? (
        <Card className="border-amber-100 bg-amber-50/50 p-4">
          <p className="text-sm font-bold text-amber-900">{confirmation.label}</p>
          {confirmation.usedAt ? (
            <p className="mt-1 text-xs text-amber-800">
              used_at: {new Date(confirmation.usedAt).toLocaleString()}
            </p>
          ) : null}
        </Card>
      ) : null}
    </div>
  )
}
