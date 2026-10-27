// Byggeklosser for kveldens spill, laget og premier.
// Alt skal forstås visuelt: ansikter, former og farger bærer betydningen, med ett ord der det trengs.

import { useEffect, useRef, useState } from 'react'
import { colleagueName, config } from './config.ts'
import { bingo, campaign, lastCampaign, tonight } from './data/demoData.ts'
import type { GameId, MomentId } from './data/demoData.ts'
import type { BingoState, CampaignState, Invites, PeriodState, ThanksCard } from './lib/calc.ts'
import { FlowRings } from './rings.tsx'
import { prizeById } from './lib/calc.ts'
import { CountUp, Icon, paths, useInView } from './ui.tsx'
import { rememberValue, seenValue } from './lib/motion.ts'
import { avatarPhoto } from './avatars.ts'
import { L, td } from './i18n.ts'
import './invite.css'
import './bingo.css'

// ── Ansikter ────────────────────────────────────────────────────────────────

export function nameOf(id: string): string {
  if (id === config.persona.id) return config.persona.firstName
  if (id === config.employer.id) return config.employer.name
  if (id === 'lag') return L('Laget', 'The team')
  if (id === 'kitchen') return L('Kjøkkenet', 'The kitchen')
  return colleagueName(id)
}

/** Rund avatar: profilbilde når personen har et, ellers initial på fast farge. */
export function Face({ id, size = 28, title }: { id: string; size?: number; title?: string }) {
  const special = id === 'kitchen' ? 'chefhat' : id === 'lag' ? 'team' : null
  const bg = special === 'chefhat' ? '#ffffff' : special === 'team' ? 'linear-gradient(140deg, #3a9d6c, #1f6e48)' : config.avatarColor[id] ?? '#5c6a64'
  return (
    <span className="face" role="img" style={{ width: size, height: size, background: bg, fontSize: Math.round(size * 0.46), color: special === 'chefhat' ? '#17231f' : special === 'team' ? '#1f6a48' : (config.avatarInk[id] ?? '#17231f'), border: special === 'chefhat' ? '1.5px solid #c4ccc7' : undefined }} title={title ?? nameOf(id)} aria-label={title ?? nameOf(id)}>
      {avatarPhoto[id] ? (
        <img className="face-photo" src={avatarPhoto[id]} alt="" width={size} height={size} draggable={false} />
      ) : special ? (
        <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {paths[special]}
        </svg>
      ) : (
        nameOf(id)[0]
      )}
    </span>
  )
}

/** Overlappende ansikter. hop endres når laget feirer, så alle hopper samtidig. */
export function FaceStack({ ids, size = 26, hop, label }: { ids: string[]; size?: number; hop?: string | number; label?: string }) {
  return (
    <span className="face-stack" role="img" aria-label={label ?? ids.map(nameOf).join(', ')}>
      {ids.map((id, i) => (
        <span key={id + '-' + hop} className={hop ? 'face-hop' : undefined} style={{ animationDelay: i * 60 + 'ms', marginLeft: i ? -size * 0.28 : 0, zIndex: ids.length - i }}>
          <Face id={id} size={size} />
        </span>
      ))}
    </span>
  )
}

// ── Vaktbingo ───────────────────────────────────────────────────────────────

// Ordene er gettere, så de leses på gjeldende språk hver gang de vises.
export const momentMeta: Record<MomentId, { icon: string; word: string }> = {
  bursdag: { icon: 'cake', get word() { return L('Bursdag', 'Birthday') } },
  allergi: { icon: 'leaf', get word() { return L('Allergi', 'Allergy') } },
  stamgjest: { icon: 'repeat', get word() { return L('Stamgjest', 'Regular') } },
  lop: { icon: 'run', get word() { return L('Løp', 'Dash') } },
  fri: { icon: 'sparkle', get word() { return L('Vi er på', 'We’re on') } },
  hjelp: { icon: 'helping', get word() { return L('Hjelp', 'Help') } },
  alkoholfri: { icon: 'leafglass', get word() { return L('Alkoholfri', 'Alcohol-free') } },
  fullthus: { icon: 'house', get word() { return L('Fullt hus', 'Full house') } },
  gjesteros: { icon: 'chatheart', get word() { return L('Gjesteros', 'Guest praise') } },
}

