// Tre designretninger for vaktsiden under vakt. Samme data og handlinger,
// ulik oppbygning, typografi, former og gradientbruk.
// Vises med ?design=a | b | c (kun forhåndsvisning – standardutseendet er uendret).

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { BingoState, DuelState, TableDot, TeamState } from '../lib/calc.ts'
import { FlowRings, flowRing } from '../rings.tsx'
import type { LegendItem, RingSpec } from '../rings.tsx'
import { L } from '../i18n.ts'
import { num, pct as fmtPct } from '../lib/format.ts'
import { CountUp, Icon } from '../ui.tsx'
import { DUR, useMounted, withViewTransition } from '../lib/motion.ts'
import { Fx } from '../ui.tsx'
import { Vitals } from '../vitals.tsx'
import { Shape } from '../shapes.tsx'
import type { VitalsData } from '../vitals.tsx'

export interface LiveVM {
  time: string
  stepTitle: string
  stepIcon: string
  sales: number
  record: number
  recordFrac: number
  tips: number
  guests: number
  bottles: number
  bottleRecord: boolean
  bottleBest: number
  tables: TableDot[]
  tablesLeft: number
  walkIns: number
  calm: boolean
  team: TeamState | null
  teamFriday: number
  duel: DuelState | null
  share: number
  lead: number
  opponent: string
  campaignUnits: { units: number; target: number } | null
  kudos: number
  kudosFrom: string | null
  atEnd: boolean
  /** Samme ringer og forklaringer som originalen (ringsFor / legendFor). */
  rings: RingSpec[]
  legend: LegendItem[]
  /** Vaktlaget (ansikter i toppen). */
  team5?: string[]
  /** Endres når laget feirer – da hopper alle ansiktene samtidig. */
  hop?: string
  bingo?: BingoState
  onBingo?: () => void
  onMore: () => void
  onCalm: () => void
  onFinish: () => void
  /** Klokka: puls og skritt (null når klokka er av). */
  vitals?: VitalsData | null
  /** Demoen spilles av – skrittene tikker jevnt mellom hendelsene. */
  playing?: boolean
  /** Et ark dekker vaktsiden – løkker settes på pause. */
  paused?: boolean
}

export type DesignId = 'a' | 'b' | 'c' | 'd' | 'bokser'

/** Standard er fire bokser (Helse, Salg, Konkurranse, Gjester). Ringene: ?design=d (eller ?design=ringer). */
export function designParam(): DesignId | null {
  const d = new URLSearchParams(window.location.search).get('design')
  if (d === 'original') return null
  if (d === 'ringer') return 'd'
  return d === 'a' || d === 'b' || d === 'c' || d === 'd' ? d : 'bokser'
}

const pct = (f: number) => fmtPct(f * 100)
const overText = (f: number) => (f >= 1 ? `+${fmtPct(Math.max(0, Math.round((f - 1) * 100)))}` : pct(f))
const leaderLine = (vm: LiveVM) => {
  const d = vm.duel!
  if (d.leader === 'tie') return L('Helt likt', 'Neck and neck')
  if (d.leader === 'me') return L('Du leder med {n}', 'You lead by {n}', { n: num(vm.lead) })
  return L('{who} leder med {n}', '{who} leads by {n}', { who: vm.opponent, n: num(vm.lead) })
}

/** Fremdriftsring med gradient. Over 100 % legges en mørkere ny runde oppå. */
function GradRing({ frac, size, stroke, from, to, lap, track, glow, children, id }: { frac: number; size: number; stroke: number; from: string; to: string; lap: string; track: string; glow?: boolean; children?: ReactNode; id: string }) {
  const c = size / 2
  const r = c - stroke / 2 - (glow ? 6 : 0)
  const circ = 2 * Math.PI * r
  const first = Math.min(1, Math.max(0, frac))
  const extra = Math.min(1, Math.max(0, frac - 1))
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={from} />
            <stop offset="1" stopColor={to} />
          </linearGradient>
          {glow && (
            <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>
        <circle cx={c} cy={c} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={c} cy={c} r={r} fill="none" stroke={`url(#${id}-g)`} strokeWidth={stroke} strokeLinecap={first >= 1 ? 'butt' : 'round'} strokeDasharray={`${first * circ} ${circ}`} transform={`rotate(-90 ${c} ${c})`} filter={glow ? `url(#${id}-glow)` : undefined} style={{ transition: 'stroke-dasharray 900ms cubic-bezier(.2,.8,.2,1)' }} />
        {extra > 0 && <circle cx={c} cy={c} r={r} fill="none" stroke={lap} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${extra * circ} ${circ}`} transform={`rotate(-90 ${c} ${c})`} />}
      </svg>
      {children && <div className="gr-center">{children}</div>}
    </div>
  )
}

/** Bølget fremdrift (Material 3 Expressive): bølge = oppnådd, rett strek = gjenstår. */
function WavyBar({ frac, from, to, track, id, height = 22 }: { frac: number; from: string; to: string; track: string; id: string; height?: number }) {
  const W = 300
  const H = height
  const f = Math.max(0, Math.min(1, frac))
  const end = f * W
  const amp = H / 2 - 5
  let d = `M4,${H / 2}`
  for (let x = 4; x <= Math.max(4, end - 4); x += 2) d += ` L${x},${(H / 2 + amp * Math.sin(x / 7)).toFixed(2)}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <line x1={Math.min(W - 4, end + 8)} x2={W - 4} y1={H / 2} y2={H / 2} stroke={track} strokeWidth={6} strokeLinecap="round" />
      <path d={d} fill="none" stroke={`url(#${id})`} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'd 900ms' }} />
      <circle cx={W - 4} cy={H / 2} r={4} fill={track} />
    </svg>
  )
}

