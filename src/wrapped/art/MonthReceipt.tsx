// Kassalappen: månedens vakter som en kvittering som skrives ut av en kortterminal.
// Hodet kommer først, radene etter hvert som de passerer spalten, og totalen til sist (teller opp i samme takt).

import './MonthReceipt.css'
import type { CSSProperties } from 'react'
import { L } from '../../i18n.ts'
import { kr, num } from '../../lib/format.ts'
import { easeData, useReducedMotion } from '../../lib/motion.ts'
import { useCountUp } from '../../ui.tsx'
import { Cookie, Flower, LinGrad, useArtId } from './kit.tsx'

export interface MonthReceiptProps {
  title: string // 'Brasserie Fjordgata'
  subtitle: string // 'Seksjon 2 · september 2026'
  rows: { id: string; label: string; sales: number; record: boolean }[]
  total: number // 271232
  tips: number // ca. 10 % av salget
  mode: 'pre' | 'play' | 'done'
  label: string
}

const vars = (o: Record<string, string | number>) => o as CSSProperties

/** Revet papirkant: tagger 12 brede og 7 dype, fra (x0, y) til (x1, y). */
function torn(x0: number, x1: number, y: number, w = 12, depth = 7) {
  let d = `M${x0},${y}`
  for (let x = x0; x < x1; x += w) d += ` L${x + w / 2},${y + depth} L${x + w},${y}`
  return d
}

/** Totalen som teller opp – monteres bare i «play», så den alltid starter på 0. */
function TotalCount({ total }: { total: number }) {
  const v = useCountUp(total, { duration: 900, delay: 700, ease: easeData }, 0)
  return <>{kr(v)}</>
}

/** Tips-stempelets diameter. */
const STAMP = 76

export function MonthReceipt({ title, subtitle, rows, total, tips, mode, label }: MonthReceiptProps) {
  const id = useArtId('rc')
  const rm = useReducedMotion()
  const play = mode === 'play' && !rm
  const rowsEnd = 104 + rows.length * 24
  // Bunnen: strekkoden til venstre og stempelet til høyre på samme midtlinje, klar av totalen og terminalen.
  const foot = rowsEnd + (tips > 0 ? 40 + STAMP / 2 : 50)
  const T = foot + (tips > 0 ? STAMP / 2 + 8 : 38) // toppen av terminalen
  const paper = `${torn(40, 280, 8)} V${T + 6} H40 Z`

  // Strekkoden: én strek per vakt, bredde etter omsetning. Krympes ved mange vakter, så den aldri når stempelet.
  const max = Math.max(1, ...rows.map((r) => r.sales))
  const raw = rows.map((r) => 3 + (7 * r.sales) / max)
  const k = Math.min(1, 116 / (raw.reduce((a, w) => a + w, 0) + 2.5 * Math.max(0, rows.length - 1)))
  let bx = 60
  const bars = rows.map((r, i) => {
    const bar = { id: r.id, x: bx, w: raw[i] * k }
    bx += (raw[i] + 2.5) * k
    return bar
  })
  const recordIndex = new Map(rows.filter((r) => r.record).map((r, j) => [r.id, j]))

  return (
    <svg className="w-art rc-art" viewBox={`0 0 320 ${T + 44}`} role="img" aria-label={label}>
      <defs>
        <LinGrad id={id('gold')} from="#bf7a12" to="#9c5c08" />
        <clipPath id={id('slot')}>
          <rect x={0} y={0} width={320} height={T + 6} />
        </clipPath>
      </defs>

      {/* (a) Kortterminalen, fast nederst */}
      <g aria-hidden="true">
        <rect x={14} y={T} width={292} height={40} rx={14} fill="#23314f" />
        <rect x={34} y={T + 4} width={252} height={5} rx={2.5} fill="#0f1830" />
        <circle cx={153} cy={T + 26} r={2} fill="#fff" fillOpacity={0.25} />
        <circle cx={167} cy={T + 26} r={2} fill="#fff" fillOpacity={0.25} />
      </g>

      {/* (b, c) Papiret, klippet ved spalten */}
      <g clipPath={`url(#${id('slot')})`} aria-hidden="true">
        <g className="rc-paper w-print" style={vars({ '--d': '150ms' })}>
          <path d={paper} transform="translate(3 4)" fill="#23314f" opacity={0.08} />
          <path d={paper} fill="#fffdf9" />
          <text className="rc-brand" x={160} y={46} textAnchor="middle">
            {title}
          </text>
          <text className="rc-sub" x={160} y={64} textAnchor="middle">
            {subtitle}
          </text>
          <path d="M60 78H260" stroke="#c4ccc7" strokeDasharray="3 4" />

          {rows.map((r, i) => {
            const y = 104 + i * 24
            const j = recordIndex.get(r.id)
            return (
              <g key={r.id}>
                {/* Prikklinjen går under dagnavnet; navnets papirfargede kant stopper den rett etter teksten, uansett bredde */}
                <path d={`M60 ${y - 4}H196`} stroke="#c4ccc7" strokeWidth={1.2} strokeDasharray="0.1 4" strokeLinecap="round" />
                <text className="rc-day" x={60} y={y}>
                  {r.label}
                </text>
                {j !== undefined && <Flower x={206} y={y - 4} size={12} fill={`url(#${id('gold')})`} className="rc-rec w-pop" style={vars({ '--d': '1350ms', '--i': j, '--st': '90ms' })} />}
                <text className="rc-amt" x={262} y={y} textAnchor="end">
                  {num(r.sales)}
                </text>
              </g>
            )
          })}

          <path d={`M60 ${rowsEnd - 6}H262M60 ${rowsEnd - 2}H262`} stroke="#17231f" strokeWidth={1} />
          <text className="rc-totl" x={60} y={rowsEnd + 26}>
            {L('TOTALT', 'TOTAL')}
          </text>
          <text className="rc-total" x={262} y={rowsEnd + 28} textAnchor="end">
            {play ? <TotalCount total={total} /> : kr(total)}
          </text>
          <g fill="#17231f">
            {bars.map((b) => (
              <rect key={b.id} x={b.x} y={foot - 8} width={b.w} height={16} />
            ))}
          </g>
        </g>
      </g>

      {/* (d) Tips-stempelet, uklippet og øverst – helt på papiret, høyrekanten i flukt med beløpene */}
      {tips > 0 && (
        <g transform={`translate(${262 - STAMP / 2} ${foot})`} aria-hidden="true">
          <g className="rc-stamp w-stamp" style={vars({ '--d': '1700ms' })}>
            {/* Kjeksen dreid 10°, så bølgene ligger likt på begge sider av beløpet */}
            <g transform="rotate(10)">
              <Cookie x={0} y={0} size={STAMP} fill="rgba(208,69,110,.10)" stroke="#8a1f44" sw={2.5} />
            </g>
            <text className="rc-tips-h" x={0} y={-11} textAnchor="middle">
              {L('TIPS', 'TIPS')}
            </text>
            <text className="rc-tips" x={0} y={7} textAnchor="middle">
              +{num(tips)}
            </text>
            <text className="rc-tips-kr" x={0} y={20} textAnchor="middle">
              kr
            </text>
          </g>
        </g>
      )}
    </svg>
  )
}