/** Lite 3×3-brett til nøkkeltallsraden. Fylte ruter i lagfarge – ingen kan telles per person. */
export function BingoMini({ state, size = 26 }: { state: BingoState; size?: number }) {
  const cell = size / 3
  const pos = (t: MomentId) => {
    const r = bingo.grid.findIndex((row) => row.includes(t))
    const c = bingo.grid[r].indexOf(t)
    return { x: c * cell + cell / 2, y: r * cell + cell / 2 }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="bingo-mini">
      {bingo.grid.flatMap((row, r) =>
        row.map((t, c) => <rect key={t} x={c * cell + 1} y={r * cell + 1} width={cell - 2} height={cell - 2} rx={2} fill={state.filled[t] ? '#2e8c5e' : '#dfe6e1'} />),
      )}
      {state.full ? (
        <g>
          <circle cx={size / 2} cy={size / 2} r={size * 0.3} fill="#fff" stroke="#1f6e48" strokeWidth={1.6} />
          <path d={`M${size * 0.36} ${size * 0.5} l${size * 0.1} ${size * 0.1} l${size * 0.18} -${size * 0.2}`} fill="none" stroke="#1f6e48" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ) : (
        state.lines.map((l, i) => {
          const a = pos(l[0])
          const b = pos(l[2])
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#23314f" strokeWidth={1.8} strokeLinecap="round" />
        })
      )}
    </svg>
  )
}

/**
 * Stort brett med ni øyeblikk, som 3D-knapper: det som mangler står opp, det som er huket av er trykket ned
 * (grønt, med en hake). Hver fylt rute viser hvem som fylte den – uten telling.
 */
export function BingoBoard({ state, compact }: { state: BingoState; compact?: boolean }) {
  const [fresh] = useState(() => new Set(Object.keys(state.filled).filter((t) => seenValue('bingo:' + t) === undefined)))
  useEffect(() => {
    for (const t of Object.keys(state.filled)) rememberValue('bingo:' + t, 1)
  })
  return (
    <div className={`bingo ${compact ? 'compact' : ''} ${state.full ? 'full' : ''}`} role="list" aria-label={L('Vaktbingo: {n} av 9 ruter', 'Shift bingo: {n} of 9 squares', { n: state.count })}>
      {bingo.grid.flatMap((row) =>
        row.map((t) => {
          const f = state.filled[t]
          return (
            <div key={t} className={`bingo-tile ${f ? 'on' : ''} ${f && fresh.has(t) ? 'new' : ''}`} role="listitem" aria-label={`${momentMeta[t].word}${f ? L(', fylt av {name}', ', filled by {name}', { name: nameOf(f.by) }) : L(', mangler', ', still missing')}`}>
              <Icon name={momentMeta[t].icon} />
              {!compact && <span className="bt-word">{momentMeta[t].word}</span>}
              {f && !compact && (
                <>
                  <span className="bt-face">
                    <Face id={f.by} size={18} />
                  </span>
                  <span className="bt-check" aria-hidden="true">
                    <Icon name="check" />
                  </span>
                </>
              )}
            </div>
          )
        }),
      )}
    </div>
  )
}

// ── Kveldens spill ──────────────────────────────────────────────────────────

