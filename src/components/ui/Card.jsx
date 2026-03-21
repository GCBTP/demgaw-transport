export function Card({ className = '', children, padding = true }) {
  return (
    <div
      className={`rounded-3xl border border-slate-100/90 bg-white shadow-[0_4px_24px_-4px_rgba(15,23,42,0.08),0_2px_8px_-2px_rgba(15,23,42,0.04)] ${padding ? 'p-5 sm:p-6' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
