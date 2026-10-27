import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { colleagueName, config } from '../config.ts'
import { periodGoals, tonight } from '../data/demoData.ts'
import { yearGoalAt } from '../lib/calc.ts'
import { YearGoalCard } from '../yeargoal.tsx'
import { bingoAt, cardFor, duelAt, funStats, lastStepIndex, liveAt, pairAt, personalPeriod, recordDefs, salesTarget, teamAt, teamComparison, teamPeriod } from '../lib/calc.ts'
import type { RecordMetric, ShiftSummary } from '../lib/calc.ts'
import { capitalize, dateLong, dec1, kr, num, km as fmtKm } from '../lib/format.ts'
import { navigate } from '../router.ts'
import { useStore } from '../state.tsx'
import { HeartLine } from '../charts.tsx'
import { dessertResult } from '../duel.tsx'
import { FlowRings } from '../rings.tsx'
import { FlowLegend } from '../designs/Directions.tsx'
import { legendFor, racePoints, ringsFor } from './Shift.tsx'
import { BingoBoard, DuelMedals, Envelope, Face, FaceStack, PeriodCard, RaceChart } from '../game-ui.tsx'
import { Confetti, CountUp, Icon, Stat, useInView } from '../ui.tsx'
import { DUR, markSeen, useFirstVisit, useReducedMotion, useUnseen } from '../lib/motion.ts'
import { KudosSheet, ShareSheet } from './Sheets.tsx'
import type { ShareFact } from './Sheets.tsx'
import { L, td } from '../i18n.ts'

export interface RecordDetail {
  metric: RecordMetric
  title: string
  value: number
  prev: number
}

export function recordDetails(summary: ShiftSummary, all: ShiftSummary[], set: RecordMetric[]): RecordDetail[] {
  const before = all.filter((s) => s.date < summary.date)
  return set.map((metric) => ({
    metric,
    title: recordDefs.find((d) => d.metric === metric)!.title,
    value: summary[metric],
    prev: Math.max(...before.map((s) => s[metric])),
  }))
}

export function formatMetric(metric: RecordMetric, v: number): string {
  return metric === 'sales' || metric === 'avgCheck' ? kr(v) : num(v)
}

function More({ icon, title, summary, children }: { icon: string; title: string; summary: string; children: ReactNode }) {
  return (
    <details className="more">
      <summary>
        <span className="icon-badge neutral">
          <Icon name={icon} />
        </span>
        <span className="grow">
          <span style={{ display: 'block', fontWeight: 650 }}>{title}</span>
          <span className="small muted" style={{ display: 'block' }}>
            {summary}
          </span>
        </span>
        <Icon name="chevR" className="chev" />
      </summary>
      <div className="body">{children}</div>
    </details>
  )
}

