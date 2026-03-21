export function Input({ label, id, error, className = '', ...props }) {
  const inputId = id || props.name
  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={`w-full rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 text-slate-900 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] transition placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25 ${className}`}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
