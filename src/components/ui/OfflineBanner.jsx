import { WifiOff } from 'lucide-react'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'

export function OfflineBanner() {
  const isOnline = useNetworkStatus()
  if (isOnline) return null
  return (
    <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-white">
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
      Hors ligne — vos billets en cache sont disponibles
    </div>
  )
}
