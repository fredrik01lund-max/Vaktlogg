// «Vaktringer»: hver ring er ett mål for kvelden.
// Bevisst egen stil (lys bakgrunn, vår palett, ikon i starten) – Apples
// retningslinjer sier at deres Activity Rings ikke skal kopieres for andre data.
//
//  • Fremdriftsring: fylles mot målet. Over 100 % starter en ny, mørkere runde
//    oppå, slik at «+12 % over rekorden» synes i selve ringen.
//  • Duellring: en dragkamp. Ringen deles mellom deg og motstanderen etter hvor
//    langt over sitt vanlige nivå hver av dere er. Den som har mest ring, leder.

import { memo, useEffect, useId, useMemo, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { L } from './i18n.ts'
import { paths } from './ui.tsx'

export interface GhostMark {
  /** Posisjon på ringen (andel av målet). */
  frac: number
  ahead: boolean
  near: boolean
  /** Lagmålet er nådd – spøkelset toner ut. */
  gone?: boolean
}

export type RingSpec =
  | {
      id: string
      kind?: 'progress'
      value: number
      color: string
      lapColor?: string
      icon: string
      label: string
      /** Spøkelsesfredag: forrige fredags lag som markør på ringen. */
      ghost?: GhostMark
      /** Gave på toppen av ringen (lagpremie). open = målet er nådd. */
      gift?: { open: boolean; prizeIcon: string; animateOpen?: boolean }
    }
  | { id: string; kind: 'duel'; share: number; color: string; colorB: string; icon: string; initialB: string; label: string; leader?: 'me' | 'opponent' | 'tie' }
  | { id: string; kind: 'pair'; beads: ('me' | 'partner')[]; goal: number; reached: boolean; icon: string; label: string; initialB: string }

export const ringColors = {
  rekord: 'var(--ring-rekord)',
  rekordLap: 'var(--ring-rekord-lap)',
  lag: 'var(--ring-lag)',
  lagLap: 'var(--ring-lag-lap)',
  duell: 'var(--ring-duell)',
  motstander: 'var(--ring-motstander)',
}

function polar(c: number, radius: number, frac: number) {
  const a = frac * 2 * Math.PI - Math.PI / 2
  return { x: c + radius * Math.cos(a), y: c + radius * Math.sin(a) }
}

function RingIcon({ name, x, y, size, color }: { name: string; x: number; y: number; size: number; color: string }) {
  return (
    <svg x={x - size / 2} y={y - size / 2} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}

export function Rings({ rings, size = 260, stroke = 16, gap = 5, children, label }: { rings: RingSpec[]; size?: number; stroke?: number; gap?: number; children?: ReactNode; label: string }) {
  const c = size / 2
  const icon = Math.max(10, stroke - 4)
  const anim = { transition: 'stroke-dasharray 900ms cubic-bezier(0.2, 0.8, 0.2, 1)' }
  return (
    <div className="rings" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        <defs>
          <filter id="lapShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="1.6" floodColor="#2e2824" floodOpacity="0.45" />
          </filter>
        </defs>
        {rings.map((r, i) => {
          const radius = c - stroke / 2 - i * (stroke + gap)
          const circ = 2 * Math.PI * radius
          const rot = `rotate(-90 ${c} ${c})`

          if (r.kind === 'duel') {
            const share = Math.max(0.04, Math.min(0.96, r.share))
            const knot = polar(c, radius, share)
            const mid = polar(c, radius, share + (1 - share) / 2)
            return (
              <g key={r.id}>
                {/* Motstanderens del: hele ringen i bunnen */}
                <circle cx={c} cy={c} r={radius} fill="none" stroke={r.colorB} strokeWidth={stroke} />
                {/* Din del: fra toppen og med klokka */}
                <circle cx={c} cy={c} r={radius} fill="none" stroke={r.color} strokeWidth={stroke} strokeDasharray={`${share * circ} ${circ}`} transform={rot} style={anim} />
                {/* Fronten i dragkampen */}
                <circle cx={knot.x} cy={knot.y} r={stroke / 2 + 1.5} fill="#fff" stroke="#2e2824" strokeWidth={1.5} style={{ transition: 'cx 900ms, cy 900ms' }} />
                <line x1={c} y1={c - radius - stroke / 2} x2={c} y2={c - radius + stroke / 2} stroke="#fff" strokeWidth={2} />
                <RingIcon name={r.icon} x={polar(c, radius, Math.min(share / 2, 0.08)).x} y={polar(c, radius, Math.min(share / 2, 0.08)).y} size={icon} color="#fff" />
                <text x={mid.x} y={mid.y} textAnchor="middle" dominantBaseline="central" fontSize={stroke - 4} fontWeight={800} fill="#fff" fontFamily="var(--sans)">
                  {r.initialB}
                </text>
              </g>
            )
          }
          // Den gamle ringvisningen (?design=original) tegner ikke makkerperler.
          if (r.kind === 'pair') return null

          const v = Math.max(0, r.value)
          const first = Math.min(1, v)
          const lap = Math.min(1, Math.max(0, v - 1))
          const end = polar(c, radius, lap)
          return (
            <g key={r.id}>
              <circle cx={c} cy={c} r={radius} fill="none" stroke={r.color} strokeOpacity={0.15} strokeWidth={stroke} />
              <circle
                cx={c}
                cy={c}
                r={radius}
                fill="none"
                stroke={r.color}
                strokeWidth={stroke}
                strokeLinecap={first >= 1 ? 'butt' : 'round'}
                strokeDasharray={`${first * circ} ${circ}`}
                opacity={first > 0 ? 1 : 0}
                transform={rot}
                style={anim}
              />
              {lap > 0 && (
                <>
                  {/* Ny runde: mørkere bue oppå, med skygge der den slutter */}
                  <circle cx={end.x} cy={end.y} r={stroke / 2} fill={r.lapColor ?? r.color} filter="url(#lapShadow)" />
                  <circle cx={c} cy={c} r={radius} fill="none" stroke={r.lapColor ?? r.color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${Math.max(0.001, lap) * circ} ${circ}`} transform={rot} style={anim} />
                </>
              )}
              <RingIcon name={r.icon} x={c} y={c - radius} size={icon} color={first > 0.02 ? '#fff' : r.color} />
            </g>
          )
        })}
      </svg>
      {children && <div className="rings-center">{children}</div>}
    </div>
  )
}

export interface LegendItem {
  id: string
  color: string
  icon: string
  label: string
  value: string
  sub?: string
  done?: boolean
  /** Duell: to farger i prikken (deg og motstanderen). */
  colorB?: string
  /** Tallet bak verdien, så det kan telle i takt med ringen. */
  num?: number
  /** Hvordan tallet skrives: «75 %», «+12 %» eller «23/26». */
  fmt?: 'pct' | 'plus' | 'of'
  of?: number
  /** Tallet bak underteksten («16 % foran»). */
  subNum?: number
}

/** Forklaring under ringene: ikon + kort navn + status. */
export function RingLegend({ items, onClick }: { items: LegendItem[]; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className="ring-legend" onClick={onClick} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((i) => (
        <span key={i.id} className="rl-item">
          <span className="rl-dot" style={{ background: i.colorB ? `linear-gradient(90deg, ${i.color} 50%, ${i.colorB} 50%)` : i.color }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {i.done ? paths.check : paths[i.icon]}
            </svg>
          </span>
          <span className="rl-label">{i.label}</span>
          <span className="rl-value">{i.value}</span>
          {i.sub && <span className="rl-sub">{i.sub}</span>}
        </span>
      ))}
    </Tag>
  )
}

/** Nedtelling av bord på seksjonen: fylte = ferdige, ring = ved bordet nå, tomme = kommer. */
export function TableCountdown({ tables, left, walkIns }: { tables: { table: number; walkIn: boolean; status: 'done' | 'active' | 'upcoming' }[]; left: number; walkIns: number }) {
  return (
    <div
      className="tables-cd"
      role="img"
      aria-label={`${L('{n} bord igjen på seksjonen', left === 1 ? '{n} table left in your section' : '{n} tables left in your section', { n: left })}${walkIns ? L(', inkludert {n} walk-in', walkIns === 1 ? ', including {n} walk-in' : ', including {n} walk-ins', { n: walkIns }) : ''}`}
    >
      <div className="tc-count">
        <span className="tc-num">{left}</span>
        <span className="tc-lab">{L('bord igjen', left === 1 ? 'table left' : 'tables left')}</span>
      </div>
      <div className="tc-dots" aria-hidden="true">
        {tables.map((t, i) => (
          <span key={i} className={`tc-dot ${t.status} ${t.walkIn ? 'walkin' : ''}`} title={L('Bord {n}', 'Table {n}', { n: t.table })}>
            {t.walkIn && t.status !== 'done' ? '+' : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Vaktringer i «Flyt»-stil (design D) ─────────────────────────────────────
// Samme ringer, rekkefølge, markører og beregning som Rings over. Forskjellen er
// tegningen: hver ring får sin egen gradient langs buen (lys start → mørk front),
// slik at fronten – der du er nå – er tydeligst. Gjenstående del er en svak spor-
// farge i samme tone, så oppnådd og gjenstående skilles tydelig.

export const flowRing: Record<string, { from: string; to: string; lap: string; track: string }> = {
  rekord: { from: '#bf7a12', to: '#9c5c08', lap: '#6e3f02', track: 'rgba(196, 128, 22, 0.14)' },
  // Pastell for premiekortene (laget grønn, deg rosa, ukens rett oransje) – samme toner som «Flere premier» på Goals.
  lag: { from: '#b6e6cc', to: '#5fb68a', lap: '#3f8f68', track: 'rgba(95, 182, 138, 0.16)' },
  uke: { from: '#ffd9b3', to: '#f0a456', lap: '#cf8233', track: 'rgba(240, 164, 86, 0.16)' },
  deg: { from: '#d0456e', to: '#8a1f44', lap: '#5f1530', track: 'rgba(0,0,0,0)' },
  motstander: { from: '#6c86bc', to: '#4d66a0', lap: '#4d66a0', track: 'rgba(0,0,0,0)' },
  makker: { from: '#f7dc85', to: '#e0b030', lap: '#a37a10', track: 'rgba(224, 176, 48, 0.16)' },
  personlig: { from: '#f9cadb', to: '#e8829f', lap: '#c9607f', track: 'rgba(232, 130, 159, 0.16)' },
  stor: { from: '#9fe3bf', to: '#ffffff', lap: '#ffd27a', track: 'rgba(255, 255, 255, 0.18)' },
}

// Fargene tolkes én gang og gjenbrukes (ingen regex per segment).
const rgbCache = new Map<string, number[]>()
function rgb(hex: string) {
  let v = rgbCache.get(hex)
  if (!v) {
    v = hex.match(/\w\w/g)!.map((x) => parseInt(x, 16))
    rgbCache.set(hex, v)
  }
  return v
}
function mix(a: string, b: string, t: number) {
  const pa = rgb(a)
  const pb = rgb(b)
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`
}

/**
 * Bue med gradient langs strøket, tegnet som små segmenter (≈40 per runde – jevn nok
 * til at overgangen ikke synes, og lett nok til at masken kan animeres på en telefon).
 */
const GradArc = memo(function GradArc({ c, r, stroke, start, end, from, to, capStart = true, capEnd = true }: { c: number; r: number; stroke: number; start: number; end: number; from: string; to: string; capStart?: boolean; capEnd?: boolean }) {
  if (end - start <= 0.0005) return null
  const n = Math.max(2, Math.ceil((end - start) * 40))
  const segs = []
  for (let i = 0; i < n; i++) {
    const a0 = start + ((end - start) * i) / n
    const a1 = start + ((end - start) * (i + 1)) / n + 0.003
    const p0 = polar(c, r, a0)
    const p1 = polar(c, r, Math.min(a1, end))
    const large = a1 - a0 > 0.5 ? 1 : 0
    segs.push(<path key={i} d={`M${p0.x},${p0.y} A${r},${r} 0 ${large} 1 ${p1.x},${p1.y}`} fill="none" stroke={mix(from, to, (i + 0.5) / n)} strokeWidth={stroke} />)
  }
  const ps = polar(c, r, start)
  const pe = polar(c, r, end)
  return (
    <g>
      {capStart && <circle cx={ps.x} cy={ps.y} r={stroke / 2} fill={from} />}
      {segs}
      {capEnd && <circle cx={pe.x} cy={pe.y} r={stroke / 2} fill={to} />}
    </g>
  )
})

/** Merke øverst på ringen: lukket gave (hvit) eller åpnet premie (farget). Spretter bare når den åpnes nå. */
function TopBadge({ c, y, r, icon, open, color, animateOpen }: { c: number; y: number; r: number; icon: string; open: boolean; color: string; animateOpen?: boolean }) {
  const s = r * 1.25
  return (
    <g className={open ? (animateOpen ? 'gift-open anim' : 'gift-open') : 'gift-closed'} style={{ transformOrigin: c + 'px ' + y + 'px' }}>
      <circle cx={c} cy={y} r={r} fill={open ? color : '#fff'} stroke={color} strokeWidth={2.2} />
      <svg x={c - s / 2} y={y - s / 2} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={open ? '#fff' : color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        {paths[icon]}
      </svg>
    </g>
  )
}

/**
 * Spøkelset: forrige fredags lag som en markør som går rundt ringen.
 * Når laget er forbi, trer det et skritt tilbake (svakere, mindre). Når lagmålet er nådd, toner det ut.
 */
function Ghost({ c, radius, stroke, mark, color }: { c: number; radius: number; stroke: number; mark: GhostMark; color: string }) {
  const deg = Math.min(0.995, mark.frac) * 360
  const y = c - radius
  const r = stroke / 2 + 2
  const s = r * 1.3
  const state = mark.gone ? 'gone' : mark.ahead ? 'behind' : ''
  return (
    <g className="ghost-rot ring-rot" style={{ transform: 'rotate(' + deg + 'deg)', transformOrigin: c + 'px ' + c + 'px' }} aria-hidden="true">
      <g className="ring-rot" style={{ transform: 'rotate(' + -deg + 'deg)', transformOrigin: c + 'px ' + y + 'px' }}>
        <g className={`ghost-face ${state} ${mark.near && !mark.gone ? 'ghost-near' : ''}`} style={{ transformOrigin: c + 'px ' + y + 'px' }}>
          <circle cx={c} cy={y} r={r} fill="rgba(255,255,255,0.92)" stroke={color} strokeWidth={2} strokeDasharray="3 2.5" />
          <svg x={c - s / 2} y={y - s / 2} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            {paths.ghost}
          </svg>
        </g>
      </g>
    </g>
  )
}

/** Hel sirkel som starter klokka 12 og går med klokka – brukes som maske som «tegner» ringen frem. */
function circlePath(c: number, r: number) {
  return `M${c},${c - r} A${r},${r} 0 1 1 ${c},${c + r} A${r},${r} 0 1 1 ${c},${c - r}`
}

/**
 * Masken som avslører en bue fra toppen og frem til `frac`.
 * Buen tegnes én gang ved målverdien; det er bare maskens strek som flyttes (CSS-overgang),
 * så en ny verdi gir én React-oppdatering og resten skjer i nettleserens grafikk.
 */
function SweepMask({ id, size, c, r, stroke, frac, round = true, className, style }: { id: string; size: number; c: number; r: number; stroke: number; frac: number; round?: boolean; className?: string; style?: CSSProperties }) {
  return (
    <mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={size} height={size}>
      <path
        className={`ring-mask ${className ?? ''}`}
        d={circlePath(c, r)}
        pathLength={1}
        fill="none"
        stroke="#fff"
        strokeWidth={stroke + 2}
        strokeLinecap={round ? 'round' : 'butt'}
        strokeDasharray="1 1"
        style={{ strokeDashoffset: 1 - Math.max(0, Math.min(1, frac)), ...style }}
      />
    </mask>
  )
}

interface Prev {
  v?: number
  share?: number
  leader?: string
  beads?: number
  reached?: boolean
}
/** En feiring som er låst til verdiendringen den hører til – en tilfeldig omtegning avbryter den ikke. */
interface Celebration {
  key: number
  from: number
  to: number
  t1: number
  until: number
}

const DATA_MS = 900
/** Tidspunktet (andel av steget) da en ease-out-telling passerer andelen f – så ring og tall passerer 100 % samtidig. */
const crossTime = (f: number) => 1 - Math.cbrt(1 - Math.max(0, Math.min(1, f)))

export function FlowRings({
  rings,
  size = 280,
  stroke = 17,
  gap = 7,
  children,
  label,
  reveal,
  quiet,
  enter,
  hold,
}: {
  rings: RingSpec[]
  size?: number
  stroke?: number
  gap?: number
  children?: ReactNode
  label: string
  /** Avsløring: ringene tegnes frem fra 0 (true) eller fra en startandel (tall), én gang. */
  reveal?: boolean | number
  /** Rolig: ingen milepæl-feiringer på ringen. */
  quiet?: boolean
  /** Nye ringer (f.eks. når kveldens spill endres) glir inn. */
  enter?: boolean
  /** Hold avsløringen igjen (f.eks. til kortet er synlig i skjermen). */
  hold?: boolean
}) {
  const c = size / 2
  const icon = stroke - 3
  const uid = useId().replace(/[^A-Za-z0-9_-]/g, '')
  // Forrige verdier per ring – for å se hva som endret seg i dette steget.
  const prevRef = useRef<Record<string, Prev>>({})
  const celebs = useRef<Record<string, Celebration>>({})
  const prev = prevRef.current
  useEffect(() => {
    const next: Record<string, Prev> = {}
    for (const r of rings) {
      if (r.kind === 'duel') next[r.id] = { share: r.share, leader: r.leader }
      else if (r.kind === 'pair') next[r.id] = { beads: r.beads.length, reached: r.reached }
      else next[r.id] = { v: r.value }
    }
    prevRef.current = next
  })
  // Nye ringer i denne visningen (spillet ble endret) – låst til settet med ringer, ikke til hver omtegning.
  const idSig = rings.map((r) => r.id).join('|')
  const shownIds = useRef<string | null>(null)
  const freshIds = useMemo(() => {
    const before = shownIds.current
    if (!enter || before === null || before === idSig) return new Set<string>()
    const old = new Set(before.split('|'))
    return new Set(idSig.split('|').filter((id) => !old.has(id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idSig, enter])
  useEffect(() => {
    shownIds.current = idSig
  }, [idSig])
  /** Start (eller behold) en feiring for en verdiendring. Samme endring gir samme nøkkel. */
  const celebrate = (id: string, from: number, to: number, t1: number) => {
    const cur = celebs.current[id]
    if (cur && cur.from === from && cur.to === to) return cur
    const next = { key: (cur?.key ?? 0) + 1, from, to, t1, until: performance.now() + t1 + 900 }
    celebs.current[id] = next
    return next
  }
  const active = (id: string) => {
    const cur = celebs.current[id]
    return cur && performance.now() < cur.until ? cur : undefined
  }
  const startFrac = typeof reveal === 'number' ? reveal : 0
  const revealing = reveal !== undefined && reveal !== false

  return (
    <div className={`rings ${revealing ? 'reveal' : ''} ${hold ? 'hold' : ''}`} style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        <defs>
          <filter id={`${uid}-shadow`} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="1.8" floodColor="#1a1a1a" floodOpacity="0.4" />
          </filter>
        </defs>
        {rings.map((r, i) => {
          const radius = c - stroke / 2 - i * (stroke + gap)
          const p = prev[r.id]
          const gStyle = { '--i': i } as CSSProperties
          const gClass = freshIds.has(r.id) ? 'ring-enter' : undefined
          const centre = c + 'px ' + c + 'px'
          const topOrigin = c + 'px ' + (c - radius) + 'px'

          if (r.kind === 'duel') {
            const me = flowRing.deg
            const them = flowRing.motstander
            const share = Math.max(0.04, Math.min(0.96, r.share))
            const pShare = p?.share !== undefined ? Math.max(0.04, Math.min(0.96, p.share)) : share
            // Under avsløring ligger Jonas' bue hele veien rundt, så knuten alltid dytter inn i blått – aldri et hull.
            const lo = revealing ? 0 : Math.min(pShare, share)
            const hi = Math.max(pShare, share)
            const midDeg = (share + (1 - share) / 2) * 360
            const iconAt = polar(c, radius, Math.min(share / 2, 0.075))
            // Emma tar ledelsen: knuten gir et lite dytt. Å miste ledelsen får ingen markering.
            if (!quiet && p?.leader !== undefined && p.leader !== 'me' && r.leader === 'me') celebrate(r.id, pShare, share, DATA_MS)
            const bump = active(r.id)
            const maskId = `${uid}-d${i}`
            return (
              <g key={r.id} className={gClass} style={gStyle}>
                <defs>
                  <SweepMask id={maskId} size={size} c={c} r={radius} stroke={stroke} frac={share} round={false} style={{ '--from': 1 } as CSSProperties} />
                </defs>
                {/* Jonas: fra fronten og rundt til toppen */}
                <GradArc c={c} r={radius} stroke={stroke} start={lo} end={1} from={them.from} to={them.to} capStart={false} capEnd={false} />
                {/* Deg: fra toppen og med klokka – masken flytter fronten */}
                <g mask={`url(#${maskId})`}>
                  <GradArc c={c} r={radius} stroke={stroke} start={0} end={hi} from={me.from} to={me.to} capStart={false} capEnd={false} />
                </g>
                <line x1={c} y1={c - radius - stroke / 2} x2={c} y2={c - radius + stroke / 2} stroke="#fff" strokeWidth={2.5} />
                {/* Knuten rir på ringen (rotasjon), i stedet for å kutte tvers over midten */}
                <g className="ring-rot" style={{ transform: `rotate(${share * 360}deg)`, transformOrigin: centre }}>
                  <g key={bump?.key ?? 0} className={bump ? 'knot-bump' : undefined} style={{ transformOrigin: topOrigin }}>
                    <circle cx={c} cy={c - radius} r={stroke / 2 + 2.5} fill="#fff" stroke="#1d2433" strokeWidth={2} />
                  </g>
                </g>
                <svg x={iconAt.x - icon / 2} y={iconAt.y - icon / 2} width={icon} height={icon} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                  {paths[r.icon]}
                </svg>
                {/* Motstanderens forbokstav midt på sin del, alltid stående (toner inn ved avsløring) */}
                <g className="ring-rot duel-init" style={{ transform: `rotate(${midDeg}deg)`, transformOrigin: centre }}>
                  <g className="ring-rot" style={{ transform: `rotate(${-midDeg}deg)`, transformOrigin: topOrigin }}>
                    <text x={c} y={c - radius} textAnchor="middle" dominantBaseline="central" fontSize={stroke - 3} fontWeight={800} fill="#fff" fontFamily="var(--sans)">
                      {r.initialB}
                    </text>
                  </g>
                </g>
              </g>
            )
          }
          if (r.kind === 'pair') {
            // Makker: én perle per dessert i det felles målet, i den rekkefølgen de ble solgt.
            const me = flowRing.deg
            const partner = flowRing.makker
            const circ = 2 * Math.PI * radius
            const gapF = 3.5 / circ
            const left = r.goal - r.beads.length
            const before = p?.beads ?? r.beads.length
            return (
              <g key={r.id} className={gClass} style={gStyle}>
                {r.reached ? (
                  <g className={p?.reached === false ? 'arc-in' : undefined}>
                    <GradArc c={c} r={radius} stroke={stroke} start={0} end={1} from={me.from} to={partner.to} capStart={false} capEnd={false} />
                  </g>
                ) : (
                  Array.from({ length: r.goal }, (_, b) => {
                    const a0 = b / r.goal + gapF / 2
                    const a1 = (b + 1) / r.goal - gapF / 2
                    const p0 = polar(c, radius, a0)
                    const p1 = polar(c, radius, a1)
                    const who = r.beads[b]
                    const fill = who === 'me' ? me.to : who === 'partner' ? partner.to : 'rgba(224, 176, 48, 0.3)'
                    // Nye perler fylles én og én, i den rekkefølgen dessertene ble solgt.
                    const delay = who && b >= before ? (b - before) * 60 : 0
                    return (
                      <path
                        key={b}
                        className={`bead ${!who && left <= 3 ? 'bead-near' : ''}`}
                        d={'M' + p0.x + ',' + p0.y + ' A' + radius + ',' + radius + ' 0 0 1 ' + p1.x + ',' + p1.y}
                        fill="none"
                        strokeWidth={stroke}
                        style={{ stroke: fill, transitionDelay: delay + 'ms' }}
                      />
                    )
                  })
                )}
                <TopBadge c={c} y={c - radius} r={stroke / 2 + 3} icon={r.reached ? 'check' : r.icon} open={r.reached} color={partner.to} animateOpen={p?.reached === false && r.reached} />
              </g>
            )
          }
          const col = flowRing[r.id] ?? flowRing.rekord
          const v = Math.max(0, r.value)
          const first = Math.min(1, v)
          const lap = Math.min(1, Math.max(0, v - 1))
          const g = r.ghost
          // Passerer 100 % i dette steget: fronten når toppen i samme øyeblikk som tallet passerer målet,
          // så fortsetter den mørkere runden. Feiringen låses til denne endringen.
          const pv = p?.v
          const crossingNow = pv !== undefined && pv < 1 && v >= 1
          if (crossingNow && !quiet) celebrate(r.id, pv, v, Math.max(200, Math.min(DATA_MS, DATA_MS * crossTime((1 - pv) / Math.max(0.0001, v - pv)))))
          const cel = active(r.id)
          const t1 = crossingNow ? (cel?.t1 ?? DATA_MS * crossTime((1 - pv) / Math.max(0.0001, v - pv))) : DATA_MS
          const firstStyle: CSSProperties = crossingNow ? { transitionDuration: t1 + 'ms', transitionTimingFunction: 'linear' } : { ['--from' as string]: 1 - startFrac }
          const lapStyle: CSSProperties = crossingNow ? { transitionDelay: t1 + 'ms', transitionDuration: Math.max(250, DATA_MS - t1) + 'ms' } : {}
          // Når ringen er full eller passerer 100 %, brukes rette ender på masken (ingen mørk tupp bak toppen);
          // en egen rund front følger fronten i stedet.
          const full = first >= 1 || crossingNow
          const mFirst = `${uid}-a${i}`
          const mLap = `${uid}-b${i}`
          const mGlow = `${uid}-g${i}`
          const showGlow = g && !g.gone
          return (
            <g key={r.id} className={gClass} style={gStyle}>
              <defs>
                <SweepMask id={mFirst} size={size} c={c} r={radius} stroke={stroke} frac={first} round={!full} className="first" style={firstStyle} />
                <SweepMask id={mLap} size={size} c={c} r={radius} stroke={stroke} frac={lap} round={false} className="lap" style={lapStyle} />
                {g && <SweepMask id={mGlow} size={size} c={c} r={radius} stroke={stroke} frac={g.gone ? 0 : Math.min(1, g.frac)} round={false} />}
              </defs>
              <circle cx={c} cy={c} r={radius} fill="none" stroke={col.track} strokeWidth={stroke} />
              {/* Laget bak spøkelset: sporet frem til spøkelset gløder svakt, under lagets egen bue */}
              {showGlow && (
                <g mask={`url(#${mGlow})`}>
                  <GradArc c={c} r={radius} stroke={stroke} start={0} end={Math.min(1, g.frac)} from="#c9e9d7" to="#b2dcc4" capStart={false} capEnd={false} />
                </g>
              )}
              {first > 0 && (
                <g mask={`url(#${mFirst})`}>
                  <GradArc c={c} r={radius} stroke={stroke} start={0} end={first} from={col.from} to={col.to} capStart capEnd={first < 1} />
                </g>
              )}
              {full && (
                <g className="ring-rot first-rot" style={{ transform: `rotate(${first * 360}deg)`, transformOrigin: centre, ...(crossingNow ? { transitionDuration: t1 + 'ms', transitionTimingFunction: 'linear' } : {}) }}>
                  <circle cx={c} cy={c - radius} r={stroke / 2} fill={col.to} />
                </g>
              )}
              {lap > 0 && (
                <g mask={`url(#${mLap})`}>
                  <GradArc c={c} r={radius} stroke={stroke} start={0} end={Math.max(0.002, lap)} from={col.to} to={col.lap} capStart={false} />
                </g>
              )}
              {/* Skyggen der den nye runden slutter følger fronten rundt */}
              <g className="ring-rot lap-rot" style={{ transform: `rotate(${lap * 360}deg)`, transformOrigin: centre, ...lapStyle }}>
                <circle cx={c} cy={c - radius} r={stroke / 2} fill={col.lap} filter={`url(#${uid}-shadow)`} style={{ opacity: lap > 0.05 ? 1 : 0 }} className="lap-cap" />
              </g>
              {/* Målet nås: én myk glød rundt ringen, i rundens farge */}
              {cel && <circle key={'h' + cel.key} className="ring-close" cx={c} cy={c} r={radius} fill="none" stroke={col.lap} strokeWidth={stroke} style={{ transformOrigin: centre, animationDelay: cel.t1 + 'ms' }} />}
              {g && <Ghost c={c} radius={radius} stroke={stroke} mark={g} color={col.to} />}
              <g key={'i' + (cel?.key ?? 0)} className={cel ? 'icon-pop' : undefined} style={{ transformOrigin: topOrigin, animationDelay: (cel?.t1 ?? 0) + 'ms' }}>
                {r.gift ? (
                  <TopBadge c={c} y={c - radius} r={stroke / 2 + 3} icon={r.gift.open ? r.gift.prizeIcon : 'gift'} open={r.gift.open} color={col.to} animateOpen={r.gift.animateOpen} />
                ) : (
                  <svg x={c - icon / 2} y={c - radius - icon / 2} width={icon} height={icon} viewBox="0 0 24 24" fill="none" stroke={first > 0.02 ? '#fff' : col.to} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                    {paths[r.icon]}
                  </svg>
                )}
              </g>
            </g>
          )
        })}
      </svg>
      {children && <div className="rings-center">{children}</div>}
    </div>
  )
}
