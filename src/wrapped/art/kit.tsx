// Felles byggeklosser for illustrasjonene i månedshistorien.
// Alle illustrasjoner er inline SVG/HTML, uten bilder og uten filtre.

import { useId } from 'react'
import { config } from '../../config.ts'
import { cookiePath, flowerPath } from '../../shapes.tsx'
import { paths } from '../../ui.tsx'
import { avatarPhoto } from '../../avatars.ts'

/** Unike id-er for gradienter og mønstre (alle kortene er montert samtidig). */
export function useArtId(prefix: string) {
  const id = useId().replace(/[^A-Za-z0-9_-]/g, '')
  return (name: string) => `${prefix}-${id}-${name}`
}

/** 140° to-stopp-gradient, lys øverst til venstre → dyp nederst til høyre. */
export function LinGrad({ id, from, to, userSpace }: { id: string; from: string; to: string; userSpace?: { x1: number; y1: number; x2: number; y2: number } }) {
  if (userSpace)
    return (
      <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={userSpace.x1} y1={userSpace.y1} x2={userSpace.x2} y2={userSpace.y2}>
        <stop offset="0" stopColor={from} />
        <stop offset="1" stopColor={to} />
      </linearGradient>
    )
  return (
    <linearGradient id={id} x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0" stopColor={from} />
      <stop offset="1" stopColor={to} />
    </linearGradient>
  )
}

/** Ikon fra appens ikonsett, sentrert på (x, y). */
export function SvgIcon({ name, x, y, size, color = '#fff', sw = 2.4, fill = 'none' }: { name: string; x: number; y: number; size: number; color?: string; sw?: number; fill?: string }) {
  return (
    <svg x={x - size / 2} y={y - size / 2} width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

/** Person som avatarprikk: profilbilde når personen har et, ellers fast farge og hvit forbokstav. Hvit ring. */
export function SvgFace({ x, y, r, id, initial }: { x: number; y: number; r: number; id: string; initial?: string }) {
  const color = config.avatarColor[id] ?? '#5c6a64'
  const letter = initial ?? (id === config.persona.id ? config.persona.firstName[0] : id[0].toUpperCase())
  const photo = avatarPhoto[id]
  // Unik id per kort (alle kortene er montert samtidig)
  const clip = useArtId('face')(`${id}-${Math.round(r)}`)
  if (photo)
    return (
      <g aria-hidden="true">
        <defs>
          <clipPath id={clip}>
            <circle cx={x} cy={y} r={r} />
          </clipPath>
        </defs>
        <circle cx={x} cy={y} r={r} fill={color} />
        <image href={photo} x={x - r} y={y - r} width={2 * r} height={2 * r} clipPath={`url(#${clip})`} preserveAspectRatio="xMidYMid slice" />
        <circle cx={x} cy={y} r={r} fill="none" stroke="#fff" strokeWidth={3} />
      </g>
    )
  return (
    <g aria-hidden="true">
      <circle cx={x} cy={y} r={r} fill={color} stroke="#fff" strokeWidth={3} />
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={r * 0.95} fontWeight={800} fill="#fff" style={{ fontFamily: 'var(--sans)' }}>
        {letter}
      </text>
    </g>
  )
}

/** Kjeks (sentrert på x, y). */
export function Cookie({ x, y, size, fill, stroke, sw, className, style }: { x: number; y: number; size: number; fill: string; stroke?: string; sw?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <g transform={`translate(${x - size / 2} ${y - size / 2})`}>
      <path d={cookiePath(size)} fill={fill} stroke={stroke} strokeWidth={sw} className={className} style={style} />
    </g>
  )
}

/** Blomst (sentrert på x, y). */
export function Flower({ x, y, size, fill, stroke, sw, className, style }: { x: number; y: number; size: number; fill: string; stroke?: string; sw?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <g transform={`translate(${x - size / 2} ${y - size / 2})`}>
      <path d={flowerPath(size)} fill={fill} stroke={stroke} strokeWidth={sw} className={className} style={style} />
    </g>
  )
}

/** Bakgrunnsformer per kort: en kjeks øverst til høyre og en blomst nederst til venstre. Snur seg én gang ved inngang. */
export function BgShapes() {
  return (
    <div className="w-bg" aria-hidden="true">
      <svg className="w-bg-a" width="320" height="320" viewBox="0 0 320 320">
        <path d={cookiePath(320)} fill="var(--w-deco)" />
      </svg>
      <svg className="w-bg-b" width="220" height="220" viewBox="0 0 220 220">
        <path d={flowerPath(220)} fill="var(--w-deco)" />
      </svg>
    </div>
  )
}