/** Dragkamp-stolpe for duellen. Motstanderens del har striper, så den ikke bare skilles på farge. */
export function TugBar({ share, me, them, height, stripes, initial, radius = 999, border }: { share: number; me: [string, string]; them: string; height: number; stripes?: boolean; initial: string; radius?: number; border?: string }) {
  const s = Math.max(0.06, Math.min(0.94, share))
  return (
    <div className="tug" style={{ height, borderRadius: radius, border, background: stripes ? `repeating-linear-gradient(135deg, ${them} 0 6px, color-mix(in srgb, ${them} 70%, #fff) 6px 12px)` : them }}>
      <div className="tug-me" style={{ width: `${s * 100}%`, background: `linear-gradient(90deg, ${me[0]}, ${me[1]})`, borderRadius: radius }} />
      <div className="tug-knot" style={{ left: `${s * 100}%`, width: height + 4, height: height + 4 }} />
      <span className="tug-init" style={{ right: 10, fontSize: Math.max(13, height * 0.5) }}>
        {initial}
      </span>
    </div>
  )
}

function Dots({ tables, cls }: { tables: TableDot[]; cls: string }) {
  const committed = useRef<Map<string, TableDot['status']> | null>(null)
  const sig = tables.map((t) => t.id + ':' + t.status).join('|')
  // Hvilke prikker endret seg i dette steget – regnet ut én gang per endring
  const anims = useMemo(() => {
    const before = committed.current
    const out = new Map<string, { cls: string; d: number }>()
    if (!before) return out
    let k = 0
    for (const t of tables) {
      const was = before.get(t.id)
      const cls = was === undefined ? 'fresh' : was === 'upcoming' && t.status !== 'upcoming' ? 'seated' : was !== 'done' && t.status === 'done' ? 'paid' : ''
      if (cls) out.set(t.id, { cls, d: k++ * 60 })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])
  useEffect(() => {
    committed.current = new Map(tables.map((t) => [t.id, t.status]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])
  return (
    <span className={`${cls} ready`} aria-hidden="true">
      {tables.map((t) => {
        const a = anims.get(t.id)
        return <i key={t.id} className={`${t.status} ${t.walkIn ? 'walkin' : ''} ${a?.cls ?? ''}`} style={a ? ({ '--d': a.d + 'ms' } as CSSProperties) : undefined} />
      })}
    </span>
  )
}

/** Klokka i toppen: bare sifrene som endrer seg, ruller på plass. */
export function Odo({ text }: { text: string }) {
  const mounted = useMounted()
  return (
    <span className="dA-clock odo">
      <span className="sr-only">{text}</span>
      {text.split('').map((ch, i) => (
        <Fx key={i + '-' + ch} cls="odo-d" on={mounted.current} aria-hidden>
          {ch}
        </Fx>
      ))}
    </span>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// A · FLYT – lys og uttrykksfull (Material 3 Expressive)
// Ringene er delt opp: én ring for rekorden, bølgestolpe for laget, dragkamp for duellen.
// ════════════════════════════════════════════════════════════════════════════

export function DesignA({ vm }: { vm: LiveVM }) {
  return (
    <div className="dA">
      <header className="dA-head">
        <span className="dA-live">
          <i /> {L('Vakt pågår', 'Shift in progress')}
        </span>
        <span className="dA-clock">{vm.time}</span>
      </header>
      <p className="dA-event">
        <Icon name={vm.stepIcon} /> {vm.stepTitle}
      </p>

      <section className="dA-hero" aria-label={L('Salg og rekord', 'Sales and record')}>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="dA-label">
            <Shape size={28} grad={['#16a37f', '#6c5ce7']} icon="star" kind="cookie" /> {L('Solgt i kveld', 'Sold tonight')}
          </div>
          <div className="dA-big">
            <CountUp value={vm.sales} />
            <small> kr</small>
          </div>
          <div className="dA-sub">{L('Rekorden din: {n} kr', 'Your record: {n} kr', { n: num(vm.record) })}</div>
        </div>
        <GradRing id="dA-rek" frac={vm.recordFrac} size={112} stroke={14} from="#12a37f" to="#6c5ce7" lap="#3b2fa8" track="#e6ece9">
          <b className="dA-ringval">{overText(vm.recordFrac)}</b>
          <span className="dA-ringlab">{vm.recordFrac >= 1 ? L('over rekord', 'over record') : L('av rekord', 'of record')}</span>
        </GradRing>
      </section>

      {vm.calm ? (
        <section className="dA-card dA-calm">
          <Icon name="moon" /> {L('Rolig modus: lagmål og duell er skjult. Tallene lagres.', 'Calm mode: team goal and duel are hidden. Your numbers are still saved.')}
        </section>
      ) : (
        <>
          {vm.team && (
            <section className="dA-card" aria-label={L('Laget: {pct} av målet', 'The team: {pct} of the goal', { pct: pct(vm.team.salesPct / 100) })}>
              <div className="dA-row">
                <Shape size={40} grad={['#8e7cf0', '#4f86e8']} icon="team" kind="flower" />
                <div className="grow">
                  <div className="dA-title">{L('Laget', 'The team')}</div>
                  <div className="dA-sub">{L('Slå forrige fredag · {n}k', 'Beat last Friday · {n}k', { n: num(vm.team.salesTarget / 1000) })}</div>
                </div>
                <b className="dA-num">{overText(vm.team.salesPct / 100)}</b>
              </div>
              <WavyBar id="dA-wave" frac={vm.team.salesPct / 100} from="#8e7cf0" to="#4f86e8" track="#e4e6ef" />
            </section>
          )}
          {vm.duel && (
            <section className="dA-card" aria-label={L('Duell: {text}', 'Duel: {text}', { text: leaderLine(vm) })}>
              <div className="dA-row">
                <Shape size={40} grad={['#dc6a2c', '#cf3f6c']} icon="duel" kind="cookie" />
                <div className="grow">
                  <div className="dA-title">{L('Du mot {name}', 'You vs {name}', { name: vm.opponent })}</div>
                  <div className="dA-sub">{L('Desserter · mot vanlig kveld', 'Desserts · vs a usual night')}</div>
                </div>
                <b className="dA-num dA-lead">{leaderLine(vm)}</b>
              </div>
              <TugBar share={vm.share} me={['#dc6a2c', '#cf3f6c']} them="#7c8794" height={22} stripes initial={vm.opponent[0]} />
              <div className="dA-tuglab">
                <span>
                  {L('Du', 'You')} {fmtPct(vm.duel.me.ofAvg)}
                </span>
                <span>
                  {vm.opponent} {fmtPct(vm.duel.opponent.ofAvg)}
                </span>
              </div>
            </section>
          )}
        </>
      )}

      <section className="dA-tiles">
        <div className="dA-tile">
          <Shape size={30} grad={['#0f8f70', '#1a8f86']} icon="coins" kind="circle" />
          <b>{num(vm.tips)}</b>
          <span>{L('kr tips', 'kr tips')}</span>
        </div>
        <div className="dA-tile">
          <Shape size={30} grad={['#6c5ce7', '#8e7cf0']} icon="guests" kind="pill" />
          <b>{vm.tablesLeft}</b>
          <span>{L('bord igjen', vm.tablesLeft === 1 ? 'table left' : 'tables left')}</span>
          <Dots tables={vm.tables} cls="dA-dots" />
        </div>
        <div className={`dA-tile ${vm.bottleRecord ? 'win' : ''}`}>
          <Shape size={30} grad={['#dc6a2c', '#cf3f6c']} icon="bottle" kind="flower" />
          <b>{vm.bottles}</b>
          <span>{vm.bottleRecord ? L('flasker 1500+ · rekord!', 'bottles 1500+ · record!') : L('flasker 1500+', 'bottles 1500+')}</span>
        </div>
      </section>

      <div className="dA-actions">
        {vm.atEnd ? (
          <button className="dA-btn" onClick={vm.onFinish}>
            <Icon name="receipt" /> {L('Avslutt og se oppgjøret', 'Finish and see your summary')}
          </button>
        ) : (
          <>
            <button className="dA-btn" onClick={vm.onMore}>
              {L('Mer om vakten', 'Shift details')} {vm.kudos > 0 && <span className="dA-badge">♥ {vm.kudos}</span>}
            </button>
            <button className="dA-btn tonal" role="switch" aria-checked={vm.calm} onClick={vm.onCalm} aria-label={L('Rolig modus', 'Calm mode')}>
              <Icon name="moon" /> {vm.calm ? L('På', 'On') : L('Rolig', 'Calm')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// B · PULS – mørk og sportslig
// Konsentriske ringer beholdes som dashbord-signatur, med lysende gradienter.
// ════════════════════════════════════════════════════════════════════════════

function DarkRings({ vm }: { vm: LiveVM }) {
  const size = 204
  const c = size / 2
  const stroke = 14
  const gap = 6
  const rings: { id: string; frac?: number; from: string; to: string; lap?: string; tug?: boolean }[] = [{ id: 'rek', frac: vm.recordFrac, from: '#18e0c0', to: '#2bb8f5', lap: '#0f8f86' }]
  if (!vm.calm && vm.team) rings.push({ id: 'lag', frac: vm.team.salesPct / 100, from: '#4d7cff', to: '#8a63ff', lap: '#3346b8' })
  // Duellen vises som eget «versus»-felt under, så midten får plass til hovedtallet.
  return (
    <div className="dB-rings" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          {rings.map((r) => (
            <linearGradient key={r.id} id={`dB-${r.id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={r.from} />
              <stop offset="1" stopColor={r.to} />
            </linearGradient>
          ))}
          <filter id="dB-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {rings.map((r, i) => {
          const rad = c - stroke / 2 - 4 - i * (stroke + gap)
          const circ = 2 * Math.PI * rad
          const rot = `rotate(-90 ${c} ${c})`
          if (r.tug) {
            const s = Math.max(0.06, Math.min(0.94, vm.share))
            const a = s * 2 * Math.PI - Math.PI / 2
            return (
              <g key={r.id}>
                <circle cx={c} cy={c} r={rad} fill="none" stroke="#6b7586" strokeWidth={stroke} strokeDasharray="5 3" />
                <circle cx={c} cy={c} r={rad} fill="none" stroke={`url(#dB-${r.id})`} strokeWidth={stroke} strokeDasharray={`${s * circ} ${circ}`} transform={rot} filter="url(#dB-glow)" style={{ transition: 'stroke-dasharray 900ms' }} />
                <circle cx={c + rad * Math.cos(a)} cy={c + rad * Math.sin(a)} r={stroke / 2 + 2} fill="#fff" />
              </g>
            )
          }
          const f = Math.min(1, r.frac!)
          const extra = Math.min(1, Math.max(0, r.frac! - 1))
          return (
            <g key={r.id}>
              <circle cx={c} cy={c} r={rad} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={stroke} />
              <circle cx={c} cy={c} r={rad} fill="none" stroke={`url(#dB-${r.id})`} strokeWidth={stroke} strokeLinecap={f >= 1 ? 'butt' : 'round'} strokeDasharray={`${f * circ} ${circ}`} transform={rot} filter="url(#dB-glow)" style={{ transition: 'stroke-dasharray 900ms' }} />
              {extra > 0 && <circle cx={c} cy={c} r={rad} fill="none" stroke={r.lap} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${extra * circ} ${circ}`} transform={rot} />}
            </g>
          )
        })}
      </svg>
      <div className="gr-center">
        <b className="dB-big">
          <CountUp value={vm.sales} />
        </b>
        <span className="dB-cap">{L('kr solgt', 'kr sold')}</span>
      </div>
    </div>
  )
}

export function DesignB({ vm }: { vm: LiveVM }) {
  const stats = [
    { id: 'rek', label: L('Rekord', 'Record'), value: overText(vm.recordFrac), sub: vm.recordFrac >= 1 ? L('over', 'over') : L('av {n}k', 'of {n}k', { n: num(vm.record / 1000) }), grad: 'linear-gradient(90deg,#18e0c0,#2bb8f5)', icon: 'star' },
    ...(!vm.calm && vm.team ? [{ id: 'lag', label: L('Laget', 'Team'), value: overText(vm.team.salesPct / 100), sub: L('av målet', 'of goal'), grad: 'linear-gradient(90deg,#4d7cff,#8a63ff)', icon: 'team' }] : []),
    ...(!vm.calm && vm.duel
      ? [
          {
            id: 'duel',
            label: L('Duell', 'Duel'),
            value: vm.duel.leader === 'me' ? `+${num(vm.lead)}` : vm.duel.leader === 'tie' ? '0' : `−${num(vm.lead)}`,
            sub: vm.duel.leader === 'me' ? L('du leder', 'you lead') : L('{who} leder', '{who} leads', { who: vm.opponent }),
            grad: 'linear-gradient(90deg,#ff5aa5,#c04bff)',
            icon: 'duel',
          },
        ]
      : []),
  ]
  return (
    <div className="dB">
      <header className="dB-head">
        <span className="dB-live">
          <i /> LIVE
        </span>
        <span className="dB-clock">{vm.time}</span>
      </header>

      <section className="dB-panel" aria-label={`${L('Salg {n} kr', 'Sales {n} kr', { n: num(vm.sales) })}. ${stats.map((s) => `${s.label} ${s.value}`).join('. ')}`}>
        <DarkRings vm={vm} />
        <div className="dB-stats" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0,1fr))` }}>
          {stats.map((s) => (
            <div key={s.id} className="dB-stat">
              <span className="dB-bar" style={{ background: s.grad }} />
              <span className="dB-lab">
                <Icon name={s.icon} /> {s.label}
              </span>
              <b>{s.value}</b>
              <span className="dB-sub">{s.sub}</span>
            </div>
          ))}
        </div>
      </section>

      {!vm.calm && vm.duel && (
        <section className="dB-vs" aria-label={L('Duell: {text}', 'Duel: {text}', { text: leaderLine(vm) })}>
          <div className="dB-side">
            <span>{L('DU', 'YOU')}</span>
            <b>{num(vm.duel.me.ofAvg)}%</b>
          </div>
          <div className="grow">
            <TugBar share={vm.share} me={['#ff5aa5', '#c04bff']} them="#6b7586" height={14} initial="" stripes />
            <div className="dB-vscap">{L('% av vanlig kveld · desserter', '% of a usual night · desserts')}</div>
          </div>
          <div className="dB-side right">
            <span>{vm.opponent.toUpperCase()}</span>
            <b>{num(vm.duel.opponent.ofAvg)}%</b>
          </div>
        </section>
      )}
      {vm.calm && (
        <section className="dB-vs">
          <Icon name="moon" /> <span className="grow">{L('Rolig modus: konkurranser skjult', 'Calm mode: competitions hidden')}</span>
        </section>
      )}

      <section className="dB-row3">
        <div className="dB-mini">
          <span className="dB-lab">{L('Tips', 'Tips')}</span>
          <b>
            {num(vm.tips)}
            <small>kr</small>
          </b>
        </div>
        <div className="dB-mini">
          <span className="dB-lab">{L('Bord igjen', 'Tables left')}</span>
          <b>{vm.tablesLeft}</b>
          <Dots tables={vm.tables} cls="dB-seg" />
        </div>
        <div className={`dB-mini ${vm.bottleRecord ? 'win' : ''}`}>
          <span className="dB-lab">{L('1500+ fl.', '1500+ btl.')}</span>
          <b>{vm.bottles}</b>
          {vm.bottleRecord && <span className="dB-pr">{L('REKORD', 'RECORD')}</span>}
        </div>
      </section>

      <p className="dB-event">
        <Icon name={vm.stepIcon} />
        <span className="grow">{vm.stepTitle}</span>
      </p>

      <div className="dB-actions">
        {vm.atEnd ? (
          <button className="dB-btn" onClick={vm.onFinish}>
            {L('Avslutt og se oppgjøret', 'Finish and see your summary')}
          </button>
        ) : (
          <>
            <button className="dB-btn" onClick={vm.onMore}>
              {L('Mer om vakten', 'Shift details')} {vm.kudos > 0 && `· ♥ ${vm.kudos}`}
            </button>
            <button className="dB-btn ghost" role="switch" aria-checked={vm.calm} onClick={vm.onCalm} aria-label={L('Rolig modus', 'Calm mode')}>
              <Icon name="moon" /> {vm.calm ? L('På', 'On') : L('Rolig', 'Calm')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// C · PLAKAT – varm og grafisk
// Halvsirkel-måler, tykke streker, tung serif og prestasjoner som klistremerker.
// ════════════════════════════════════════════════════════════════════════════

function Gauge({ frac }: { frac: number }) {
  const W = 132
  const H = 74
  const r = 56
  const cx = W / 2
  const cy = H - 6
  const f = Math.min(1, Math.max(0, frac))
  const arcLen = Math.PI * r
  const d = `M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}`
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <path d={d} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={16} strokeLinecap="round" />
      <path d={d} fill="none" stroke="#2b1611" strokeWidth={16} strokeLinecap="round" strokeDasharray={`${f * arcLen} ${arcLen}`} style={{ transition: 'stroke-dasharray 900ms' }} />
      {/* Over rekorden: ny runde i korall oppå, fra venstre */}
      {frac > 1 && <path d={d} fill="none" stroke="#e8483a" strokeWidth={8} strokeLinecap="round" strokeDasharray={`${Math.max(0.03, Math.min(1, frac - 1)) * arcLen} ${arcLen}`} />}
    </svg>
  )
}

function Burst({ children, grad, rotate }: { children: ReactNode; grad: string; rotate: number }) {
  // Merke/rosett med takket kant
  const n = 14
  const pts = Array.from({ length: n * 2 }, (_, i) => {
    const a = (i / (n * 2)) * Math.PI * 2
    const r = i % 2 ? 44 : 50
    return `${(50 + r * Math.cos(a)).toFixed(1)}% ${(50 + r * Math.sin(a)).toFixed(1)}%`
  }).join(',')
  return (
    <div className="dC-burst" style={{ transform: `rotate(${rotate}deg)` }}>
      <div className="dC-burst-bg" style={{ background: grad, clipPath: `polygon(${pts})` }} />
      <div className="dC-burst-in">{children}</div>
    </div>
  )
}

export function DesignC({ vm }: { vm: LiveVM }) {
  return (
    <div className="dC">
      <header className="dC-head">
        <span className="dC-tag">{L('● VAKT · {time}', '● SHIFT · {time}', { time: vm.time })}</span>
      </header>

      <section
        className="dC-poster"
        aria-label={
          vm.recordFrac >= 1
            ? L('Solgt {n} kr, {pct} over rekorden', 'Sold {n} kr, {pct} over your record', { n: num(vm.sales), pct: overText(vm.recordFrac) })
            : L('Solgt {n} kr, {pct} av rekorden', 'Sold {n} kr, {pct} of your record', { n: num(vm.sales), pct: overText(vm.recordFrac) })
        }
      >
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="dC-kicker">{L('Solgt i kveld', 'Sold tonight')}</div>
          <div className="dC-big">
            <CountUp value={vm.sales} />
          </div>
          <div className="dC-kicker">{L('kroner', 'kroner')}</div>
        </div>
        <div className="dC-gauge">
          <Gauge frac={vm.recordFrac} />
          <b>{overText(vm.recordFrac)}</b>
          <span>{vm.recordFrac >= 1 ? L('over rekord', 'over record') : L('av rekorden', 'of record')}</span>
        </div>
      </section>

      <section className="dC-stickers">
        {vm.bottleRecord ? (
          <Burst grad="linear-gradient(135deg,#ffe066,#ffb27a)" rotate={-6}>
            <small>{L('REKORD', 'RECORD')}</small>
            <b>{vm.bottles}</b>
            <small>
              {L('flasker', 'bottles')}
              <br />
              1500+
            </small>
          </Burst>
        ) : (
          <Burst grad="linear-gradient(135deg,#fff1c2,#ffd3b0)" rotate={-6}>
            <small>{L('FLASKER', 'BOTTLES')}</small>
            <b>{vm.bottles}</b>
            <small>{L('rekord {n}', 'record {n}', { n: vm.bottleBest })}</small>
          </Burst>
        )}
        <div className="dC-stamp">
          <span>{L('Tips', 'Tips')}</span>
          <b>{num(vm.tips)}</b>
          <span>kr</span>
        </div>
        <div className="dC-stamp">
          <span>{L('Bord igjen', 'Tables left')}</span>
          <b>{vm.tablesLeft}</b>
          <Dots tables={vm.tables} cls="dC-dots" />
        </div>
      </section>

      {vm.calm ? (
        <section className="dC-box" style={{ flexDirection: "row", alignItems: "center", fontWeight: 700 }}>
          <Icon name="moon" /> {L('Rolig modus: lagmål og duell er skjult.', 'Calm mode: team goal and duel are hidden.')}
        </section>
      ) : (
        <>
          {vm.team && (
            <section className="dC-box" aria-label={L('Laget {pct} av målet', 'The team: {pct} of the goal', { pct: overText(vm.team.salesPct / 100) })}>
              <div className="dC-line">
                <span className="dC-chip mint">
                  <Icon name="team" /> {L('LAGET', 'TEAM')}
                </span>
                <span className="grow dC-small">{L('mot forrige fredag', 'vs last Friday')}</span>
                <b className="dC-pct">{overText(vm.team.salesPct / 100)}</b>
              </div>
              <div className="dC-thermo">
                <span style={{ width: `${Math.min(100, vm.team.salesPct)}%` }} />
                <i style={{ left: `${(vm.teamFriday / vm.team.salesTarget) * 100}%` }} title={L('Forrige fredag', 'Last Friday')} />
              </div>
            </section>
          )}
          {vm.duel && (
            <section className="dC-box" aria-label={L('Duell: {text}', 'Duel: {text}', { text: leaderLine(vm) })}>
              <div className="dC-line">
                <span className="dC-chip coral">
                  <Icon name="duel" /> {L('DUELL', 'DUEL')}
                </span>
                <span className="grow dC-small">{leaderLine(vm)}</span>
              </div>
              <div className="dC-face">
                <div>
                  <b>{num(vm.duel.me.ofAvg)}</b>
                  <span>{L('% · DU', '% · YOU')}</span>
                </div>
                <span className="dC-vs">vs</span>
                <div className="right">
                  <b>{num(vm.duel.opponent.ofAvg)}</b>
                  <span>% · {vm.opponent.toUpperCase()}</span>
                </div>
              </div>
              <TugBar share={vm.share} me={['#e0682e', '#d43f68']} them="#5b6472" height={16} stripes initial="" radius={6} border="2px solid #2b1611" />
            </section>
          )}
        </>
      )}

      <div className="dC-actions">
        {vm.atEnd ? (
          <button className="dC-btn" onClick={vm.onFinish}>
            {L('Avslutt og se oppgjøret', 'Finish and see your summary')}
          </button>
        ) : (
          <>
            <button className="dC-btn" onClick={vm.onMore}>
              {L('Mer om vakten', 'Shift details')} {vm.kudos > 0 && `· ♥ ${vm.kudos}`}
            </button>
            <button className="dC-btn ghost" role="switch" aria-checked={vm.calm} onClick={vm.onCalm} aria-label={L('Rolig modus', 'Calm mode')}>
              <Icon name="moon" /> {vm.calm ? L('På', 'On') : L('Rolig', 'Calm')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// D · FLYT MED RINGER – A sitt uttrykk rundt de originale tre ringene
// Ringene (rekkefølge, beregning, markører) er uendret; bare tegningen er ny.
// ════════════════════════════════════════════════════════════════════════════

const legendGrad: Record<string, [string, string]> = {
  rekord: [flowRing.rekord.from, flowRing.rekord.to],
  lag: [flowRing.lag.from, flowRing.lag.to],
  duell: [flowRing.deg.to, flowRing.motstander.to],
  makker: [flowRing.deg.to, flowRing.makker.to],
}

/** Ringforklaring i Flyt-stil: ikon i ringens gradient, kort navn, verdi og forklaring. */
const fmtFor = (l: LegendItem) => (v: number) => (l.fmt === 'plus' ? `+${fmtPct(v)}` : l.fmt === 'of' ? `${num(v)}/${num(l.of ?? 0)}` : fmtPct(v))
const foran = (v: number) => L('{pct} foran', 'by {pct}', { pct: fmtPct(v) })
/** Når (andel av steget) en ease-out-telling passerer andelen f. */
const crossTime = (f: number) => 1 - Math.cbrt(1 - Math.max(0, Math.min(1, f)))

export function FlowLegend({ items, onClick, reveal }: { items: LegendItem[]; onClick?: () => void; reveal?: boolean }) {
  const mounted = useMounted()
  const m = mounted.current
  // Mål nådd i dette steget: vis den gamle prosenten som teller opp til 100 %, og bytt først når ringen og summen er der.
  const committed = useRef<Record<string, LegendItem>>({})
  const holds = useRef<Record<string, { from: string; until: number; t1: number; item: LegendItem }>>({})
  const [, tick] = useState(0)
  const now = performance.now()
  const shown = items.map((l) => {
    const before = committed.current[l.id]
    const sig = (before?.value ?? '') + '>' + l.value
    if (m && before && !before.done && l.done && before.num !== undefined && before.fmt === 'pct') {
      const target = l.fmt === 'plus' && l.num !== undefined ? 100 + l.num : 100
      const t1 = Math.max(200, Math.min(DUR.data, DUR.data * crossTime((100 - before.num) / Math.max(0.0001, target - before.num))))
      const cur = holds.current[l.id]
      if (!cur || cur.from !== sig) holds.current[l.id] = { from: sig, until: now + t1, t1, item: { ...before, num: 100 } }
    }
    const h = holds.current[l.id]
    return h && h.from === sig && now < h.until ? { item: h.item, held: h } : { item: l, held: undefined }
  })
  useEffect(() => {
    committed.current = Object.fromEntries(items.map((l) => [l.id, l]))
    const waits = Object.values(holds.current).map((h) => h.until - performance.now()).filter((ms) => ms > 0)
    if (!waits.length) return
    const t = window.setTimeout(() => tick((x) => x + 1), Math.max(...waits) + 16)
    return () => window.clearTimeout(t)
  })
  const inner = shown.map(({ item: l, held }, idx) => (
    <span key={l.id} className={`dD-li ${reveal ? 'li-reveal' : ''}`} style={{ '--i': idx } as CSSProperties}>
      <Fx key={String(!!l.done)} cls="fx-pop" on={!!l.done && m} className="dD-shape">
        <Shape size={30} grad={legendGrad[l.id] ?? legendGrad.rekord} icon={l.done ? 'check' : l.icon} kind="cookie" split={l.id === 'duell' || l.id === 'makker'} />
      </Fx>
      <span className="dD-lab rl-label">{l.label}</span>
      <b className="dD-val rl-value">
        {l.num !== undefined ? (
          <CountUp key={l.fmt} value={l.num} format={fmtFor(l)} duration={held ? held.t1 : undefined} />
        ) : (
          <Fx key={l.value} cls="fx-swap" on={m}>
            {l.value}
          </Fx>
        )}
      </b>
      {l.sub && (
        <span className="dD-sub">
          {l.subNum !== undefined ? (
            <CountUp key="foran" value={l.subNum} format={foran} />
          ) : (
            <Fx key={l.sub} cls="fx-swap" on={m}>
              {l.sub}
            </Fx>
          )}
        </span>
      )}
    </span>
  ))
  const style = { gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }
  return onClick ? (
    <button className="dD-legend" onClick={onClick} style={style} aria-label={L('Forklaring av ringene – åpne detaljer', 'What the rings mean – open details')}>
      {inner}
    </button>
  ) : (
    <div className="dD-legend" style={style}>
      {inner}
    </div>
  )
}

export { Shape }

/** Rolig-bryteren: samme ord i begge tilstander (på/av vises med farge og aria-checked). Månen snur seg bare ved bytte. */
function RoligSwitch({ calm, onCalm }: { calm: boolean; onCalm: () => void }) {
  const mounted = useMounted()
  return (
    <button className="dA-btn tonal" role="switch" aria-checked={calm} onClick={() => withViewTransition(onCalm)} aria-label={L('Rolig modus', 'Calm mode')}>
      <Fx key={String(calm)} cls="moon-turn" on={mounted.current} className="moon-wrap">
        <Icon name="moon" />
      </Fx>{' '}
      {L('Rolig', 'Calm')}
    </button>
  )
}

export function DesignD({ vm }: { vm: LiveVM }) {
  // Én løkke om gangen: hjertet når klokka er på, ellers den levende prikken. Ingen i rolig modus.
  const loop = vm.calm ? 'none' : vm.vitals ? 'heart' : 'live'
  return (
    <div className="dD" data-loop={loop} data-paused={vm.paused ? 'true' : undefined}>
      <header className="dA-head">
        <span className="dA-live">
          <i /> {L('Vakt pågår', 'Shift in progress')}
        </span>
        <Odo text={vm.time} />
      </header>

      <section className="dD-card" aria-label={L('Kveldens ringer', "Tonight's rings")}>
        <FlowRings
          rings={vm.rings}
          size={vm.calm ? 252 : 276}
          stroke={17}
          gap={7}
          quiet={vm.calm}
          label={`${L('Solgt {n} kr', 'Sold {n} kr', { n: num(vm.sales) })}. ${vm.legend.map((l) => `${l.label}: ${l.value}${l.sub ? ' ' + l.sub : ''}`).join('. ')}`}
        >
          <div className="dD-num">
            <CountUp value={vm.sales} />
          </div>
          <div className="dD-cap">{L('kr solgt', 'kr sold')}</div>
        </FlowRings>
        <FlowLegend items={vm.legend} onClick={vm.onMore} />
        {vm.calm && (
          <p className="dD-calm">
            <Icon name="moon" /> {L('Rolig modus: bare din egen ring vises.', 'Calm mode: only your own ring is shown.')}
          </p>
        )}
      </section>

      <section className={`dD-info three ${vm.vitals ? 'has-vitals' : ''}`} aria-label={L('Nøkkeltall', 'Key figures')}>
        {/* Årsak før virkning: bordprikken endrer seg først, tallene følger rett etter */}
        <div className="dD-i">
          <b>
            <CountUp value={vm.tips} delay={120} />
          </b>
          <span>{L('Tips', 'Tips')}</span>
        </div>
        <div className="dD-i">
          <b>
            <CountUp value={vm.guests} delay={120} />
          </b>
          <span>{L('Gjester', 'Guests')}</span>
        </div>
        <div className="dD-i">
          <b>
            <CountUp value={vm.tablesLeft} delay={120} />
          </b>
          <span>{L('Bord igjen', 'Tables left')}</span>
          <Dots tables={vm.tables.map((t) => ({ ...t, walkIn: false }))} cls="dD-dots" />
        </div>
        {vm.vitals && <Vitals v={vm.vitals} playing={!!vm.playing} calm={vm.calm} paused={!!vm.paused} onOpen={vm.onMore} />}
      </section>

      <div className="dA-actions">
        {vm.atEnd ? (
          <button className="dA-btn" onClick={vm.onFinish}>
            <Icon name="receipt" /> {L('Avslutt', 'Finish')}
          </button>
        ) : (
          <button className="dA-btn" onClick={vm.onMore}>
            {L('Mer om vakten', 'Shift details')}
          </button>
        )}
        <RoligSwitch calm={vm.calm} onCalm={vm.onCalm} />
      </div>
    </div>
  )
}
