import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { exportTicketAsPng, exportTicketAsPdf } from '../utils/ticketExport'

export function DriverBadge() {
  const { user } = useAuth()
  const captureRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [downloaded, setDownloaded] = useState(false)

  const badgePayload = useMemo(() => {
    return JSON.stringify({
      kind: 'demgaw_driver',
      id: user?.id,
      operator: user?.driverOperator,
    })
  }, [user?.id, user?.driverOperator])

  async function runExport(kind) {
    setError(null)
    setDownloaded(false)
    setBusy(true)
    try {
      const el = captureRef.current
      if (!el) throw new Error('Badge introuvable')

      if (kind === 'png') {
        await exportTicketAsPng(el, `demgaw-chauffeur-${user?.id ?? 'badge'}.png`)
      } else {
        await exportTicketAsPdf(el, `demgaw-chauffeur-${user?.id ?? 'badge'}.pdf`)
      }
      setDownloaded(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (!user) return null

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-4">
      <div className="flex items-center gap-3">
        <Link
          to="/chauffeur"
          className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm active:scale-[0.98]"
          aria-label="Retour tableau de bord"
        >
          <ArrowLeft className="h-6 w-6" aria-hidden />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Badge chauffeur
          </h1>
          <p className="text-sm text-slate-600">Identifiant + opérateur</p>
        </div>
      </div>

      {error ? (
        <Card className="border-red-100 bg-red-50/50 p-4">
          <p className="text-sm font-semibold text-red-900">{error}</p>
        </Card>
      ) : null}

      {downloaded ? (
        <Card className="border-emerald-100 bg-emerald-50/50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-700" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Badge téléchargé
              </p>
              <p className="mt-1 text-xs text-emerald-800">
                Vous pouvez l’imprimer ou l’afficher hors-ligne.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="p-4">
        <div
          ref={captureRef}
          id="demgaw-driver-badge"
          className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5"
          style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-5"
            style={{
              backgroundImage:
                'repeating-linear-gradient(-12deg, #047857 0px, #047857 1px, transparent 1px, transparent 8px)',
            }}
          />

          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Transport interurbain
              </p>
              <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                DemGaw
              </p>
              <p className="mt-3 text-sm font-semibold text-slate-900 truncate">
                {user.displayName || user.email}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Opérateur :{' '}
                <span className="font-semibold text-slate-900">
                  {user.driverOperator ?? '—'}
                </span>
              </p>
              {user.phone ? (
                <p className="mt-1 text-sm text-slate-600">
                  Tél. :{' '}
                  <span className="font-semibold text-slate-900">
                    {user.phone}
                  </span>
                </p>
              ) : null}
              <p className="mt-2 font-mono text-xs text-slate-500 break-all">
                uid: {user.id}
              </p>
            </div>

            <div className="shrink-0">
              <div className="rounded-xl bg-slate-50 p-2">
                <QRCodeSVG value={badgePayload} size={120} level="M" />
              </div>
              <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
                QR identité
              </p>
            </div>
          </div>

          <div className="relative mt-5 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 p-3 text-white">
            <p className="text-xs font-bold uppercase tracking-widest opacity-95">
              Présentation au contrôle
            </p>
            <p className="mt-1 text-sm font-semibold">
              Espace chauffeur :{' '}
              <span className="opacity-95">{user.driverOperator ?? '—'}</span>
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          size="lg"
          onClick={() => void runExport('png')}
          disabled={busy}
          className="gap-2"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Télécharger PNG
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => void runExport('pdf')}
          disabled={busy}
          className="gap-2"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Télécharger PDF
        </Button>
      </div>
    </div>
  )
}

