// Profilens nivå: alt Emma har gjort blir XP – salg, tips, medaljer (milepæler) og trofeer (personlige rekorder).
// Ett kort på Meg: nivået med XP-linje og fire tall. Trykk for å se hvor XP-en kommer fra og alle medaljene.

import { useEffect, useState } from 'react'
import { profileXp } from './data/demoData.ts'
import { L, td } from './i18n.ts'
import { levelFor, profileAt } from './lib/calc.ts'
import type { MedalState, ProfileState } from './lib/calc.ts'
import { dec1, num } from './lib/format.ts'
import { isEn } from './i18n.ts'
import { rememberValue, seenValue } from './lib/motion.ts'
import { useShifts } from './shifts.ts'
import { CountUp, Icon, Sheet } from './ui.tsx'
import './profile.css'

export function useProfile(): ProfileState {
  const { all } = useShifts()
  return profileAt(all)
}

/** Første besøk etter vakten: XP-linjen fylles fra der den var før kvelden. */
function usePrevXp(p: ProfileState) {
  const [prev] = useState(() => seenValue('profile-xp') ?? p.xp - p.tonightXp)
  useEffect(() => rememberValue('profile-xp', p.xp), [p.xp])
  return prev
}

/** Store beløp kort, så de alltid får plass i boksen: 4,1 mill / 403k. */
const short = (n: number) => (n >= 1_000_000 ? `${dec1(n / 1_000_000)} ${isEn() ? 'M' : 'mill'}` : n >= 10_000 ? `${num(Math.round(n / 1000))}k` : num(n))

function Stat({ icon, tone, value, label }: { icon: string; tone: string; value: string; label: string }) {
  return (
    <span className="lv-stat" data-tone={tone}>
      <span className="lv-stat-ic">
        <Icon name={icon} />
      </span>
      <b className="num">{value}</b>
      <small>{label}</small>
    </span>
  )
}

export function LevelCard() {
  const p = useProfile()
  const [sheet, setSheet] = useState(false)
  const prev = usePrevXp(p)
  const grew = prev < p.xp
  const leveledNow = grew && levelFor(prev).level < p.level
  const frac = (p.into / p.need) * 100
  const from = leveledNow ? 0 : grew ? (levelFor(prev).into / p.need) * 100 : frac
  return (
    <>
      <button
        className="lv-card"
        onClick={() => setSheet(true)}
        aria-label={L('LVL {n}. {into} av {need} XP til LVL {next}. {m} medaljer, {t} trofeer, {tips} kr i tips, {sales} kr solgt. Åpne detaljer', 'LVL {n}. {into} of {need} XP to LVL {next}. {m} medals, {t} trophies, {tips} kr in tips, {sales} kr sold. Open details', {
          n: p.level,
          tips: num(p.totals.tips),
          sales: num(p.totals.sales),
          into: num(p.into),
          need: num(p.need),
          next: p.level + 1,
          m: p.medalCount,
          t: p.trophies,
        })}
      >
        <span className="lv-top" aria-hidden="true">
          <span className={`lv-badge ${leveledNow ? 'up' : ''}`}>
            <small>LVL</small>
            <b className="num">{p.level}</b>
          </span>
          <span className="lv-main">
            {p.levelUp && <em className={`lv-new ${leveledNow ? 'pop' : ''}`}>{L('Ny LVL!', 'Level up!')}</em>}
            <span className="lv-bar">
              <i style={{ width: `${frac}%`, ['--from' as string]: `${from}%` }} className={grew ? 'grow' : ''} />
            </span>
            <span className="lv-sub">
              <b className="num">{grew && !leveledNow ? <CountUp from={levelFor(prev).into} value={p.into} delay={300} /> : num(p.into)}</b> / {num(p.need)} XP {L('til LVL {n}', 'to LVL {n}', { n: p.level + 1 })}
            </span>
          </span>
          <Icon name="chevR" className="lv-chev" />
        </span>
        <span className="lv-stats" aria-hidden="true">
          <Stat icon="medal" tone="orange" value={num(p.medalCount)} label={L('medaljer', 'medals')} />
          <Stat icon="trophy" tone="yellow" value={num(p.trophies)} label={L('trofeer', 'trophies')} />
          <Stat icon="coins" tone="green" value={short(p.totals.tips)} label={L('kr i tips', 'kr in tips')} />
          <Stat icon="receipt" tone="pink" value={short(p.totals.sales)} label={L('kr solgt', 'kr sold')} />
        </span>
        {p.tonightXp > 0 && (
          <span className="lv-tonight" aria-hidden="true">
            <Icon name="sparkle" /> {L('+{n} XP fra kvelden', '+{n} XP from tonight', { n: num(p.tonightXp) })}
          </span>
        )}
      </button>
      {sheet && <XpSheet p={p} onClose={() => setSheet(false)} />}
    </>
  )
}