// Rekkefølgen følger det servitørene ser etter på kasselappen:
// tallene → rekorder → laget og ros → del. Detaljene ligger samlet nederst.
export function Report({ summary, records, isTonight }: { summary: ShiftSummary; records: RecordDetail[]; isTonight: boolean }) {
  const { settings, demo, saveShift, giveKudos, pushToasts, openCard } = useStore()
  const [share, setShare] = useState(false)
  // En rolig vakt viser ikke konkurransene i oppgjøret før Emma selv vil se dem.
  const [revealed, setRevealed] = useState(false)
  const [kudosOpen, setKudosOpen] = useState(false)
  const end = liveAt(lastStepIndex)
  const duel = duelAt(end)
  const team = teamAt(end)
  const fun = funStats(summary)
  const quietReport = isTonight && (settings.calm || demo.quietShift) && !revealed
  const showCompetition = isTonight && !quietReport && demo.game !== 'rolig'
  const duelOn = isTonight && demo.game === 'duell'
  const pairOn = isTonight && demo.game === 'makker'
  const pairState = pairAt(end)
  const bingoState = bingoAt(end)
  const card = isTonight ? cardFor(summary.id, demo.sentCards) : undefined

  const finalRings = ringsFor(end, { calm: !showCompetition, game: demo.game, giftId: demo.teamGiftId })
  const finalLegend = legendFor(finalRings, end, true)

  // Første gang kveldens oppgjør åpnes: ringene og summen tegnes frem sammen. Senere besøk er stille.
  const reveal = useFirstVisit('report-tonight', isTonight)
  const [recRef, recInView] = useInView<HTMLDivElement>(0.6)
  const confetti = useUnseen('report-confetti', isTonight)
  const rm = useReducedMotion()
  useEffect(() => {
    if (recInView && isTonight) markSeen('report-confetti')
  }, [recInView, isTonight])

  // Vakten lagres automatisk – ingen kasselapp å miste.
  useEffect(() => {
    if (isTonight && !demo.saved) saveShift()
  }, [isTonight, demo.saved, saveShift])

  const facts: ShareFact[] = [
    ...records.map((r) => ({ id: `rek-${r.metric}`, label: L('Rekord: {t}', 'Record: {t}', { t: td(r.title).toLowerCase() }), value: formatMetric(r.metric, r.value), on: r === records[0] })),
    { id: 'salg', label: L('Totalsalg', 'Total sales'), value: kr(summary.sales), on: false },
    { id: 'tips', label: L('Tips', 'Tips'), value: num(summary.tips), on: false },
    { id: 'gjester', label: L('Gjester', 'Guests'), value: num(summary.guests), on: records.length === 0 },
    { id: 'flasker', label: L('Flasker over 1 500 kr', 'Bottles over 1,500 kr'), value: num(summary.premiumBottles), on: false },
    ...(duelOn && showCompetition ? [{ id: 'duell', label: L('Dessertduell mot {name}', 'Dessert duel vs {name}', { name: duel.opponent.name }), value: duel.leader === 'me' ? L('Vant', 'Won') : L('Tapte', 'Lost'), on: false }] : []),
    ...(showCompetition ? [{ id: 'lag', label: L('Lagmålet', 'Team goal'), value: team.reachedSales ? L('Nådd', 'Reached') : L('Ikke nådd', 'Not reached'), on: false }] : []),
    ...(settings.watch ? [{ id: 'km', label: L('Gått på jobb', 'Walked at work'), value: fmtKm(summary.activity.km), on: false }] : []),
    ...(card ? [{ id: 'kari', label: L('Takkekort fra {name}', 'Thank-you card from {name}', { name: config.employer.name }), value: td(card.category), on: false }] : []),
    ...(showCompetition && bingoState.full ? [{ id: 'bingo', label: L('Vaktbingo', 'Shift bingo'), value: L('Fullt brett med laget', 'Full board with the team'), on: false }] : []),
  ]

  return (
    <>
      <div className="row between wrap" style={{ rowGap: 6 }}>
        <p className="eyebrow">{isTonight ? L('Sluttoppgjør', 'Shift summary') : L('Vaktrapport', 'Shift report')}</p>
        {(!isTonight || demo.saved) && (
          <span className="saved-pill">
            <Icon name="check" /> {L('Lagret i historikken', 'Saved to history')}
          </span>
        )}
      </div>
      <h1 className="h2 mt8">{capitalize(dateLong(summary.date))}</h1>
      <p className="muted mt8 num">
        {summary.start}–{summary.end} · {L('{h} timer', '{h} hours', { h: dec1(summary.hours).replace(',0', '').replace(/\.0$/, '') })} · {td(config.persona.section)}
      </p>

      {/* 1. Tallene – for kveldens vakt som ringer, slik som under vakt */}
      {isTonight ? (
        <div className="card dD-card mt16" style={{ position: 'relative', overflow: 'hidden', alignItems: 'stretch' }}>
          <FlowRings rings={finalRings} size={262} stroke={16} gap={7} reveal={reveal || undefined} label={L('Totalsalg {sales}. {rest}', 'Total sales {sales}. {rest}', { sales: kr(summary.sales), rest: finalLegend.map((l) => `${l.label}: ${l.value}`).join('. ') })}>
            <div className="dD-num">
              <CountUp value={summary.sales} from={reveal ? 0 : undefined} duration={DUR.reveal} />
            </div>
            <div className="dD-cap">{L('kr totalsalg', 'kr total sales')}</div>
          </FlowRings>
          <FlowLegend items={finalLegend} reveal={reveal} />
          {showCompetition && (
            <div className="stack mt16 small">
              {duelOn && (
                <div className="row gap8" style={{ alignItems: 'center' }}>
                  <DuelMedals winner={duel.leader === 'me' ? config.persona.id : duel.leader === 'opponent' ? duel.opponentId : null} ids={[config.persona.id, duel.opponentId]} />
                  <span>
                    {L('Du solgte', 'You sold')} <b>{dessertResult(duel.me)}</b>, {duel.opponent.name} {dessertResult(duel.opponent, true)}.
                  </span>
                </div>
              )}
              {pairOn && (
                <div className="row gap8" style={{ alignItems: 'center' }}>
                  <span className={`pair-badge ${pairState.reached ? 'done' : ''}`}>
                    <FaceStack ids={[config.persona.id, pairState.partnerId]} size={28} />
                  </span>
                  <span>
                    {pairState.reached ? <b>{L('Makkere!', 'Buddies!')}</b> : <b>{L('Nesten makkere', 'Almost buddies')}</b>}{' '}
                    {L('{n} av {goal} desserter sammen.', '{n} of {goal} desserts together.', { n: num(pairState.count), goal: num(pairState.goal) })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="card dark mt16">
          <div className="eyebrow">{L('Totalsalg', 'Total sales')}</div>
          <div className="hero-num mt8">
            <CountUp value={summary.sales} />
            <span className="unit">kr</span>
          </div>
        </div>
      )}

      <div className="kpis mt12">
        <div className="kpi">
          <span className="k-top">
            <Icon name="coins" /> {L('Tips', 'Tips')}
          </span>
          <span className="k-val">{num(summary.tips)}</span>
        </div>
        <div className="kpi">
          <span className="k-top">
            <Icon name="receipt" /> {L('Snittbong', 'Avg check')}
          </span>
          <span className="k-val">
            {num(summary.avgCheck)}
            <small>kr</small>
          </span>
        </div>
        <div className="kpi">
          <span className="k-top">
            <Icon name="guests" /> {L('Gjester', 'Guests')}
          </span>
          <span className="k-val">{num(summary.guests)}</span>
        </div>
      </div>

      {/* 2. Rekorder */}
      {records.length > 0 && (
        <div className="card tint-gold mt12" style={{ position: 'relative', overflow: 'hidden' }} ref={recRef}>
          {/* Konfettien venter til kortet faktisk sees */}
          {isTonight && confetti && recInView && <Confetti count={14} />}
          <div className="row">
            <div className="icon-badge gold">
              <Icon name="trophy" />
            </div>
            <div className="h3 grow">{records.length === 1 ? L('Ny personlig rekord', 'New personal record') : L('{n} nye personlige rekorder', '{n} new personal records', { n: records.length })}</div>
          </div>
          <div className="stack mt12">
            {records.map((r) => (
              <div key={r.metric} className="row between">
                <span>{td(r.title)}</span>
                <span className="nowrap" style={{ textAlign: 'right' }}>
                  <b className="num">
                    {isTonight && confetti && !rm ? (
                      <>
                        <span aria-hidden="true">
                          <CountUp from={r.prev} value={recInView ? r.value : r.prev} format={(v) => formatMetric(r.metric, v)} />
                        </span>
                        <span className="sr-only">{formatMetric(r.metric, r.value)}</span>
                      </>
                    ) : (
                      formatMetric(r.metric, r.value)
                    )}
                  </b>
                  <span className="small muted num" style={{ display: 'block' }}>
                    {L('før: {v}', 'previous: {v}', { v: formatMetric(r.metric, r.prev) })}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kvelden teller mot månedens premier */}
      {isTonight && (
        <section className="section">
          <div className="section-head">
            <h2>{L('Premier', 'Prizes')}</h2>
            <button className="link" onClick={() => navigate('/mal')}>
              {L('Mål', 'Goals')}
            </button>
          </div>
          <div className="stack">
            {!quietReport && <YearGoalCard compact state={yearGoalAt(end)} />}
            {!quietReport && <PeriodCard ctx="rapport" compact who="lag" period={periodGoals.monthName} state={teamPeriod(end, true)} prizeId={demo.teamGiftId} rule={periodGoals.team.rule} />}
            <PeriodCard ctx="rapport" compact who="meg" period={periodGoals.monthName} state={personalPeriod(true)} prizeId={periodGoals.personal.prizeId} rule={periodGoals.personal.rule} />
          </div>
        </section>
      )}

      {/* Takkekort fra Kari – for et øyeblikk, aldri for et tall */}
      {card && (
        <section className="section">
          <div className="section-head">
            <h2>{L('Takkekort fra {name}', 'Thank-you card from {name}', { name: config.employer.name })}</h2>
          </div>
          <Envelope card={card} opened={demo.cardOpened} onOpen={openCard} />
        </section>
      )}

      {quietReport && (
        <div className="card tint-sage flat mt20">
          <div className="note" style={{ color: 'var(--sage-deep)' }}>
            <Icon name="moon" />
            <span>{L('Rolig vakt: spill og lagmål er skjult. Resultatene er lagret.', 'Calm shift: games and team goals are hidden. Your results are saved.')}</span>
          </div>
          <button className="btn secondary small mt12" onClick={() => setRevealed(true)}>
            {L('Vis resultatene', 'Show results')}
          </button>
        </div>
      )}

      {/* 4. Ros */}
      <section className="section">
        <div className="section-head">
          <h2>{L('Fra laget', 'From the team')}</h2>
          {summary.kudos.length > 0 && <span className="chip sage">{summary.kudos.length}</span>}
        </div>
        {summary.kudos.length ? (
          <div className="list">
            {summary.kudos.map((k, i) => (
              <div key={i} className="list-item" style={{ alignItems: 'flex-start' }}>
                <Face id={k.from} size={40} />
                <div className="grow">
                  <div className="title">
                    {colleagueName(k.from)} · <span style={{ color: 'var(--sage-deep)' }}>{td(k.category)}</span>
                  </div>
                  {k.message && <div className="meta">{L('«{m}»', '“{m}”', { m: td(k.message) })}</div>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">{L('Ingen kudos registrert på denne vakten.', 'No kudos logged on this shift.')}</p>
        )}
        {isTonight && (
          <>
            {demo.givenKudos.length > 0 && (
              <p className="small muted mt12">
                {L('Du har gitt kudos til {names}.', 'You’ve given kudos to {names}.', {
                  names: [...new Set(demo.givenKudos.map((g) => g.to))].map((to) => { const n = demo.givenKudos.filter((g) => g.to === to).length; return n > 1 ? `${colleagueName(to)} (×${n})` : colleagueName(to) }).join(', '),
                })}
              </p>
            )}
            <button className="btn secondary block mt12" onClick={() => setKudosOpen(true)}>
              <Icon name="heart" /> {L('Gi kudos til en kollega', 'Give kudos to a colleague')}
            </button>
          </>
        )}
      </section>

      {/* 6. Del */}
      <button className="btn block mt20" onClick={() => setShare(true)}>
        <Icon name="share" /> {L('Lag et delbart kort', 'Make a shareable card')}
      </button>

      {/* 7. Detaljer */}
      <section className="section">
        <div className="section-head">
          <h2>{L('Detaljer', 'Details')}</h2>
        </div>
        {showCompetition && (
          <More icon="ghost" title={L('Tempo', 'Pace')} summary={L('Laget mot forrige fredag på samme tid', 'The team vs. last Friday at the same time')}>
            <RaceChart points={racePoints(lastStepIndex)} target={salesTarget} />
            <div className="row gap8 small mt8 muted">
              <span className="race-key solid" /> {L('i kveld', 'tonight')}
              <span className="race-key dashed" /> {L('forrige fredag', 'last Friday')}
            </div>
          </More>
        )}
        <More icon="receipt" title={L('Mest solgt', 'Best sellers')} summary={summary.lines.slice(0, 2).map((l) => td(l.name)).join(', ') + ' …'}>
          <div className="list">
            {summary.lines.slice(0, 5).map((l) => (
              <div key={l.id} className="list-item" style={{ minHeight: 54 }}>
                <div className="grow">
                  <div className="title">{td(l.name)}</div>
                  <div className="meta num">{L('{n} stk.', '{n} sold', { n: num(l.qty) })}</div>
                </div>
                <div className="end">{kr(l.sales)}</div>
              </div>
            ))}
          </div>
          <div className="grid2 mt12">
            <Stat label={L('Desserter', 'Desserts')} value={num(summary.desserts)} />
            <Stat label={L('Flasker over 1 500 kr', 'Bottles over 1,500 kr')} value={num(summary.premiumBottles)} />
          </div>
        </More>
        {settings.watch && (
          <More
            icon="pulse"
            title={L('Skritt og puls', 'Steps and heart rate')}
            summary={L('Snittpuls {avg} · maks {max}', 'Avg. heart rate {avg} · max {max}', { avg: summary.activity.hrAvg, max: summary.activity.hrMax })}
          >
            <div className="grid2">
              <Stat label={L('Gått', 'Walked')} value={dec1(summary.activity.km)} unit="km" sub={L('{n} skritt', '{n} steps', { n: num(summary.activity.steps) })} />
              <Stat label={L('Puls', 'Heart rate')} value={num(summary.activity.hrAvg)} unit={L('snitt', 'avg')} sub={L('Maks {max} slag/min', 'Max {max} bpm', { max: summary.activity.hrMax })} />
            </div>
            {isTonight && (
              <div className="card flat mt12">
                <HeartLine samples={tonight.activity.heartRate} />
              </div>
            )}
            {fun.kmPerRedBottle !== null && (
              <div className="row between mt12">
                <span>{L('Gått per rødvinsflaske', 'Walked per bottle of red')}</span>
                <b className="num">{dec1(fun.kmPerRedBottle)} km</b>
              </div>
            )}
            <div className="row between mt8">
              <span>{L('Toppuls {hr}', 'Peak heart rate {hr}', { hr: fun.highlight.hr })}</span>
              <span className="small muted">
                {fun.highlight.at} · {td(fun.highlight.what)}
              </span>
            </div>
          </More>
        )}
        {showCompetition && (
          <More icon="grid" title={L('Vaktbingo', 'Shift bingo')} summary={bingoState.full ? L('Fullt brett med laget', 'Full board with the team') : L('{n} av 9 ruter', '{n} of 9 squares', { n: bingoState.count })}>
            <BingoBoard state={bingoState} />
            <div className="row gap8 mt12">
              <FaceStack ids={Array.from(new Set(Object.values(bingoState.filled).map((f) => f!.by)))} size={24} />
            </div>
          </More>
        )}
        {isTonight && (
          <More icon="team" title={L('Salg på vaktlaget', 'Sales on the shift team')} summary={L('Kolleger som deler tallene sine', 'Colleagues who share their numbers')}>
            <div className="list">
              {teamComparison().map((r) => (
                <div key={r.id} className="list-item" style={{ minHeight: 54 }}>
                  <div className={`avatar ${r.sales === null ? 'hidden' : ''}`} style={r.isMe ? { background: 'var(--wine)', color: '#fff7f0' } : undefined}>
                    {r.sales === null ? <Icon name="eyeOff" className="chev" /> : r.name[0]}
                  </div>
                  <div className="grow">
                    <div className="title">{r.isMe ? L('{name} (deg)', '{name} (you)', { name: r.name }) : r.sales === null ? L('Skjult', 'Hidden') : r.name}</div>
                    {r.sales === null && <div className="meta">{L('Har valgt å ikke dele', 'Has chosen not to share')}</div>}
                  </div>
                  <div className="end">{r.sales === null ? '–' : kr(r.sales)}</div>
                </div>
              ))}
            </div>
            <p className="small muted mt8">{L('Bare kolleger på samme vakt som deler tallene sine. Sortert etter navn, ikke rangert.', 'Only colleagues on this shift who share their numbers. Sorted by name, not ranked.')}</p>
          </More>
        )}
        {!settings.watch && (
          <p className="small muted mt12">{L('Klokken er ikke koblet til, så det finnes ingen skritt eller puls for denne vakten.', 'No watch is connected, so there are no steps or heart rate for this shift.')}</p>
        )}
      </section>

      {share && <ShareSheet title={capitalize(dateLong(summary.date))} facts={facts} onClose={() => setShare(false)} />}
      {kudosOpen && (
        <KudosSheet
          onClose={() => setKudosOpen(false)}
          onSend={(to, category) => {
            giveKudos(to, category)
            setKudosOpen(false)
            pushToasts([
              {
                kind: 'kudos',
                title: L('Kudos sendt til {name}', 'Kudos sent to {name}', { name: colleagueName(to) }),
                body: L('«{c}» – det kan ikke måles i kassen, men det teller.', '“{c}” – the till can’t measure it, but it counts.', { c: td(category) }),
              },
            ])
          }}
        />
      )}
    </>
  )
}
