import { Link } from 'react-router-dom'
import { Bus } from 'lucide-react'

export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#FAFBFC] bg-gradient-to-b from-white via-brand-50/40 to-orange-50/30">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
        <Link
          to="/"
          className="mb-8 flex items-center justify-center gap-2.5 text-slate-900"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_6px_20px_-6px_rgba(5,150,105,0.5)]">
            <Bus className="h-6 w-6" aria-hidden />
          </span>
          <span className="text-xl font-bold tracking-tight">DemGaw</span>
        </Link>

        <div className="rounded-3xl border border-slate-100/90 bg-white p-6 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12),0_2px_12px_-4px_rgba(15,23,42,0.06)] sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
            ) : null}
          </div>
          {children}
        </div>

        {footer ? (
          <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>
        ) : null}
      </div>
    </div>
  )
}