// Pastell: to-delte flater for spill mellom to, mørk ikonfarge av samme tone.
export const gameMeta: Record<GameId, { word: string; icon: string; grad: string; ink: string }> = {
  duell: { get word() { return L('Duell', 'Duel') }, icon: 'duel', grad: 'linear-gradient(90deg, #f9cadb 50%, #cfdcf6 50%)', ink: '#4f2a4a' },
  makker: { get word() { return L('Makker', 'Buddy') }, icon: 'pair', grad: 'linear-gradient(90deg, #f9cadb 50%, #dcd4fc 50%)', ink: '#4a2b5c' },
  laget: { get word() { return L('Laget', 'The team') }, icon: 'team', grad: 'linear-gradient(140deg, #cdeedd, #8fd4b1)', ink: '#1f6a48' },
  rolig: { get word() { return L('Rolig', 'Calm') }, icon: 'moon', grad: 'linear-gradient(140deg, #e2e6f4, #bcc5e2)', ink: '#2f3d66' },
}

/** Fire like store kort. Rolig er like stort og like synlig som Duell. Den inviterte kollegaen står på kortet. */
export function GameCards({ value, onChange, invites, disabled }: { value: GameId; onChange: (g: GameId) => void; invites: Invites; disabled?: boolean }) {
  return (
    <div className="game-cards" role="radiogroup" aria-label={L('Kveldens spill', 'Tonight’s game')}>
      {(['duell', 'makker', 'laget', 'rolig'] as GameId[]).map((g) => {
        const m = gameMeta[g]
        const on = value === g
        const other = g === 'duell' ? invites.duell : g === 'makker' ? invites.makker : null
        return (
          <button key={g} className={`game-card ${on ? 'on' : ''}`} role="radio" aria-checked={on} disabled={disabled} onClick={() => onChange(g)}>
            <span className="gc-icon" style={{ background: m.grad, color: m.ink }}>
              <Icon name={m.icon} />
            </span>
            <span className="gc-word">{m.word}</span>
            {other && on && (
              <span className="gc-other" role="img" aria-label={L('{name} er med', '{name} is in', { name: nameOf(other) })}>
                <Face id={other} size={22} />
                <span className="gc-yes">
                  <Icon name="check" />
                </span>
              </span>
            )}
            {on && (
              <span className="gc-me">
                <Face id={config.persona.id} size={22} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Før vakten: hvem vil du invitere? Vises for Duell (én motstander) og Makker (én makker).
 * Laget og Rolig trenger ingen invitasjon – på Laget er hele vaktlaget med.
 * Kollegaen svarer ja etter et øyeblikk, så invitasjonen kjennes ekte.
 */
export function InviteRow({ game, invited, onInvite }: { game: GameId; invited: string; onInvite: (id: string) => void }) {
  const [pending, setPending] = useState(false)
  useEffect(() => {
    if (!pending) return
    const t = window.setTimeout(() => setPending(false), 900)
    return () => window.clearTimeout(t)
  }, [pending, invited])
  if (game !== 'duell' && game !== 'makker') return null
  const label = game === 'duell' ? L('Inviter til duell', 'Invite to the duel') : L('Velg makker', 'Pick your buddy')
  return (
    <div className="invite">
      <div className="inv-head">
        <span>{label}</span>
        <span className={`inv-status ${pending ? 'wait' : ''}`} aria-live="polite">
          {pending ? (
            L('Venter på svar …', 'Waiting for a reply …')
          ) : (
            <>
              <Icon name="check" /> {L('{name} sa ja', '{name} said yes', { name: nameOf(invited) })}
            </>
          )}
        </span>
      </div>
      <div className="inv-faces" role="radiogroup" aria-label={label}>
        {config.colleagues.map((c) => {
          const on = invited === c.id
          return (
            <button
              key={c.id}
              role="radio"
              aria-checked={on}
              className={`inv-face ${on ? 'on' : ''}`}
              onClick={() => {
                if (on) return
                onInvite(c.id)
                setPending(true)
              }}
            >
              <span className="inv-ava">
                <Face id={c.id} size={40} />
                {on && <span className={`inv-badge ${pending ? 'wait' : ''}`}>{pending ? <i /> : <Icon name="check" />}</span>}
              </span>
              <span className="inv-name">{c.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Ukens rett: stempelkort og like lodd ────────────────────────────────────

export function StampCard({ state, joined, onJoin, anonymous }: { state: CampaignState; joined: boolean; onJoin?: () => void; anonymous?: boolean }) {
  const stampsLabel = L('{n} av {total} stempler', '{n} of {total} stamps', { n: state.stamps, total: state.stampsTotal })
  if (anonymous) {
    // Arbeidsgiver ser bare at loddene er like – ikke hvem som er med.
    return (
      <div className="stamp-card">
        <div className="stamps" role="img" aria-label={stampsLabel}>
          {Array.from({ length: state.stampsTotal }, (_, i) => (
            <span key={i} className={`stamp ${i < state.stamps ? 'old' : ''}`}>
              <Icon name="plate" />
            </span>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="stamp-card">
      <div className="stamps" role="img" aria-label={stampsLabel}>
        {Array.from({ length: state.stampsTotal }, (_, i) => (
          <span key={i} className={`stamp ${i < state.stampsBefore ? 'old' : i < state.stamps ? 'new' : ''} ${i >= state.stamps && state.stampsTotal - state.stamps <= 3 ? 'close' : ''}`} style={{ animationDelay: (i - state.stampsBefore) * 90 + 'ms' }}>
            <Icon name="plate" />
          </span>
        ))}
      </div>
      <div className="tickets" role="img" aria-label={L('{n} like lodd', '{n} equal tickets', { n: campaign.participants.length + (joined ? 1 : 0) })}>
        {campaign.participants.map((id) => (
          <span key={id} className="ticket">
            <Icon name="ticket" />
            <Face id={id} size={20} />
          </span>
        ))}
        {joined ? (
          <span className="ticket me">
            <Icon name="ticket" />
            <Face id={config.persona.id} size={20} />
          </span>
        ) : (
          onJoin && (
            <button className="ticket join" onClick={onJoin} aria-label={L('Bli med i Ukens rett', 'Join Dish of the week')}>
              <Icon name="ticket" />
              <span className="plus">+</span>
            </button>
          )
        )}
      </div>
    </div>
  )
}

/** Forrige ukes trekning: like lodd, to snudd til gave. */
export function LastDraw() {
  return (
    <div className="tickets drawn" role="img" aria-label={L('Forrige uke: {names} vant', 'Last week: {names} won', { names: lastCampaign.drawn.map(nameOf).join(L(' og ', ' and ')) })}>
      {lastCampaign.participants.map((id) => {
        const won = lastCampaign.drawn.includes(id)
        return (
          <span key={id} className={`ticket ${won ? 'won' : ''}`}>
            <Icon name={won ? 'gift' : 'ticket'} />
            <Face id={id} size={20} />
          </span>
        )
      })}
    </div>
  )
}

// ── Premier over en periode ─────────────────────────────────────────────────

const dayNum = (iso: string) => Number(iso.slice(8, 10))

/**
 * Mål → periode → fremgang → premie, i én blokk.
 * Ringen viser hvor mange vakter som teller, gaven sitter på toppen og åpnes når målet er nådd.
 */
// Samme tre farger som i «Flere premier»-boksen på Goals: laget grønn, deg rosa, ukens rett oransje.
const periodRing = { lag: '#5fb68a', meg: '#e8829f', uke: '#f0a456' }

export function PeriodCard({ who, state, prizeId, rule, compact, period, big, ctx = '', tone = who }: { who: 'lag' | 'meg'; state: PeriodState; prizeId: string; rule: string; compact?: boolean; period?: string; big?: boolean; ctx?: string; tone?: 'lag' | 'meg' | 'uke' }) {
  const prize = prizeById(prizeId)
  // Animer bare det som har endret seg siden kortet sist ble vist (f.eks. +1 i kveld), og bare når det sees.
  const key = `${ctx}:${who}:${prizeId}:${period ?? ''}`
  const [prevCount] = useState(() => seenValue(key) ?? (state.tonightCounts ? state.count - 1 : state.count))
  const changed = prevCount !== state.count
  const [viewRef, inView] = useInView<HTMLDivElement>(0.5)
  useEffect(() => {
    if (inView) rememberValue(key, state.count)
  }, [inView, key, state.count])
  const ring = {
    id: big ? 'stor' : tone === 'meg' ? 'personlig' : tone,
    value: state.count / state.target,
    color: big ? '#ffffff' : periodRing[tone],
    icon: who === 'lag' ? 'team' : 'user',
    label: who === 'lag' ? L('Lagmål', 'Team goal') : L('Ditt mål', 'Your goal'),
    gift: { open: state.reached, prizeIcon: prize.icon, animateOpen: changed && prevCount < state.target && state.reached },
  }
  const size = compact ? 64 : 92
  return (
    <div ref={viewRef} data-tone={tone} className={`period-card ${who} ${compact ? 'compact' : ''} ${big ? 'big' : ''} ${changed ? 'changed' : ''} ${changed && inView ? 'go' : ''}`}>
      <div className="pc-top">
        <FlowRings rings={[ring]} size={size} stroke={compact ? 8 : 10} gap={4} reveal={changed ? prevCount / state.target : undefined} hold={changed && !inView} label={L('{n} av {target}', '{n} of {target}', { n: state.count, target: state.target })}>
          <b className="pc-count num">
            {changed ? <CountUp from={prevCount} value={inView ? state.count : prevCount} delay={700} duration={300} /> : state.count}
            <small>/{state.target}</small>
          </b>
        </FlowRings>
        <div className="grow">
          <div className="pc-eyebrow">
            {/* Engelsk: «Team · October» får plass på én linje ved siden av «+1 tonight». */}
            {who === 'lag' ? L('Laget', 'Team') : L('Deg', 'You')}
            {period ? ` · ${td(period)}` : ''}
          </div>
          <div className="pc-prize">{td(prize.title)}</div>
          <div className="pc-rule">
            {td(rule)}
            {!compact && <b className="pc-left"> · {state.reached ? L('nådd!', 'reached!') : L('{n} igjen', '{n} to go', { n: state.left })}</b>}
          </div>
        </div>
        {compact && state.tonightCounts && <span className="pc-plus">{L('+1 i kveld', '+1 tonight')}</span>}
      </div>
      {!compact && state.dots.length > 0 && (
        <div
          className="pc-dots"
          role="img"
          aria-label={L('{n} av {target} vakter så langt, {left} igjen', '{n} of {target} shifts so far, {left} to go', { n: state.count, target: state.target, left: state.left })}
        >
          {state.dots.map((d) => (
            <span key={d.date} className={`pc-dot ${d.state} ${changed && d.state === 'ja' && d.date === tonight.date ? 'new' : ''}`}>
              <i>{d.state === 'ja' && <Icon name="check" />}</i>
              <small>{dayNum(d.date)}</small>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Premier ─────────────────────────────────────────────────────────────────

/** Tegnet signatur (én strek), ikke en kursiv font. */
function Signature({ draw }: { draw?: boolean }) {
  return (
    <svg className="signature" viewBox="0 0 120 40" aria-label={L('Signert {name}', 'Signed {name}', { name: config.employer.name })}>
      <path className={draw ? 'sig-draw' : undefined} pathLength={1} d="M6 28c6-18 10-22 12-14s-2 16 4 8 8-16 10-6-4 12 2 6 6-10 10-4 2 8 8 2 6-6 10-2 4 6 10 0 10-8 16-4 8 6 14 2" fill="none" stroke="#23314f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Konvolutt fra Kari: trykk for å åpne. Kortet gjelder et konkret øyeblikk – aldri et salgstall. */
export function Envelope({ card, opened, onOpen }: { card: ThanksCard; opened: boolean; onOpen: () => void }) {
  const [anim, setAnim] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const gift = card.giftId ? prizeById(card.giftId) : null
  useEffect(() => {
    if (opened && anim) cardRef.current?.focus()
  }, [opened, anim])
  if (!opened) {
    return (
      <button
        className="envelope"
        onClick={() => {
          setAnim(true)
          window.setTimeout(onOpen, 380)
        }}
        aria-label={L('Takkekort fra {name}. Trykk for å åpne.', 'Thank-you card from {name}. Tap to open.', { name: config.employer.name })}
      >
        <span className={`env-body ${anim ? 'opening' : ''}`}>
          <span className="env-flap" />
          <span className="env-seal">
            <Icon name="heart" />
          </span>
        </span>
        <span className="env-from">
          <Face id={config.employer.id} size={24} /> {config.employer.name}
        </span>
      </button>
    )
  }
  return (
    <div className="thanks-card" role="group" tabIndex={-1} ref={cardRef} aria-label={L('Takkekort fra {name}', 'Thank-you card from {name}', { name: config.employer.name })}>
      <div className="tc-art" aria-hidden="true">
        <span className="tc-cake">
          <Icon name={card.moment ? momentMeta[card.moment.tag].icon : 'heart'} />
        </span>
        {card.moment && <span className="tc-table">{card.moment.table}</span>}
      </div>
      <p className="tc-msg">{L('«{m}»', '“{m}”', { m: td(card.message) })}</p>
      <div className="tc-sign">
        <Signature draw={anim} />
        <Face id={config.employer.id} size={26} />
      </div>
      {gift && (
        <div className="tc-gift">
          <span className="tcg-icon">
            <Icon name={gift.icon} />
          </span>
          <span>
            <b>+ {td(gift.title)}</b>
          </span>
        </div>
      )}
    </div>
  )
}

/** Medaljer etter duellen: begge får «var med», vinneren får laurbær rundt sin. */
export function DuelMedals({ winner, ids }: { winner: string | null; ids: string[] }) {
  return (
    <div className="medals">
      {ids.map((id) => (
        <span key={id} className={`medal ${winner === id ? 'gold' : ''}`} role="img" aria-label={`${nameOf(id)}: ${winner === id ? L('vant duellen', 'won the duel') : L('var med', 'took part')}`}>
          <span className="medal-disc">
            <Face id={id} size={30} />
          </span>
          {winner === id && <span className="laurel" aria-hidden="true" />}
        </span>
      ))}
    </div>
  )
}

/** Løpet: laget (heltrukket) mot forrige fredags lag (stiplet) gjennom kvelden. */
export function RaceChart({ points, target }: { points: { t: number; team: number; ghost: number }[]; target: number }) {
  const W = 320
  const H = 96
  const t0 = points[0]?.t ?? 0
  const t1 = points[points.length - 1]?.t ?? 1
  const x = (t: number) => 6 + ((t - t0) / (t1 - t0 || 1)) * (W - 12)
  const y = (v: number) => H - 8 - (v / target) * (H - 20)
  const line = (k: 'team' | 'ghost') => points.map((p, i) => (i ? 'L' : 'M') + x(p.t).toFixed(1) + ',' + y(p[k]).toFixed(1)).join(' ')
  const cross = points.find((p, i) => i > 0 && points[i - 1].team <= points[i - 1].ghost && p.team > p.ghost)
  return (
    <svg className="chart race" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={L('Laget mot forrige fredags lag gjennom kvelden', 'The team vs. last Friday’s team through the evening')}>
      <line x1={6} x2={W - 6} y1={y(target)} y2={y(target)} stroke="#c4ccc7" strokeDasharray="2 3" />
      <path d={line('ghost')} fill="none" stroke="#3a9d6c" strokeWidth={2.5} strokeDasharray="5 4" strokeLinecap="round" />
      <path className="draw" pathLength={1} d={line('team')} fill="none" stroke="#1f6e48" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {cross && <circle className="race-cross" cx={x(cross.t)} cy={y(cross.team)} r={5} fill="#fff" stroke="#1f6e48" strokeWidth={2.5} style={{ transformOrigin: `${x(cross.t)}px ${y(cross.team)}px` }} />}
    </svg>
  )
}

