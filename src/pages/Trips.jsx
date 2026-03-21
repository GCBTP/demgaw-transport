import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { TripCard } from '../components/trips/TripCard'
import { Button } from '../components/ui/Button'
import { seedSampleTrips } from '../supabase/trips'
import { useAuth } from '../hooks/useAuth'
import { useTrips } from '../hooks/useTrips'

export function Trips() {
  const { trips, loading, error } = useTrips()
  const { user } = useAuth()
  const [seeding, setSeeding] = useState(false)
  const [seedMessage, setSeedMessage] = useState(null)

  async function handleSeed() {
    if (!user) {
      setSeedMessage('Connectez-vous pour importer les trajets de démonstration.')
      return
    }
    setSeeding(true)
    setSeedMessage(null)
    try {
      await seedSampleTrips()
      setSeedMessage('Trajets de démonstration importés.')
    } catch (e) {
      setSeedMessage(
        e.message ??
          'Impossible d’écrire dans Supabase (RLS : connectez-vous, ou vérifiez les politiques).',
      )
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Trajets disponibles
        </h1>
        <p className="mt-1 text-slate-600">
          Données Supabase (table <code className="rounded bg-slate-100 px-1">trips</code>
          ) — temps réel si la publication Realtime est activée.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-semibold">Erreur</p>
          <p className="mt-1">{error}</p>
          <p className="mt-2 text-red-700/90">
            Vérifiez le schéma SQL (<code className="rounded bg-red-100 px-1">supabase/migrations</code>
            ), les clés <code className="rounded bg-red-100 px-1">.env</code> et que la
            table <code className="rounded bg-red-100 px-1">trips</code> existe.
          </p>
        </div>
      ) : null}

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" aria-hidden />
          <p className="text-sm font-medium">Chargement des trajets…</p>
        </div>
      ) : trips.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
          <p className="font-semibold text-slate-800">Aucun trajet pour le moment</p>
          <p className="mt-2 text-sm text-slate-600">
            Exécutez le script SQL dans Supabase, puis importez les trajets de démo
            (départs/arrivées couvrant les 14 régions du Sénégal).
          </p>
          <Button
            variant="accent"
            size="lg"
            className="mt-6"
            disabled={seeding}
            onClick={handleSeed}
          >
            {seeding ? 'Import…' : 'Importer les trajets de démo'}
          </Button>
          {!user ? (
            <p className="mt-3 text-xs text-slate-500">
              Connexion requise pour l’import (politiques RLS).
            </p>
          ) : null}
          {seedMessage ? (
            <p className="mt-4 text-sm text-slate-600">{seedMessage}</p>
          ) : null}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              {trips.length} trajet{trips.length > 1 ? 's' : ''} au catalogue
            </p>
            {user ? (
              <Button
                variant="secondary"
                size="sm"
                disabled={seeding}
                onClick={handleSeed}
              >
                {seeding ? 'Mise à jour…' : 'Réimporter la démo'}
              </Button>
            ) : null}
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </>
      )}

      {seedMessage && trips.length > 0 ? (
        <p className="text-center text-sm text-slate-600">{seedMessage}</p>
      ) : null}
    </div>
  )
}
