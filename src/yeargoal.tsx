// Gullmedaljen: årets lagmål, satt av ledelsen. Én sum for hele serveringslaget gjennom året,
// og den største premien: firmatur til en vinprodusent i Frankrike. Alle andre premier er kortere motivasjoner.
// Viser bare lagets samlede salg – aldri hva én person har solgt.

import { useState } from 'react'
import { periodGoals } from './data/demoData.ts'
import { prizeById } from './lib/calc.ts'
import type { YearGoalState } from './lib/calc.ts'
import { num } from './lib/format.ts'
import { Icon, Sheet } from './ui.tsx'
import bourgogne from './img/bourgogne.webp'
import './yeargoal.css'
import { L, isEn, td } from './i18n.ts'

const mill = (v: number, digits = 2) => (v / 1_000_000).toLocaleString(isEn() ? 'en-GB' : 'nb-NO', { minimumFractionDigits: 1, maximumFractionDigits: digits })
const round1000 = (v: number) => Math.round(v / 1000) * 1000

/** Medaljen: bånd og gullmynt med stjerne. */
function Medal({ size = 56 }: { size?: number }) {
  return (
    <svg className="yg-medal" width={size} height={size * 1.2} viewBox="0 0 50 60" aria-hidden="true">
      <path d="M14 2h9l6 20h-9z" fill="#f08fb0" />
      <path d="M36 2h-9l-6 20h9z" fill="#94b0e6" />
      <circle cx="25" cy="38" r="19" fill="url(#yg-coin)" stroke="#d9a640" strokeWidth="1.5" />
      <circle cx="25" cy="38" r="14" fill="none" stroke="#fffaf0" strokeOpacity=".8" strokeWidth="1.2" />
      <path d="m25 29.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L25 42.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" fill="#fffaf0" stroke="#d9a640" strokeWidth=".8" strokeLinejoin="round" />
      <defs>
        <linearGradient id="yg-coin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fdeaa8" />
          <stop offset=".55" stopColor="#f6d270" />
          <stop offset="1" stopColor="#eeba55" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function Progress({ s }: { s: YearGoalState }) {
  return (
    <div className="yg-progress">
      <div className="yg-nums">
        <b className="num">{mill(s.sold)}</b>
        <span>{L('av {t} mill. kr', 'of {t} million kr', { t: mill(s.target, 1) })}</span>
      </div>
      <div
        className="yg-bar"
        role="progressbar"
        aria-valuenow={Math.round(s.frac * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={L('{n} prosent av årets mål', '{n} percent of this year’s goal', { n: num(s.frac * 100) })}
      >
        <i style={{ width: `${Math.min(100, s.frac * 100)}%` }} />
        {/* Hvor laget skulle vært i dag ved jevnt salg gjennom året */}
        <em style={{ left: `${s.pace * 100}%` }}>
          <span>{L('i dag', 'today')}</span>
        </em>
      </div>
      <div className="yg-foot">
        <span className={`yg-pace ${s.ahead ? 'ahead' : ''}`}>
          <Icon name={s.ahead ? 'check' : 'clock'} />
          {s.reached ? L('Målet er nådd!', 'Goal reached!') : s.ahead ? L('Foran skjema', 'Ahead of schedule') : L('Litt bak skjema', 'Slightly behind schedule')}
        </span>
        <span>{L('{n} dager igjen', '{n} days left', { n: num(s.daysLeft) })}</span>
      </div>
    </div>
  )
}

/** tile = smal utgave i halv bredde (Goals-siden): bilde, medalje, premie og fremdrift – detaljene ligger i arket. */
export function YearGoalCard({ state, compact, tile }: { state: YearGoalState; compact?: boolean; tile?: boolean }) {
  const [open, setOpen] = useState(false)
  const y = periodGoals.year
  const prize = prizeById(y.prizeId)
  return (
    <>
      <button
        className={`yg ${compact ? 'compact' : ''} ${tile ? 'tile' : ''}`}
        onClick={() => setOpen(true)}
        aria-label={L('Årets lagmål {year}: {prize}. {sold} av {target} millioner kroner. Åpne detaljer om reisen', 'Team goal of the year {year}: {prize}. {sold} of {target} million kroner. Open details about the trip', {
          year: y.label,
          prize: td(prize.title),
          sold: mill(state.sold),
          target: mill(state.target, 1),
        })}
      >
        {/* Målet: vinmarkene i Bourgogne. Bildet glir over i gullflaten, og medaljen henger over kanten. */}
        <span className="yg-photo" aria-hidden="true">
          <img src={bourgogne} alt="" draggable={false} />
        </span>
        <div className="yg-top" aria-hidden="true">
          <Medal size={tile ? 34 : compact ? 40 : 52} />
          <div className="grow">
            <div className="yg-eyebrow">
              {L('Årets lagmål', 'Team goal of the year')}
              {tile ? '' : ` · ${y.label}`}
              {!tile && <span className="yg-by">{L('Satt av {who}', 'Set by {who}', { who: td(y.setBy).toLowerCase() })}</span>}
            </div>
            <div className="yg-prize">{td(prize.title)}</div>
            {!compact && !tile && (
              <div className="yg-desc">
                {L('{days} dager i {place} – kurs hos en vinprodusent og ferie for hele laget', '{days} days in {place} – a course with a winemaker and a holiday for the whole team', {
                  days: y.trip.days,
                  place: td(y.trip.place),
                })}
              </div>
            )}
          </div>
          {!tile && <Icon name="chevR" className="yg-chev" />}
        </div>
        <div aria-hidden="true">
          <Progress s={state} />
        </div>
        {state.tonight > 0 && !tile && (
          <span className="yg-tonight" aria-hidden="true">
            {L('+{n} kr fra laget i kveld', '+{n} kr from the team tonight', { n: num(round1000(state.tonight)) })}
          </span>
        )}
      </button>
      {open && (
        <Sheet title={L('Årets lagmål', 'Team goal of the year')} onClose={() => setOpen(false)}>
          <div className="yg-sheet">
            <div className="yg-sheet-photo" aria-hidden="true">
              <img src={bourgogne} alt="" draggable={false} />
            </div>
            <div className="yg-sheet-head">
              <Medal size={64} />
              <div>
                <div className="yg-eyebrow">{L('Gullmedaljen · {year}', 'The gold medal · {year}', { year: y.label })}</div>
                <h3>{td(prize.title)}</h3>
                <p className="muted">{td(y.rule)}.</p>
              </div>
            </div>
            <div className="yg-sheet-progress">
              <Progress s={state} />
            </div>
            <h4>{L('Reisen · {when}', 'The trip · {when}', { when: td(y.trip.when) })}</h4>
            <ul className="yg-plan">
              {y.trip.plan.map((p) => (
                <li key={p.title}>
                  <span className="yg-plan-ic">
                    <Icon name={p.icon} />
                  </span>
                  <span>
                    <b>{td(p.title)}</b>
                    <small>{td(p.text)}</small>
                  </span>
                </li>
              ))}
            </ul>
            <h4>{L('Bra for alle', 'Good for everyone')}</h4>
            <ul className="yg-why">
              {y.trip.why.map((w) => (
                <li key={w}>
                  <Icon name="check" />
                  {td(w)}
                </li>
              ))}
            </ul>
          </div>
        </Sheet>
      )}
    </>
  )
}
