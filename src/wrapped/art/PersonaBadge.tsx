// Septembertypen: et blomstermerke med opptil tre trekk i bane rundt.
// Bygget bare av ros, kalender og meny – aldri aktivitet, puls, skritt, salg eller tips.

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Cookie, Flower, LinGrad, SvgIcon, useArtId } from './kit.tsx'

export interface PersonaBadgeProps {
  icon: string // 'helping'
  traits: { icon: string; label: string; color: string }[] // ≤3
  label: string
}

// Banen fyller hele bredden og merket er stort, så bildet også fyller høyden på høye telefoner
const W = 340
const H = 388
const CX = 170
const CY = 172
const R = 160
const ANGLES = [-135, -45, 90]
// Navnene over de øverste trekkene holdes innenfor tegneflaten (lange navn som «Rolig under press»)
const LABEL_EDGE = 68
/** Luft mellom et navn og kanten av tegneflaten. */
const LABEL_PAD = 4

export function PersonaBadge({ icon, traits, label }: PersonaBadgeProps) {
  const id = useArtId('pb')
  // Navnenes bredde måles etter første tegning: et langt navn (f.eks. på engelsk) flyttes inn så det aldri kuttes ved kanten.
  const texts = useRef<(SVGTextElement | null)[]>([])
  const [widths, setWidths] = useState<number[]>([])
  const key = traits.map((t) => t.label).join('|')
  useLayoutEffect(() => {
    setWidths(texts.current.map((t) => (t ? t.getComputedTextLength() : 0)))
  }, [key])
  const sats = traits.slice(0, ANGLES.length).map((t, i) => {
    const a = (ANGLES[i] * Math.PI) / 180
    const dx = Math.round(R * Math.cos(a)) || 0
    const dy = Math.round(R * Math.sin(a)) || 0
    const edge = Math.max(LABEL_EDGE, (widths[i] ?? 0) / 2 + LABEL_PAD)
    return { ...t, dx, dy, x: CX + dx, y: CY + dy, lx: Math.min(W - edge, Math.max(edge, CX + dx)) }
  })
  // Uten trekk under merket slutter tegningen ved banen – ellers ville et tomt felt nederst skyve merket opp
  const h = sats.some((s) => s.dy > 0) ? H : CY + R + 10
  return (
    <svg className="w-art pb" viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>
      <defs>
        <radialGradient id={id('halo')}>
          <stop offset="0" stopColor="#9fe3bf" stopOpacity={0.35} />
          <stop offset="1" stopColor="#9fe3bf" stopOpacity={0} />
        </radialGradient>
        <LinGrad id={id('badge')} from="#3a9d6c" to="#8f82e6" />
      </defs>
      <g aria-hidden="true">
        <circle cx={CX} cy={CY} r={168} fill={`url(#${id('halo')})`} />
        <circle className="w-fade" style={{ '--d': '600ms' } as CSSProperties} cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,.22)" strokeWidth={1.5} strokeDasharray="2 7" strokeLinecap="round" />
        <g className="pb-badge w-spin" style={{ '--d': '150ms' } as CSSProperties}>
          <Flower x={CX} y={CY} size={236} fill={`url(#${id('badge')})`} />
          <Flower x={CX} y={CY} size={204} fill="none" stroke="rgba(255,255,255,.85)" sw={3} />
          <SvgIcon name={icon} x={CX} y={CY} size={98} color="#ffffff" sw={2.2} />
        </g>
        {sats.map((s, i) => (
          <g key={`${i}-${s.label}`}>
            <g className="pb-sat w-fly" style={{ '--dx': `${s.dx}px`, '--dy': `${s.dy}px`, '--d': '800ms', '--i': i, '--st': '120ms' } as CSSProperties}>
              <Cookie x={s.x} y={s.y} size={64} fill="#ffffff" />
              <SvgIcon name={s.icon} x={s.x} y={s.y} size={30} color={s.color} sw={2.4} />
            </g>
            <text
              ref={(el) => {
                texts.current[i] = el
              }}
              className="w-fade"
              style={{ '--d': '950ms', '--i': i, '--st': '120ms' } as CSSProperties}
              x={s.lx}
              y={s.dy < 0 ? s.y - 42 : s.y + 50}
              textAnchor="middle"
              fontSize={15}
              fontWeight={700}
              fill="#ffffff"
            >
              {s.label}
            </text>
          </g>
        ))}
      </g>
    </svg>
  )
}
