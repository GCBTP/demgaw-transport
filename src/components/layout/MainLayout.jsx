import { Navigate, useLocation } from 'react-router-dom'
import { Header } from '../navigation/Header'
import { MobileBottomNav } from '../navigation/MobileBottomNav'
import { OfflineBanner } from '../ui/OfflineBanner'
import { useAuth } from '../../hooks/useAuth'

export function MainLayout({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (
    !loading &&
    user?.role === 'driver' &&
    !location.pathname.startsWith('/chauffeur')
  ) {
    return <Navigate to="/chauffeur" replace />
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#FAFBFC]">
      <OfflineBanner />
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 sm:pb-12 sm:pt-8 md:pb-14">
        {children}
      </main>
      <MobileBottomNav />
    </div>
  )
}
