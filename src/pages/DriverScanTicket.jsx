import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Camera, CheckCircle2, Hash, Loader2, ShieldCheck, XCircle } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { consumeTicketFromScan, validateTicketByRef } from '../supabase/driverManifest'

const REASON_LABEL = {
  TICKET_QR_SECRET_NOT_SET: 'Configuration billet indisponible',
  BAD_SIGNATURE: 'Signature du billet invalide',
  TIMESTAMP_NOT_IN_RANGE: 'Horodatage du QR incohérent',
  EXPIRED: 'QR expiré (plus de 24 h)',
  BOOKING_NOT_FOUND: 'Réservation introuvable',
  NOT_PAID: 'Billet non payé',
  ALREADY_USED: 'Billet déjà utilisé',
  NOT_AUTHORIZED: 'Non autorisé',
  DRIVER_OPERATOR_NOT_SET: 'Opérateur chauffeur non configuré',
}

function playBeep(ok = true) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = ok ? 880 : 300
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (ok ? 0.3 : 0.5))
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + (ok ? 0.3 : 0.5))
  } catch { /* navigateur sans Web Audio */ }
}

export function DriverScanTicket() {
  const [refValue, setRefValue] = useState('')
  const [refBusy, setRefBusy] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [validated, setValidated] = useState([])
  const [scannerReady, setScannerReady] = useState(false)
  const [scannerActive, setScannerActive] = useState(false)
  const scannerRef = useRef(null)
  const lockRef = useRef(false) // remplace busy pour éviter stale closure

  function addToHistory(data) {
    const booking = {
      id: data.booking_id,
      departure_city: data.departure_city,
      destination_city: data.destination_city,
      seat_number: data.seat_number,
      date: data.date,
      time: data.time,
    }
    setValidated((prev) => [
      { booking, usedAt: data.used_at ?? new Date().toISOString(), key: Date.now() },
      ...prev,
    ])
    return booking
  }

  // Stable — jamais recréée, utilise setValidated/setLastResult directement (stables)
  const runValidate = useCallback(async (raw) => {
    if (lockRef.current) return
    lockRef.current = true
    setLastResult(null)
    try {
      const line = String(raw ?? '').trim()
      const parts = line.split('|').map((s) => s.trim())
      if (parts.length < 4) throw new Error('QR invalide : 4 segments séparés par | attendus')
      const [bookingId, userId, tsStr, signature] = parts
      const ts = Number(tsStr)
      if (!bookingId || !userId || !Number.isFinite(ts) || !signature) throw new Error('QR invalide : données incomplètes')

      const data = await consumeTicketFromScan({ bookingId, userId, ts, signature })

      if (!data.valid) {
        playBeep(false)
        const reason = data.reason ?? 'UNKNOWN'
        setLastResult({ ok: false, label: REASON_LABEL[reason] || reason })
        return
      }

      playBeep(true)
      const booking = {
        id: data.booking_id,
        departure_city: data.departure_city,
        destination_city: data.destination_city,
        seat_number: data.seat_number,
        date: data.date,
        time: data.time,
      }
      setValidated((prev) => [
        { booking, usedAt: data.used_at ?? new Date().toISOString(), key: Date.now() },
        ...prev,
      ])
      setLastResult({ ok: true, label: 'Embarqué ✓', booking })
    } catch (e) {
      playBeep(false)
      setLastResult({ ok: false, label: e instanceof Error ? e.message : String(e) })
    } finally {
      lockRef.current = false
    }
  }, []) // setValidated/setLastResult sont stables → pas de dépendances

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current
    if (!scanner) return
    try {
      if (scanner.isScanning) await scanner.stop()
      await scanner.clear()
    } catch { /* ignore */ }
    finally { setScannerActive(false) }
  }, [])

  const startScanner = useCallback(async () => {
    setLastResult(null)
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('driver-qr-reader')
      }
      const scanner = scannerRef.current
      const cameras = await Html5Qrcode.getCameras()
      if (!cameras?.length) throw new Error('Aucune caméra détectée.')
      const preferred = cameras.find((c) => /back|rear|environment|arrière/i.test(c.label))
      await scanner.start(
        preferred?.id ?? cameras[0].id,
        { fps: 8, qrbox: { width: 260, height: 260 }, aspectRatio: 1.33 },
        (decodedText) => { void runValidate(decodedText) },
      )
      setScannerActive(true)
      setScannerReady(true)
    } catch (e) {
      setScannerActive(false)
      setScannerReady(false)
      setLastResult({ ok: false, label: e instanceof Error ? e.message : String(e) })
    }
  }, [runValidate])

  useEffect(() => {
    void startScanner()
    return () => { void stopScanner() }
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
          <p className="text-sm text-slate-600">
            {validated.length > 0 ? `${validated.length} embarqué${validated.length > 1 ? 's' : ''} cette session` : 'Vérification QR en temps réel'}
          </p>
        </div>
      </div>

      {/* Scanner caméra */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">Caméra QR</p>
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${scannerActive ? 'bg-brand-100 text-brand-900' : 'bg-slate-100 text-slate-700'}`}>
            {scannerActive ? 'ACTIVE' : 'ARRÊTÉE'}
          </span>
        </div>
        <div id="driver-qr-reader" className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button type="button" size="lg" className="h-14 text-base font-semibold" disabled={scannerActive} onClick={() => void startScanner()}>
            <Camera className="h-5 w-5" aria-hidden />
            Démarrer
          </Button>
          <Button type="button" size="lg" variant="secondary" className="h-14 text-base font-semibold" disabled={!scannerActive} onClick={() => void stopScanner()}>
            Stop
          </Button>
        </div>
        {!scannerReady ? <p className="mt-3 text-xs text-slate-500">Autorisez la caméra si le navigateur le demande.</p> : null}
      </Card>

      {/* Saisie référence manuelle */}
      <Card className="p-5">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Hash className="h-4 w-4 text-brand-600" aria-hidden />
          Référence du billet
        </label>
        <input
          type="text"
          value={refValue}
          onChange={(e) => setRefValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && refValue.trim() && !refBusy) e.currentTarget.form?.requestSubmit?.() }}
          placeholder="Réf. billet (ex: A1B2C3D4) ou UUID complet"
          className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-inner placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          autoComplete="off"
          spellCheck={false}
        />
        <Button
          type="button"
          size="lg"
          className="mt-4 h-14 w-full text-base font-semibold"
          disabled={refBusy || !refValue.trim()}
          onClick={async () => {
            setLastResult(null)
            setRefBusy(true)
            try {
              const r = await validateTicketByRef(refValue)
              if (!r.valid) {
                playBeep(false)
                setLastResult({ ok: false, label: REASON_LABEL[r.reason] || r.reason || 'Billet refusé' })
                return
              }
              playBeep(true)
              const booking = addToHistory(r)
              setLastResult({ ok: true, label: 'Embarqué ✓', booking })
              setRefValue('')
            } catch (e) {
              playBeep(false)
              setLastResult({ ok: false, label: e instanceof Error ? e.message : String(e) })
            } finally {
              setRefBusy(false)
            }
          }}
        >
          {refBusy ? <><Loader2 className="h-5 w-5 animate-spin" aria-hidden />Validation…</> : <><ShieldCheck className="h-5 w-5" aria-hidden />Valider et embarquer</>}
        </Button>
      </Card>

      {/* Résultat dernier scan */}
      {lastResult ? (
        <Card className={`p-4 ${lastResult.ok ? 'border-brand-100 bg-brand-50/50' : 'border-red-100 bg-red-50/50'}`}>
          <div className="flex items-center gap-3">
            {lastResult.ok
              ? <CheckCircle2 className="h-7 w-7 shrink-0 text-brand-700" aria-hidden />
              : <XCircle className="h-7 w-7 shrink-0 text-red-600" aria-hidden />}
            <div>
              <p className={`font-bold ${lastResult.ok ? 'text-brand-900' : 'text-red-900'}`}>{lastResult.label}</p>
              {lastResult.booking ? (
                <p className="text-sm text-slate-700">
                  {lastResult.booking.departure_city} → {lastResult.booking.destination_city} · Siège {lastResult.booking.seat_number}
                </p>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      {/* Historique session */}
      {validated.length > 0 ? (
        <Card className="p-4">
          <p className="mb-3 text-sm font-bold text-slate-800">
            Billets embarqués — session ({validated.length})
          </p>
          <ul className="space-y-2">
            {validated.map((entry) => (
              <li key={entry.key} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium text-slate-900">
                  {entry.booking?.departure_city ?? '?'} → {entry.booking?.destination_city ?? '?'}
                  {entry.booking?.seat_number ? ` · Siège ${entry.booking.seat_number}` : ''}
                </span>
                <span className="ml-3 shrink-0 font-mono text-xs text-slate-500">
                  {new Date(entry.usedAt).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  )
}
