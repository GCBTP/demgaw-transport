import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthProvider.jsx'
import { Onboarding, shouldShowOnboarding } from './components/onboarding/Onboarding.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'

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
