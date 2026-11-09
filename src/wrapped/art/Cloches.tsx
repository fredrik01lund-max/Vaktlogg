// gjett – «Hva bar du ut mest?»: tre tallerkener med lokk over de tre mest solgte hovedrettene (alfabetisk).
// Én rett per rad, annenhver side med navnet ved siden av – da får lokkene hele bredden og blir kortets helt.
// Lokkene er knapper til avsløringen; kortet (Body) eier revealed/guessId og auto-avsløringen.
// Etter avsløringen løftes lokkene (gjettet først, vinneren sist): den tegnede tallerkenen tones over i et bilde av retten,
// retten glir på plass og det stiger litt damp. Tallene teller opp samtidig (vinneren leder hele veien) og vinneren får gullmerke.

import './Cloches.css'
import { useEffect, useRef, type CSSProperties } from 'react'
import { L } from '../../i18n.ts'
import { num } from '../../lib/format.ts'
import { easeData, useReducedMotion } from '../../lib/motion.ts'
import { useCountUp } from '../../ui.tsx'
import { Dish } from './food.tsx'
import torskImg from './img/torsk.webp'
import steakImg from './img/steak.webp'
import moulesImg from './img/moules.webp'
import { Flower, LinGrad, SvgIcon, useArtId } from './kit.tsx'

export interface ClochesProps {
  items: { id: string; name: string; qty: number }[] // quiz order, length 3
  winnerId: string
  revealed: boolean
  guessId: string | null
  onReveal: (guessId: string | null) => void
  mode: 'pre' | 'play' | 'done'
}

// Tegneflaten. Knapper og navn ligger over i prosent av den samme flaten, så de treffer ved alle størrelser.
const W = 360
const H = 480
// Hver rad er ROW høy: fra lokkets knott (py − 129) til skyggen under tallerkenen (py + 26). Radene overlapper ikke,
// så hver rad kan være én trykkflate i full bredde.
const ROW = 160
const TOP = 133 // midten av første tallerken
const PR = 96 // tallerkenens halvbredde
const PRY = 24
const DR = 80 // lokkets halvbredde
const DH = 100 // lokkets høyde
const GAP = 12 // luft mellom tallerken og navn
// Plassene i leserekkefølge: venstre, høyre, venstre (py = midten av tallerkenen)
const SLOTS = [0, 1, 2].map((i) => ({ cx: i % 2 ? W - 106 : 106, py: TOP + i * ROW, right: i % 2 === 1 }))
const vars = (o: Record<string, string | number>) => o as CSSProperties

/**
 * Bilder av rettene (560 px brede, tallerkenen fyller bredden). plateY = tallerkenens midtlinje i bildet,
 * så bildet legges nøyaktig over den tegnede tallerkenen. Retter uten bilde bruker tegningen.
 */
