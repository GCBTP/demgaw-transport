import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthProvider.jsx'
import { Onboarding, shouldShowOnboarding } from './components/onboarding/Onboarding.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'
import { supabase } from './supabase/client.js'

// Intercepte le deep link OAuth sur Android (Capacitor)
async function handleDeepLink(url) {
  if (!url) return
  const u = new URL(url)
  const params = new URLSearchParams(u.hash.replace('#', ''))
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  if (accessToken) {
    await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken ?? '' })
  }
}

if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
  import('@capacitor/app').then(({ App }) => {
    App.addListener('appUrlOpen', ({ url }) => { void handleDeepLink(url) })
  })
}

function Root() {
  const [showOnboarding, setShowOnboarding] = useState(() => shouldShowOnboarding())
  if (showOnboarding) return <Onboarding onDone={() => setShowOnboarding(false)} />
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
