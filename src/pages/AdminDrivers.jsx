import { useEffect, useState } from 'react'
import { Loader2, Truck, UserPlus } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { adminCreateDriver, adminListDrivers } from '../supabase/adminDrivers'

const emptyForm = {
  full_name: '',
  phone: '',
  email: '',
  password: '',
  driver_operator: '',
}

export function AdminDrivers() {
  const [drivers, setDrivers] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState(null)

  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [formSuccess, setFormSuccess] = useState(null)

  async function refreshList() {
    setListLoading(true)
    setListError(null)
    try {
      const rows = await adminListDrivers()
      setDrivers(rows)
    } catch (e) {
      setListError(e instanceof Error ? e.message : String(e))
      setDrivers([])
    } finally {
      setListLoading(false)
    }
  }

  useEffect(() => {
    void refreshList()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)
    setSubmitting(true)
    try {
      await adminCreateDriver({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        password: form.password,
        driver_operator: form.driver_operator.trim(),
      })
      setForm(emptyForm)
      setFormSuccess('Compte chauffeur créé. L’utilisateur peut se connecter avec l’e-mail et le mot de passe définis.')
      await refreshList()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Chauffeurs
        </h1>
        <p className="mt-1 text-slate-600">
          Créer des comptes avec accès espace chauffeur (Auth Supabase + rôle{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-sm">driver</code>
          ). Le libellé opérateur doit correspondre au champ opérateur des trajets.
        </p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <UserPlus className="h-5 w-5 text-brand-600" aria-hidden />
          Nouveau chauffeur
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Déployez l’Edge Function{' '}
          <code className="rounded bg-slate-100 px-1 text-xs">admin-create-driver</code>{' '}
          sur votre projet Supabase pour activer la création depuis l’app.
        </p>

        <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <div className="sm:col-span-1">
            <Input
              name="full_name"
              label="Nom complet"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              required
              autoComplete="name"
            />
          </div>
          <div className="sm:col-span-1">
            <Input
              name="phone"
              type="tel"
              label="Téléphone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              required
              autoComplete="tel"
              placeholder="+221 …"
            />
          </div>
          <div className="sm:col-span-1">
            <Input
              name="email"
              type="email"
              label="E-mail (connexion)"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              autoComplete="email"
            />
          </div>
          <div className="sm:col-span-1">
            <Input
              name="password"
              type="password"
              label="Mot de passe initial"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              autoComplete="new-password"
              minLength={8}
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              name="driver_operator"
              label="Libellé opérateur (ex. DemGaw Express)"
              value={form.driver_operator}
              onChange={(e) =>
                setForm((f) => ({ ...f, driver_operator: e.target.value }))
              }
              required
              placeholder="Identique au champ « opérateur » des trajets"
            />
          </div>

          {formError ? (
            <p className="sm:col-span-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
              {formError}
            </p>
          ) : null}
          {formSuccess ? (
            <p className="sm:col-span-2 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
              {formSuccess}
            </p>
          ) : null}

          <div className="sm:col-span-2">
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Création…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" aria-hidden />
                  Créer le compte chauffeur
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      <div>
        <h2 className="text-lg font-bold text-slate-900">Chauffeurs enregistrés</h2>
        {listLoading ? (
          <div className="mt-6 flex flex-col items-center justify-center gap-3 py-12 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" aria-hidden />
            <p className="text-sm font-medium">Chargement…</p>
          </div>
        ) : listError ? (
          <Card className="mt-4 border-red-100 bg-red-50/40">
            <p className="text-sm font-semibold text-red-900">Erreur</p>
            <p className="mt-2 text-sm text-red-800">{listError}</p>
          </Card>
        ) : drivers.length === 0 ? (
          <Card className="mt-4">
            <p className="text-sm text-slate-600">Aucun chauffeur pour l’instant.</p>
          </Card>
        ) : (
          <div className="mt-4 grid gap-3">
            {drivers.map((d) => (
              <Card key={d.id} className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-800">
                      <Truck className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        {d.full_name?.trim() || '—'}
                      </p>
                      <p className="text-sm text-slate-600">{d.email ?? d.id}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Tél.{' '}
                        <span className="font-medium text-slate-800">
                          {d.phone?.trim() || '—'}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-slate-500 break-all">uid: {d.id}</p>
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="text-slate-500">Opérateur</span>
                    <p className="font-semibold text-slate-900">
                      {d.driver_operator ?? '—'}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
