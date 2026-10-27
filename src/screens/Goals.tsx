// Goals: premiene og rekordene på én skjerm.
//  • Øverst to bokser side om side: gullmedaljen (årets lagmål) og de andre premiene samlet.
//    Trykk på en boks for alle detaljene.
//  • Under: de nyeste rekordene. Trykk for alle rekordene.
// Premier hører til et mål over tid – aldri til én enkelt vakt.

import { useState } from 'react'
import type { ReactNode } from 'react'
import { config } from '../config.ts'
import { campaign, periodGoals, tonight } from '../data/demoData.ts'
import { campaignAt, computeRecords, liveAt, personalPeriod, prizeById, recordDefs, teamPeriod, yearGoalAt } from '../lib/calc.ts'
import type { PeriodState } from '../lib/calc.ts'
import { capitalize, dateShort, num } from '../lib/format.ts'
import { navigate } from '../router.ts'
import { useShifts } from '../shifts.ts'
import { useStore } from '../state.tsx'
import { Icon, Sheet, TopBar } from '../ui.tsx'
import { formatMetric } from './Report.tsx'
import { Face, PeriodCard } from '../game-ui.tsx'
import { YearGoalCard } from '../yeargoal.tsx'
import { L, td } from '../i18n.ts'

const recordIcon = { premiumBottles: 'bottle', sales: 'receipt', desserts: 'dessert', avgCheck: 'guests' } as const

function Head({ color, icon, title, right }: { color: string; icon: string; title: string; right?: ReactNode }) {
  return (
    <div className="section-head">
      <h2 className="row gap8">
        <span className="rl-dot sm" style={{ background: color }}>
          <Icon name={icon} />
        </span>
        {title}
      </h2>
      {right}
    </div>
  )
}

/** Én linje i boksen med de andre premiene: premieikon, premie, hvem/når og fremdrift. */
function GoalLine({ tone, prizeId, who, state }: { tone: 'lag' | 'meg' | 'uke'; prizeId: string; who: string; state: Pick<PeriodState, 'count' | 'target' | 'reached'> }) {
  const prize = prizeById(prizeId)
  const pct = Math.min(100, (state.count / state.target) * 100)
  return (
    <li className="gl-line" data-tone={tone}>
      <span className="gl-ic">
        <Icon name={prize.icon} />
      </span>
      <span className="gl-text">
        <b>{td(prize.title)}</b>
        <span className="gl-meta">
          <small>{who}</small>
          <span className="gl-count num">
            {state.reached ? <Icon name="check" /> : null}
            {num(state.count)}
            <small>/{num(state.target)}</small>
          </span>
        </span>
        <span className="gl-bar" aria-hidden="true">
          <i style={{ width: `${pct}%` }} />
        </span>
      </span>
    </li>
  )
}

