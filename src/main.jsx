import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthProvider.jsx'
import { Onboarding, shouldShowOnboarding } from './components/onboarding/Onboarding.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'
import { supabase } from './supabase/client.js'

// Intercepte le deep link OAuth sur Android (Capacitor) — flux PKCE
async function handleDeepLink(url) {
  if (!url) return
  try {
    // Échanger le code PKCE contre une session d'abord
    const { error } = await supabase.auth.exchangeCodeForSession(url)
    if (error) console.warn('exchangeCodeForSession error:', error.message)
    // Fermer le navigateur après
    const { Browser } = await import('@capacitor/browser')
    await Browser.close().catch(() => {})
  } catch (e) {
    console.warn('Deep link OAuth error', e)
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
