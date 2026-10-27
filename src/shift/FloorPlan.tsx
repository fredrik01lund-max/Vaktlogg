// Bordkartet: hele lokalet, med Emmas seksjon fremhevet ved vinduene. Bare hennes bord har farge:
// grønn = aktiv, rød = forsinket, gul = betalt, grå = ledig (klokke = booking senere i kveld).
// Formen viser antall plasser: kvadrat = 4, langbord = 6. Trykk på et bord for å gå til det i listen.

import { L, td } from '../i18n.ts'
import type { FloorStatus, FloorTable } from '../lib/calc.ts'
import { paths } from '../ui.tsx'

/** Plassering i rommet (360 × 330). Seksjonen ligger langs vinduene til høyre, bordene nær hverandre. */
const spots: Record<number, { x: number; y: number }> = {
  15: { x: 232, y: 110 },
  14: { x: 314, y: 110 },
  12: { x: 232, y: 180 },
  11: { x: 314, y: 180 },
  16: { x: 232, y: 250 },
  13: { x: 314, y: 250 },
  17: { x: 273, y: 310 },
}
/** Andre seksjoner – bare for å vise hvor i lokalet bordene står. */
const others = [
  { no: 1, x: 36, y: 96 },
  { no: 2, x: 36, y: 150 },
  { no: 3, x: 36, y: 204 },
  { no: 4, x: 92, y: 96 },
  { no: 5, x: 92, y: 150 },
  { no: 6, x: 92, y: 204 },
  { no: 21, x: 150, y: 96 },
  { no: 22, x: 150, y: 150 },
  { no: 23, x: 150, y: 204 },
]

const size = (seats: number) => (seats > 4 ? { w: 74, h: 42 } : { w: 46, h: 46 })

