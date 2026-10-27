// Åpningskortet: veggkalenderen som lyser opp. Én kjeks per vakt – lengre vakt gir større kjeks.
// Pillen markerer en ukedag hun jobbet hver gang, og en gullring varsler om den beste kvelden.
// «mini» er den lille, stille utgaven til delekortet og banneret i Historikk.

import './MonthCalendar.css'
import type { CSSProperties } from 'react'
import { weekdayLetter } from '../../lib/format.ts'
import { cookiePath } from '../../shapes.tsx'
import { LinGrad, useArtId } from './kit.tsx'

export interface MonthCalendarProps {
  cells: { day: number; col: number; row: number; worked: boolean; hours?: number }[]
  rows: number
  highlightCol?: number // 0=Mon … 6=Sun; pill only when every such weekday was worked
  highlightLabel?: string // '4/4'
  goldDay?: number // 19
  variant?: 'story' | 'mini'
  label?: string // aria-label; omitted → aria-hidden
}

/** Kolonnene mandag–søndag; forbokstaven hentes på gjeldende språk (M T O T F L S / M T W T F S S). */
const COLS = [0, 1, 2, 3, 4, 5, 6]
const cx = (col: number) => 24 + col * 48
const cy = (row: number) => 62 + row * 48
/** Kjeksdiameter: 6 t = 35,6 og 7,5 t = 41 (holdes innenfor ruten på 48). */
const size = (hours = 7.5) => Math.min(44, Math.max(26, 14 + hours * 3.6))
const MINI = cookiePath(12)
const mid = { textAnchor: 'middle', dominantBaseline: 'central' } as const
const v = (o: Record<string, string | number>) => o as CSSProperties

export function MonthCalendar({ cells, rows, highlightCol, highlightLabel, goldDay, variant = 'story', label }: MonthCalendarProps) {
  const id = useArtId('cal')
  const fill = `url(#${id('stor')})`
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true }
  const worked = cells.filter((c) => c.worked).sort((a, b) => a.day - b.day)
  const off = cells.filter((c) => !c.worked)
  const defs = (
    <defs>
      <LinGrad id={id('stor')} from="#9fe3bf" to="#ffffff" />
    </defs>
  )

  if (variant === 'mini')
    return (
      <svg className="cal cal-mini" viewBox={`0 0 98 ${rows * 14}`} width={98} height={rows * 14} {...a11y}>
        {defs}
        {off.map((c) => (
          <circle key={c.day} cx={7 + c.col * 14} cy={7 + c.row * 14} r={3} fill="rgba(255,255,255,.22)" />
        ))}
        {worked.map((c, i) => (
          <g key={c.day} transform={`translate(${1 + c.col * 14} ${1 + c.row * 14})`}>
            <path className="cal-cookie" d={MINI} fill={fill} style={v({ '--i': i })} />
          </g>
        ))}
      </svg>
    )

  const gold = cells.find((c) => c.day === goldDay)
  const goldR = gold ? (gold.worked ? size(gold.hours) : 30) / 2 + 4 : 0
  return (
    <svg className="w-art cal" viewBox={`0 0 336 ${48 + rows * 48 + 18}`} {...a11y}>
      {defs}
      <g className="w-fade" style={v({ '--d': '250ms' })} aria-hidden="true">
        {COLS.map((col) => (
          <text key={col} className="cal-head" x={cx(col)} y={20} {...mid}>
            {weekdayLetter(col)}
          </text>
        ))}
      </g>
      {highlightCol !== undefined && (
        <rect className="cal-pill w-growy" x={cx(highlightCol) - 22} y={38} width={44} height={rows * 48} rx={22} fill="rgba(255,255,255,.08)" style={v({ '--d': '1350ms' })} />
      )}
      <g className="w-fade" style={v({ '--d': '250ms' })}>
        {off.map((c) => (
          <g key={c.day}>
            <circle cx={cx(c.col)} cy={cy(c.row)} r={15} fill="rgba(255,255,255,.08)" />
            <text className="cal-off" x={cx(c.col)} y={cy(c.row)} {...mid}>
              {c.day}
            </text>
          </g>
        ))}
      </g>
      {worked.map((c, i) => {
        const D = size(c.hours)
        return (
          <g key={c.day} transform={`translate(${cx(c.col) - D / 2} ${cy(c.row) - D / 2})`}>
            <g className="cal-cookie w-popturn" style={v({ '--i': i, '--st': '90ms', '--d': '300ms' })}>
              <path d={cookiePath(D)} fill={fill} />
              <text className="cal-num" x={D / 2} y={D / 2} {...mid}>
                {c.day}
              </text>
            </g>
          </g>
        )
      })}
      {highlightCol !== undefined && highlightLabel && (
        <text className="cal-lbl w-fade" x={cx(highlightCol)} y={38 + rows * 48 + 14} style={v({ '--d': '1600ms' })} {...mid}>
          {highlightLabel}
        </text>
      )}
      {gold && (
        <circle className="cal-ring w-draw" cx={cx(gold.col)} cy={cy(gold.row)} r={goldR} transform={`rotate(-90 ${cx(gold.col)} ${cy(gold.row)})`} pathLength={1} fill="none" stroke="#ffd27a" strokeWidth={2.5} strokeLinecap="round" style={v({ '--d': '1650ms' })} aria-hidden="true" />
      )}
    </svg>
  )
}
