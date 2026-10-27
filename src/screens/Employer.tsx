// Karis telefon – arbeidsgiverens side av Vaktlogg.
// Hun ser én lagring (først etter vakten), fem like låste personkort, og tre verktøy:
// lagpremien for måneden, takkekort og Ukens rett. Hun ser aldri et tall om én person, og ingenting live.

import { useState } from 'react'
import { config } from '../config.ts'
import { campaign, periodGoals, products, tonight } from '../data/demoData.ts'
import type { MomentId } from '../data/demoData.ts'
import { campaignAt, cardsOverview, lastStepIndex, liveAt, prizeById, teamAt, teamPeriod, yearGoalAt } from '../lib/calc.ts'
import type { CardMoment } from '../lib/calc.ts'
import { kr, num } from '../lib/format.ts'
import { setMode, useStore } from '../state.tsx'
import { FlowRings } from '../rings.tsx'
import { CountUp, Icon, Sheet, paths } from '../ui.tsx'
import { DUR, useFirstVisit } from '../lib/motion.ts'
import { Face, StampCard, momentMeta, nameOf } from '../game-ui.tsx'
import { ringsFor } from './Shift.tsx'
import { KariMenuTool } from '../staffmenu.tsx'
import { L, td } from '../i18n.ts'

const people = [config.persona.id, ...config.colleagues.map((c) => c.id)].sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'nb'))

/** Øyeblikk fra restaurantens egne reservasjoner (bord og hendelse) – ikke fra noens salgstall. */
const bookingMoments: (CardMoment & { step: number })[] = tonight.steps.flatMap((st, step) =>
  (st.seat ?? []).flatMap((s) => {
    const tags: MomentId[] = st.moments ?? []
    return tags.map((tag) => ({ time: st.time, table: s.table, tag, step }))
  }),
)

