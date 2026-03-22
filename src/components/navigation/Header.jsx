import { Link, NavLink } from 'react-router-dom'
import { LogOut, Menu, QrCode, Shield, Truck, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'

const navLinkClass = ({ isActive }) =>
  `rounded-full px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-brand-50 text-brand-800'
      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
  }`

export function Header() {
  const [open, setOpen] = useState(false)
  const { user, logout, isAdmin, isDriver } = useAuth()

  const links = isDriver ? (
    <>
      <NavLink
        to="/chauffeur"
        end
        className={navLinkClass}
        onClick={() => setOpen(false)}
      >
        <span className="inline-flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5" aria-hidden />
          Journée
        </span>
      </NavLink>
      <NavLink
        to="/chauffeur/scan"
        className={navLinkClass}
        onClick={() => setOpen(false)}
      >
        <span className="inline-flex items-center gap-1.5">
          <QrCode className="h-3.5 w-3.5" aria-hidden />
          Scan billet
        </span>
      </NavLink>
    </>
  ) : (
    <>
      <NavLink to="/trips" className={navLinkClass} onClick={() => setOpen(false)}>
        Trajets
      </NavLink>
      <NavLink
        to="/booking"
        className={navLinkClass}
        onClick={() => setOpen(false)}
      >
        Réserver
      </NavLink>
      <NavLink
        to="/compte"
        className={navLinkClass}
        onClick={() => setOpen(false)}
      >
        Compte
      </NavLink>
      {isAdmin ? (
        <NavLink
          to="/dashboard"
          className={navLinkClass}
          onClick={() => setOpen(false)}
        >
          <span className="inline-flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" aria-hidden />
            Admin
          </span>
        </NavLink>
      ) : null}
    </>
  )

  async function handleLogout() {
    setOpen(false)
    await logout()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:gap-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-slate-900"
          onClick={() => setOpen(false)}
        >
          <img src="/logo.svg" alt="DemGaw" className="h-10 w-10 object-contain" />
          <div className="leading-tight">
            <span className="block text-lg font-bold tracking-tight">DemGaw</span>
            <span className="hidden text-[10px] font-medium uppercase tracking-wider text-slate-400 sm:block">
              Intercity
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">{links}</nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <span
                className="max-w-[140px] truncate text-sm text-slate-600"
                title={user.email ?? ''}
              >
                {user.displayName || user.email}
              </span>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" aria-hidden />
                Déconnexion
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Connexion
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="accent" size="sm">
                  S&apos;inscrire
                </Button>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/90 bg-white text-slate-800 shadow-sm transition active:scale-95 md:hidden"
          aria-expanded={open}
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-slate-100 bg-white px-4 py-5 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)] md:hidden">
          <div className="flex flex-col gap-1">{links}</div>
          {user ? (
            <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
              <p className="truncate text-sm text-slate-600">
                {user.displayName || user.email}
              </p>
              <Button
                variant="secondary"
                className="w-full"
                size="lg"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Déconnexion
              </Button>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-2.5 border-t border-slate-100 pt-5">
              <Link to="/login" onClick={() => setOpen(false)}>
                <Button variant="secondary" className="w-full" size="lg">
                  Connexion
                </Button>
              </Link>
              <Link to="/register" onClick={() => setOpen(false)}>
                <Button variant="accent" className="w-full" size="lg">
                  S&apos;inscrire
                </Button>
              </Link>
            </div>
          )}
        </div>
      ) : null}
    </header>
  )
}
