// Formene i «Flyt»-designet (Material 3 Expressive): kjeks og blomst, med gradientfyll og hvitt ikon.
// Brukes på vaktsiden, i forklaringene og i månedshistoriens illustrasjoner.

import { paths } from './ui.tsx'

/** «Cookie»-form: sirkel med myke bølger i kanten. */
export function cookiePath(size: number, lobes = 9, depth = 0.07) {
  const c = size / 2
  const pts: string[] = []
  for (let i = 0; i <= 180; i++) {
    const a = (i / 180) * Math.PI * 2
    const r = c * (1 - depth + depth * Math.cos(lobes * a))
    pts.push(`${(c + r * Math.cos(a)).toFixed(2)},${(c + r * Math.sin(a)).toFixed(2)}`)
  }
  return `M${pts.join('L')}Z`
}

/** Blomst: fire dype lober – rekord, milepæl, merke. */
export const flowerPath = (size: number) => cookiePath(size, 4, 0.14)

export function Shape({ size = 40, grad, icon, kind = 'cookie', label, split }: { size?: number; grad: [string, string]; icon: string; kind?: 'cookie' | 'flower' | 'pill' | 'circle'; label?: string; split?: boolean }) {
  const id = `g-${grad.join('').replace(/#/g, '')}-${kind}${split ? '-s' : ''}`
  const d = kind === 'cookie' ? cookiePath(size) : kind === 'flower' ? flowerPath(size) : ''
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden={!label} role={label ? 'img' : undefined} aria-label={label} style={{ flex: 'none' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2={split ? '0' : '1'}>
          <stop offset={split ? '0.5' : '0'} stopColor={grad[0]} />
          <stop offset={split ? '0.5' : '1'} stopColor={grad[1]} />
        </linearGradient>
      </defs>
      {kind === 'pill' ? <rect width={size} height={size} rx={size * 0.32} fill={`url(#${id})`} /> : kind === 'circle' ? <circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} /> : <path d={d} fill={`url(#${id})`} />}
      <svg x={size * 0.25} y={size * 0.25} width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        {paths[icon]}
      </svg>
    </svg>
  )
}