export function Employer() {
  const { demo, sendCard, pushToasts } = useStore()
  const [sheet, setSheet] = useState<null | 'gift' | 'card' | 'dish'>(null)
  const done = demo.phase === 'done'
  const reveal = useFirstVisit('kari-done', done)
  const end = liveAt(lastStepIndex)
  const team = teamAt(end)
  // Lagpremien gjelder et mål over hele måneden; kvelden teller først når vakten er over.
  const period = teamPeriod(done ? end : null, done)
  const year = yearGoalAt(done ? end : null)
  // Ukens rett oppdateres for Kari først etter vakten, som lagringen.
  const camp = campaignAt(done ? end : null, true)
  const cards = cardsOverview(tonight.date, demo.sentCards, done)
  const cardsFull = cards.used >= cards.quota
  // Bare lagringen – uten spøkelset, Kari skal se resultatet, ikke løpet
  const teamRing = ringsFor(end, { calm: false, game: 'laget', giftId: demo.teamGiftId })
    .filter((r) => r.id === 'lag')
    .map((r) => (r.kind === 'progress' ? { ...r, ghost: undefined } : r))
  const happened = bookingMoments.filter((m) => done || (demo.phase === 'live' && m.step <= demo.step))

  return (
    <div className="boss">
      <header className="boss-bar">
        <Face id={config.employer.id} size={36} />
        <div className="grow">
          <div className="boss-name">{config.employer.name}</div>
          <div className="boss-role">
            {td(config.employer.role)} · {config.restaurant.name}
          </div>
        </div>
        <button className="boss-back" onClick={() => setMode('emma')} aria-label={L('Tilbake til Emmas telefon', 'Back to Emma’s phone')}>
          <Icon name="chevL" /> <Face id={config.persona.id} size={24} />
        </button>
      </header>

      {/* Én ring for laget. Før og under vakt: grå med klokke – sjefen ser ikke live. */}
      <section className="boss-ring">
        {done ? (
          <FlowRings rings={teamRing} size={168} stroke={16} gap={6} reveal={reveal || undefined} label={L('Laget: {sales}', 'The team: {sales}', { sales: kr(team.sales) })}>
            <b className="num" style={{ fontSize: 20, fontWeight: 800 }}>
              <CountUp value={team.sales} from={reveal ? 0 : undefined} duration={DUR.reveal} format={kr} />
            </b>
            <span className="small muted">{L('laget i kveld', 'the team tonight')}</span>
          </FlowRings>
        ) : (
          <div className="ring-wait" role="img" aria-label={L('Lagets tall vises først etter vakten', 'The team’s numbers show only after the shift')}>
            <svg viewBox="0 0 196 196" width={168} height={168} aria-hidden="true">
              <circle cx={98} cy={98} r={86} fill="none" stroke="#dfe4e1" strokeWidth={18} />
              <circle cx={98} cy={12} r={12} fill="#e7f6ee" stroke="#5fb68a" strokeWidth={2.2} />
              <svg x={90} y={4} width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#1f6a48" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                {paths.team}
              </svg>
            </svg>
            <span className="rw-clock">
              <Icon name="clock" />
            </span>
          </div>
        )}
        <div className="boss-people" role="img" aria-label={L('Personlige tall er låst for alle fem', 'Personal numbers are locked for all five')}>
          {people.map((id) => (
            <div key={id} className="person-lock">
              <Face id={id} size={28} />
              <span className="frost" />
              <Icon name="eyeOff" />
            </div>
          ))}
        </div>
      </section>

      {/* Verktøy */}
      <section className="boss-tools">
        <button className="tool" onClick={() => setSheet('gift')}>
          <span className="tool-art gift" aria-hidden="true">
            <Icon name="gift" />
          </span>
          <span className="tool-body">
            <b>{L('Premier', 'Prizes')}</b>
            <span className="tool-sub">{td(prizeById(demo.teamGiftId).title)}</span>
            <span
              className="mini-stamps period"
              role="img"
              aria-label={L('Lagmålet nådd på {n} av {target} helgevakter i {month}', 'Team goal reached on {n} of {target} weekend shifts in {month}', { n: period.count, target: period.target, month: td(periodGoals.monthName) })}
            >
              {period.dots.map((d) => (
                <i key={d.date} className={d.state === 'ja' ? 'on' : d.state === 'nei' ? 'no' : ''} />
              ))}
            </span>
            <span className="q-cap" aria-hidden="true">
              {period.count}/{period.target} · {td(periodGoals.monthName)}
            </span>
          </span>
          {period.reached && (
            <span className="tool-done" role="img" aria-label={L('Nådd', 'Reached')}>
              <Icon name="check" />
            </span>
          )}
        </button>

        <button className="tool" onClick={() => setSheet('card')}>
          <span className="tool-art card" aria-hidden="true">
            <Icon name="envelope" />
          </span>
          <span className="tool-body">
            <b>{L('Takkekort', 'Thank-you cards')}</b>
            <span className="quota" role="img" aria-label={L('{used} av {quota} kort brukt denne uka', '{used} of {quota} cards used this week', { used: cards.used, quota: cards.quota })}>
              {Array.from({ length: cards.quota }, (_, i) => (
                <span key={i} className={i < cards.used ? 'used' : ''}>
                  <Icon name="envelope" />
                </span>
              ))}
              <span className="q-cap" aria-hidden="true">
                {Math.min(cards.used, cards.quota)}/{cards.quota}
              </span>
            </span>
            <span
              className="spread"
              role="img"
              aria-label={L('Fått kort siste fire uker: {names}', 'Got a card in the last four weeks: {names}', { names: people.filter((id) => cards.recent.has(id)).map(nameOf).join(', ') || L('ingen', 'no one') })}
            >
              {people.map((id) => (
                <span key={id} className={cards.recent.has(id) ? 'got' : ''}>
                  <Face id={id} size={14} />
                </span>
              ))}
            </span>
          </span>
        </button>

        <button className="tool" onClick={() => setSheet('dish')}>
          <span className="tool-art dish" aria-hidden="true">
            <Icon name="plate" />
          </span>
          <span className="tool-body">
            <b>{td(campaign.title)}</b>
            <span className="tool-sub">
              {td(campaign.dish)} · {td(prizeById(campaign.prizeId).title)}
            </span>
            <span className="mini-stamps" role="img" aria-label={L('{n} av {total} stempler', '{n} of {total} stamps', { n: camp.stamps, total: camp.stampsTotal })}>
              {Array.from({ length: camp.stampsTotal }, (_, i) => (
                <i key={i} className={i < camp.stamps ? 'on' : ''} />
              ))}
            </span>
          </span>
        </button>
      </section>
      {/* Personalmenyen: budsjett, populære retter og vaktønsker – aldri saldoer */}
      <KariMenuTool />

      {sheet === 'gift' && (
        <Sheet title={L('Premier', 'Prizes')} onClose={() => setSheet(null)}>
          <div className="ladder">
            {[
              { prizeId: periodGoals.year.prizeId, who: L('Årets lagmål', 'Team goal of the year') + ' · ' + periodGoals.year.label, rule: td(periodGoals.year.rule), progress: L('{n} %', '{n}%', { n: Math.round(year.frac * 100) }) },
              { prizeId: demo.teamGiftId, who: L('Laget', 'Team') + ' · ' + td(periodGoals.monthName), rule: td(periodGoals.team.rule), progress: `${period.count}/${period.target}` },
              { prizeId: periodGoals.personal.prizeId, who: L('Hver enkelt', 'Each person') + ' · ' + td(periodGoals.monthName), rule: td(periodGoals.personal.rule), progress: null },
              { prizeId: campaign.prizeId, who: L('Laget', 'Team') + ' · ' + td(campaign.weekLabel), rule: `${td(campaign.title)}: ${campaign.targetUnits} ${td(campaign.unitLabel)}`, progress: `${camp.units}/${camp.target}` },
            ].map((r, i) => (
              <div key={r.prizeId} className={`ladder-row ${i === 0 ? 'top' : ''}`}>
                <span className="cat-ic" aria-hidden="true">
                  <Icon name={prizeById(r.prizeId).icon} />
                </span>
                <span className="grow">
                  <span className="lr-who">{r.who}</span>
                  <b>{td(prizeById(r.prizeId).title)}</b>
                  <span className="small muted" style={{ display: 'block' }}>
                    {r.rule}
                  </span>
                </span>
                {r.progress && <b className="num lr-progress">{r.progress}</b>}
              </div>
            ))}
          </div>
        </Sheet>
      )}
      {sheet === 'card' && (
        <CardComposer
          moments={happened}
          full={cardsFull}
          onClose={() => setSheet(null)}
          onSend={(card) => {
            sendCard(card)
            setSheet(null)
            pushToasts([{ kind: 'kudos', icon: 'envelope', title: L('Takkekort til {name}', 'Thank-you card to {name}', { name: nameOf(card.to) }), body: L('Kommer etter vakten.', 'Arrives after the shift.'), faces: [card.to], boss: true }])
          }}
        />
      )}
      {sheet === 'dish' && (
        <Sheet title={td(campaign.title)} onClose={() => setSheet(null)}>
          <div className="dish-pick">
            {['and', 'coq', 'torsk', 'risotto'].map((id) => {
              const p = products.find((x) => x.id === id)!
              return (
                <span key={id} className={`dish ${id === campaign.productId ? 'on' : ''}`}>
                  <Icon name="plate" /> {td(p.name)}
                  {id === campaign.productId && <span className="sr-only">{L(' (valgt)', ' (selected)')}</span>}
                </span>
              )
            })}
            <span className="dish off">
              <Icon name="glass" /> <s>{L('Vin', 'Wine')}</s>
              <span className="sr-only">{L(' – alkohol kan ikke velges', ' – alcohol can’t be chosen')}</span>
            </span>
          </div>
          <div className="mt16">
            <StampCard state={camp} joined anonymous />
          </div>
          <p className="small muted mt8 num">
            {num(camp.units)}/{num(camp.target)} {td(campaign.unitLabel)} · {done ? L('etter kveldens vakt', 'after tonight’s shift') : L('før kveldens vakt', 'before tonight’s shift')}
          </p>
        </Sheet>
      )}
    </div>
  )
}

