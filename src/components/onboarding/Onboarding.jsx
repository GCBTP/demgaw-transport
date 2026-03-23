import { useState } from 'react'
import { Bus, QrCode, Ticket } from 'lucide-react'

const STORAGE_KEY = 'demgaw_onboarding_done'

const slides = [
  {
    icon: <Bus className="h-16 w-16 text-white" />,
    title: 'Demgaw',
    subtitle: '"Voyager" en wolof',
    description: 'Réservez votre billet de transport interurbain au Sénégal, en quelques secondes.',
    bg: 'from-[#00853F] to-[#005c2b]',
  },
  {
    icon: <Ticket className="h-16 w-16 text-white" />,
    title: 'Votre billet numérique',
    subtitle: 'Simple et rapide',
    description: 'Choisissez votre trajet, payez via Wave, recevez votre billet avec QR code instantanément.',
    bg: 'from-[#1e40af] to-[#1e3a8a]',
  },
  {
    icon: <QrCode className="h-16 w-16 text-white" />,
    title: 'Embarquement facile',
    subtitle: 'Présentez votre QR',
    description: 'À bord, le chauffeur scanne votre QR code. Pas de papier, pas de file d\'attente.',
    bg: 'from-[#b45309] to-[#92400e]',
  },
]

export function Onboarding({ onDone }) {
  const [step, setStep] = useState(0)

  function finish() {
    localStorage.setItem(STORAGE_KEY, '1')
    onDone()
  }

  const slide = slides[step]
  const isLast = step === slides.length - 1

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-white">
      <div className={`flex w-full flex-1 flex-col items-center justify-center bg-gradient-to-br ${slide.bg} px-8 py-12 text-center text-white`}>
        <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-white/20">
          {slide.icon}
        </div>
        <h1 className="text-4xl font-black tracking-tight">{slide.title}</h1>
        <p className="mt-1 text-lg font-semibold opacity-80">{slide.subtitle}</p>
        <p className="mt-4 max-w-xs text-base leading-relaxed opacity-90">{slide.description}</p>
      </div>

      <div className="w-full px-6 py-8">
        <div className="mb-6 flex justify-center gap-2">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`block h-2 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-[#00853F]' : 'w-2 bg-slate-200'}`}
            />
          ))}
        </div>

        <button
          onClick={isLast ? finish : () => setStep((s) => s + 1)}
          className="h-14 w-full rounded-2xl bg-[#00853F] text-lg font-bold text-white shadow-lg active:scale-[0.98]"
        >
          {isLast ? 'Commencer' : 'Suivant'}
        </button>

        {!isLast && (
          <button onClick={finish} className="mt-4 w-full text-center text-sm text-slate-400">
            Passer
          </button>
        )}
      </div>
    </div>
  )
}

export function shouldShowOnboarding() {
  return !localStorage.getItem(STORAGE_KEY)
}
