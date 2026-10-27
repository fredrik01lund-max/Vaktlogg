// Sluttrapporten: vakten på én side.
//  • Øverst plakaten – en onepager som kan deles: salget, rekorden, salget per halvtime, seks nøkkeltall
//    og kveldens høydepunkter. Mørk, fargerik og lettlest.
//  • Under: det som motiverer videre – takkekortet fra Kari og hvordan kvelden flyttet premiene.
//  • «Del» åpner plakaten med valg for hva som skal være med.
// Brukes både for kveldens vakt (isTonight) og for vakter i historikken.

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { colleagueName, config } from '../config.ts'
import { periodGoals } from '../data/demoData.ts'
import { bingoAt, cardFor, duelAt, lastStepIndex, liveAt, pairAt, personalPeriod, prizeById, teamAt, teamPeriod, yearGoalAt } from '../lib/calc.ts'
import type { ShiftSummary } from '../lib/calc.ts'
import { capitalize, dateLong, dec1, kr, num, pct } from '../lib/format.ts'
import { useFirstVisit, useUnseen, markSeen } from '../lib/motion.ts'
import { navigate } from '../router.ts'
import { useShifts } from '../shifts.ts'
import { useStore } from '../state.tsx'
import { Confetti, CountUp, Icon, Sheet } from '../ui.tsx'
import { Envelope, Face, nameOf } from '../game-ui.tsx'
import { L, td } from '../i18n.ts'
import type { RecordDetail } from '../screens/Report.tsx'
import './report.css'

type Tone = 'gold' | 'green' | 'pink' | 'yellow' | 'rose' | 'blue'

interface Highlight {
  id: string
  icon: string
  text: string
  tone: Tone
  competition?: boolean
}

interface Show {
  sales: boolean
  tips: boolean
  steps: boolean
  games: boolean
}

const startHour = 16
const slotTime = (i: number) => `${String(startHour + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`

function useReportData(summary: ShiftSummary, records: RecordDetail[], isTonight: boolean) {
  const { settings, demo } = useStore()
  const { all } = useShifts()
  const end = liveAt(lastStepIndex)
  const others = all.filter((s) => s.id !== summary.id && s.date < summary.date)
  const avg = others.length ? others.reduce((a, s) => a + s.sales, 0) / others.length : summary.sales
  const vsAvg = (summary.sales / avg - 1) * 100
  const salesRecord = records.find((r) => r.metric === 'sales') ?? null
  const slots = isTonight ? end.salesBySlot : null
  const peak = slots ? slots.reduce((b, v, i) => (v > slots[b] ? i : b), 0) : -1
  const food = summary.lines.filter((l) => l.category === 'hovedrett').sort((a, b) => b.qty - a.qty)[0]
  const watch = settings.watch && summary.activity.steps > 0

  const highlights: Highlight[] = []
  // Flaskerekorden står ikke på plakaten – vi feirer ikke alkohol
  for (const r of records.filter((x) => x.metric !== 'sales' && x.metric !== 'premiumBottles'))
    highlights.push({ id: 'rek-' + r.metric, icon: 'star', tone: 'gold', text: L('Rekord: {what}', 'Record: {what}', { what: td(r.title).toLowerCase() }) })
  if (isTonight && demo.game === 'duell') {
    const d = duelAt(end)
    highlights.push({
      id: 'duell',
      icon: 'duel',
      tone: 'pink',
      competition: true,
      text: d.leader === 'me' ? L('Vant duellen mot {name}', 'Won the duel against {name}', { name: d.opponent.name }) : L('Duell mot {name}: {pct} flere desserter enn vanlig', 'Duel vs {name}: {pct} more desserts than usual', { name: d.opponent.name, pct: pct(Math.max(0, d.me.overAvg)) }),
    })
  }
  if (isTonight && demo.game === 'makker') {
    const p = pairAt(end)
    highlights.push({ id: 'makker', icon: 'pair', tone: 'yellow', competition: true, text: p.reached ? L('Makkermålet nådd med {name}', 'Buddy goal reached with {name}', { name: nameOf(p.partnerId) }) : L('{n} av {goal} desserter med {name}', '{n} of {goal} desserts with {name}', { n: num(p.count), goal: num(p.goal), name: nameOf(p.partnerId) }) })
  }
  if (isTonight && demo.game !== 'rolig' && teamAt(end).reachedSales) highlights.push({ id: 'lag', icon: 'team', tone: 'green', competition: true, text: L('Lagmålet nådd', 'Team goal reached') })
  if (isTonight && demo.game !== 'rolig') {
    const b = bingoAt(end)
    highlights.push({ id: 'bingo', icon: 'grid', tone: 'blue', competition: true, text: b.full ? L('Fullt bingobrett', 'Full bingo board') : L('Vaktbingo {n}/9', 'Shift bingo {n}/9', { n: num(b.count) }) })
  }
  if (summary.kudos.length) {
    const from = [...new Set(summary.kudos.map((k) => colleagueName(k.from)))]
    highlights.push({ id: 'ros', icon: 'heart', tone: 'rose', text: L('Kudos fra {names}', 'Kudos from {names}', { names: from.join(L(' og ', ' and ')) }) })
  }
  if (food) highlights.push({ id: 'rett', icon: 'plate', tone: 'yellow', text: L('Mest solgt: {dish} ×{n}', 'Best seller: {dish} ×{n}', { dish: td(food.name), n: num(food.qty) }) })

  return { end, vsAvg, salesRecord, slots, peak, watch, highlights, tables: isTonight ? end.tablesServed : null }
}

