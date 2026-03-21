import { useEffect, useMemo, useState } from 'react'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import {
  adminDeleteTrip,
  adminUpsertTrip,
  fetchTrips,
} from '../supabase/trips'
import { adminListDrivers } from '../supabase/adminDrivers'
import {
  coerceToStationValue,
  formatStationLabel,
  getStationOptionsByRegion,
  isKnownStationValue,
  SENEGAL_REGIONS_WITH_STATIONS,
} from '../data/locations'

function normalizeForId(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // enlever les accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function makeTripId({ departureCity, destinationCity, date, time }) {
  const dep = normalizeForId(departureCity)
  const dest = normalizeForId(destinationCity)
  const t = String(time ?? '').replace(/:/g, '')
  const d = String(date ?? '')
  return `trip_${dep}_${dest}_${d}_${t}`
}

const initialForm = {
  id: '',
  departureCity: coerceToStationValue('Dakar'),
  destinationCity: coerceToStationValue('Thiès'),
  date: '',
  time: '',
  price: 2500,
  availableSeats: 0,
  operator: '',
  duration: '',
}

export function AdminTrips() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [drivers, setDrivers] = useState([])
  const [driversLoading, setDriversLoading] = useState(true)
  const [driversError, setDriversError] = useState(null)

  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [formError, setFormError] = useState(null)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchTrips()
      setTrips(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setTrips([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  useEffect(() => {
    let mounted = true
    async function loadDrivers() {
      setDriversLoading(true)
      setDriversError(null)
      try {
        const list = await adminListDrivers()
        if (!mounted) return
        setDrivers(list)
      } catch (e) {
        if (!mounted) return
        setDriversError(e instanceof Error ? e.message : String(e))
        setDrivers([])
      } finally {
        if (mounted) setDriversLoading(false)
      }
    }
    void loadDrivers()
    return () => {
      mounted = false
    }
  }, [])

  const driverOperators = useMemo(() => {
    const set = new Set()
    for (const d of drivers) {
      const op = d.driver_operator ?? ''
      if (op.trim()) set.add(op.trim())
    }
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [drivers])

  const sortedTrips = useMemo(() => {
    // fetchTrips retourne déjà trié sur sort_key, mais on garde un fallback.
    return [...trips].sort((a, b) => String(a.sortKey ?? '').localeCompare(String(b.sortKey ?? '')))
  }, [trips])

  function resetForm() {
    setForm(initialForm)
    setFormError(null)
  }

  async function handleSave(e) {
    e.preventDefault()
    setFormError(null)

    const id = String(form.id ?? '').trim() || makeTripId(form)
    if (!form.departureCity || !form.destinationCity || !form.date || !form.time) {
      setFormError('Veuillez remplir au minimum départ, arrivée, date et heure.')
      return
    }

    const payload = {
      id,
      departureCity: isKnownStationValue(form.departureCity)
        ? formatStationLabel(form.departureCity)
        : form.departureCity.trim(),
      destinationCity: isKnownStationValue(form.destinationCity)
        ? formatStationLabel(form.destinationCity)
        : form.destinationCity.trim(),
      date: form.date,
      time: form.time,
      price: Number.parseInt(String(form.price ?? 0), 10) || 0,
      availableSeats: Number.parseInt(String(form.availableSeats ?? 0), 10) || 0,
      operator: form.operator ?? '',
      duration: form.duration ?? '',
    }

    setSaving(true)
    try {
      await adminUpsertTrip(payload)
      resetForm()
      await refresh()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(tripId) {
    if (!tripId) return
    const ok = window.confirm(
      'Supprimer ce trajet ? (attention : les réservations existantes peuvent empêcher la suppression)',
    )
    if (!ok) return

    setDeleting(true)
    try {
      await adminDeleteTrip(tripId)
      await refresh()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Gestion des trajets
        </h1>
        <p className="mt-1 text-slate-600">
          Ajoutez, modifiez ou supprimez les trajets (via RPC admin).
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-brand-600" aria-hidden />
              <p className="text-sm font-medium">Chargement des trajets…</p>
            </div>
          ) : error ? (
            <Card className="border-red-100 bg-red-50/40">
              <p className="text-sm font-semibold text-red-900">Erreur</p>
              <p className="mt-2 text-sm text-red-800">{error}</p>
            </Card>
          ) : sortedTrips.length === 0 ? (
            <Card>
              <p className="font-semibold text-slate-900">Aucun trajet</p>
              <p className="mt-2 text-sm text-slate-600">
                Ajoutez un trajet ci-contre, ou importez la démo depuis la page `Catalogue trajets`.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {sortedTrips.map((t) => (
                <Card key={t.id} className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {formatStationLabel(t.departureCity)} → {formatStationLabel(t.destinationCity)}
                      </p>
                      <p className="mt-1 text-lg font-bold tracking-tight text-slate-900">
                        {t.date} · {t.time}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        Prix : <span className="font-semibold">{t.price} XOF</span> · Places :{' '}
                        <span className="font-semibold">{t.availableSeats}</span>
                      </p>
                      {t.operator ? (
                        <p className="mt-1 text-sm text-slate-600">
                          Opérateur : <span className="font-semibold">{t.operator}</span>
                        </p>
                      ) : null}

                      {!driversLoading && t.operator ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Chauffeurs assignés (opérateur) :{' '}
                          <span className="font-semibold text-slate-700">
                            {drivers.filter((d) => d.driver_operator === t.operator).length}
                          </span>
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-2 sm:items-end">
                      <Button
                        type="button"
                        variant="secondary"
                        className="gap-2"
                        onClick={() => {
                          setForm({
                            id: t.id,
                            departureCity: coerceToStationValue(t.departureCity),
                            destinationCity: coerceToStationValue(t.destinationCity),
                            date: t.date,
                            time: t.time,
                            price: t.price,
                            availableSeats: t.availableSeats,
                            operator: t.operator ?? '',
                            duration: t.duration ?? '',
                          })
                          setFormError(null)
                        }}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                        Modifier
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        className="gap-2"
                        disabled={deleting}
                        onClick={() => handleDelete(t.id)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">Trajet</p>
              <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={resetForm}>
                <Plus className="h-4 w-4" aria-hidden />
                Nouveau
              </Button>
            </div>

            <form className="mt-4 space-y-4" onSubmit={handleSave}>
              <Input
                label="ID (optionnel)"
                name="id"
                value={form.id}
                onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                placeholder={makeTripId({
                  departureCity: 'Pompiers Dakar',
                  destinationCity: 'Thiès principale',
                  date: '2026-03-22',
                  time: '08:00',
                })}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Départ (gare)</label>
                  <select
                    name="departureCity"
                    value={form.departureCity}
                    onChange={(e) => setForm((f) => ({ ...f, departureCity: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-sm text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                  >
                    {SENEGAL_REGIONS_WITH_STATIONS.map((entry) => (
                      <optgroup key={entry.region} label={entry.region}>
                        {getStationOptionsByRegion(entry.region).map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.station}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Arrivée (gare)</label>
                  <select
                    name="destinationCity"
                    value={form.destinationCity}
                    onChange={(e) => setForm((f) => ({ ...f, destinationCity: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-sm text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                  >
                    {SENEGAL_REGIONS_WITH_STATIONS.map((entry) => (
                      <optgroup key={entry.region} label={entry.region}>
                        {getStationOptionsByRegion(entry.region).map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.station}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Date (YYYY-MM-DD)"
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
                <Input
                  label="Heure (HH:MM)"
                  type="time"
                  name="time"
                  value={form.time}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Prix (XOF)"
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  min={0}
                />
                <Input
                  label="Places disponibles"
                  type="number"
                  name="availableSeats"
                  value={form.availableSeats}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, availableSeats: e.target.value }))
                  }
                  min={0}
                />
              </div>

              <Input
                label="Opérateur"
                name="operator"
                value={form.operator}
                onChange={(e) => setForm((f) => ({ ...f, operator: e.target.value }))}
                placeholder="Teranga Bus"
                list="driver-operators"
              />

              {driverOperators.length ? (
                <datalist id="driver-operators">
                  {driverOperators.map((op) => (
                    <option key={op} value={op} />
                  ))}
                </datalist>
              ) : null}

              {driversError ? (
                <p className="text-xs text-red-700">
                  Les chauffeurs ne peuvent pas être chargés : {driversError}
                </p>
              ) : null}

              {driversLoading ? (
                <p className="text-xs text-slate-500">Chauffeurs…</p>
              ) : form.operator ? (
                <p className="text-xs text-slate-500">
                  Match chauffeurs :{' '}
                  <span className="font-semibold text-slate-700">
                    {drivers.filter((d) => d.driver_operator === form.operator).length}
                  </span>
                </p>
              ) : null}

              <Input
                label="Durée"
                name="duration"
                value={form.duration}
                onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                placeholder="1 h"
              />

              {formError ? (
                <p className="text-sm text-red-700" role="alert">
                  {formError}
                </p>
              ) : null}

              <Button type="submit" variant="primary" size="lg" className="w-full" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Sauvegarde…
                  </>
                ) : (
                  'Sauvegarder'
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}

