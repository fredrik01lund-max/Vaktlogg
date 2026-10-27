// Desserter: et brett med én petit-four per dessert (enhetsdiagram), fylt i slange etter sort, flest først.
// Hver sort har et lite kjennetegn (ramekinkant, flytende kjerne, eplebåt, mynteblad) – også i forklaringen.
import './DessertTray.css'
import type { CSSProperties, ReactNode } from 'react'
import { cookiePath, flowerPath } from '../../shapes.tsx'
import { LinGrad, useArtId } from './kit.tsx'

export interface DessertTrayProps {
  items: { id: string; name: string; qty: number }[] // qty desc
  total: number // 97 – brettet tegnes ut fra items, uten tomme plasser
  label: string
}

const PAL: Record<string, [string, string]> = {
  brulee: ['#f0b54a', '#a8650f'],
  fondant: ['#8a5a48', '#4e2c22'],
  tatin: ['#ec8a5c', '#c0613a'],
  sorbet: ['#fff1a6', '#e9c63f'],
}
const CYCLE = Object.values(PAL)
const F26 = flowerPath(26)
const MOLTEN = cookiePath(11.6, 6, 0.1)
const grad = (id: string, i: number) => PAL[id] ?? CYCLE[i % CYCLE.length]

/** Kjennetegnet midt på kaken (26 × 26). Ukjente sorter får bare fargen. */
const MARK: Record<string, ReactNode> = {
  // Crème brûlée: lys ramekinkant rundt den brente sukkertoppen
  brulee: <circle cx={13} cy={13} r={7} fill="none" stroke="#fff4dc" strokeWidth={1.9} />,
  // Sjokoladefondant: en blank, flytende kjerne (bølget kant og en lysstripe, ikke en rund prikk som ser ut som et øye)
  fondant: (
    <>
      <path d={MOLTEN} transform="translate(7.2 7.2)" fill="#2b140e" />
      <path d="M10.4 12.2a3.4 3.4 0 0 1 2.4-2.5" fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={1.2} strokeLinecap="round" />
    </>
  ),
  // Tarte tatin: en karamellisert eplebåt
  tatin: <path d="M13 6.6a6.4 6.4 0 0 1 0 12.8a3.6 6.4 0 0 0 0-12.8z" fill="#ffe2a6" transform="rotate(35 13 13)" />,
  // Sitronsorbet: et mynteblad på kula
  sorbet: <path d="M8.2 17.8c0-5.6 3.9-9.6 9.6-9.6c0 5.6-3.9 9.6-9.6 9.6z" fill="#4c9a5f" />,
}

/** Én kake: blomsten i sortens farge med kjennetegnet oppå. */
function Petit({ kind, fill }: { kind: string; fill: string }) {
  return (
    <>
      <path d={F26} fill={fill} />
      {MARK[kind]}
    </>
  )
}

/** Midtpunkt for kake k av n: ti per rad, annenhver rad baklengs (hver sort blir et bånd). En kort siste rad sentreres. */
function cell(k: number, n: number) {
  const r = Math.floor(k / 10)
  const inRow = Math.min(10, n - r * 10)
  const i = k % 10
  const c = (r % 2 ? inRow - 1 - i : i) + (10 - inRow) / 2
  return { x: 25 + c * 30, y: 25 + r * 30 }
}

export function DessertTray({ items, label }: DessertTrayProps) {
  const aid = useArtId('dt')
  const kinds = items.flatMap((it, i) => Array.from({ length: Math.max(0, Math.round(it.qty)) }, () => i))
  const n = kinds.length
  const rows = Math.max(1, Math.ceil(n / 10))

  return (
    <div className="dt">
      <svg className="w-art dt-art" viewBox={`0 0 320 ${rows * 30 + 20}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>
        <defs>
          {items.map((it, i) => (
            <LinGrad key={i} id={aid(`g${i}`)} from={grad(it.id, i)[0]} to={grad(it.id, i)[1]} />
          ))}
          {items.map((it, i) => (
            <symbol key={i} id={aid(`k${i}`)} viewBox="0 0 26 26" overflow="visible">
              <Petit kind={it.id} fill={`url(#${aid(`g${i}`)})`} />
            </symbol>
          ))}
        </defs>
        <rect className="dt-tray w-fade" x={4} y={4} width={312} height={rows * 30 + 12} rx={28} fill="#fffaf2" stroke="#f5d4ac" strokeWidth={2} />
        <g style={{ '--d': '200ms', '--st': '11ms' } as CSSProperties}>
          {kinds.map((g, k) => {
            const p = cell(k, n)
            return <use key={k} className="dt-cell w-pop" href={`#${aid(`k${g}`)}`} x={p.x - 13} y={p.y - 13} width={26} height={26} style={{ '--i': k, transformOrigin: `${p.x}px ${p.y}px` } as CSSProperties} />
          })}
        </g>
      </svg>
      {/* Forklaringen gjentar det aria-label allerede sier, så den skjules for skjermlesere. */}
      <ul className="dt-legend" aria-hidden="true" style={{ '--d': '1350ms', '--st': '80ms' } as CSSProperties}>
        {items.map((it, i) => (
          <li key={i} className="w-up" style={{ '--i': i } as CSSProperties}>
            <svg className="dt-sw" viewBox="0 0 26 26">
              <defs>
                <LinGrad id={aid(`s${i}`)} from={grad(it.id, i)[0]} to={grad(it.id, i)[1]} />
              </defs>
              <Petit kind={it.id} fill={`url(#${aid(`s${i}`)})`} />
            </svg>
            <span className="dt-name">{it.name}</span>
            <span className="dt-qty">{it.qty}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
