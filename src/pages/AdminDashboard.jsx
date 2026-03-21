import { Link } from 'react-router-dom'
import { LayoutDashboard, Shield, Truck, UserRound } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useAuth } from '../hooks/useAuth'

export function AdminDashboard() {
  const { user } = useAuth()

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
          <Shield className="h-7 w-7" aria-hidden />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Accès restreint
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Tableau administrateur
          </h1>
          <p className="mt-2 text-slate-600">
            Connecté en tant qu’administrateur ({user?.email ?? '—'}).
          </p>
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <LayoutDashboard className="h-5 w-5 text-brand-600" aria-hidden />
          Espace admin
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Ici, vous pouvez gérer les trajets, les réservations et les paiements,
          les utilisateurs, et créer des comptes chauffeurs (après déploiement de
          la fonction Edge associée).
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link to="/dashboard/trips" className="sm:col-span-1">
            <Button variant="primary" size="lg" className="w-full">
              Gestion des trajets
            </Button>
          </Link>
          <Link to="/dashboard/bookings" className="sm:col-span-1">
            <Button variant="secondary" size="lg" className="w-full">
              Réservations & paiements
            </Button>
          </Link>
          <Link to="/dashboard/users" className="sm:col-span-1">
            <Button variant="secondary" size="lg" className="w-full">
              Gestion des utilisateurs
            </Button>
          </Link>
          <Link to="/dashboard/drivers" className="sm:col-span-1">
            <Button variant="secondary" size="lg" className="w-full gap-2">
              <Truck className="h-5 w-5 shrink-0" aria-hidden />
              Chauffeurs
            </Button>
          </Link>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link to="/compte" className="sm:flex-1">
            <Button variant="primary" size="lg" className="w-full gap-2">
              <UserRound className="h-5 w-5" aria-hidden />
              Mon espace voyageur
            </Button>
          </Link>
          <Link to="/trips" className="sm:flex-1">
            <Button variant="secondary" size="lg" className="w-full">
              Catalogue trajets
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
