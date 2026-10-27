// Kortene i månedshistorien. Hvert kort: én illustrasjon, ett stort tall/ord og én kort linje.
// Alle tall kommer fra monthStory() i calc.ts – her bare formateres de.
// Tekst: L('norsk', 'engelsk') for kortenes egen tekst, td() for navn og tekst fra dataene (retter, ros, typer).

import { useState } from 'react'
import type { ReactNode } from 'react'
import { colleagueName, config } from '../config.ts'
import { L, isEn, td } from '../i18n.ts'
import type { MonthStory } from '../lib/calc.ts'
import { capitalize, dateLong, dayLabel, dayMonth, dec1, hoursText, kr, monthName, num, numberWord, ordinalWord, plural, weekdayByCol, weekdayPluralDef } from '../lib/format.ts'
import { easeData } from '../lib/motion.ts'
import { useStore } from '../state.tsx'
import { Icon } from '../ui.tsx'
import { momentMeta } from '../game-ui.tsx'
import { Caption, Eyebrow, Hero, Stage } from './parts.tsx'
import type { Mode } from './parts.tsx'
import { MonthCalendar } from './art/MonthCalendar.tsx'
import { Storefronts } from './art/Storefronts.tsx'
import { MonthReceipt } from './art/MonthReceipt.tsx'
import { Cloches } from './art/Cloches.tsx'
import { DessertTray } from './art/DessertTray.tsx'
import { RecordStairs } from './art/RecordStairs.tsx'
import { Postcard } from './art/Postcard.tsx'
import { WalkPath } from './art/WalkPath.tsx'
import { KudosThread } from './art/KudosThread.tsx'
import { PersonaBadge } from './art/PersonaBadge.tsx'
import { SharePoster } from './art/SharePoster.tsx'

export interface BodyProps {
  s: MonthStory
  mode: Mode
  /** Kortet er vist før og brukeren har gått videre (gjettingen er avgjort). */
  seen: boolean
  watch: boolean
  active: boolean
  onReplay: () => void
  /** Brukeren gjør noe på kortet (løfter et lokk): pausen slippes, så det som skjer også vises. */
  onResume: () => void
  /** Lukk historien (fokus tilbake til inngangen på Historikk). */
  onClose: () => void
}

export interface SlideDef {
  id: string
  /** Kortets navn (funksjon, så det følger språket). */
  title: () => string
  tone: 'night' | 'lag' | 'deg' | 'smak' | 'dessert' | 'rekord' | 'rekord-r' | 'blend'
  ink: 'light' | 'dark'
  /** Varighet før neste kort (ms). Uten: kortet står til brukeren går videre. */
  dur?: number
  when?: (o: { s: MonthStory; watch: boolean }) => boolean
  aria: (s: MonthStory) => string
  Body: (p: BodyProps) => ReactNode
}

