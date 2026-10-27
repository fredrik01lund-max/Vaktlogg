// «Du gikk»: månedens km som en slangesti med marathonflagg. Én JS-klokke (p) styrer strek, gåer og vaktprikker.
import './WalkPath.css'
import type { CSSProperties } from 'react'
import { config } from '../../config.ts'
import { easeData, useReducedMotion } from '../../lib/motion.ts'
import { flowerPath } from '../../shapes.tsx'
import { useCountUp } from '../../ui.tsx'
import { serpentine } from './geom.ts'
import { LinGrad, SvgFace, useArtId } from './kit.tsx'

export interface WalkPathProps {
  km: number // 83.25
  target: number // 84.39
  cumKm: number[]
  flags: { at: number; reached: boolean; label?: string; n: number }[]
  leftText?: string // '1,1 km igjen' (utelates når alle flagg er nådd)
  mode: 'pre' | 'play' | 'done'
  label: string // '83 km gått i september, nesten to maraton'
}

const X0 = 52
const X1 = 288
const YS = [60, 128, 196, 264]
const ROUTE = serpentine({ x0: X0, x1: X1, ys: YS, r: 34 })
const END = ROUTE.pointAt(ROUTE.length)
const PS = 22 // vimpelstørrelse
const POLE = 28 // stanglengde
const PENNANT = flowerPath(PS)
/** Samme gull som rekordtrappen: holder 3:1 mot tonebakgrunnen (scripts/kontrast.mjs). */
const GOLD = { from: '#aa6a0c', to: '#9c5c08' }
/** useCountUp skriver bare når den avrundede verdien endres; vi teller i 1/100 km så gåeren glir i stedet for å hoppe 1 km om gangen. */
const SCALE = 100
const LATE = { '--d': '2100ms' } as CSSProperties
const STROKE = { fill: 'none', strokeWidth: 14, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
const HALF = STROKE.strokeWidth / 2

/**
 * Hvor flagget plantes. Stanga står alltid utenfor streken og utenfor gåerens vei:
 * på en bane rett over streken, i en sving inne i buen, og målflagget litt forbi enden med vimpelen vendt bort fra gåeren.
 * side = 1: vimpelen til høyre for stanga, -1: til venstre.
 */
function flagSpot(pt: { x: number; y: number }, end: boolean) {
  if (end) {
    const side = END.x < 170 ? -1 : 1
    return { x: END.x + side * 21, base: END.y + HALF, top: END.y + HALF - POLE, side }
  }
  if (YS.some((y) => Math.abs(pt.y - y) < 0.5)) return { x: pt.x, base: pt.y - HALF - 4, top: pt.y - HALF - 4 - POLE, side: pt.x > 230 ? -1 : 1 }
  const i = YS.findIndex((y) => y > pt.y)
  const cy = (YS[i - 1] + YS[i]) / 2
  const right = pt.x > (X0 + X1) / 2
  return { x: right ? X1 + 10 : X0 - 10, base: cy + 12, top: cy + 12 - POLE, side: right ? -1 : 1 }
}

export function WalkPath(props: WalkPathProps) {
  const rm = useReducedMotion()
  const live = props.mode === 'play' && !rm
  // Ny montering ved bytte mellom spill og stillbilde: 'done' viser alltid sluttbildet med en gang.
  return <WalkArt key={live ? 'live' : 'still'} {...props} live={live} />
}

function WalkArt({ km, target, cumKm, flags, leftText, label, live }: WalkPathProps & { live: boolean }) {
  const id = useArtId('wp')
  const p = useCountUp(km * SCALE, { duration: 1800, delay: 200, ease: easeData }, live ? 0 : undefined) / SCALE
  const at = (k: number) => ROUTE.pointAt((k / target) * ROUTE.length)
  const walker = at(p)
  return (
    <svg className="w-art wp" viewBox="0 0 340 312" role="img" aria-label={label}>
      <defs>
        <LinGrad id={id('walk')} from="#d0456e" to="#8a1f44" userSpace={{ x1: 0, y1: 0, x2: 340, y2: 312 }} />
        <LinGrad id={id('gold')} {...GOLD} />
      </defs>
      <g aria-hidden="true">
        <path d={ROUTE.d} stroke="rgba(138,31,68,.12)" {...STROKE} />
        <path d={ROUTE.d} pathLength={target} stroke={`url(#${id('walk')})`} strokeDasharray={`${p} ${target + 1}`} {...STROKE} />
        {cumKm.slice(0, -1).map((c, i) => {
          const pt = at(c)
          return <circle key={i} className="wp-dot" cx={pt.x} cy={pt.y} r={3} fill="#fff" style={{ opacity: p >= c ? 0.95 : 0 }} />
        })}
        {flags.map((f) => {
          if (f.reached && live && p < f.at) return null // flagget legges inn (og spretter) i det streken passerer
          const end = f.at >= target - 0.01
          const s = flagSpot(at(f.at), end)
          const px = s.side > 0 ? s.x + 1 : s.x - 1 - PS // vimpelens venstre kant
          const cx = px + PS / 2
          const cy = s.top + PS / 2
          return (
            <g key={f.n} className={f.reached ? 'w-pop wp-pop' : 'w-fade'} style={f.reached ? undefined : LATE}>
              <line x1={s.x} y1={s.base} x2={s.x} y2={s.top} stroke="#17231f" strokeWidth={1.5} strokeLinecap="round" />
              <g transform={`translate(${px} ${s.top})`}>
                {f.reached ? (
                  <path d={PENNANT} fill={`url(#${id('gold')})`} stroke="#fff" strokeWidth={1.5} />
                ) : (
                  <path d={PENNANT} fill="#fffdf9" stroke="#9c5c08" strokeWidth={1.5} strokeDasharray="2 2" />
                )}
              </g>
              {/* Tallet står mørkt på lys bunn, så det kan leses (gull med hvitt tall var for svakt) */}
              {f.reached && <circle cx={cx} cy={cy} r={6.5} fill="#fffdf9" />}
              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={800} fill="#6e3f02">
                {f.n}
              </text>
              {f.label &&
                (end ? (
                  <text x={s.x} y={s.base + 15} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600} fill="#4b5a54">
                    {f.label}
                  </text>
                ) : (
                  <text x={s.side > 0 ? px + PS + 5 : px - 5} y={cy} textAnchor={s.side > 0 ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight={600} fill="#4b5a54">
                    {f.label}
                  </text>
                ))}
            </g>
          )
        })}
        {leftText && (
          <g className="w-fade" style={LATE}>
            <rect x={66} y={280} width={96} height={24} rx={12} fill="#fff" stroke="rgba(138,31,68,.25)" />
            <text x={114} y={292} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700} fill="#8a1f44">
              {leftText}
            </text>
          </g>
        )}
        <g transform={`translate(${walker.x} ${walker.y})`}>
          <SvgFace x={0} y={0} r={13} id={config.persona.id} initial={config.persona.initials} />
        </g>
      </g>
    </svg>
  )
}
