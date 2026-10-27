// Gjester: øverst det som trenger oppmerksomhet nå, så bordkartet over seksjonen, og til slutt hvert bord.
// Trykk på et bord i kartet (eller en linje i «Viktig nå») for å gå til bordet i listen.

import { useState } from 'react'
import { L, td } from '../i18n.ts'
import { floorAt, tablesAt } from '../lib/calc.ts'
import type { Course, FloorTable, LiveState, TableInfo } from '../lib/calc.ts'
import { num, plural } from '../lib/format.ts'
import { Icon } from '../ui.tsx'
import { Card } from './parts.tsx'
import { FloorLegend, FloorPlan } from './FloorPlan.tsx'

const courseName = (c: Course) => ({ forrett: L('Forrett', 'Starter'), hovedrett: L('Hovedrett', 'Main'), dessert: L('Dessert', 'Dessert') })[c]
const guestsText = (n: number) => plural(n, L('gjest', 'guest'), L('gjester', 'guests'))
/** Allerginavnet i liten skrift («nøtter» / «nuts»). */
const allergyName = (what: string) => td(what).toLowerCase()
const rowId = (party: string) => `bord-${party}`

/** Gå til bordet i listen og blink det kort. */
function focusRow(party: string) {
  const el = document.getElementById(rowId(party))
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.classList.remove('flash')
  void el.offsetWidth
  el.classList.add('flash')
}

interface Item {
  tone: 'late' | 'allergy' | 'next' | 'note'
  icon: string
  text: string
  meta?: string
  party: string
}

/** Det viktigste akkurat nå, i prioritert rekkefølge: forsinket, allergier, neste booking, ønsker. */
function importantNow(tables: TableInfo[], floor: FloorTable[]): Item[] {
  const active = tables.filter((t) => t.status === 'active')
  const items: Item[] = []
  for (const t of active.filter((x) => x.late))
    items.push({ tone: 'late', icon: 'clock', text: L('Bord {n} venter på {what}', 'Table {n} is waiting for {what}', { n: t.table, what: td(t.late!.what) }), meta: `${num(t.late!.minutes)} min`, party: t.party })
  for (const t of active) for (const a of t.allergies) items.push({ tone: 'allergy', icon: 'alert', text: L('Bord {n}: {what}', 'Table {n}: {what}', { n: t.table, what: allergyName(a.what) }), meta: guestsText(a.guests), party: t.party })
  const next = tables.filter((t) => t.status === 'upcoming').sort((a, b) => a.time.localeCompare(b.time))[0]
  if (next) {
    const busy = floor.find((f) => f.table === next.table)?.status
    const extra = next.allergies.length ? ` · ${next.allergies.map((a) => allergyName(a.what)).join(', ')}` : ''
    items.push({
      tone: 'next',
      icon: 'calendar',
      text: L('Neste: bord {n} kl. {time}', 'Next: table {n} at {time}', { n: next.table, time: next.time }),
      meta: `${guestsText(next.guests)}${extra}${busy === 'active' || busy === 'late' ? L(' · bordet er opptatt', ' · table still occupied') : ''}`,
      party: next.party,
    })
  }
  for (const t of active) for (const w of t.wishes) items.push({ tone: 'note', icon: 'note', text: L('Bord {n}: {wish}', 'Table {n}: {wish}', { n: t.table, wish: td(w) }), party: t.party })
  return items
}

function Notes({ t }: { t: TableInfo }) {
  if (!t.late && !t.allergies.length && !t.wishes.length) return null
  return (
    <ul className="st-notes">
      {t.late && (
        <li className="late">
          <Icon name="clock" />
          <span>
            <b>{L('Venter på {what}', 'Waiting for {what}', { what: td(t.late.what) })}</b> · {num(t.late.minutes)} min
          </span>
        </li>
      )}
      {t.allergies.map((a) => (
        <li key={a.what} className="allergy">
          <Icon name="alert" />
          <span>
            <b>{L('Allergi: {what}', 'Allergy: {what}', { what: td(a.what) })}</b> · {guestsText(a.guests)}
          </span>
        </li>
      ))}
      {t.wishes.map((w) => (
        <li key={w}>
          <Icon name="note" />
          <span>{td(w)}</span>
        </li>
      ))}
    </ul>
  )
}

