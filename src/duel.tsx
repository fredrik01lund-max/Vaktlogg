// Én felles måte å vise duellen på overalt i appen:
//   under vakt:  «3 av vanlige 9,6»  (stolpe med strek for en vanlig kveld)
//   resultat:    «+46 % mer enn vanlig»
// Den som går mest over sitt eget vanlige nivå, vinner.

import { L } from './i18n.ts'
import type { DuelSide, DuelState } from './lib/calc.ts'
import { dec1, num, pct, signedPct } from './lib/format.ts'

/** Regelen for duellen (en funksjon, så den leses på gjeldende språk). */
export const duelRule = (): string => L('Den som går mest over sitt eget vanlige nivå, vinner.', 'Whoever goes furthest above their own usual level wins.')

/** Stolpen går til 150 % av vanlig kveld; streken markerer «vanlig». */
const SCALE = 1.5

export function sofar(s: DuelSide): string {
  return L('{n} av vanlige {avg}', '{n} of a usual {avg}', { n: num(s.count), avg: dec1(s.avg) })
}

export function resultText(s: DuelSide): string {
  return s.overAvg >= 0 ? L('{p} mer enn vanlig', '{p} more than usual', { p: signedPct(s.overAvg) }) : L('{p} mindre enn vanlig', '{p} less than usual', { p: signedPct(s.overAvg) })
}

/** Resultatet i desserter: «46 % flere desserter enn vanlig» (kort form for den andre). */
export function dessertResult(s: DuelSide, short = false): string {
  const p = pct(Math.round(Math.abs(s.overAvg)))
  const more = s.overAvg >= 0
  if (short) return more ? L('{p} flere', '{p} more', { p }) : L('{p} færre', '{p} fewer', { p })
  return more ? L('{p} flere desserter enn vanlig', '{p} more desserts than usual', { p }) : L('{p} færre desserter enn vanlig', '{p} fewer desserts than usual', { p })
}

export function leaderText(d: DuelState, done: boolean): string {
  if (d.leader === 'tie') return L('Helt likt', done ? "It's a tie" : 'Neck and neck')
  if (d.leader === 'me') return done ? L('Du vant', 'You won') : L('Du leder', 'You lead')
  const who = d.opponent.name
  return done ? L('{who} vant', '{who} won', { who }) : L('{who} leder', '{who} leads', { who })
}

function Row({ side, tone, label }: { side: DuelSide; tone?: 'sage' | 'deg' | 'mot'; label: string }) {
  const fill = Math.min(100, (side.ofAvg / (SCALE * 100)) * 100)
  return (
    <>
      <span>{label}</span>
      <div className={`bar thin duelbar ${tone ?? ''}`} role="img" aria-label={L('{label}: {sofar} desserter', '{label}: {sofar} desserts', { label, sofar: sofar(side) })}>
        <span style={{ width: `${fill}%` }} />
        <i className="usual" style={{ left: `${100 / SCALE}%` }} />
      </div>
      <b>{pct(Math.round(side.ofAvg))}</b>
    </>
  )
}

/** Kompakt visning med en strek for «vanlig kveld». */
export function DuelBars({ duel }: { duel: DuelState }) {
  return (
    <div className="minibars">
      <Row side={duel.me} label={L('Du', 'You')} tone="deg" />
      <Row side={duel.opponent} label={duel.opponent.name} tone="mot" />
    </div>
  )
}
