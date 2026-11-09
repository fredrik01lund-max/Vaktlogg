import { useEffect, useRef } from 'react'
import { monthStory } from '../lib/calc.ts'
import { MonthCalendar } from '../wrapped/art/MonthCalendar.tsx'
import { capitalize, dateLong, kr, monthName, num } from '../lib/format.ts'
import { navigate } from '../router.ts'
import { useShifts } from '../shifts.ts'
import { HistoryBars } from '../charts.tsx'
import { useFirstVisit } from '../lib/motion.ts'
import { useStore } from '../state.tsx'
import { Icon, TopBar } from '../ui.tsx'
import { recordDetails } from './Report.tsx'
import { EndReport } from '../report/EndReport.tsx'
import { returnFocus } from '../wrapped/Story.tsx'
import { L } from '../i18n.ts'

const STORY_MONTH = '2026-09'

export function History() {
  const growTonight = useFirstVisit('history-tonight', useStore().demo.phase === 'done')
  const { listed, recordsSet } = useShifts()
  const sept = monthStory(STORY_MONTH)!
  const banner = useRef<HTMLButtonElement>(null)
  // Lukket historien: fokus tilbake til inngangen den ble åpnet fra.
  useEffect(() => {
    if (returnFocus.month !== sept.month) return
    returnFocus.month = null
    banner.current?.focus({ preventScroll: true })
  }, [sept.month])
  const sorted = [...listed].sort((a, b) => b.date.localeCompare(a.date))
  const months = [...new Set(sorted.map((s) => s.date.slice(0, 7)))]

  return (
    <>
      <TopBar />
      <h1 className="h2">{L('Historikk', 'History')}</h1>
      <p className="lead mt8">{L('Alle vaktene dine, lagret.', 'All your shifts, saved.')}</p>

      <button ref={banner} className="card dark mt16" onClick={() => navigate(`/maned/${sept.month}`)} style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="row" style={{ position: 'relative' }}>
          <div className="grow">
            <div className="eyebrow">{L('Månedsoppsummering', 'Monthly recap')}</div>
            <div className="h2 mt8" style={{ fontStyle: 'italic' }}>
              {L('Din {month} er klar', 'Your {month} is ready', { month: monthName(`${sept.month}-01`) })}
            </div>
            <div className="muted small mt8 num">
              <span className="nowrap">{L('{n} vakter', '{n} shifts', { n: num(sept.count) })}</span> · <span className="nowrap">{kr(sept.sales)}</span> ·{' '}
              <span className="nowrap">{L('{n} kudos', '{n} kudos', { n: num(sept.kudosTotal) })}</span>
            </div>
          </div>
          {/* Smakebit: vaktdagene lyser i en liten kalender – uten tall */}
          <span className="month-teaser" aria-hidden="true">
            <MonthCalendar cells={sept.calendar.cells} rows={sept.calendar.rows} variant="mini" />
          </span>
          <Icon name="chevR" className="chev" />
        </div>
      </button>

      <div className="card mt12">
        <div className="row between">
          <h2 className="h3">{L('Salg per vakt', 'Sales per shift')}</h2>
          <span className="small muted">{L('Trykk på en stolpe', 'Tap a bar')}</span>
        </div>
        <div className="mt12">
          <HistoryBars shifts={[...listed].sort((a, b) => a.date.localeCompare(b.date))} onSelect={(id) => navigate(`/historikk/${id}`)} growTonight={growTonight} />
        </div>
        <div className="row gap8 mt8 wrap small muted">
          <span className="row gap8">
            <i style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--orange-strong)', display: 'inline-block' }} /> {L('fredag og lørdag', 'Friday and Saturday')}
          </span>
          <span className="row gap8">
            <i style={{ width: 10, height: 10, borderRadius: 3, background: '#fbd3aa', display: 'inline-block' }} /> {L('hverdag', 'weekday')}
          </span>
          <span className="row gap8 num">
            <i style={{ width: 14, borderTop: '2px dashed var(--sage)', display: 'inline-block' }} /> {L('snitt {v}', 'average {v}', { v: kr(listed.reduce((a, s) => a + s.sales, 0) / listed.length) })}
          </span>
        </div>
      </div>

      {months.map((m) => (
        <section key={m} className="section">
          <div className="section-head">
            <h2>{capitalize(monthName(`${m}-01`))}</h2>
          </div>
          <div className="list">
            {sorted
              .filter((s) => s.date.startsWith(m))
              .map((s) => {
                const recs = recordsSet.get(s.id) ?? []
                return (
                  <button key={s.id} className="list-item" onClick={() => navigate(`/historikk/${s.id}`)}>
                    <div className="grow">
                      <div className="title">
                        {capitalize(dateLong(s.date))}
                        {s.isTonight && <span className="chip gold" style={{ marginLeft: 8 }}>{L('Ny', 'New')}</span>}
                      </div>
                      <div className="meta num">
                        {L('{guests} gjester · {tips} i tips', '{guests} guests · {tips} in tips', { guests: num(s.guests), tips: num(s.tips) })}
                      </div>
                      {recs.length > 0 && (
                        <span className="chip gold mt8">
                          <Icon name="star" /> {recs.length} {recs.length === 1 ? L('ny rekord', 'new record') : L('nye rekorder', 'new records')}
                        </span>
                      )}
                    </div>
                    <div className="end">{kr(s.sales)}</div>
                    <Icon name="chevR" className="chev" />
                  </button>
                )
              })}
          </div>
        </section>
      ))}
    </>
  )
}

export function HistoryDetail({ id }: { id: string }) {
  const { all, recordsSet } = useShifts()
  const summary = all.find((s) => s.id === id)
  const back = (
    <button className="back" onClick={() => navigate('/historikk')}>
      <Icon name="chevL" /> {L('Historikk', 'History')}
    </button>
  )
  return summary ? (
    <EndReport summary={summary} records={recordDetails(summary, all, recordsSet.get(summary.id) ?? [])} isTonight={summary.isTonight} left={back} />
  ) : (
    <>
      {back}
      <p className="muted mt16">{L('Fant ikke denne vakten.', 'Couldn’t find this shift.')}</p>
    </>
  )
}
