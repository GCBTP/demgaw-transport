import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

/**
 * Réservé aux utilisateurs avec rôle `admin` (table `profiles`).
 */
export function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth()
  const location = useLocation()
  const driverFallback = user?.role === 'driver' ? '/chauffeur' : '/compte'

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4">
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600"
          aria-hidden
        />
        <p className="text-sm font-medium text-slate-500">Chargement…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <Navigate to="/login" replace state={{ from: location }} />
    )
  }

  if (!isAdmin) {
    return (
      <Navigate
        to={driverFallback}
        replace
        state={{ from: location, adminDenied: true }}
      />
    )
  }

  return children
}