const medalProgress = (m: MedalState) => (m.goal >= 1000 ? `${short(m.value)} / ${short(m.goal)}` : m.goal % 1 ? `${dec1(m.value)} / ${dec1(m.goal)}` : `${num(Math.round(m.value))} / ${num(m.goal)}`)

function XpSheet({ p, onClose }: { p: ProfileState; onClose: () => void }) {
  const rows = [
    { icon: 'receipt', tone: 'pink', label: L('Solgt', 'Sold'), what: `${num(p.totals.sales)} kr`, rule: L('1 XP per {n} kr', '1 XP per {n} kr', { n: profileXp.perSalesKr }), xp: p.parts.sales },
    { icon: 'coins', tone: 'green', label: L('Tips', 'Tips'), what: `${num(p.totals.tips)} kr`, rule: L('1 XP per {n} kr', '1 XP per {n} kr', { n: profileXp.perTipsKr }), xp: p.parts.tips },
    { icon: 'medal', tone: 'orange', label: L('Medaljer', 'Medals'), what: `${p.medalCount} × ${num(profileXp.perMedal)}`, rule: L('milepæler', 'milestones'), xp: p.parts.medals },
    { icon: 'trophy', tone: 'yellow', label: L('Trofeer', 'Trophies'), what: `${p.trophies} × ${num(profileXp.perTrophy)}`, rule: L('personlige rekorder', 'personal records'), xp: p.parts.trophies },
  ]
  return (
    <Sheet title={`LVL ${p.level}`} onClose={onClose}>
      <ul className="xp-rows">
        {rows.map((r) => (
          <li key={r.label} data-tone={r.tone}>
            <span className="lv-stat-ic">
              <Icon name={r.icon} />
            </span>
            <span className="grow">
              <b>{r.label}</b>
              <small>
                {r.what} · {r.rule}
              </small>
            </span>
            <span className="xp-val num">{num(r.xp)} XP</span>
          </li>
        ))}
        <li className="xp-total">
          <span className="grow">
            <b>{L('Totalt', 'Total')}</b>
          </span>
          <span className="xp-val num">{num(p.xp)} XP</span>
        </li>
      </ul>
      <h3 className="xp-h">
        {L('Medaljer', 'Medals')} <span className="num">{p.medalCount}/{p.medals.length}</span>
      </h3>
      <ul className="xp-medals">
        {p.medals.map((m) => (
          <li key={m.id} className={m.reached ? 'on' : ''} aria-label={`${td(m.title)}${m.reached ? '' : L(', ikke nådd ennå', ', not reached yet')}`}>
            <span className="xp-medal">
              <Icon name={m.icon} />
              {m.tonight && <em>{L('Ny!', 'New!')}</em>}
            </span>
            <small>{td(m.title)}</small>
            {!m.reached && <span className="xp-prog num">{medalProgress(m)}</span>}
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

/** Lite nivåmerke på profilbildet. */
export function LevelDot() {
  const p = useProfile()
  return (
    <span className="lv-dot num" aria-label={`LVL ${p.level}`}>
      {p.level}
    </span>
  )
}
