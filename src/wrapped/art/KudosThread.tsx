// Ros fra kolleger som en chattråd: ansikt + boble, annenhver side. Bare i Emmas egen visning.

import './KudosThread.css'
import type { CSSProperties } from 'react'
import { Face } from '../../game-ui.tsx'
import { L } from '../../i18n.ts'
import { paths } from '../../ui.tsx'

export interface KudosThreadProps {
  notes: { from: string; name: string; category: string; icon: string; message?: string; dateText: string }[]
  more: number // count beyond the 4 shown
}

// Fire bobler lander innen ca. 1,9 s (320 + 3 × 420 + 280 ms), i takt med tallet som teller opp
const STEP = 420

export function KudosThread({ notes, more }: KudosThreadProps) {
  const total = notes.length + more
  // Én eller to meldinger: større bobler, så kortet ikke blir en liten lapp midt i tomrommet (én alene blir størst)
  const big = notes.length <= 2
  const cls = notes.length === 1 ? 'kt kt-big kt-one' : big ? 'kt kt-big' : 'kt'
  return (
    <ul className={cls} role="list" aria-label={total === 1 ? L('{n} kudos-melding', '{n} kudos message', { n: total }) : L('{n} kudos-meldinger', '{n} kudos messages', { n: total })}>
      {notes.map((n, i) => (
        <li key={`${n.from}-${n.dateText}-${i}`} className={`kt-row${i % 2 ? ' rev' : ''}`}>
          <span className="kt-face w-pop" style={{ '--d': `${200 + i * STEP}ms` } as CSSProperties}>
            <Face id={n.from} size={big ? 44 : 36} title={n.name} />
          </span>
          <div className="kt-b w-bubble" style={{ '--d': `${320 + i * STEP}ms` } as CSSProperties}>
            <div className="kt-meta">
              <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="#1f6e48" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {paths[n.icon]}
              </svg>
              {n.message && <span className="kt-cat">{n.category}</span>}
              <span className="kt-date">{n.message ? `· ${n.dateText}` : n.dateText}</span>
            </div>
            <p className="kt-msg">{n.message ? L('«{m}»', '“{m}”', { m: n.message }) : n.category}</p>
          </div>
        </li>
      ))}
      {more > 0 && (
        <li className="kt-more w-pop" style={{ '--d': `${320 + notes.length * STEP}ms` } as CSSProperties}>
          <span aria-hidden="true">+{more}</span>
          <span className="sr-only">{L('{n} til', '{n} more', { n: more })}</span>
        </li>
      )}
    </ul>
  )
}