export function Goals() {
  const { demo, quiet } = useStore()
  const { all } = useShifts()
  const [sheet, setSheet] = useState<null | 'premier' | 'rekorder'>(null)
  const records = computeRecords(all)
  const started = demo.phase !== 'pre'
  const done = demo.phase === 'done'
  const live = liveAt(started ? demo.step : -1)
  // En rolig vakt som pågår: ingen stillinger her heller.
  const hideLive = quiet && started && !done
  const camp = campaignAt(started && !hideLive ? live : null, true)
  const teamP = teamPeriod(started && !hideLive ? live : null, done)
  const meP = personalPeriod(done)
  const year = yearGoalAt(started && !hideLive ? live : null)
  const campState = { count: camp.units, target: camp.target, reached: camp.reached }
  // Nyeste rekorder først
  const recent = [...records].sort((a, b) => b.shift.date.localeCompare(a.shift.date))

  return (
    <>
      <TopBar />
      <section className="section gl-top">
        <Head
          color="#a8325a"
          icon="gift"
          title={L('Premier', 'Prizes')}
          right={
            <span className="chip">
              <Face id={config.employer.id} size={20} /> {config.employer.name}
            </span>
          }
        />
        <div className="gl-grid">
          {/* Gullmedaljen står alltid synlig */}
          <YearGoalCard tile state={year} />
          {/* De andre premiene samlet – trykk for alle detaljene */}
          <button
            className="gl-others"
            onClick={() => setSheet('premier')}
            aria-label={L('Flere premier: staff dinner, kinobilletter og pizza. Åpne detaljer', 'More prizes: staff dinner, cinema tickets and pizza. Open details')}
          >
            <span className="gl-others-head" aria-hidden="true">
              {L('Flere premier', 'More prizes')}
              <Icon name="chevR" />
            </span>
            <ul className="gl-lines" aria-hidden="true">
              {/* Engelsk: «Team», ikke «The team» – linjen er smal. */}
              <GoalLine tone="lag" prizeId={demo.teamGiftId} who={`${L('Laget', 'Team')} · ${td(periodGoals.monthName)}`} state={teamP} />
              <GoalLine tone="meg" prizeId={periodGoals.personal.prizeId} who={`${L('Deg', 'You')} · ${td(periodGoals.monthName)}`} state={meP} />
              <GoalLine tone="uke" prizeId={campaign.prizeId} who={`${L('Laget', 'Team')} · ${td(campaign.weekLabel)}`} state={campState} />
            </ul>
          </button>
        </div>
      </section>

      {/* Rekorder: de nyeste – trykk for alle */}
      <section className="section gl-rec-section">
        <button className="gl-records" onClick={() => setSheet('rekorder')} aria-label={L('Rekorder. Åpne alle rekordene', 'Records. Open all records')}>
          <span className="gl-records-head" aria-hidden="true">
            <span className="rl-dot sm" style={{ background: '#b8740f' }}>
              <Icon name="star" />
            </span>
            <b>{L('Rekorder', 'Records')}</b>
            <Icon name="chevR" className="gl-chev" />
          </span>
          <span className="gl-rec-row" aria-hidden="true">
            {recent.slice(0, 2).map((r) => (
              <span key={r.metric} className="gl-rec">
                <span className="icon-badge gold">
                  <Icon name={recordIcon[r.metric]} />
                </span>
                <span className="grow">
                  <b className="num">{formatMetric(r.metric, r.value)}</b>
                  <small>{td(recordDefs.find((d) => d.metric === r.metric)!.short)}</small>
                  <small className="gl-rec-date">
                    {r.shift.date === tonight.date ? <em>{L('Ny i kveld!', 'New tonight!')}</em> : capitalize(dateShort(r.shift.date))}
                  </small>
                </span>
              </span>
            ))}
          </span>
        </button>
      </section>

      {sheet === 'premier' && (
        <Sheet title={L('Premier', 'Prizes')} onClose={() => setSheet(null)}>
          <div className="stack">
            <PeriodCard ctx="mal" who="lag" period={periodGoals.monthName} state={teamP} prizeId={demo.teamGiftId} rule={periodGoals.team.rule} />
            <PeriodCard ctx="mal" who="meg" period={periodGoals.monthName} state={meP} prizeId={periodGoals.personal.prizeId} rule={periodGoals.personal.rule} />
            <PeriodCard
              who="lag"
              tone="uke"
              period={campaign.weekLabel}
              state={{ dots: [], count: camp.units, target: camp.target, left: Math.max(0, camp.target - camp.units), reached: camp.reached, tonightCounts: false }}
              prizeId={campaign.prizeId}
              rule={L('{title}: {n} {unit} {dish}', '{title}: {n} {unit} of {dish}', { title: td(campaign.title), n: num(campaign.targetUnits), unit: td(campaign.unitLabel), dish: td(campaign.dish).toLowerCase() })}
            />
          </div>
        </Sheet>
      )}

      {sheet === 'rekorder' && (
        <Sheet title={L('Rekorder', 'Records')} onClose={() => setSheet(null)}>
          <div className="list">
            {recent.map((r) => (
              <button
                key={r.metric}
                className="list-item"
                onClick={() => {
                  setSheet(null)
                  navigate(`/historikk/${r.shift.id}`)
                }}
              >
                <div className="icon-badge gold">
                  <Icon name={recordIcon[r.metric]} />
                </div>
                <div className="grow">
                  <div className="title">{td(recordDefs.find((d) => d.metric === r.metric)!.short)}</div>
                  <div className="meta">{capitalize(dateShort(r.shift.date))}</div>
                </div>
                <div className="end">{formatMetric(r.metric, r.value)}</div>
                <Icon name="chevR" className="chev" />
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </>
  )
}
