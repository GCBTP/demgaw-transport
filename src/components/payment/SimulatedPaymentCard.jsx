import { CheckCircle2, CreditCard, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

/**
 * @param {{
 *   amountLabel: string
 *   onPay?: () => void | Promise<void>
 *   busy?: boolean
 *   error?: string | null
 *   paid?: boolean
 * }} props
 */
export function SimulatedPaymentCard({
  amountLabel,
  onPay = async () => {},
  busy = false,
  error = null,
  paid = false,
}) {
  if (paid) {
    return (
      <Card className="border-emerald-200/90 bg-gradient-to-br from-emerald-50 to-white">
        <div className="flex gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-7 w-7" strokeWidth={2} aria-hidden />
          </span>
          <div>
            <h3 className="text-lg font-bold text-emerald-900">
              Paiement réussi
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-emerald-800/90">
              Votre transaction a été enregistrée (mode simulation). Votre billet
              numérique est disponible ci-dessous. Un vrai prestataire de
              paiement pourra remplacer cette étape plus tard.
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Montant réglé : {amountLabel}
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="border-warm-200/60 bg-gradient-to-b from-amber-50/50 to-white">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warm-100 text-warm-700">
          <CreditCard className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-900">Paiement (simulation)</h3>
          <p className="mt-1 text-sm text-slate-600">
            Réglez <span className="font-semibold text-slate-900">{amountLabel}</span>{' '}
            pour activer votre billet. Aucune carte bancaire n’est demandée pour
            l’instant.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          size="lg"
          variant="accent"
          className="w-full sm:w-auto"
          disabled={busy}
          onClick={() => onPay()}
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <CreditCard className="h-5 w-5" aria-hidden />
          )}
          Payer maintenant
        </Button>
        <p className="text-center text-[11px] text-slate-500 sm:text-right">
          API de paiement réelle à brancher ici (Stripe, Wave, etc.)
        </p>
      </div>

      {error ? (
        <p
          className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </Card>
  )
}
