// Rekorder: en trapp der hvert trinn er én slått salgsrekord (ingen avkuttet verdiakse). Emma hopper opp trinn for trinn.
import './RecordStairs.css'
import type { CSSProperties } from 'react'
import { config } from '../../config.ts'
import { flowerPath } from '../../shapes.tsx'
import { paths } from '../../ui.tsx'
import { LinGrad, SvgFace, useArtId } from './kit.tsx'

export interface RecordStairsProps {
  columns: { value: string; date: string; base?: boolean }[] // baseline first, ≤4
  extras: { icon: string; label: string; value: string; date: string }[]
  label: string
}

const FLOOR = 228
const W = 64
const HOP0 = 650 // Emma letter fra grunnsøylen; landing på trinn k ved HOP0 + k·333 ms
const F28 = flowerPath(28)
/** Gull som holder 3:1 mot tonebakgrunnen og bakgrunnsformen (sjekkes i scripts/kontrast.mjs). */
const GOLD = { from: '#aa6a0c', to: '#9c5c08' }
const vars = (o: Record<string, string | number>) => o as CSSProperties
/** Søyle med runde topphjørner (r 14) og rett bunn. */
const colPath = (x: number, t: number) => `M${x} ${FLOOR}V${t + 14}a14 14 0 0 1 14-14h${W - 28}a14 14 0 0 1 14 14V${FLOOR}Z`

export function RecordStairs({ columns, extras, label }: RecordStairsProps) {
  const aid = useArtId('rs')
  const cols = columns.length > 4 ? [columns[0], ...columns.slice(-3)] : columns
  const n = cols.length
  if (!n) return null
  const x0 = (340 - (n * W + (n - 1) * 12)) / 2
  const geo = cols.map((c, i) => {
    const x = x0 + i * 76
    const top = FLOOR - (52 + i * 44)
    return { ...c, x, top, cx: x + W / 2, ey: top - 19 }
  })
  const last = geo[n - 1]
  // Hoppbanen: --x0..--x3/--y0..--y3 er toppen av hver søyle (ubrukte plasser gjentar den siste); --a1..--a3 er toppunktene.
  const hop: Record<string, string> = { '--d': `${HOP0}ms` }
  for (let k = 0; k < 4; k++) {
    const g = geo[Math.min(k, n - 1)]
    hop[`--x${k}`] = `${g.cx}px`
    hop[`--y${k}`] = `${g.ey}px`
    if (k > 0) {
      const p = geo[Math.min(k - 1, n - 1)]
      hop[`--a${k}`] = `${p === g ? g.ey : Math.min(p.ey, g.ey) - 24}px`
    }
  }

  return (
    <div className="rs">
      <svg className="w-art" viewBox="0 0 340 262" preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>
        <defs>
          <LinGrad id={aid('gold')} {...GOLD} />
        </defs>
        <g aria-hidden="true">
          <line x1={16} y1={FLOOR} x2={324} y2={FLOOR} stroke="#17231f" strokeOpacity={0.12} strokeWidth={2} strokeLinecap="round" />
          {geo.map((c, i) => (
            <g key={i}>
              <g className="w-growy" style={vars({ '--d': '100ms', '--i': i, '--st': '110ms' })}>
                <path d={colPath(c.x, c.top)} fill={c.base ? 'rgba(196,128,22,.18)' : `url(#${aid('gold')})`} />
              </g>
              {/* Beløpet står mørkt på en lys lapp øverst på søylen, så gullet kan være lyst uten at tallet blir svakt */}
              <g className={c.base ? 'w-fade' : 'rs-val w-pop'} style={vars({ '--d': c.base ? '450ms' : `${HOP0 + i * 333}ms` })}>
                {!c.base && <rect x={c.x + 4} y={c.top + 7} width={W - 8} height={22} rx={11} fill="#fffdf9" />}
                <text x={c.cx} y={c.top + 18} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={800} fill="#6e3f02">
                  {c.value}
                </text>
              </g>
              <text className="w-fade" style={vars({ '--d': '100ms', '--i': i, '--st': '110ms' })} x={c.cx} y={248} textAnchor="middle" fontSize={12} fontWeight={600} fill="#4b5a54">
                {c.date}
              </text>
            </g>
          ))}
          <g className="w-twinkle" style={vars({ '--d': '1700ms' })}>
            <g transform={`translate(${last.x + W - 7} ${last.top - 23}) scale(0.75)`} fill="#bf7a12">
              {paths.sparkle}
            </g>
          </g>
          <g className="rs-emma w-hop4" style={vars(hop)}>
            <g className="rs-emma-y w-hop4">
              <g className="w-pop" style={vars({ '--d': '250ms' })}>
                <SvgFace x={0} y={0} r={17} id={config.persona.id} initial={config.persona.initials} />
              </g>
            </g>
          </g>
        </g>
      </svg>
      {extras.length > 0 && (
        <ul className="rs-chips" style={vars({ '--n': Math.min(extras.length, 2) })}>
          {extras.map((e, i) => (
            <li key={i} className="rs-chip w-up" style={vars({ '--d': '1800ms', '--i': i, '--st': '100ms' })}>
              <svg width={28} height={28} viewBox="0 0 28 28" aria-hidden="true">
                <defs>
                  <LinGrad id={aid(`c${i}`)} {...GOLD} />
                </defs>
                <path d={F28} fill={`url(#${aid(`c${i}`)})`} />
                <svg x={7} y={7} width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                  {paths[e.icon]}
                </svg>
              </svg>
              <span className="rs-chip-txt">
                <span className="rs-chip-label">{e.label}</span>
                <span className="rs-chip-line">
                  <b className="rs-chip-val">{e.value}</b> <span className="rs-chip-date">{e.date}</span>
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
