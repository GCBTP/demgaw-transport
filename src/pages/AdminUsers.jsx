import { useEffect, useState } from 'react'
import { Loader2, Shield, Truck, UserRound } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { adminListUsers, adminSetUserRole } from '../supabase/profiles'

export function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [savingUserId, setSavingUserId] = useState(null)
  const [updateErrors, setUpdateErrors] = useState({})
  /** @type {Record<string, { role: 'admin' | 'client' | 'driver', operator: string }>} */
  const [driverDraft, setDriverDraft] = useState({})

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const list = await adminListUsers()
      setUsers(list)
      setDriverDraft({})
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  function displayRole(u) {
    const d = driverDraft[u.id]
    return d?.role ?? u.role
  }

  async function handleUpdateRole(userId, nextRole, driverOperator = null) {
    setSavingUserId(userId)
    setUpdateErrors((prev) => ({ ...prev, [userId]: null }))
    try {
      await adminSetUserRole(userId, nextRole, driverOperator)
      await refresh()
    } catch (e) {
      setUpdateErrors((prev) => ({
        ...prev,
        [userId]: e instanceof Error ? e.message : String(e),
      }))
    } finally {
      setSavingUserId(null)
    }
  }

  function handleRoleSelectChange(u, nextRole) {
    if (nextRole === 'driver') {
      setDriverDraft((prev) => ({
        ...prev,
        [u.id]: {
          role: 'driver',
          operator: u.driverOperator ?? '',
        },
      }))
      return
    }
    setDriverDraft((prev) => {
      const n = { ...prev }
      delete n[u.id]
      return n
    })
    if (nextRole !== u.role) {
      void handleUpdateRole(u.id, nextRole, null)
    }
  }

  function cancelDriverDraft(userId) {
    setDriverDraft((prev) => {
      const n = { ...prev }
      delete n[userId]
      return n
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Gestion des utilisateurs
        </h1>
        <p className="mt-1 text-slate-600">
          Rôles : client, administrateur, ou chauffeur (réservé aux comptes créés
          d’abord par inscription — vous assignez ensuite le rôle chauffeur et
          l’opérateur, identique au libellé sur les trajets).
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" aria-hidden />
          <p className="text-sm font-medium">Chargement des utilisateurs…</p>
        </div>
      ) : error ? (
        <Card className="border-red-100 bg-red-50/40">
          <p className="text-sm font-semibold text-red-900">Erreur</p>
          <p className="mt-2 text-sm text-red-800">{error}</p>
        </Card>
      ) : users.length === 0 ? (
        <Card>
          <p className="font-semibold text-slate-900">Aucun utilisateur</p>
          <p className="mt-2 text-sm text-slate-600">
            Crée des comptes, puis reviens ici pour les promouvoir.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {users.map((u) => {
            const dr = driverDraft[u.id]
            const showingDriverForm = dr?.role === 'driver'
            return (
              <Card key={u.id} className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <UserRound className="h-4 w-4 text-brand-600" aria-hidden />
                      {u.email ?? u.id}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 break-all">uid: {u.id}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${
                          u.role === 'admin'
                            ? 'bg-brand-50 text-brand-900 ring-brand-200/80'
                            : u.role === 'driver'
                              ? 'bg-amber-50 text-amber-900 ring-amber-200/80'
                              : 'bg-slate-100 text-slate-700 ring-slate-200/80'
                        }`}
                      >
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1">
                            <Shield className="h-3.5 w-3.5" aria-hidden />
                            admin
                          </span>
                        ) : u.role === 'driver' ? (
                          <span className="inline-flex items-center gap-1">
                            <Truck className="h-3.5 w-3.5" aria-hidden />
                            chauffeur
                          </span>
                        ) : (
                          'client'
                        )}
                      </span>
                      {u.role === 'driver' && u.driverOperator ? (
                        <span className="text-xs text-slate-600">
                          opérateur :{' '}
                          <span className="font-semibold text-slate-800">
                            {u.driverOperator}
                          </span>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:items-end sm:min-w-[220px]">
                    <div className="flex items-center gap-2">
                      <select
                        value={displayRole(u)}
                        disabled={savingUserId === u.id}
                        onChange={(e) => {
                          const v = e.target.value
                          handleRoleSelectChange(
                            u,
                            v === 'admin' ? 'admin' : v === 'driver' ? 'driver' : 'client',
                          )
                        }}
                        className="rounded-2xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                      >
                        <option value="client">client</option>
                        <option value="admin">admin</option>
                        <option value="driver">chauffeur</option>
                      </select>
                    </div>

                    {showingDriverForm ? (
                      <div className="w-full max-w-sm space-y-2 rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                        <Input
                          label="Libellé opérateur (ex. DemGaw Express)"
                          value={dr.operator}
                          onChange={(e) =>
                            setDriverDraft((prev) => ({
                              ...prev,
                              [u.id]: { ...prev[u.id], operator: e.target.value },
                            }))
                          }
                          placeholder="Identique au champ « opérateur » du trajet"
                          disabled={savingUserId === u.id}
                        />
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            type="button"
                            size="sm"
                            disabled={savingUserId === u.id || !dr.operator.trim()}
                            onClick={() =>
                              void handleUpdateRole(u.id, 'driver', dr.operator.trim())
                            }
                          >
                            Enregistrer chauffeur
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={savingUserId === u.id}
                            onClick={() => cancelDriverDraft(u.id)}
                          >
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {updateErrors[u.id] ? (
                      <p className="text-sm text-red-700">{updateErrors[u.id]}</p>
                    ) : null}
                    {savingUserId === u.id ? (
                      <Button type="button" variant="secondary" disabled className="gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Mise à jour…
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