const mName = (s: MonthStory) => monthName(`${s.month}-01`)
const year = (s: MonthStory) => s.month.slice(0, 4)
const cssVars = (o: Record<string, string | number>) => o as React.CSSProperties
const andList = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${L('og', 'and')} ${xs.at(-1)}`)
const ganger = (n: number) => (n === 1 ? L('gang', 'time') : L('ganger', 'times'))
/** «3 ganger» / «3 times» */
const timesText = (n: number) => plural(n, ganger(1), ganger(2))
/** Dag i måneden i en opplest liste: «5.» / «5». */
const dayNo = (iso: string) => L('{d}.', '{d}', { d: Number(iso.slice(8)) })
/** De tre mest solgte hovedrettene i quizrekkefølge (alfabetisk på gjeldende språk), med oversatte navn. */
const quizItems = (s: MonthStory) => s.topMains.map((m) => ({ ...m, name: td(m.name) })).sort((a, b) => a.name.localeCompare(b.name, isEn() ? 'en' : 'nb'))
/** Trekkene rundt typemerket. Ukedag og rett settes sammen på engelsk; resten kommer fra ordlisten. */
const traitLabel = (s: MonthStory, t: MonthStory['persona']['traits'][number]) =>
  t.kind === 'dag'
    ? L(t.label, '{day} regular', { day: weekdayByCol(s.calendar.topWeekday.col) })
    : t.kind === 'rett' && s.topMains[0]
      ? L(t.label, '{dish} pro', { dish: td(s.topMains[0].name) })
      : td(t.label)
/** Rettene i gjettekortet som opplest liste (alfabetisk, svaret røpes ikke). */
const quizList = (s: MonthStory) => andList(quizItems(s).map((m) => m.name))

// ── 1. Åpning: kalenderen lyser opp ──
function Apning({ s, mode }: BodyProps) {
  const cal = s.calendar
  const top = cal.topWeekday
  const cells = cal.cells.map((c) => ({ day: c.day, col: c.col, row: c.row, worked: c.worked, hours: c.hours }))
  const worked = cal.cells.filter((c) => c.worked).map((c) => L('{d}.', '{d}', { d: c.day }))
  return (
    <>
      <div className="w-head">
        <Eyebrow>{L('Din {m}', 'Your {m}', { m: mName(s) })}</Eyebrow>
        <Hero value={s.count} unit={(n) => (n === 1 ? L('vakt', 'shift') : L('vakter', 'shifts'))} mode={mode} duration={900} delay={300} />
      </div>
      <Stage>
        <MonthCalendar
          cells={cells}
          rows={cal.rows}
          highlightCol={cal.allOfTopWeekday ? top.col : undefined}
          highlightLabel={cal.allOfTopWeekday ? `${top.worked}/${top.inMonth}` : undefined}
          goldDay={Number(s.bestShift.date.slice(8))}
          variant="story"
          label={L('Kalender for {m}: vakter {list} og {last}', 'Calendar for {m}: shifts on {list} and {last}', { m: mName(s), list: worked.slice(0, -1).join(', '), last: worked.at(-1) ?? '' })}
        />
      </Stage>
      <Caption d={1550}>
        {hoursText(s.hours)}
        {cal.allOfTopWeekday ? L(' · alle {n} {days}', ' · all {n} {days}', { n: numberWord(top.worked), days: weekdayPluralDef(top.col) }) : ''}
      </Caption>
    </>
  )
}

// ── 2. Gjestene: Fjordgata fylt opp ──
function Gjester({ s, mode }: BodyProps) {
  const dur = Math.max(600, s.houses.length * 340 - 280)
  const rest = s.guests % config.restaurant.seats
  // «fire ganger» / «four times» (engelsk: «once», «twice»)
  const fills = L('{n} {times}', s.fullHouses === 1 ? 'once' : s.fullHouses === 2 ? 'twice' : '{n} times', { n: numberWord(s.fullHouses), times: ganger(s.fullHouses) })
  return (
    <>
      <div className="w-head">
        <Eyebrow>{L('Gjestene dine', 'Your guests')}</Eyebrow>
        <Hero value={s.guests} unit={(n) => L('gjester', n === 1 ? 'guest' : 'guests')} mode={mode} duration={dur} delay={400} />
      </div>
      <Stage>
        <Storefronts
          houses={s.houses}
          seats={config.restaurant.seats}
          label={
            L('{g} gjester – nok til å fylle restauranten {x}', '{g} guests – enough to fill the restaurant {x}', { g: num(s.guests), x: fills }) +
            (rest ? L(', og {r} til', ', with {r} to spare', { r: num(rest) }) : '')
          }
        />
      </Stage>
      {s.fullHouses >= 1 && (
        <Caption d={1900}>{L('Nok til å fylle restauranten {x}', 'Enough to fill the restaurant {x}', { x: fills })}</Caption>
      )}
    </>
  )
}

// ── 3. Kassalappen ──
function Kassalapp({ s, mode }: BodyProps) {
  const records = s.receipt.filter((r) => r.record).map((r) => dayNo(r.date))
  return (
    <>
      <div className="w-head">
        <Eyebrow>{L('Kassalappen din', 'Your receipt')}</Eyebrow>
      </div>
      <Stage>
        <MonthReceipt
          title={config.restaurant.name}
          subtitle={`${td(config.persona.section)} · ${mName(s)} ${year(s)}`}
          rows={s.receipt.map((r) => ({ id: r.id, label: dayLabel(r.date), sales: r.sales, record: r.record }))}
          total={s.sales}
          tips={s.tips}
          mode={mode}
          label={
            L('Kassalapp for {m}: {n} vakter, totalt {total}, tips {tips}', 'Receipt for {m}: {n} shifts, total {total}, tips {tips}', { m: mName(s), n: num(s.count), total: kr(s.sales), tips: kr(s.tips) }) +
            (records.length ? L(', salgsrekord {days} {m}', ', sales record on {days} {m}', { days: andList(records), m: mName(s) }) : '')
          }
        />
      </Stage>
      <Caption d={1950}>{L('{avg} per vakt i snitt', '{avg} per shift on average', { avg: kr(s.avgPerShift) })}</Caption>
    </>
  )
}

// ── 4. Gjett månedens rett ──
// Lokkene løftes ved et trykk, eller av seg selv etter 4,5 s. Tidsuret er en usynlig CSS-animasjon,
// så det står stille på pause (knapp, hold inne, skjult fane) akkurat som resten av kortet.
// Ved redusert bevegelse: ingen tidsur – lokkene løftes når du trykker (eller når du går videre).
function Gjett({ s, mode, seen, onResume }: BodyProps) {
  const [revealed, setRevealed] = useState(false)
  const [guess, setGuess] = useState<string | null>(null)
  const items = quizItems(s)
  const winner = s.topMains[0]
  const winnerName = td(winner.name)
  const isRevealed = revealed || seen
  const reveal = (g: string | null) => {
    // Et trykk på et lokk mens historien står på pause: spill av, ellers løftes lokkene i et fryst bilde.
    if (g) onResume()
    setGuess(g)
    setRevealed(true)
  }
  const every = Math.round(s.mainsTotal / winner.qty)
  const guessed = items.find((d) => d.id === guess)
  const verdict = !guessed
    ? L('Månedens rett', 'Dish of the month')
    : guessed.id === winner.id
      ? L('Riktig! Månedens rett', 'Correct! Dish of the month')
      : L('Ikke {name} – men', 'Not {name} – it was', { name: guessed.name })
  const times = L('{n} ganger', winner.qty === 1 ? '{n} time' : '{n} times', { n: num(winner.qty) })
  return (
    <>
      <div className="w-head">
        {isRevealed ? (
          <>
            <Eyebrow key="e2">{verdict}</Eyebrow>
            {/* Navnet kommer når lokkene er løftet – svaret røpes ikke før bildet viser det */}
            <Hero key="h2" text={winnerName} variant="word" mode={mode} style={cssVars({ '--d': mode === 'play' ? '520ms' : '0ms' })} />
          </>
        ) : (
          <>
            <Eyebrow key="e1">{L('Gjett!', 'Guess!')}</Eyebrow>
            <Hero key="h1" text={L('Hva bar du ut mest?', 'What did you carry out most?')} variant="q" mode={mode} />
          </>
        )}
      </div>
      <Stage>
        {mode === 'play' && !isRevealed && <i className="w-timer" aria-hidden="true" style={cssVars({ '--t': '4500ms' })} onAnimationEnd={() => reveal(null)} />}
        <Cloches items={items} winnerId={winner.id} revealed={isRevealed} guessId={guess} onReveal={reveal} mode={mode} />
      </Stage>
      {isRevealed ? (
        <Caption d={mode === 'play' ? 1100 : 0}>
          {times}
          {every >= 2 && every <= 10 ? L(' · hver {nth} hovedrett', ' · every {nth} main course', { nth: ordinalWord(every) }) : ''}
        </Caption>
      ) : (
        <span />
      )}
      <p className="sr-only" aria-live="polite">
        {revealed ? `${guessed ? verdict : L('Månedens rett:', 'Dish of the month:')} ${winnerName}, ${times}` : ''}
      </p>
    </>
  )
}

// ── 5. Desserter ──
function Desserter({ s, mode }: BodyProps) {
  const items = s.desserts.items.map((d) => ({ ...d, name: td(d.name) }))
  return (
    <>
      <div className="w-head">
        <Eyebrow>{L('Til dessert', 'For dessert')}</Eyebrow>
        <Hero value={s.desserts.total} unit={(n) => (n === 1 ? L('dessert', 'dessert') : L('desserter', 'desserts'))} mode={mode} duration={1070} delay={200} />
      </div>
      <Stage>
        <DessertTray
          items={items}
          total={s.desserts.total}
          label={L('{n} desserter: {list}', '{n} desserts: {list}', { n: num(s.desserts.total), list: items.map((d) => `${d.name} ${num(d.qty)}`).join(', ') })}
        />
      </Stage>
      <span />
    </>
  )
}

// ── 6. Rekordtrappen ──
function Rekorder({ s, mode }: BodyProps) {
  const l = s.ladder!
  const steps = l.steps.slice(-3)
  const columns = [{ value: num(l.baseline.value), date: dayMonth(l.baseline.date), base: true }, ...steps.map((x) => ({ value: num(x.value), date: dayMonth(x.date) }))]
  const extras = s.recordBests.map((b) => ({
    icon: b.metric === 'desserts' ? 'dessert' : 'receipt',
    label: td(b.short),
    value: b.metric === 'avgCheck' ? kr(b.value) : num(b.value),
    date: dayMonth(b.date),
  }))
  const ladderVars = { times: timesText(l.steps.length), from: num(l.baseline.value), to: steps.map((x) => num(x.value)).join(', ') }
  return (
    <>
      <div className="w-head">
        <Eyebrow>{L('Du slo salgsrekorden din', 'You beat your sales record')}</Eyebrow>
        <Hero value={l.steps.length} unit={ganger} mode={mode} duration={1000} delay={650} />
      </div>
      <Stage>
        <RecordStairs
          columns={columns}
          extras={extras}
          label={L('Salgsrekorden slått {times}: fra {from} til {to} kr', 'Sales record beaten {times}: from {from} to {to} kr', ladderVars)}
        />
      </Stage>
      <span />
    </>
  )
}

// ── 7. Beste vakt: postkortet ──
function Beste({ s, watch }: BodyProps) {
  const b = s.bestShift
  const icon = (b.moments[0] && momentMeta[b.moments[0]]?.icon) || 'star'
  const note = td(b.activity.highlight)
  const guests = L('{n} gjester', '{n} guests', { n: num(b.guests) })
  const desserts = L('{n} desserter', b.desserts === 1 ? '{n} dessert' : '{n} desserts', { n: num(b.desserts) })
  const cardVars = { date: dateLong(b.date), sales: kr(b.sales), guests, desserts, avg: kr(b.avgCheck) }
  return (
    <>
      <div className="w-head">
        <Eyebrow>{L('Beste vakt', 'Best shift')}</Eyebrow>
      </div>
      <Stage>
        <Postcard
          dateText={capitalize(dateLong(b.date))}
          amount={num(b.sales)}
          icon={icon}
          quote={watch ? note : undefined}
          chips={[
            { icon: 'guests', text: guests },
            { icon: 'dessert', text: desserts },
            { icon: 'receipt', text: L('{kr} snitt', '{kr} per guest', { kr: kr(b.avgCheck) }) },
          ]}
          label={L('Beste vakt: {date}, {sales}, {guests}, {desserts}, {avg} i snitt', 'Best shift: {date}, {sales}, {guests}, {desserts}, {avg} per guest', cardVars) + (watch ? `. ${note}` : '')}
        />
      </Stage>
      <span />
    </>
  )
}

// ── 8. Du gikk ──
function Gikk({ s, mode }: BodyProps) {
  const w = s.walk
  const open = w.flags.filter((f) => !f.reached)
  const nearly = w.nearly ? L('nesten {n} maraton', w.nearly === 1 ? 'almost a marathon' : 'almost {n} marathons', { n: numberWord(w.nearly) }) : ''
  return (
    <>
      <div className="w-head">
        <Eyebrow>{L('Du gikk', 'You walked')}</Eyebrow>
        <Hero value={s.km} unit="km" mode={mode} duration={1800} delay={200} ease={easeData} />
      </div>
      <Stage>
        <WalkPath
          km={s.km}
          target={w.target}
          cumKm={w.cumKm}
          flags={w.flags.map((f) => ({ at: f.at, reached: f.reached, label: f.date ? dayMonth(f.date) : undefined, n: f.n }))}
          leftText={open.length ? L('{km} km igjen', '{km} km to go', { km: dec1(w.kmLeft) }) : undefined}
          mode={mode}
          label={L('{km} km gått i {m}', '{km} km walked in {m}', { km: num(s.km), m: mName(s) }) + (nearly ? `, ${nearly}` : '')}
        />
      </Stage>
      <Caption d={2100}>
        {L('{n} skritt', '{n} steps', { n: num(s.steps) })} · {nearly || L('{n} maraton', '{n} marathons', { n: dec1(s.marathons) })}
      </Caption>
    </>
  )
}

// ── 9. Ros fra kolleger ──
function Ros({ s, mode }: BodyProps) {
  const notes = s.kudosNotes.slice(-4).map((k) => ({
    from: k.from,
    name: colleagueName(k.from),
    category: td(k.category),
    icon: config.kudosIcon[k.category] ?? 'heart',
    message: k.message ? td(k.message) : k.message,
    dateText: dayMonth(k.date),
  }))
  return (
    <>
      <div className="w-head">
        <Eyebrow>{L('Kudos fra kolleger', 'Kudos from colleagues')}</Eyebrow>
        <Hero value={s.kudosTotal} unit={ganger} mode={mode} duration={Math.max(400, notes.length * 350)} delay={300} />
      </div>
      <Stage>
        <KudosThread notes={notes} more={Math.max(0, s.kudosNotes.length - notes.length)} />
      </Stage>
      <span />
    </>
  )
}

// ── 10. Din septembertype ──
function Type({ s }: BodyProps) {
  const p = s.persona
  const title = td(p.title)
  const colors: Record<string, string> = { dag: '#9c5c08', helg: '#9c5c08', ros: '#1f6e48', rett: '#8a1f44' }
  const traits = p.traits.map((t) => ({ icon: t.icon, label: traitLabel(s, t), color: colors[t.kind] }))
  return (
    <>
      <div className="w-head">
        <Eyebrow>{L('Din {m}type', 'Your {m} type', { m: mName(s) })}</Eyebrow>
        <Hero text={title} variant="word" mode="done" style={cssVars({ '--d': '500ms' })} />
      </div>
      <Stage>
        <PersonaBadge
          icon={p.icon}
          traits={traits}
          label={L('{M}type {title}: {traits}', 'Your {M} type, {title}: {traits}', { M: capitalize(mName(s)), title, traits: traits.map((t) => t.label).join(', ') })}
        />
      </Stage>
      <Caption d={1300}>
        {p.fromKudos ? L('Navnet kommer fra det kollegene takket deg mest for', 'Named for what your colleagues thanked you for most') : L('Navnet kommer fra kalenderen din', 'Inspired by your calendar')}
      </Caption>
    </>
  )
}

// ── 11. Del ──
interface Fact {
  id: string
  chip: string
  icon: string
  value: string
  label: string
  wide?: boolean
}
function Del({ s, watch, onReplay, onClose }: BodyProps) {
  const { pushToasts } = useStore()
  const p = s.persona
  const facts: Fact[] = [
    { id: 'type', chip: L('Type', 'Type'), icon: p.icon, value: td(p.title), label: L('type', 'type') },
    { id: 'vakter', chip: L('Vakter', 'Shifts'), icon: 'calendar', value: num(s.count), label: s.count === 1 ? L('vakt', 'shift') : L('vakter', 'shifts') },
    { id: 'gjester', chip: L('Gjester', 'Guests'), icon: 'guests', value: num(s.guests), label: L('gjester', s.guests === 1 ? 'guest' : 'guests') },
    ...(s.topMains[0] ? [{ id: 'rett', chip: L('Rett', 'Dish'), icon: 'plate', value: td(s.topMains[0].name), label: L('månedens rett', 'dish of the month'), wide: true }] : []),
    { id: 'ros', chip: L('Kudos', 'Kudos'), icon: 'heart', value: num(s.kudosTotal), label: 'kudos' },
    { id: 'beste', chip: L('Beste vakt', 'Best shift'), icon: 'star', value: dayMonth(s.bestShift.date), label: L('beste vakt', 'best shift') },
    { id: 'salg', chip: L('Salg', 'Sales'), icon: 'receipt', value: kr(s.sales), label: L('salg', 'sales'), wide: true },
    ...(watch ? [{ id: 'km', chip: L('Km', 'Km'), icon: 'steps', value: `${num(s.km)} km`, label: L('gått', 'walked') }] : []),
  ]
  const [on, setOn] = useState<Set<string>>(() => new Set(['type', 'vakter', 'ros', 'rett']))
  const max = 6
  const shown = facts.filter((f) => on.has(f.id) && f.id !== 'type')
  const full = on.size >= max
  return (
    <>
      <div className="w-head">
        <Eyebrow>{L('Del måneden din', 'Share your month')}</Eyebrow>
      </div>
      <Stage>
        <SharePoster
          name={L('{name}s {m}', "{name}'s {m}", { name: config.persona.firstName, m: mName(s) })}
          persona={on.has('type') ? { title: td(p.title), icon: p.icon } : undefined}
          calendar={on.has('vakter') ? { cells: s.calendar.cells.map((c) => ({ day: c.day, col: c.col, row: c.row, worked: c.worked, hours: c.hours })), rows: s.calendar.rows } : undefined}
          facts={shown.map((f) => ({ id: f.id, icon: f.icon, value: f.value, label: f.label, wide: f.wide }))}
          footer={config.restaurant.name}
        />
        <div className="w-chips" role="group" aria-label={L('Velg hva som vises', 'Choose what to show')} aria-describedby="w-chips-hint">
          {facts.map((f) => {
            const checked = on.has(f.id)
            const disabled = !checked && full
            return (
              <button
                key={f.id}
                className="w-chip"
                role="checkbox"
                aria-checked={checked}
                aria-disabled={disabled || undefined}
                onClick={() => {
                  if (disabled) return
                  setOn((cur) => {
                    const n = new Set(cur)
                    if (n.has(f.id)) n.delete(f.id)
                    else n.add(f.id)
                    return n
                  })
                }}
              >
                {checked && <Icon name="check" />}
                {f.chip}
              </button>
            )
          })}
        </div>
        <p className="w-hint" id="w-chips-hint" aria-live="polite">
          {full ? L('Seks valgt – fjern ett for å velge noe annet', 'Six selected – remove one to pick something else') : L('Velg opptil seks · {n} valgt', 'Choose up to six · {n} selected', { n: numberWord(on.size) })}
        </p>
        <div className="w-actions">
          <button
            className="btn w-btn-light"
            disabled={on.size === 0}
            onClick={() => {
              pushToasts([{ kind: 'info', title: L('Kortet er klart', 'The card is ready'), body: L('Delt med vaktlaget.', 'Shared with the team.') }])
              onClose()
            }}
          >
            <Icon name="share" /> {L('Del', 'Share')}
          </button>
          <button className="btn w-btn-ghost" onClick={onReplay}>
            <Icon name="repeat" /> {L('Se igjen', 'Replay')}
          </button>
        </div>
      </Stage>
      <span />
    </>
  )
}

// Titler og opplesning er funksjoner: de kalles under tegning, så de følger valgt språk.
export const slideDefs: SlideDef[] = [
  {
    id: 'apning',
    title: () => L('Måneden din', 'Your month'),
    tone: 'night',
    ink: 'dark',
    dur: 4500,
    aria: (s) => L('{n} vakter, {hours}', s.count === 1 ? '{n} shift, {hours}' : '{n} shifts, {hours}', { n: num(s.count), hours: hoursText(s.hours) }),
    Body: Apning,
  },
  { id: 'gjester', title: () => L('Gjestene dine', 'Your guests'), tone: 'lag', ink: 'light', dur: 4500, aria: (s) => L('{n} gjester', '{n} guests', { n: num(s.guests) }), Body: Gjester },
  { id: 'kassalapp', title: () => L('Kassalappen din', 'Your receipt'), tone: 'deg', ink: 'light', dur: 5000, aria: (s) => L('Totalt {kr}', 'Total {kr}', { kr: kr(s.sales) }), Body: Kassalapp },
  {
    id: 'gjett',
    title: () => L('Månedens rett', 'Dish of the month'),
    tone: 'smak',
    ink: 'light',
    dur: 8000,
    when: ({ s }) => s.topMains.length >= 3 && s.topMains[0].qty > s.topMains[1].qty,
    // Svaret leses ikke opp før lokkene er løftet
    aria: (s) => L('Gjett hva du bar ut mest: {list}', 'Guess what you carried out most: {list}', { list: quizList(s) }),
    Body: Gjett,
  },
  {
    id: 'desserter',
    title: () => L('Desserter', 'Desserts'),
    tone: 'dessert',
    ink: 'light',
    dur: 4500,
    when: ({ s }) => s.desserts.total > 0,
    aria: (s) => L('{n} desserter', s.desserts.total === 1 ? '{n} dessert' : '{n} desserts', { n: num(s.desserts.total) }),
    Body: Desserter,
  },
  {
    id: 'rekorder',
    title: () => L('Rekorder', 'Records'),
    tone: 'rekord',
    ink: 'light',
    dur: 5000,
    when: ({ s }) => s.ladder !== null,
    aria: (s) => L('Salgsrekorden slått {times}', 'Sales record beaten {times}', { times: timesText(s.ladder?.steps.length ?? 0) }),
    Body: Rekorder,
  },
  { id: 'beste', title: () => L('Beste vakt', 'Best shift'), tone: 'rekord-r', ink: 'light', dur: 6500, aria: (s) => L('Beste vakt {date}', 'Best shift: {date}', { date: dateLong(s.bestShift.date) }), Body: Beste },
  { id: 'gikk', title: () => L('Du gikk', 'You walked'), tone: 'deg', ink: 'light', dur: 5000, when: ({ watch }) => watch, aria: (s) => `${num(s.km)} km`, Body: Gikk },
  {
    id: 'ros',
    title: () => L('Kudos', 'Kudos'),
    tone: 'lag',
    ink: 'light',
    dur: 9000,
    when: ({ s }) => s.kudosTotal > 0,
    aria: (s) => L('Kudos {times}', 'Kudos from colleagues, {times}', { times: timesText(s.kudosTotal) }),
    Body: Ros,
  },
  { id: 'type', title: () => L('Din type', 'Your type'), tone: 'blend', ink: 'dark', dur: 4500, aria: (s) => L('Din type: {title}', 'Your type: {title}', { title: td(s.persona.title) }), Body: Type },
  { id: 'del', title: () => L('Del', 'Share'), tone: 'night', ink: 'dark', aria: () => L('Velg hva som deles', 'Choose what to share'), Body: Del },
]
