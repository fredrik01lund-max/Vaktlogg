// gjester – «Nok til å fylle Fjordgata fire ganger»: én restaurantfasade per fullt hus, 1 sete = 1 gjest.
// Hver fasade har markise med navnet, et vindu og en dør. Bak vinduet står et 10×10-setekart som fylles
// nedenfra, rad for rad; et fullt hus får et hakemerke. To mønsterlag per hus (tomme og fylte seter) i stedet for 100 sirkler.

import './Storefronts.css'
import type { CSSProperties } from 'react'
import { config } from '../../config.ts'
import { Cookie, LinGrad, SvgIcon, useArtId } from './kit.tsx'

export interface StorefrontsProps {
  houses: number[] // [100,100,100,100,19]
  seats: number // 100 – grid is always 10×10 seats per house
  label: string
}

const W = 340
const HOUSE_W = 100
const GAP = 14
const ROW_Y = [8, 138]
const HOUSE_H = 122 // fra markisestangen til skyggen under fasaden
// Vinduet (glassfronten) med setene, og døra til høyre for det
const WIN = { x: 5, y: 40, w: 70, h: 70 }
const PITCH = 6.4
const GRID = { x: WIN.x + 3, y: WIN.y + 3 } // 10 × 6,4 = 64 innenfor et 70 px vindu
const FACADE_B = WIN.y + WIN.h + 6
const DOOR = { x: 80, w: 15, top: 62 }
// Markisen: stripet tak og en mørk kappe med buer under – navnet står på kappen
const CANOPY = `M1,8H99L104,18H-4Z`
const SCALLOP = 108 / 8
const R = (SCALLOP / 2).toFixed(2)
const VALANCE = `M-4,18H104V29${Array.from({ length: 8 }, (_, i) => `A${R},${R} 0 0 1 ${(104 - SCALLOP * (i + 1)).toFixed(2)},29`).join('')}Z`
const DOOR_PATH = `M${DOOR.x},${WIN.y + WIN.h}V${DOOR.top + DOOR.w / 2}a${DOOR.w / 2},${DOOR.w / 2} 0 0 1 ${DOOR.w},0V${WIN.y + WIN.h}Z`
const PANE = `M${DOOR.x + 3},${DOOR.top + 22}V${DOOR.top + 7.5}a4.5,4.5 0 0 1 9,0V${DOOR.top + 22}Z`

const vars = (o: Record<string, string | number>) => o as CSSProperties

export function Storefronts({ houses, seats, label }: StorefrontsProps) {
  const id = useArtId('sf')
  const list = houses.slice(0, 6)
  const height = list.length > 3 ? ROW_Y[1] + HOUSE_H : ROW_Y[0] + HOUSE_H // én rad med hus → ingen tom halvdel under
  const placed = list.map((v, k) => {
    const row = k < 3 ? 0 : 1
    const c = row === 0 ? Math.min(3, list.length) : list.length - 3
    const j = row === 0 ? k : k - 3
    const x0 = (W - (c * HOUSE_W + (c - 1) * GAP)) / 2
    const cells = Math.max(0, Math.min(100, Math.round((v * 100) / Math.max(1, seats))))
    return { k, cells, full: v >= seats, x: x0 + j * (HOUSE_W + GAP), y: ROW_Y[row] }
  })

  return (
    <svg className="w-art" viewBox={`0 0 ${W} ${height}`} role="img" aria-label={label}>
      <defs>
        <pattern id={id('stripe')} patternUnits="userSpaceOnUse" x={-4} y={0} width={16} height={32}>
          <rect width={8} height={32} fill="#2e8c5e" />
          <rect x={8} width={8} height={32} fill="#ffffff" />
        </pattern>
        <pattern id={id('empty')} patternUnits="userSpaceOnUse" x={GRID.x} y={GRID.y} width={PITCH} height={PITCH}>
          <circle cx={PITCH / 2} cy={PITCH / 2} r={2.2} fill="#c5e5d3" />
        </pattern>
        <pattern id={id('full')} patternUnits="userSpaceOnUse" x={GRID.x} y={GRID.y} width={PITCH} height={PITCH}>
          <circle cx={PITCH / 2} cy={PITCH / 2} r={2.2} fill="#2e8c5e" />
        </pattern>
        <LinGrad id={id('badge')} from="#3a9d6c" to="#1f6e48" />
      </defs>
      <g aria-hidden="true">
        {placed.map(({ k, cells, full, x, y }) => {
          const fullRows = Math.floor(cells / 10)
          const t0 = 400 + k * 340
          return (
            <g key={k} transform={`translate(${x} ${y})`}>
              <g className="w-up" style={vars({ '--i': k, '--st': '80ms' })}>
                {/* Fasaden med skygge */}
                <rect x={2} y={24} width={HOUSE_W} height={FACADE_B - 20} rx={8} fill="#2e1a22" opacity={0.06} />
                <rect y={20} width={HOUSE_W} height={FACADE_B - 20} rx={8} fill="#ffffff" />
                {/* Glassfronten: setene sees gjennom vinduet */}
                <rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} rx={5} fill="#f3faf6" stroke="#2e8c5e" strokeWidth={2} />
                <rect x={GRID.x} y={GRID.y} width={PITCH * 10} height={PITCH * 10} fill={`url(#${id('empty')})`} />
                {Array.from({ length: Math.ceil(cells / 10) }, (_, r) => (
                  <rect
                    key={r}
                    className="w-fade sf-row"
                    style={vars({ '--d': `${t0 + r * 30}ms` })}
                    x={GRID.x}
                    y={+(GRID.y + (9 - r) * PITCH).toFixed(2)}
                    width={r < fullRows ? PITCH * 10 : +((cells % 10) * PITCH).toFixed(2)}
                    height={PITCH}
                    fill={`url(#${id('full')})`}
                  />
                ))}
                {/* Døra: buet topp, liten rute og gyllent håndtak, med en varm lampe over */}
                <path d={DOOR_PATH} fill="#2e8c5e" />
                <path d={PANE} fill="#f3faf6" />
                <circle cx={DOOR.x + DOOR.w - 4} cy={DOOR.top + 31} r={1.4} fill="#f2b84b" />
                <rect x={DOOR.x - 1.5} y={WIN.y + WIN.h} width={DOOR.w + 3} height={2.5} rx={1.25} fill="#c5e5d3" />
                <circle cx={DOOR.x + DOOR.w / 2} cy={50} r={3.2} fill="#f2b84b" />
                <rect x={DOOR.x + DOOR.w / 2 - 0.75} y={42} width={1.5} height={6} fill="#1f6e48" />
                {/* Markisen. Et hus som ikke er fullt, får et blekere tak; kappen med navnet står alltid tydelig. */}
                <rect x={-4} y={6} width={HOUSE_W + 8} height={2.5} rx={1.25} fill="#1f6e48" />
                <path d={CANOPY} fill={`url(#${id('stripe')})`} opacity={full ? undefined : 0.5} />
                <path d={VALANCE} fill="#1f6e48" />
                {k === 0 && (
                  <text className="sf-sign" x={HOUSE_W / 2} y={23.5} textAnchor="middle" dominantBaseline="central">
                    {config.restaurant.shortName}
                  </text>
                )}
                {full && (
                  <g className="w-pop sf-badge" style={vars({ '--d': `${t0 + 320}ms` })}>
                    <Cookie x={HOUSE_W - 11} y={11} size={22} fill={`url(#${id('badge')})`} />
                    <SvgIcon name="check" x={HOUSE_W - 11} y={11} size={12} />
                  </g>
                )}
              </g>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
