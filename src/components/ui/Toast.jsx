import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, Info, XCircle } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500)
  }, [])

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="pointer-events-none fixed bottom-20 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3 shadow-lg text-sm font-semibold text-white animate-in slide-in-from-bottom-4 duration-300 ${
              t.type === 'success' ? 'bg-[#00853F]' :
              t.type === 'error'   ? 'bg-red-600' :
                                     'bg-slate-800'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="h-5 w-5 shrink-0" />}
            {t.type === 'error'   && <XCircle className="h-5 w-5 shrink-0" />}
            {t.type === 'info'    && <Info className="h-5 w-5 shrink-0" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