type Data = ReturnType<typeof useReportData>

/** Plakaten – onepageren som deles. */
export function ReportPoster({ summary, data, show, animate }: { summary: ShiftSummary; data: Data; show: Show; animate?: boolean }) {
  const confetti = useUnseen('report-confetti', !!animate && !!data.salesRecord)
  useEffect(() => {
    if (confetti) markSeen('report-confetti')
  }, [confetti])
  const tiles: { id: string; icon: string; tone: Tone; value: ReactNode; label: string; hidden?: boolean }[] = [
    { id: 'tips', icon: 'coins', tone: 'gold', value: animate ? <CountUp value={summary.tips} from={0} delay={300} /> : num(summary.tips), label: L('tips (kr)', 'tips (kr)'), hidden: !show.tips },
    { id: 'gjester', icon: 'guests', tone: 'green', value: num(summary.guests), label: L('gjester', 'guests') },
    data.tables !== null ? { id: 'bord', icon: 'grid', tone: 'green', value: num(data.tables), label: L('bord', 'tables') } : { id: 'timer', icon: 'clock', tone: 'blue', value: dec1(summary.hours).replace(/[,.]0$/, ''), label: L('timer', 'hours') },
    { id: 'dessert', icon: 'dessert', tone: 'pink', value: num(summary.desserts), label: L('desserter', 'desserts') },
    { id: 'snitt', icon: 'receipt', tone: 'yellow', value: kr(summary.avgCheck), label: L('per gjest', 'per guest') },
    data.watch && show.steps ? { id: 'skritt', icon: 'steps', tone: 'rose', value: num(summary.activity.steps), label: L('skritt · {km} km', 'steps · {km} km', { km: dec1(summary.activity.km) }) } : { id: 'timer2', icon: 'clock', tone: 'blue', value: dec1(summary.hours).replace(/[,.]0$/, ''), label: L('timer på jobb', 'hours at work') },
  ]
  const shown = tiles.filter((t) => !t.hidden)
  const highlights = data.highlights.filter((h) => show.games || !h.competition)
  const max = data.slots ? Math.max(1, ...data.slots) : 1
  return (
    <article className="er-poster" aria-label={L('Sluttrapport for {date}', 'Shift report for {date}', { date: dateLong(summary.date) })}>
      {confetti && <Confetti count={16} />}
      <header className="er-top">
        <span className="er-brand">{config.appName}</span>
        <span className="er-who">
          <span>
            <b>{config.persona.firstName}</b>
            <small>{td(config.persona.section)}</small>
          </span>
          <Face id={config.persona.id} size={34} />
        </span>
      </header>
      <p className="er-eyebrow">{L('Sluttrapport', 'Shift report')}</p>
      <h2 className="er-date">{capitalize(dateLong(summary.date))}</h2>
      <p className="er-time num">
        {summary.start}–{summary.end} · {td(config.restaurant.name)}
      </p>

      {show.sales ? (
        <div className="er-hero">
          <div className="er-sales num">
            {animate ? <CountUp value={summary.sales} from={0} duration={1100} /> : num(summary.sales)}
            <small>kr</small>
          </div>
          <div className="er-hero-chips">
            {data.salesRecord && (
              <span className="er-chip gold">
                <Icon name="star" />
                {L('Ny rekord! +{p}', 'New record! +{p}', { p: pct(Math.round((data.salesRecord.value / data.salesRecord.prev - 1) * 100)) })}
              </span>
            )}
            {data.vsAvg >= 1 && <span className="er-chip">{L('{p} over snittet ditt', '{p} above your average', { p: pct(Math.round(data.vsAvg)) })}</span>}
          </div>
        </div>
      ) : (
        <div className="er-hero">
          <div className="er-sales small">{L('Godt jobbet!', 'Great shift!')}</div>
        </div>
      )}

      {data.slots && show.sales && (
        <div className="er-slots" aria-hidden="true">
          <div className="er-bars">
            {data.slots.map((v, i) => (
              <i key={i} data-peak={i === data.peak || undefined} style={{ height: `${Math.max(6, (v / max) * 100)}%` }} />
            ))}
          </div>
          <span className="er-peak">{L('Travlest {from}–{to}', 'Busiest {from}–{to}', { from: slotTime(data.peak), to: slotTime(data.peak + 1) })}</span>
        </div>
      )}

      <div className="er-tiles">
        {shown.map((t) => (
          <div key={t.id} className="er-tile" data-tone={t.tone}>
            <span className="er-tile-ic">
              <Icon name={t.icon} />
            </span>
            <b className="num">{t.value}</b>
            <small>{t.label}</small>
          </div>
        ))}
      </div>

      {highlights.length > 0 && (
        <ul className="er-highlights">
          {highlights.map((h) => (
            <li key={h.id} data-tone={h.tone}>
              <Icon name={h.icon} />
              {h.text}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

/** Premiene kvelden flyttet: årets lagmål, månedens lagpremie og ditt eget mål. */
function PrizeProgress({ quiet }: { quiet: boolean }) {
  const { demo } = useStore()
  const end = liveAt(lastStepIndex)
  const year = yearGoalAt(end)
  const team = teamPeriod(end, true)
  const me = personalPeriod(true)
  const rows = [
    !quiet && { id: 'year', icon: 'medal', tone: 'gold', title: td(prizeById(periodGoals.year.prizeId).title), value: `+${num(Math.round(year.tonight / 1000))}k kr`, sub: L('{p} av årets lagmål', '{p} of the team goal of the year', { p: pct(Math.round(year.frac * 100)) }) },
    !quiet && { id: 'team', icon: prizeById(demo.teamGiftId).icon, tone: 'green', title: td(prizeById(demo.teamGiftId).title), value: team.tonightCounts ? '+1' : '', sub: L('{n} av {t} helgevakter', '{n} of {t} weekend shifts', { n: num(team.count), t: num(team.target) }) },
    { id: 'me', icon: prizeById(periodGoals.personal.prizeId).icon, tone: 'pink', title: td(prizeById(periodGoals.personal.prizeId).title), value: me.tonightCounts ? '+1' : '', sub: L('{n} av {t} vakter', '{n} of {t} shifts', { n: num(me.count), t: num(me.target) }) },
  ].filter(Boolean) as { id: string; icon: string; tone: string; title: string; value: string; sub: string }[]
  return (
    <button className="er-card er-prizes" onClick={() => navigate('/mal')} aria-label={L('Premier – kvelden teller med. Åpne Goals', 'Prizes – tonight counts. Open Goals')}>
      <span className="er-card-head" aria-hidden="true">
        <Icon name="gift" />
        {L('Kvelden teller mot', 'Tonight counts towards')}
        <Icon name="chevR" className="er-chev" />
      </span>
      <ul aria-hidden="true">
        {rows.map((r) => (
          <li key={r.id} data-tone={r.tone}>
            <span className="er-pr-ic">
              <Icon name={r.icon} />
            </span>
            <span className="grow">
              <b>{r.title}</b>
              <small>{r.sub}</small>
            </span>
            {r.value && <em className="num">{r.value}</em>}
          </li>
        ))}
      </ul>
    </button>
  )
}

/** Deling: plakaten med valg for hva som er med. */
function ShareReport({ summary, data, onClose }: { summary: ShiftSummary; data: Data; onClose: () => void }) {
  const { pushToasts } = useStore()
  const [show, setShow] = useState<Show>({ sales: true, tips: false, steps: true, games: true })
  const chips: { key: keyof Show; label: string }[] = [
    { key: 'sales', label: L('Salg', 'Sales') },
    { key: 'tips', label: L('Tips', 'Tips') },
    ...(data.watch ? [{ key: 'steps' as const, label: L('Skritt', 'Steps') }] : []),
    { key: 'games', label: L('Konkurranser', 'Competitions') },
  ]
  const share = async () => {
    const text = [
      `${config.appName} · ${capitalize(dateLong(summary.date))}`,
      show.sales ? L('{kr} solgt', '{kr} sold', { kr: kr(summary.sales) }) : '',
      ...data.highlights.filter((h) => show.games || !h.competition).map((h) => h.text),
    ]
      .filter(Boolean)
      .join('\n')
    try {
      if (navigator.share) await navigator.share({ title: L('Sluttrapport', 'Shift report'), text })
    } catch {
      /* avbrutt */
    }
    pushToasts([{ kind: 'info', title: L('Sluttrapporten er delt', 'Shift report shared'), body: L('Laget kan se den nå.', 'The team can see it now.') }])
    onClose()
  }
  return (
    <Sheet title={L('Del sluttrapporten', 'Share the shift report')} onClose={onClose}>
      <div className="er-share">
        <div className="er-share-preview">
          <ReportPoster summary={summary} data={data} show={show} />
        </div>
        <div className="er-share-chips" role="group" aria-label={L('Hva skal være med', 'What to include')}>
          {chips.map((c) => (
            <button key={c.key} role="checkbox" aria-checked={show[c.key]} className="w-chip er-chip-toggle" onClick={() => setShow((s) => ({ ...s, [c.key]: !s[c.key] }))}>
              {show[c.key] && <Icon name="check" />}
              {c.label}
            </button>
          ))}
        </div>
        <button className="btn block" onClick={share}>
          <Icon name="share" /> {L('Del', 'Share')}
        </button>
      </div>
    </Sheet>
  )
}

/** `left` erstatter «Lagret» øverst – historikken legger tilbakeknappen der. */
export function EndReport({ summary, records, isTonight, left }: { summary: ShiftSummary; records: RecordDetail[]; isTonight: boolean; left?: ReactNode }) {
  const { settings, demo, saveShift, openCard } = useStore()
  const [share, setShare] = useState(false)
  const [thanks, setThanks] = useState(false)
  // En rolig vakt viser ikke konkurransene før Emma selv vil se dem.
  const [revealed, setRevealed] = useState(false)
  const quiet = isTonight && (settings.calm || demo.quietShift) && !revealed
  const data = useReportData(summary, records, isTonight)
  const card = isTonight ? cardFor(summary.id, demo.sentCards) : undefined
  // Første gang kveldens rapport åpnes, teller tallene opp. Senere besøk er stille.
  const animate = useFirstVisit('report-tonight', isTonight)

  // Vakten lagres automatisk – ingen kasselapp å miste.
  useEffect(() => {
    if (isTonight && !demo.saved) saveShift()
  }, [isTonight, demo.saved, saveShift])

  return (
    <div className="er">
      <div className="er-bar">
        {left ?? (
          <span className="saved-pill">
            <Icon name="check" /> {L('Lagret', 'Saved')}
          </span>
        )}
        <button className="er-share-btn" onClick={() => setShare(true)}>
          <Icon name="share" /> {L('Del', 'Share')}
        </button>
      </div>

      <ReportPoster summary={summary} data={data} show={{ sales: true, tips: true, steps: true, games: !quiet }} animate={animate} />

      {quiet && (
        <div className="er-card er-quiet">
          <Icon name="calm" />
          <span className="grow">{L('Rolig vakt: spillene er skjult.', 'Calm shift: the games are hidden.')}</span>
          <button className="btn secondary small" onClick={() => setRevealed(true)}>
            {L('Vis resultatene', 'Show results')}
          </button>
        </div>
      )}

      {isTonight && (
        <div className={`er-more ${card ? 'two' : ''}`}>
          {card && (
            <button className="er-card er-thanks" onClick={() => setThanks(true)}>
              <span className="er-env" aria-hidden="true">
                <Icon name="envelope" />
                {!demo.cardOpened && <i />}
              </span>
              <span className="grow">
                <b>{L('Takkekort fra {name}', 'Thank-you card from {name}', { name: config.employer.name })}</b>
                <small>{demo.cardOpened ? td(card.category) : L('Trykk for å åpne', 'Tap to open')}</small>
              </span>
              <Face id={config.employer.id} size={32} />
            </button>
          )}
          <PrizeProgress quiet={quiet} />
        </div>
      )}

      {thanks && card && (
        <Sheet title={L('Takkekort fra {name}', 'Thank-you card from {name}', { name: config.employer.name })} onClose={() => setThanks(false)}>
          <Envelope card={card} opened={demo.cardOpened} onOpen={openCard} />
        </Sheet>
      )}
      {share && <ShareReport summary={summary} data={data} onClose={() => setShare(false)} />}
    </div>
  )
}
