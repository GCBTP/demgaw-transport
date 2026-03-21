const variants = {
  primary:
    'bg-brand-600 text-white shadow-[0_4px_14px_-2px_rgba(5,150,105,0.45)] hover:bg-brand-700 hover:shadow-[0_6px_20px_-4px_rgba(5,150,105,0.5)] active:bg-brand-800 active:scale-[0.98] focus-visible:ring-brand-500',
  accent:
    'bg-warm-500 text-white shadow-[0_4px_14px_-2px_rgba(249,115,22,0.45)] hover:bg-warm-600 hover:shadow-[0_6px_20px_-4px_rgba(249,115,22,0.5)] active:bg-warm-600 active:scale-[0.98] focus-visible:ring-warm-500',
  secondary:
    'bg-white text-slate-800 border border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] hover:bg-slate-50 active:scale-[0.98] focus-visible:ring-slate-300',
  ghost:
    'text-brand-700 hover:bg-brand-50 active:bg-brand-100 focus-visible:ring-brand-400',
  danger:
    'bg-red-600 text-white shadow-md hover:bg-red-700 active:scale-[0.98] focus-visible:ring-red-500',
}

const sizes = {
  sm: 'px-4 py-2 text-sm rounded-full gap-1.5 min-h-9',
  md: 'px-5 py-2.5 text-sm rounded-full gap-2 min-h-10',
  lg: 'px-7 py-3.5 text-[15px] rounded-full gap-2 min-h-[52px] font-semibold tracking-wide',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  type = 'button',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45'
  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
