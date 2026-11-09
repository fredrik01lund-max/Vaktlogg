// Ros på vaktsiden.
//  • KudosRow: kollegene på vakt under boksene. Hvert trykk sender ros – avataren spretter, hjerter fyker ut
//    og hjertemerket teller opp. Man kan trykke så mye man vil; raske trykk gir større utbrudd.
//  • KudosRain: når en kollega sender Emma ros, regner det emoji bak boksene (synlig i sprekkene).
//    Laget tar ingen trykk, varer noen sekunder og vises ikke ved redusert bevegelse.

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { colleagueName, config } from '../config.ts'
import { L } from '../i18n.ts'
import { seenValue, rememberValue, useFirstVisit, useReducedMotion } from '../lib/motion.ts'
import { useStore } from '../state.tsx'
import { Face } from '../game-ui.tsx'
import { Icon } from '../ui.tsx'

const vars = (o: Record<string, string | number>) => o as CSSProperties
/** Partikler som fyker ut fra avataren: retning (grader) og avstand. */
const BURST = [-150, -120, -95, -70, -45, -20, -165, -10].map((deg, i) => ({ deg, dist: 34 + (i % 3) * 10, glyph: ['💛', '👏', '✨', '🙌'][i % 4] }))

function Colleague({ id, i, count, onSend }: { id: string; i: number; count: number; onSend: () => void }) {
  // Hvert trykk lager en ny «puff» (nøkkel), så animasjonen spilles på nytt – også når man trykker fort.
  // Trykk i rask rekkefølge bygger en kombo: utbruddet blir litt større for hvert trykk.
  const [puff, setPuff] = useState<{ n: number; combo: number; at: number } | null>(null)
  const [showCount, setShowCount] = useState(false)
  useEffect(() => {
    if (!puff) return
    const t = window.setTimeout(() => setShowCount(false), 1600)
    return () => window.clearTimeout(t)
  }, [puff])
  const name = colleagueName(id)
  const combo = puff?.combo ?? 0
  const turn = ((puff?.n ?? 0) * 23) % 40 // hvert utbrudd vrir seg litt, så de ikke ser like ut
  return (
    <button
      className={`kd-person ${count ? 'sent' : ''}`}
      style={vars({ '--i': i })}
      aria-label={count ? L('Send kudos til {name} ({n} sendt i kveld)', 'Send kudos to {name} ({n} sent tonight)', { name, n: count }) : L('Send kudos til {name}', 'Send kudos to {name}', { name })}
      onClick={() => {
        onSend()
        const now = performance.now()
        setPuff((p) => ({ n: (p?.n ?? 0) + 1, combo: p && now - p.at < 700 ? Math.min(p.combo + 1, 6) : 0, at: now }))
        setShowCount(true)
        navigator.vibrate?.(14)
      }}
    >
      <span key={puff?.n ?? 0} className={`kd-face ${puff ? 'pop' : ''}`} style={vars({ '--burst': 1 + combo * 0.12 })}>
        <Face id={id} size={44} />
        {puff && <i className="kd-ring" aria-hidden="true" />}
        {puff && (
          <span className="kd-burst" aria-hidden="true">
            {BURST.map((b, i) => {
              const deg = b.deg + turn - 20
              const dist = b.dist * (1 + combo * 0.12)
              return (
                <i key={i} style={vars({ '--dx': `${Math.cos((deg * Math.PI) / 180) * dist}px`, '--dy': `${Math.sin((deg * Math.PI) / 180) * dist}px`, '--i': i })}>
                  {b.glyph}
                </i>
              )
            })}
          </span>
        )}
        {puff && (
          <span className="kd-plus" aria-hidden="true">
            +1
          </span>
        )}
        <span className="kd-heart" aria-hidden="true">
          {count > 1 ? <b className="num">{count > 99 ? '99+' : count}</b> : <Icon name="heart" />}
        </span>
      </span>
      <span className="kd-name" aria-hidden="true">
        {showCount && count ? (count === 1 ? L('Sendt!', 'Sent!') : `×${count}`) : name}
      </span>
    </button>
  )
}

export function KudosRow() {
  const { demo, giveKudos } = useStore()
  const count = (id: string) => demo.givenKudos.filter((g) => g.to === id).length
  // Første gang vaktsiden vises: hjertene vrikker etter tur, én gang – «disse kan du trykke på»
  const hint = useFirstVisit('kd-hint')
  return (
    <section className="kd-row" data-hint={hint || undefined} aria-label={L('Send kudos til en kollega', 'Send kudos to a colleague')}>
      <span className="kd-cta" aria-hidden="true">
        <span className="kd-cta-ic">
          <Icon name="heart" />
        </span>
        <span className="kd-cta-txt">{L('Send kudos', 'Send kudos')}</span>
      </span>
      {config.colleagues.map((c, i) => (
        <Colleague key={c.id} id={c.id} i={i} count={count(c.id)} onSend={() => giveKudos(c.id)} />
      ))}
    </section>
  )
}

/** Emoji-regn bak boksene når Emma får ny ros. Spilles én gang per ros, også om hun var på en annen side da den kom. */
const RAIN = Array.from({ length: 28 }, (_, i) => ({
  x: (i * 37) % 100,
  delay: ((i * 53) % 140) * 10,
  dur: 2600 + ((i * 29) % 12) * 120,
  size: 18 + ((i * 7) % 4) * 4,
  sway: ((i % 2) * 2 - 1) * (8 + (i % 5) * 4),
  glyph: ['💛', '👏', '🙌', '⭐', '🎉', '💚', '✨'][i % 7],
}))

export function KudosRain({ received }: { received: number }) {
  const rm = useReducedMotion()
  const [play, setPlay] = useState(0)
  useEffect(() => {
    const before = seenValue('kudos-rain') ?? 0
    rememberValue('kudos-rain', received)
    if (received > before && !rm) setPlay((p) => p + 1)
  }, [received, rm])
  useEffect(() => {
    if (!play) return
    const t = window.setTimeout(() => setPlay(0), 5200)
    return () => window.clearTimeout(t)
  }, [play])
  if (!play) return null
  return (
    <div className="kd-rain" key={play} aria-hidden="true">
      {RAIN.map((r, i) => (
        <i key={i} style={vars({ left: `${r.x}%`, '--delay': `${r.delay}ms`, '--dur': `${r.dur}ms`, '--size': `${r.size}px`, '--sway': `${r.sway}px` })}>
          {r.glyph}
        </i>
      ))}
    </div>
  )
}