function ActiveTable({ t }: { t: TableInfo }) {
  return (
    <li className="st-table" id={rowId(t.party)} data-status={t.late ? 'late' : 'active'}>
      <div className="st-table-head">
        <span className="st-tno big" aria-label={L('Bord {n}', 'Table {n}', { n: t.table })}>
          {t.table}
        </span>
        <span className="grow">
          <b>{guestsText(t.guests)}</b>
          <small>{L('satt {time}', 'seated {time}', { time: t.time })}</small>
        </span>
        <span className="st-course" data-course={t.course ?? 'none'}>
          {t.course ? courseName(t.course) : L('Ikke bestilt', 'Not ordered')}
        </span>
      </div>
      <Notes t={t} />
    </li>
  )
}

export function GuestsDetail({ live }: { live: LiveState }) {
  const tables = tablesAt(live)
  const floor = floorAt(live)
  const [selected, setSelected] = useState<number | null>(null)
  const active = tables.filter((t) => t.status === 'active')
  const upcoming = tables.filter((t) => t.status === 'upcoming').sort((a, b) => a.time.localeCompare(b.time))
  const done = tables.filter((t) => t.status === 'done')
  const seated = active.reduce((a, t) => a + t.guests, 0)
  const items = importantNow(tables, floor)
  return (
    <>
      <Card title={L('Viktig nå', 'Important now')} className="st-important">
        {items.length ? (
          <ul className="st-imp">
            {items.slice(0, 4).map((it, i) => (
              <li key={i}>
                <button data-tone={it.tone} onClick={() => focusRow(it.party)}>
                  <Icon name={it.icon} />
                  <span className="grow">
                    <b>{it.text}</b>
                    {it.meta && <small>{it.meta}</small>}
                  </span>
                  <Icon name="chevR" className="st-imp-chev" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="st-muted">{L('Alt er i rute.', "Everything's on track.")}</p>
        )}
      </Card>

      <Card
        title={L('Bordkart', 'Floor plan')}
        right={
          <span className="st-note num">
            {L('{active} aktive · {seated} gjester · {left} igjen', '{active} active · {seated} {guests} · {left} left', {
              active: num(active.length),
              seated: num(seated),
              guests: seated === 1 ? 'guest' : 'guests',
              left: num(live.tablesLeft),
            })}
          </span>
        }
      >
        <FloorPlan
          floor={floor}
          selected={selected}
          onSelect={(f) => {
            setSelected(f.table)
            const party = f.party ?? f.next
            if (party) focusRow(party.party)
          }}
        />
        <FloorLegend />
      </Card>

      <Card title={L('Ved bordene nå', 'At the tables now')}>
        {active.length ? (
          <ul className="st-tables">
            {active.map((t) => (
              <ActiveTable key={t.party} t={t} />
            ))}
          </ul>
        ) : (
          <p className="st-muted">{L('Ingen bord akkurat nå.', 'No tables right now.')}</p>
        )}
      </Card>

      {upcoming.length > 0 && (
        <Card title={L('Bookinger senere i kveld', 'Bookings later tonight')}>
          <ul className="st-rows">
            {upcoming.map((t) => (
              <li key={t.party} id={rowId(t.party)} className="st-upcoming">
                <span className="st-tno">{t.table}</span>
                <span className="grow">
                  <b>{L('Bord {n} · kl. {time}', 'Table {n} · {time}', { n: t.table, time: t.time })}</b>
                  <small>{guestsText(t.guests)}</small>
                  <Notes t={t} />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {done.length > 0 && (
        <Card title={L('Ferdige bord', 'Finished tables')} right={<span className="st-note num">{num(done.length)}</span>}>
          <ul className="st-rows tight">
            {done.map((t) => (
              <li key={t.party} id={rowId(t.party)}>
                <span className="st-tno">{t.table}</span>
                <span className="grow">{guestsText(t.guests)}</span>
                <span className="st-muted small">
                  <Icon name="check" /> {L('betalt {time}', 'paid {time}', { time: t.paidAt ?? '' })}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}
