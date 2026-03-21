import { NavLink } from 'react-router-dom'
import {
  Bus,
  CalendarCheck,
  Home,
  LayoutDashboard,
  QrCode,
  Truck,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const baseItem =
  'flex flex-1 flex-col items-center gap-1 rounded-2xl py-2.5 text-[11px] font-semibold transition-all duration-200'

export function MobileBottomNav() {
  const { user, isDriver } = useAuth()

  if (isDriver) {
    return (
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-100 bg-white/90 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-4px_24px_-4px_rgba(15,23,42,0.06)] backdrop-blur-xl md:hidden"
        aria-label="Navigation chauffeur"
      >
        <div className="mx-auto flex max-w-lg justify-around px-2">
          <NavLink
            to="/chauffeur"
            end
            className={({ isActive }) =>
              `${baseItem} ${isActive ? 'text-brand-700' : 'text-slate-400'}`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 shadow-inner shadow-brand-100/50'
                      : 'text-slate-400'
                  }`}
                >
                  <Truck className="h-5 w-5" aria-hidden />
                </span>
                Journée
              </>
            )}
          </NavLink>
          <NavLink
            to="/chauffeur/scan"
            className={({ isActive }) =>
              `${baseItem} ${isActive ? 'text-brand-700' : 'text-slate-400'}`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 shadow-inner shadow-brand-100/50'
                      : 'text-slate-400'
                  }`}
                >
                  <QrCode className="h-5 w-5" aria-hidden />
                </span>
                Scan
              </>
            )}
          </NavLink>
        </div>
      </nav>
    )
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-100 bg-white/90 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-4px_24px_-4px_rgba(15,23,42,0.06)] backdrop-blur-xl md:hidden"
      aria-label="Navigation principale"
    >
      <div className="mx-auto flex max-w-lg justify-around px-2">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `${baseItem} ${isActive ? 'text-brand-700' : 'text-slate-400'}`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 shadow-inner shadow-brand-100/50'
                    : 'text-slate-400'
                }`}
              >
                <Home className="h-5 w-5" aria-hidden />
              </span>
              Accueil
            </>
          )}
        </NavLink>
        <NavLink
          to="/trips"
          className={({ isActive }) =>
            `${baseItem} ${isActive ? 'text-brand-700' : 'text-slate-400'}`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 shadow-inner shadow-brand-100/50'
                    : 'text-slate-400'
                }`}
              >
                <Bus className="h-5 w-5" aria-hidden />
              </span>
              Trajets
            </>
          )}
        </NavLink>
        <NavLink
          to="/booking"
          className={({ isActive }) =>
            `${baseItem} ${isActive ? 'text-warm-600' : 'text-slate-400'}`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-colors ${
                  isActive
                    ? 'bg-orange-50 text-warm-600 shadow-inner shadow-orange-100/50'
                    : 'text-slate-400'
                }`}
              >
                <CalendarCheck className="h-5 w-5" aria-hidden />
              </span>
              Réserver
            </>
          )}
        </NavLink>
        <NavLink
          to={user ? '/compte' : '/login'}
          className={({ isActive }) =>
            `${baseItem} ${isActive ? 'text-brand-700' : 'text-slate-400'}`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 shadow-inner shadow-brand-100/50'
                    : 'text-slate-400'
                }`}
              >
                <LayoutDashboard className="h-5 w-5" aria-hidden />
              </span>
              Compte
            </>
          )}
        </NavLink>
      </div>
    </nav>
  )
}