const photos: Record<string, { src: string; h: number; plateY: number }> = {
  torsk: { src: torskImg, h: 180, plateY: 77 },
  steak: { src: steakImg, h: 222, plateY: 117 },
  moules: { src: moulesImg, h: 242, plateY: 140 },
}
const PHOTO_W = 560
const PHOTO_PLATE = 553
const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`

function Count({ x, y, qty, size, win, from, delay }: { x: number; y: number; qty: number; size: number; win: boolean; from?: number; delay: number }) {
  const v = useCountUp(qty, { duration: 600, delay, ease: easeData }, from)
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={size} fontWeight={800} fill={win ? '#2e1a22' : '#5e3a46'}>
      {num(v)}
    </text>
  )
}

export function Cloches({ items, winnerId, revealed, guessId, onReveal, mode }: ClochesProps) {
  const id = useArtId('cl')
  const rm = useReducedMotion()
  const animate = mode === 'play' && !rm
  const svgRef = useRef<SVGSVGElement>(null)
  const refocus = useRef(false)

  // Knappen som hadde fokus forsvinner ved avsløringen – flytt fokus til bildet (som nå leser opp tallene).
  useEffect(() => {
    if (!revealed || !refocus.current) return
    refocus.current = false
    svgRef.current?.focus({ preventScroll: true })
  }, [revealed])

  const list = items.slice(0, 3)
  const max = Math.max(1, ...list.map((d) => d.qty))
  const rank = (k: string) => (k === guessId ? 0 : k === winnerId ? 2 : 1)
  const liftOrder = list.map((d) => d.id).sort((a, b) => rank(a) - rank(b))
  const label = revealed
    ? [...list].sort((a, b) => b.qty - a.qty).map((d) => `${d.name} ${num(d.qty)}`).join(', ')
    : L('Tre hovedretter under lokk', 'Three covered main courses')

  return (
    <div className="cl-wrap">
      <svg ref={svgRef} className="w-art cl-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} tabIndex={-1}>
        <defs>
          <LinGrad id={id('dome')} from="#fbc0d6" to="#ee8fb2" />
          <LinGrad id={id('gold')} from="#bf7a12" to="#9c5c08" />
        </defs>
        {list.map((d, i) => {
          const { cx, py } = SLOTS[i]
          const db = py - 9 // lokkets underkant
          const win = d.id === winnerId
          const k = liftOrder.indexOf(d.id)
          const photo = photos[d.id]
          const ps = (2 * PR * 1.08) / PHOTO_PLATE // bildets skala: litt større enn den tegnede tallerkenen, så retten «kommer frem»
          return (
            <g key={d.id} className="cl-plate w-up" style={vars({ '--i': i, '--st': '90ms', '--d': '100ms' })}>
              {/* Vinneren: en gullring rundt tallerkenen */}
              {revealed && win && <ellipse className="w-pop" style={vars({ '--d': '900ms' })} cx={cx} cy={py + 2} rx={PR * 1.08 + 8} ry={PRY * 1.08 + 10} fill="none" stroke={`url(#${id('gold')})`} strokeWidth={4} />}
              <g className={`cl-art${revealed && !win ? ' cl-dim' : ''}`}>
                {/* Den tegnede tallerkenen står under lokket; med bilde tones den ut når retten kommer frem */}
                <g className={revealed && photo ? 'cl-plate-out' : undefined} style={vars({ '--k': k })}>
                  <ellipse cx={cx} cy={py + 13} rx={PR} ry={13} fill="#2e1a22" opacity={0.07} />
                  <ellipse cx={cx} cy={py} rx={PR} ry={PRY} fill="#fff" stroke={revealed && win && !photo ? `url(#${id('gold')})` : '#f6c3cf'} strokeWidth={3} />
                  <ellipse cx={cx} cy={py} rx={65} ry={16} fill="none" stroke="#fde4ea" strokeWidth={2} />
                </g>
                {revealed && photo && (
                  <image
                    className="cl-photo"
                    style={vars({ '--k': k })}
                    href={photo.src}
                    x={cx - (PHOTO_W * ps) / 2}
                    y={py - photo.plateY * ps}
                    width={PHOTO_W * ps}
                    height={photo.h * ps}
                  />
                )}
                {revealed && !photo && (
                  <g transform={`translate(${cx} ${py - 12}) scale(1.9)`}>
                    <Dish id={d.id} x={0} y={0} />
                  </g>
                )}
              </g>
              {/* Litt damp fra den nylig avdekkede retten (bare når kortet spilles) */}
              {revealed && animate && (
                <g className="cl-steam" style={vars({ '--k': k })}>
                  {[-26, 0, 26].map((dx, j) => (
                    <path key={j} style={vars({ '--j': j })} d={`M${cx + dx},${py - 34}c-7,-9 7,-15 0,-24s7,-15 0,-24`} fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" />
                  ))}
                </g>
              )}
              {revealed && <Count x={cx} y={py - 92} qty={d.qty} size={+(52 * Math.sqrt(d.qty / max)).toFixed(1)} win={win} from={animate ? 0 : undefined} delay={480} />}
              {revealed && win && (
                <g className="w-pop" style={vars({ '--d': '900ms' })}>
                  <Flower x={cx + 66} y={py - 96} size={34} fill={`url(#${id('gold')})`} />
                  <SvgIcon name="star" x={cx + 66} y={py - 96} size={18} />
                </g>
              )}
              {revealed && win && guessId === winnerId && (
                <g className="w-twinkle" style={vars({ '--d': '1150ms' })}>
                  <SvgIcon name="sparkle" x={cx + 90} y={py - 116} size={16} color="#bf7a12" fill="#bf7a12" sw={1} />
                </g>
              )}
              {(!revealed || animate) && (
                <g className={`cl-dome ${revealed ? 'cl-lift' : 'w-wobble'}`} style={vars(revealed ? { '--k': k } : { '--i': i, '--st': '200ms', '--d': '700ms' })}>
                  <path d={`M${cx - DR},${db}A${DR},${DH} 0 0 1 ${cx + DR},${db}Z`} fill={`url(#${id('dome')})`} />
                  <path d={`M${cx - 54},${db - 24}Q${cx - 55},${db - 68} ${cx - 21},${db - 82}`} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={8} strokeLinecap="round" />
                  <rect x={cx - DR - 6} y={db - 5} width={2 * (DR + 6)} height={12} rx={6} fill="#e27aa0" />
                  <circle cx={cx} cy={db - DH - 8} r={12} fill="#e27aa0" />
                  <circle cx={cx - 4} cy={db - DH - 12} r={3.5} fill="#fff" opacity={0.6} />
                </g>
              )}
            </g>
          )
        })}
      </svg>
      {/* Navnet ved siden av hver tallerken, i samme koordinater som tegningen */}
      {list.map((d, i) => {
        const { cx, py, right } = SLOTS[i]
        const x0 = right ? 8 : cx + PR + GAP
        const x1 = right ? cx - PR - GAP : W - 8
        return (
          <div
            key={d.id}
            className={`cl-label w-up${right ? ' cl-end' : ''}`}
            aria-hidden="true"
            style={vars({ left: pct(x0, W), width: pct(x1 - x0, W), top: pct(py - 112, H), height: pct(120, H), '--i': i, '--st': '90ms', '--d': '160ms' })}
          >
            <span>{d.name}</span>
          </div>
        )
      })}
      {/* Hele raden (lokk, tallerken og navn) er trykkflate. Radene møtes uten overlapp. */}
      {!revealed &&
        list.map((d, i) => (
          <button
            key={d.id}
            type="button"
            className="cl-btn"
            style={{ left: 0, width: '100%', top: pct(i * ROW, H), height: pct(ROW, H) }}
            aria-label={L('Løft lokket: {name}', 'Lift the lid: {name}', { name: d.name })}
            onClick={(e) => {
              refocus.current = document.activeElement === e.currentTarget
              onReveal(d.id)
            }}
          />
        ))}
    </div>
  )
}