function Chairs({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const per = w > 50 ? [-w / 4, w / 4] : [0]
  return (
    <g className="fp-chairs">
      {per.map((dx) => (
        <g key={dx}>
          <rect x={x + dx - 8} y={y - h / 2 - 9} width={16} height={6} rx={3} />
          <rect x={x + dx - 8} y={y + h / 2 + 3} width={16} height={6} rx={3} />
        </g>
      ))}
      {w <= 50 && (
        <>
          <rect x={x - w / 2 - 9} y={y - 8} width={6} height={16} rx={3} />
          <rect x={x + w / 2 + 3} y={y - 8} width={6} height={16} rx={3} />
        </>
      )}
    </g>
  )
}

function Badge({ x, y, icon, tone }: { x: number; y: number; icon: string; tone: 'allergy' | 'next' }) {
  return (
    <g className={`fp-badge ${tone}`}>
      <circle cx={x} cy={y} r={9.5} />
      <svg x={x - 6} y={y - 6} width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
        {paths[icon]}
      </svg>
    </g>
  )
}

const statusText = (s: FloorStatus) => ({ active: L('aktiv', 'active'), late: L('forsinket', 'delayed'), paid: L('betalt', 'paid'), free: L('ledig', 'free') })[s]

export function FloorPlan({ floor, selected, onSelect }: { floor: FloorTable[]; selected: number | null; onSelect: (t: FloorTable) => void }) {
  return (
    <svg className="fp" viewBox="0 0 360 350" role="group" aria-label={L('Bordkart', 'Floor plan')}>
      {/* Rommet */}
      <rect className="fp-room" x={4} y={4} width={352} height={342} rx={18} />
      <rect className="fp-kitchen" x={4} y={4} width={170} height={44} rx={14} />
      <text className="fp-area" x={89} y={31}>
        {L('Kjøkken', 'Kitchen')}
      </text>
      <rect className="fp-bar" x={20} y={262} width={120} height={30} rx={10} />
      <text className="fp-area" x={80} y={281}>
        {L('Bar', 'Bar')}
      </text>
      <path className="fp-door" d="M106 346v-6h44v6" />
      <text className="fp-area small" x={128} y={332}>
        {L('Inngang', 'Entrance')}
      </text>
      {/* Vinduene langs høyre vegg */}
      {[76, 146, 216, 286].map((y) => (
        <line key={y} className="fp-window" x1={356} x2={356} y1={y} y2={y + 46} />
      ))}
      {/* Andre seksjoner */}
      {others.map((o) => (
        <g key={o.no} className="fp-other">
          <rect x={o.x - 16} y={o.y - 16} width={32} height={32} rx={8} />
          <text x={o.x} y={o.y + 4}>
            {o.no}
          </text>
        </g>
      ))}
      {/* Din seksjon */}
      <rect className="fp-section" x={186} y={56} width={164} height={284} rx={16} />
      <text className="fp-section-label" x={198} y={74}>
        {L('Din seksjon', 'Your section')}
      </text>
      {floor.map((f) => {
        const p = spots[f.table]
        if (!p) return null
        const { w, h } = size(f.seats)
        const party = f.party
        const line2 = f.status === 'late' ? `${party!.late!.minutes} min` : f.status === 'paid' ? L('betalt', 'paid') : party ? L('{n} pers', '{n} ppl', { n: party.guests }) : f.next ? f.next.time : ''
        const allergy = (f.status === 'active' || f.status === 'late') && !!party?.allergies.length
        const label = [
          L('Bord {n}, {status}', 'Table {n}, {status}', { n: f.table, status: statusText(f.status) }),
          party && f.status !== 'paid' ? L(', {n} gjester', party.guests === 1 ? ', {n} guest' : ', {n} guests', { n: party.guests }) : '',
          allergy ? L(', allergi', ', allergy') : '',
          f.status === 'late' ? L(', venter på {what}', ', waiting for {what}', { what: td(party!.late!.what) }) : '',
          f.next && f.status !== 'active' && f.status !== 'late' ? L(', booking {time}', ', booking at {time}', { time: f.next.time }) : '',
        ].join('')
        return (
          <g
            key={f.table}
            className={`fp-table ${selected === f.table ? 'selected' : ''}`}
            data-status={f.status}
            role="button"
            tabIndex={0}
            aria-label={label}
            onClick={() => onSelect(f)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(f)
              }
            }}
          >
            <Chairs x={p.x} y={p.y} w={w} h={h} />
            <rect className="fp-top" x={p.x - w / 2} y={p.y - h / 2} width={w} height={h} rx={11} />
            <text className="fp-no" x={p.x} y={line2 ? p.y + 1 : p.y + 6}>
              {f.table}
            </text>
            {line2 && (
              <text className="fp-sub" x={p.x} y={p.y + 14}>
                {line2}
              </text>
            )}
            {allergy && <Badge x={p.x - w / 2 + 2} y={p.y - h / 2 + 2} icon="alert" tone="allergy" />}
            {f.next && (f.status === 'free' || f.status === 'paid') && <Badge x={p.x + w / 2 - 2} y={p.y - h / 2 + 2} icon="clock" tone="next" />}
          </g>
        )
      })}
    </svg>
  )
}

export function FloorLegend() {
  return (
    <ul className="fp-legend" aria-label={L('Forklaring', 'Legend')}>
      <li data-status="active">
        <i /> {L('Aktiv', 'Active')}
      </li>
      <li data-status="late">
        <i /> {L('Forsinket', 'Delayed')}
      </li>
      <li data-status="paid">
        <i /> {L('Betalt', 'Paid')}
      </li>
      <li data-status="free">
        <i /> {L('Ledig', 'Free')}
      </li>
      <li className="fp-legend-ic">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {paths.clock}
        </svg>
        {L('Booking senere', 'Booking later')}
      </li>
      <li className="fp-legend-ic allergy">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {paths.alert}
        </svg>
        {L('Allergi', 'Allergy')}
      </li>
    </ul>
  )
}