function CardComposer({ moments, full, onClose, onSend }: { moments: CardMoment[]; full: boolean; onClose: () => void; onSend: (card: { to: string; moment: CardMoment | null; giftId: string | null }) => void }) {
  const [to, setTo] = useState<string | null>(null)
  const [moment, setMoment] = useState<number | null>(null)
  // Øyeblikkene kommer fra Emmas bord i kveld; for de andre har demoen ingen bordliste.
  const list = to === config.persona.id ? moments : []
  const ready = !!to && (list.length === 0 || moment !== null) && !full
  return (
    <Sheet title={L('Takkekort', 'Thank-you card')} onClose={onClose}>
      <div className="pick-faces" role="radiogroup" aria-label={L('Til', 'To')}>
        {people.map((id) => (
          <button
            key={id}
            className={`pf ${to === id ? 'on' : ''}`}
            role="radio"
            aria-checked={to === id}
            onClick={() => {
              setTo(id)
              setMoment(null)
            }}
          >
            <Face id={id} size={44} />
            <span>{nameOf(id)}</span>
          </button>
        ))}
      </div>
      {list.length > 0 && (
        <div className="pick-moments mt16" role="radiogroup" aria-label={L('Øyeblikk fra kvelden', 'Moments from tonight')}>
          {list.map((m, i) => (
            <button key={i} className={`pm ${moment === i ? 'on' : ''}`} role="radio" aria-checked={moment === i} onClick={() => setMoment(i)}>
              <Icon name={momentMeta[m.tag].icon} />
              <span>
                {m.time} · {L('bord {n}', 'table {n}', { n: m.table })}
              </span>
            </button>
          ))}
        </div>
      )}
      <button className="btn block mt16" disabled={!ready} onClick={() => to && onSend({ to, moment: moment !== null ? list[moment] : null, giftId: null })}>
        <Icon name="envelope" /> {full ? L('Ukas kort er brukt', 'This week’s cards are used up') : L('Send etter vakten', 'Send after the shift')}
      </button>
    </Sheet>
  )
}
