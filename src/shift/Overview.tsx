// Vaktsiden under vakt: fire bokser, ett tema hver – Helse, Salg, Konkurranse og Gjester.
// Hver boks viser det viktigste tallet øverst og en liten levende illustrasjon under:
// pulskurven, salget per halvtime, duellen og bordene i seksjonen. Trykk på boksen for alle detaljene.

import type { CSSProperties, ReactNode } from 'react'
import { config } from '../config.ts'
import { tonight } from '../data/demoData.ts'
import { duelAt, duelLead, duelShare, floorAt, ghostAt, historyBest, hrSeries, hrZone, lastStepIndex, liveAt, pairAt, tablesAt, teamAt } from '../lib/calc.ts'
import type { LiveState } from '../lib/calc.ts'
import { L } from '../i18n.ts'
import { kr, num, pct } from '../lib/format.ts'
import { useMounted } from '../lib/motion.ts'
import { navigate } from '../router.ts'
import { useStore } from '../state.tsx'
import { CountUp, Fx, Icon } from '../ui.tsx'
import { leaderText } from '../duel.tsx'
import { Face, nameOf } from '../game-ui.tsx'
import { TugBar } from '../designs/Directions.tsx'
import { stressName, topicById } from './topics.ts'
import type { TopicId } from './topics.ts'
import { Heart, LiveHead, Steps } from './parts.tsx'
import { KudosRain, KudosRow } from './Kudos.tsx'

