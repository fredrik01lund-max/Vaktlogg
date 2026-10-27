// Delekortet: plakaten Emma setter sammen selv. Bare det hun har valgt vises –
// aldri ros-meldinger, kollegenavn, tips eller puls (det filtreres i kortets Body).

import './SharePoster.css'
import { useState, type CSSProperties } from 'react'
import { config } from '../../config.ts'
import { L } from '../../i18n.ts'
import { Shape, cookiePath } from '../../shapes.tsx'
import { useMounted } from '../../lib/motion.ts'
import { SvgIcon } from './kit.tsx'
import { MonthCalendar, type MonthCalendarProps } from './MonthCalendar.tsx'

export interface SharePosterProps {
  name: string // 'Emmas september'
  persona?: { title: string; icon: string }
  /** Bare når «Vakter» er valgt – kalenderen viser hvilke dager hun jobbet. */
  calendar?: Pick<MonthCalendarProps, 'cells' | 'rows'>
  facts: { id: string; icon: string; value: string; label: string; wide?: boolean }[]
  footer: string // config.restaurant.name
}

type Fact = SharePosterProps['facts'][number]
const CHIP = cookiePath(22)
/** Verdier over 8 tegn får hele bredden. */
const isWide = (f: Fact) => !!f.wide || f.value.length > 8

/** Én flis. Fx-mønsteret: om den skal sprette inn, låses da den ble laget – bare nye fliser beveger seg. */
function Tile({ f, wide, added }: { f: Fact; wide: boolean; added: boolean }) {
  const [pop] = useState(added)
  return (
    <div className={['sp-tile', wide && 'sp-wide', pop && 'sp-new'].filter(Boolean).join(' ')}>
      <svg className="sp-chip" viewBox="0 0 22 22" aria-hidden="true">
        <path d={CHIP} fill="rgba(255,255,255,.18)" />
        <SvgIcon name={f.icon} x={11} y={11} size={13} />
      </svg>
      <span className="sp-val">{f.value}</span>
      <span className="sp-lbl">{f.label}</span>
    </div>
  )
}

export function SharePoster({ name, persona, calendar, facts, footer }: SharePosterProps) {
  const mounted = useMounted()
  // Flere rader med fliser → tettere fliser og lavere kalenderbånd, så plakaten holder seg innenfor halve skjermen.
  // En halv flis som blir alene på raden, får også hele bredden (ingen tomme hull på plakaten).
  const half = facts.filter((f) => !isWide(f))
  const lone = half.length % 2 ? half.at(-1) : undefined
  const rows = facts.length - half.length + Math.ceil(half.length / 2)
  const density = rows <= 2 ? 'roomy' : rows === 3 ? 'compact' : 'tight'
  return (
    <div className="sp" data-density={density} role="group" aria-label={L('Delekort: {name}', 'Share card: {name}', { name })}>
      <div className="sp-top">
        <span className="sp-brand">{config.appName}</span>
        {persona && (
          <div className="sp-badge w-pop" style={{ '--d': '300ms' } as CSSProperties}>
            <Shape kind="flower" size={64} grad={['#3a9d6c', '#8f82e6']} icon={persona.icon} />
          </div>
        )}
      </div>
      <div className="sp-name">{name}</div>
      {persona && <div className="sp-persona">{persona.title}</div>}
      {calendar && (
        <div className="sp-band">
          <MonthCalendar variant="mini" cells={calendar.cells} rows={calendar.rows} />
        </div>
      )}
      <div className="sp-tiles">
        {facts.length ? facts.map((f) => <Tile key={f.id} f={f} wide={isWide(f) || f === lone} added={mounted.current} />) : !persona && <div className="sp-tile sp-wide sp-empty">{L('Velg minst én ting', 'Choose at least one thing')}</div>}
      </div>
      <div className="sp-foot">{footer}</div>
    </div>
  )
}
