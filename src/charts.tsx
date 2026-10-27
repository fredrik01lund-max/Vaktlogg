import { L } from './i18n.ts'
import { isWeekend, kr } from './lib/format.ts'

/** Salg per halvtime gjennom vakten. */
export function SalesSlots({ values, current, startHour = 16, tone }: { values: number[]; current: number; startHour?: number; tone?: 'gold' }) {
  // Pastell: halvtimen nå i sterk pastell, resten i lys pastell
  const strong = tone === 'gold' ? 'var(--orange-strong)' : 'var(--lilac-strong)'
  const soft = tone === 'gold' ? '#fbd3aa' : 'var(--lilac-fill)'
  const W = 340
  const H = 104
  const top = 8
  const base = 82
  const max = Math.max(4000, ...values)
  const gap = 4
  const bw = (W - gap * (values.length - 1)) / values.length
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={L('Salg per halvtime', 'Sales per half hour')}>
      <line x1="0" x2={W} y1={base + 0.5} y2={base + 0.5} stroke="var(--line)" />
      {values.map((v, i) => {
        const h = v ? Math.max(3, ((base - top) * v) / max) : 0
        const x = i * (bw + gap)
        const future = i > current
        return (
          <g key={i}>
            {future ? (
              <rect x={x} y={base - 3} width={bw} height={3} rx={1.5} fill="var(--line)" />
            ) : (
              <rect className="slot" x={x} y={base - h} width={bw} height={h} rx={4} fill={i === current ? strong : soft} style={{ animationDelay: 200 + i * 30 + 'ms' }} />
            )}
          </g>
        )
      })}
      {[0, 4, 8, 12].map((i) => (
        <text key={i} x={i * (bw + gap)} y={H - 4}>
          {String(startHour + i / 2).padStart(2, '0')}:00
        </text>
      ))}
    </svg>
  )
}

/** Totalsalg per vakt i historikken. Trykk på en stolpe for å åpne vakten. */
export function HistoryBars({ shifts, onSelect, growTonight }: { shifts: { id: string; date: string; sales: number; isTonight?: boolean }[]; onSelect: (id: string) => void; growTonight?: boolean }) {
  const W = 340
  const H = 150
  const top = 14
  const base = 118
  const max = Math.max(...shifts.map((s) => s.sales)) * 1.05
  const avg = shifts.reduce((a, s) => a + s.sales, 0) / shifts.length
  const gap = 5
  const bw = (W - gap * (shifts.length - 1)) / shifts.length
  const yAvg = base - ((base - top) * avg) / max
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={L('Salg per vakt. Snitt {avg}.', 'Sales per shift. Average {avg}.', { avg: kr(avg) })}>
      <line x1="0" x2={W} y1={base + 0.5} y2={base + 0.5} stroke="var(--line)" />
      <line x1="0" x2={W} y1={yAvg} y2={yAvg} stroke="var(--sage)" strokeDasharray="4 4" strokeWidth="1.5" />
      {shifts.map((s, i) => {
        const h = ((base - top) * s.sales) / max
        const x = i * (bw + gap)
        const weekend = isWeekend(s.date)
        return (
          <g key={s.id} onClick={() => onSelect(s.id)} style={{ cursor: 'pointer' }}>
            <rect x={x - gap / 2} y={0} width={bw + gap} height={H} fill="transparent" />
            <rect className={s.isTonight && growTonight ? 'bar-new' : undefined} x={x} y={base - h} width={bw} height={h} rx={4} fill={s.isTonight ? 'var(--pink-strong)' : weekend ? 'var(--orange-strong)' : '#fbd3aa'} />
            {(i % 2 === 0 || s.isTonight) && (
              <text x={x + bw / 2} y={H - 14} textAnchor="middle">
                {Number(s.date.slice(8))}
              </text>
            )}
          </g>
        )
      })}
      <text x={0} y={H - 1}>{L('sep.', 'Sep')}</text>
      <text x={W} y={H - 1} textAnchor="end">
        {L('okt.', 'Oct')}
      </text>
    </svg>
  )
}

/** Puls gjennom vakten, med kveldens høydepunkt markert. */
export function HeartLine({ samples, startHour = 16 }: { samples: number[]; startHour?: number }) {
  const W = 340
  const H = 110
  const top = 16
  const base = 86
  const min = Math.min(...samples) - 6
  const max = Math.max(...samples) + 4
  const x = (i: number) => (i / (samples.length - 1)) * W
  const y = (v: number) => base - ((base - top) * (v - min)) / (max - min)
  const d = samples.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const peak = samples.indexOf(Math.max(...samples))
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={L('Puls gjennom vakten', 'Heart rate through the shift')}>
      <path className="hl-area" d={`${d} L${W},${base} L0,${base} Z`} fill="var(--pink-bg)" />
      <path className="hl-line" pathLength={1} d={d} fill="none" stroke="#e57fa3" strokeWidth="2.5" strokeLinejoin="round" />
      <circle className="hl-peak" cx={x(peak)} cy={y(samples[peak])} r="5" fill="var(--surface)" stroke="#e57fa3" strokeWidth="2.5" style={{ transformOrigin: `${x(peak)}px ${y(samples[peak])}px` }} />
      <text x={Math.min(W - 60, x(peak) + 9)} y={y(samples[peak]) + 4} style={{ fill: 'var(--pink-ink)', fontWeight: 650 }}>
        {samples[peak]} {L('slag/min', 'bpm')}
      </text>
      {[0, 8, 16, 24].map((i) => (
        <text key={i} x={x(i)} y={H - 4} textAnchor={i === 0 ? 'start' : 'middle'}>
          {String(startHour + i / 4).padStart(2, '0')}:00
        </text>
      ))}
    </svg>
  )
}