const andList = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${L('og', 'and')} ${xs.at(-1)}`)

function Tile({ id, label, art, badge, children }: { id: TopicId; label: string; art?: ReactNode; badge?: ReactNode; children: ReactNode }) {
  const t = topicById(id)!
  return (
    <button className="st-tile" data-topic={id} onClick={() => navigate(`/vakt/${id}`)} aria-label={L('{title}: {label}. Åpne detaljer', '{title}: {label}. Open details', { title: t.title, label })}>
      <span className="st-tile-top" aria-hidden="true">
        <span className="st-ic">
          <Icon name={t.icon} />
        </span>
        {badge}
        <Icon name="chevR" className="st-chev" />
      </span>
      <span className="st-tile-body" aria-hidden="true">
        {children}
      </span>
      {art && (
        <span className="st-art" aria-hidden="true">
          {art}
        </span>
      )}
    </button>
  )
}

// ── Helse: puls og skritt, og pulskurven for kvelden ──
/** Pulskurven på faste akser for hele vakten. Den vokser mot høyre; prikken er nå. */
function PulseSpark({ idx }: { idx: number }) {
  const n = hrSeries.length - 1
  const lo = 70
  const hi = 155
  const y = (v: number) => 4 + ((hi - Math.max(lo, Math.min(hi, v))) / (hi - lo)) * 52
  const x = (i: number) => (i / n) * 100
  const pts = hrSeries.slice(0, idx + 1)
  const line = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ')
  const area = `${line} L${x(pts.length - 1).toFixed(2)},60 L0,60 Z`
  const rush = y(config.hrZones.rush)
  const last = pts.at(-1)!
  return (
    <span className="st-spark">
      <svg viewBox="0 0 100 60" preserveAspectRatio="none">
        <defs>
          <linearGradient id="st-pulse-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f08fb0" stopOpacity="0.45" />
            <stop offset="1" stopColor="#f08fb0" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" x2="100" y1={rush} y2={rush} stroke="#e57fa3" strokeOpacity="0.5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
        <path d={area} fill="url(#st-pulse-fill)" />
        <path d={line} fill="none" stroke="#e57fa3" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <i className="st-spark-dot" style={{ left: `${x(pts.length - 1)}%`, top: `${(y(last) / 60) * 100}%` }} />
    </span>
  )
}

function HealthTile({ live, watch, calm, playing }: { live: LiveState; watch: boolean; calm: boolean; playing: boolean }) {
  if (!watch)
    return (
      <Tile
        id="helse"
        label={L('Klokka er ikke koblet til', 'Watch not connected')}
        art={
          <span className="st-watch-off">
            <Icon name="watch" />
          </span>
        }
      >
        <span className="st-big muted">{L('Klokke av', 'Watch off')}</span>
        <span className="st-sub">{L('Trykk for å koble til', 'Tap to connect')}</span>
      </Tile>
    )
  const a = live.activity
  const zone = hrZone(a.hr)
  return (
    <Tile id="helse" label={L('Puls {hr}, {stress} stress, {steps} skritt', 'Heart rate {hr}, {stress} stress, {steps} steps', { hr: a.hr, stress: stressName[zone].toLowerCase(), steps: num(a.steps) })} art={<PulseSpark idx={a.hrIdx} />}>
      <span className="st-big st-hr">
        <Heart hr={a.hr} calm={calm} />
        <CountUp value={a.hr} duration={600} />
        <small>{L('puls', 'bpm')}</small>
      </span>
      <span className="st-sub st-steps">
        <Icon name="steps" />
        <b>
          <Steps steps={a.steps} playing={playing} calm={calm} />
        </b>
        {L('skritt', 'steps')}
      </span>
      <span className="st-chip" data-zone={zone}>
        {stressName[zone]} stress
      </span>
    </Tile>
  )
}

// ── Salg: omsetning og tips, og salget per halvtime ──
function SalesBars({ live }: { live: LiveState }) {
  const v = live.salesBySlot
  const max = Math.max(4000, ...v)
  const current = Math.min(v.length - 1, Math.floor((live.minutes - Number(tonight.start.slice(0, 2)) * 60) / 30))
  return (
    <span className="st-bars">
      {v.map((x, i) => (
        <i key={i} data-state={i > current ? 'future' : i === current ? 'now' : 'past'} style={{ '--h': `${Math.max(i > current ? 4 : 6, (x / max) * 100)}%` } as CSSProperties} />
      ))}
    </span>
  )
}

function SalesTile({ live }: { live: LiveState }) {
  const frac = live.stats.sales / historyBest.sales
  return (
    <Tile
      id="salg"
      label={L('{sales} solgt, {tips} i tips, {pct} prosent av rekorden', '{sales} sold, {tips} in tips, {pct} percent of your record', { sales: kr(live.stats.sales), tips: num(live.tips), pct: num(frac * 100) })}
      art={<SalesBars live={live} />}
    >
      <span className="st-big">
        <CountUp value={live.stats.sales} />
      </span>
      <span className="st-unit">{L('kr solgt', 'kr sold')}</span>
      <span className="st-sub">
        <b>
          <CountUp value={live.tips} delay={120} />
        </b>
        {L('tips', 'tips')}
      </span>
      <span className="st-chip">{frac >= 1 ? L('Ny rekord!', 'New record!') : L('{pct} av rekord', '{pct} of record', { pct: pct(frac * 100) })}</span>
    </Tile>
  )
}

// ── Konkurranse: kveldens prioriterte spill (eller rekorden i rolig modus) ──
function CompetitionTile({ live, game, calm }: { live: LiveState; game: string; calm: boolean }) {
  const mounted = useMounted()
  const recordPct = (live.stats.sales / historyBest.sales) * 100
  // Rolig modus (eller en Rolig-kveld): ingen konkurranser – bare rekorden din.
  if (calm || game === 'rolig')
    return (
      <Tile
        id="konkurranse"
        label={L('Rolig modus: {pct} prosent av rekorden din', 'Calm mode: {pct} percent of your record', { pct: num(recordPct) })}
        art={
          <span className="st-meter-mini">
            <i style={{ width: `${Math.min(100, recordPct)}%` }} />
          </span>
        }
      >
        <span className="st-kicker">
          <Icon name="calm" /> {L('Rolig modus', 'Calm mode')}
        </span>
        <span className="st-big">
          <CountUp value={Math.round(recordPct)} />
          <small>%</small>
        </span>
        <span className="st-sub">{L('av rekorden din', 'of your record')}</span>
      </Tile>
    )
  if (game === 'duell') {
    const d = duelAt(live)
    const lead = duelLead(d)
    const text = leaderText(d, false)
    return (
      <Tile
        id="konkurranse"
        label={`${L('Duell mot {name}: {text}', 'Duel vs {name}: {text}', { name: d.opponent.name, text })}${lead > 0 ? L(', {n} prosent foran', ', by {n} percent', { n: num(lead) }) : ''}`}
        art={
          <span className="st-duel">
            <span className="st-duel-row">
              <span className="st-duel-face" data-lead={d.leader === 'me'}>
                <Face id={config.persona.id} size={30} />
                <Icon name="crown" />
              </span>
              <TugBar share={duelShare(d)} me={['#f6b3cb', '#f08fb0']} them="#a7bfeb" height={14} initial="" />
              <span className="st-duel-face" data-lead={d.leader === 'opponent'}>
                <Face id={d.opponentId} size={30} />
                <Icon name="crown" />
              </span>
            </span>
            {lead > 0 && (
              <span className="st-duel-lead" data-who={d.leader}>
                {L('{p} foran', '{p} ahead', { p: pct(lead) })}
              </span>
            )}
          </span>
        }
      >
        <span className="st-kicker">{L('Duell mot {name}', 'Duel vs {name}', { name: d.opponent.name })}</span>
        <Fx key={text} cls="fx-pop" on={mounted.current} className="st-big st-word">
          {text}
        </Fx>
      </Tile>
    )
  }
  if (game === 'makker') {
    const p = pairAt(live)
    return (
      <Tile
        id="konkurranse"
        label={L('Makker med {name}: {n} av {goal} desserter', 'Buddy: {name}, {n} of {goal} desserts together', { name: nameOf(p.partnerId), n: p.count, goal: p.goal })}
        art={
          <span className="st-beads mini">
            {Array.from({ length: p.goal }, (_, i) => (
              <i key={i} data-who={p.beads[i] ?? 'none'} />
            ))}
          </span>
        }
      >
        <span className="st-kicker">{L('Makker med {name}', 'Buddy: {name}', { name: nameOf(p.partnerId) })}</span>
        <span className="st-big">
          <CountUp value={p.count} />
          <small>/ {num(p.goal)}</small>
        </span>
        <span className="st-sub">{p.reached ? L('Fullført!', 'Done!') : L('desserter sammen', 'desserts together')}</span>
      </Tile>
    )
  }
  const t = teamAt(live)
  const g = ghostAt(live)
  return (
    <Tile
      id="konkurranse"
      label={
        g.ahead
          ? L('Lagmål: {n} prosent, foran forrige fredag', 'Team goal: {n} percent, ahead of last Friday', { n: num(Math.min(100, t.salesPct)) })
          : L('Lagmål: {n} prosent, bak forrige fredag', 'Team goal: {n} percent, behind last Friday', { n: num(Math.min(100, t.salesPct)) })
      }
      art={
        <span className="st-meter-mini team">
          <i style={{ width: `${Math.min(100, t.salesPct)}%` }} />
          <em style={{ left: `${Math.min(100, g.frac * 100)}%` }} />
        </span>
      }
    >
      <span className="st-kicker">{L('Lagmål i kveld', "Tonight's team goal")}</span>
      <span className="st-big">
        <CountUp value={Math.min(100, Math.round(t.salesPct))} />
        <small>%</small>
      </span>
      <span className="st-sub">{g.ahead ? L('foran forrige fredag', 'ahead of last Friday') : L('bak forrige fredag', 'behind last Friday')}</span>
    </Tile>
  )
}

// ── Gjester: aktive bord, bord igjen, og bordene i seksjonen ──
function GuestsTile({ live }: { live: LiveState }) {
  const tables = tablesAt(live)
  const active = tables.filter((t) => t.status === 'active')
  const allergic = active.filter((t) => t.allergies.length)
  return (
    <Tile
      id="gjester"
      badge={
        allergic.length > 0 && (
          <span className="st-alert">
            <Icon name="alert" />
            {L('Allergi', 'Allergy')}
          </span>
        )
      }
      label={`${L('{active} aktive bord, {left} bord igjen i kveld', '{active} active {tables}, {left} {left_tables} left tonight', {
        active: active.length,
        tables: active.length === 1 ? 'table' : 'tables',
        left: live.tablesLeft,
        left_tables: live.tablesLeft === 1 ? 'table' : 'tables',
      })}${allergic.length ? L('. Allergi ved bord {list}', allergic.length > 1 ? '. Allergies at tables {list}' : '. Allergy at table {list}', { list: andList(allergic.map((t) => String(t.table))) }) : ''}`}
      art={
        <span className="st-floor">
          {floorAt(live).map((f) => (
            <i key={f.table} data-status={f.status} data-allergy={(f.status === 'active' || f.status === 'late') && f.party?.allergies.length ? true : undefined}>
              <b>{f.table}</b>
              {(f.status === 'active' || f.status === 'late') && f.party && <small>{f.party.guests}</small>}
            </i>
          ))}
        </span>
      }
    >
      <span className="st-big">
        <CountUp value={active.length} />
        <small>{active.length === 1 ? L('aktivt bord', 'active table') : L('aktive bord', 'active tables')}</small>
      </span>
      <span className="st-sub">
        <b>
          <CountUp value={live.tablesLeft} delay={120} />
        </b>
        {L('bord igjen', live.tablesLeft === 1 ? 'table left' : 'tables left')}
      </span>
    </Tile>
  )
}

export function ShiftOverview() {
  const { settings, demo, quiet, playing, finishShift } = useStore()
  const live = liveAt(demo.step)
  const atEnd = demo.step >= lastStepIndex
  // Én løkke om gangen: hjertet når klokka er på, ellers den levende prikken. Ingen i rolig modus.
  const loop = quiet ? 'none' : settings.watch ? 'heart' : 'live'
  return (
    <div className="st st-home" data-loop={loop}>
      {/* Ros fra en kollega: emoji-regn bak boksene */}
      <KudosRain received={live.kudos.length} />
      {atEnd ? (
        // Vakten er over: «Avslutt» tar klokkas plass i toppen – ingen ekstra rad som skyver boksene
        <header className="dA-head st-head">
          <span className="dA-live st-done">
            <i /> {L('Vakten er over', 'Shift is over')}
          </span>
          <button className="st-finish-pill" onClick={finishShift}>
            {L('Avslutt', 'Finish')} <Icon name="chevR" />
          </button>
        </header>
      ) : (
        <LiveHead time={live.time} />
      )}
      <div className="st-grid">
        <HealthTile live={live} watch={settings.watch} calm={quiet} playing={playing} />
        <SalesTile live={live} />
        <CompetitionTile live={live} game={demo.game} calm={quiet} />
        <GuestsTile live={live} />
      </div>
      <KudosRow />
    </div>
  )
}
