import { useState } from 'react'
import data from '../../data/transports-informels.json'

const TYPE_LABEL = {
  dem_dikk:   { label: 'Dem Dikk',    color: 'bg-blue-100 text-blue-900' },
  car_rapide: { label: 'Car Rapide',  color: 'bg-amber-100 text-amber-900' },
  clando:     { label: 'Clando',      color: 'bg-slate-100 text-slate-700' },
}

const FILTERS = [
  { key: 'all',        label: 'Tous' },
  { key: 'dem_dikk',  label: 'Dem Dikk' },
  { key: 'car_rapide',label: 'Car Rapide' },
  { key: 'clando',    label: 'Clando' },
]

export function TransportsInformels() {
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? data : data.filter((t) => t.type === filter)

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-bold text-slate-900">Transports locaux — Dakar</h2>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              filter === f.key
                ? 'bg-[#00853F] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-3">
        {filtered.map((t, i) => {
          const meta = TYPE_LABEL[t.type]
          return (
            <li key={i} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900">{t.depart} → {t.arrivee}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{t.quartiers.join(' · ')}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${meta.color}`}>
                  {meta.label}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-500">{t.numero}</span>
                <span className="font-bold text-[#00853F]">{t.tarif.toLocaleString()} {t.devise}</span>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
