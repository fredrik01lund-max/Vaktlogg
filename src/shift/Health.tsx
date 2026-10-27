// Helse: puls, stress (anslått fra pulsen) og bevegelse gjennom vakten.
// Bare Emma ser dette. Ingenting her brukes i konkurranser eller vises for Kari.

import { tonight } from '../data/demoData.ts'
import { L } from '../i18n.ts'
import { hrSeries, hrZone, movementAt, stressAt } from '../lib/calc.ts'
import type { HrZone, LiveState } from '../lib/calc.ts'
import { km as fmtKm, num } from '../lib/format.ts'
import { useStore } from '../state.tsx'
import { CountUp, Icon } from '../ui.tsx'
import { config } from '../config.ts'
import { Card, Heart, Stat, Steps, useWalkedKm } from './parts.tsx'
import { stressName } from './topics.ts'

const zoneOrder: HrZone[] = ['rolig', 'aktiv', 'rush']
const hours = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} ${L('t', 'h')}${min % 60 ? ` ${min % 60} min` : ''}` : `${min} min`)
/** Klokkeslett for et punkt på vaktens tidslinje (fra start, i minutter). */
const startH = Number(tonight.start.slice(0, 2))
const axis = [0, 2, 4, 6].map((h) => ({ at: (h * 60) / 450, label: `${String(startH + h).padStart(2, '0')}:00` }))

/** Stresstripen: ett felt per kvarter for hele vakten. Kvarterene som ikke har kommet ennå, er tomme. */
function StressStrip({ cells }: { cells: { time: string; hr: number; zone: HrZone }[] }) {
  return (
    <div className="st-strip" role="img" aria-label={L('Stress per kvarter: {list}', 'Stress per quarter hour: {list}', { list: cells.map((c) => `${c.time} ${stressName[c.zone].toLowerCase()}`).join(', ') })}>
      <div className="st-strip-cells">
        {hrSeries.map((_, i) => {
          const c = cells[i]
          return <i key={i} data-zone={c?.zone ?? 'none'} style={{ '--i': i } as React.CSSProperties} />
        })}
      </div>
      <div className="st-axis" aria-hidden="true">
        {axis.map((a) => (
          <span key={a.label} style={{ left: `${a.at * 100}%` }}>
            {a.label}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Pulsen gjennom kvelden på faste akser, med sonene som bakgrunn. Kurven vokser mot høyre. */
function PulseChart({ idx, peak }: { idx: number; peak: { hr: number; time: string } }) {
  const W = 340
  const H = 150
  const lo = 70
  const hi = 160
  const n = hrSeries.length - 1
  const x = (i: number) => 4 + (i / n) * (W - 8)
  const y = (v: number) => 10 + ((hi - v) / (hi - lo)) * (H - 34)
  const pts = hrSeries.slice(0, idx + 1)
  const d = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const pi = pts.indexOf(peak.hr)
  const { aktiv, rush } = config.hrZones
  return (
    <svg className="chart st-pulse" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={L('Pulsen gjennom kvelden. Nå {now}, høyest {peak} klokken {time}.', 'Heart rate through the evening. Now {now}, highest {peak} at {time}.', { now: pts.at(-1) ?? '', peak: peak.hr, time: peak.time })}>
      <rect x={0} y={y(hi)} width={W} height={y(rush) - y(hi)} fill="#fdecf2" />
      <rect x={0} y={y(rush)} width={W} height={y(aktiv) - y(rush)} fill="#fff4e6" />
      <line x1={0} x2={W} y1={y(lo)} y2={y(lo)} stroke="var(--line)" />
      <text x={W - 4} y={y(rush) - 5} textAnchor="end" className="st-zone-lbl">
        {L('Høy', 'High')}
      </text>
      <text x={W - 4} y={y(aktiv) - 5} textAnchor="end" className="st-zone-lbl">
        {L('Middels', 'Medium')}
      </text>
      <path className="st-draw" pathLength={1} d={d} fill="none" stroke="#e57fa3" strokeWidth={2.75} strokeLinejoin="round" strokeLinecap="round" />
      {pi >= 0 && pi < pts.length - 1 && (
        <g>
          <circle cx={x(pi)} cy={y(peak.hr)} r={4} fill="#fff" stroke="#e57fa3" strokeWidth={2} />
          <text x={x(pi)} y={y(peak.hr) - 9} textAnchor="middle" className="st-peak-lbl">
            {peak.hr}
          </text>
        </g>
      )}
      <circle className="st-now" cx={x(pts.length - 1)} cy={y(pts.at(-1)!)} r={5} fill="#e57fa3" stroke="#fff" strokeWidth={2} />
      {axis.map((a) => (
        <text key={a.label} x={4 + a.at * (W - 8)} y={H - 6} className="st-axis-lbl">
          {a.label}
        </text>
      ))}
    </svg>
  )
}

/** Skritt per halvtime. Halvtimen med mest bevegelse er fremhevet. */
function MoveChart({ slots, current, peakFrom }: { slots: number[]; current: number; peakFrom: string | null }) {
  const W = 340
  const H = 120
  const base = 92
  const max = Math.max(1200, ...slots)
  const gap = 5
  const bw = (W - gap * (slots.length - 1)) / slots.length
  const peakIdx = peakFrom ? (Number(peakFrom.slice(0, 2)) * 60 + Number(peakFrom.slice(3)) - startH * 60) / 30 : -1
  return (
    <svg className="chart st-move" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={L('Skritt per halvtime: {list}', 'Steps per half hour: {list}', { list: slots.slice(0, current + 1).map((v) => num(v)).join(', ') })}>
      <line x1={0} x2={W} y1={base + 0.5} y2={base + 0.5} stroke="var(--line)" />
      {slots.map((v, i) => {
        const h = v ? Math.max(3, ((base - 8) * v) / max) : 0
        const xx = i * (bw + gap)
        if (i > current) return <rect key={i} x={xx} y={base - 3} width={bw} height={3} rx={1.5} fill="var(--line)" />
        return <rect key={i} className="st-grow" x={xx} y={base - h} width={bw} height={h} rx={4} fill={i === peakIdx ? '#f08fb0' : i === current ? '#f5abc5' : '#f9cadb'} style={{ '--i': i } as React.CSSProperties} />
      })}
      {[0, 4, 8, 12].map((i) => (
        <text key={i} x={i * (bw + gap)} y={H - 6} className="st-axis-lbl">
          {String(startH + i / 2).padStart(2, '0')}:00
        </text>
      ))}
    </svg>
  )
}

function WalkedKm({ km, calm }: { km: number; calm: boolean }) {
  return <>{fmtKm(useWalkedKm(km, calm))}</>
}

export function HealthDetail({ live }: { live: LiveState }) {
  const { settings, updateSettings, quiet, playing } = useStore()
  if (!settings.watch)
    return (
      <Card className="st-empty">
        <Icon name="watch" />
        <p>{L('Koble til klokka for å se puls, stress og hvor mye du har vært i bevegelse i kveld.', "Connect your watch to see your heart rate, stress and how much you've been on the move tonight.")}</p>
        <button className="watch-toggle st-watch" role="switch" aria-checked={false} aria-label={L('Klokke', 'Watch')} onClick={() => updateSettings({ watch: true })}>
          <Icon name="watch" /> {L('Koble til klokka', 'Connect watch')}
          <span className="switch" data-on={false} />
        </button>
      </Card>
    )
  const a = live.activity
  const stress = stressAt(live)
  const move = movementAt(live)
  const zone = hrZone(a.hr)
  return (
    <>
      <Card className="st-hero">
        <div className="st-hero-row">
          <Heart hr={a.hr} calm={quiet} size={40} />
          <div className="st-hero-num">
            <b>
              <CountUp value={a.hr} duration={600} />
            </b>
            <span>{L('puls nå', 'bpm right now')}</span>
          </div>
          <span className="st-level" data-zone={zone}>
            {stressName[zone]} stress
          </span>
        </div>
        <div className="st-stats">
          <Stat value={<Steps steps={a.steps} playing={playing} calm={quiet} />} label={L('skritt', 'steps')} />
          <Stat value={<WalkedKm km={a.km} calm={quiet} />} label={L('gått', 'walked')} />
          <Stat value={num(stress.peak.hr)} label={L('høyeste puls · {time}', 'peak bpm · {time}', { time: stress.peak.time })} />
        </div>
      </Card>

      <Card title={L('Stress gjennom kvelden', 'Stress through the evening')}>
        <StressStrip cells={stress.cells} />
        <ul className="st-legend">
          {zoneOrder.map((z) => (
            <li key={z} data-zone={z}>
              <i aria-hidden="true" />
              {stressName[z]}
              <b>{hours(stress.minutes[z])}</b>
            </li>
          ))}
        </ul>
      </Card>

      <Card title={L('Puls', 'Heart rate')}>
        <PulseChart idx={a.hrIdx} peak={stress.peak} />
      </Card>

      <Card title={L('Bevegelse', 'Movement')} right={<span className="st-note num">{L('{n} skritt', '{n} steps', { n: num(a.steps) })}</span>}>
        <MoveChart slots={move.slots} current={move.current} peakFrom={move.peak?.from ?? null} />
        {move.peak && (
          <p className="st-callout">
            <Icon name="run" />
            <span>
              {L('Mest i bevegelse', 'Most on the move')} <b>{move.peak.from}–{move.peak.to}</b> · {L('{n} skritt', '{n} steps', { n: num(move.peak.steps) })}
            </span>
          </p>
        )}
      </Card>
    </>
  )
}
