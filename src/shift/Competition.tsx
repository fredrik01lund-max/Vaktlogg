// Konkurranse: bare spillene – kveldens spill øverst, deretter lagmålet, vaktbingoen og ukens rett.
// Premiene står på Goals. Rolig modus skjuler alle konkurranser.

import { config } from '../config.ts'
import { campaign } from '../data/demoData.ts'
import { L, td } from '../i18n.ts'
import { bingoAt, campaignAt, duelAt, duelLead, ghostAt, pairAt, salesTarget, teamAt } from '../lib/calc.ts'
import type { LiveState } from '../lib/calc.ts'
import { num, pct } from '../lib/format.ts'
import { useStore } from '../state.tsx'
import { Bar, Icon } from '../ui.tsx'
import { DuelBars, duelRule, leaderText } from '../duel.tsx'
import { BingoBoard, FaceStack, RaceChart, nameOf } from '../game-ui.tsx'
import { racePoints } from '../screens/Shift.tsx'
import { Card } from './parts.tsx'

function CalmSwitch({ calm, onToggle }: { calm: boolean; onToggle: () => void }) {
  return (
    <button className="st-switch" role="switch" aria-checked={calm} onClick={onToggle}>
      <Icon name="calm" />
      <span className="grow">
        <b>{L('Rolig modus', 'Calm mode')}</b>
        <small>{calm ? L('Konkurransene er skjult', 'Competitions are hidden') : L('Skjul konkurransene i kveld', 'Hide competitions tonight')}</small>
      </span>
      <span className="switch" data-on={calm} />
    </button>
  )
}

function Team({ live }: { live: LiveState }) {
  const t = teamAt(live)
  const g = ghostAt(live)
  return (
    <Card
      title={L('Lagmål i kveld', "Tonight's team goal")}
      right={
        <span className={`ghost-chip ${g.ahead ? 'ahead' : ''}`} role="img" aria-label={g.ahead ? L('foran forrige fredag på samme tid', 'ahead of last Friday at this time') : L('bak forrige fredag på samme tid', 'behind last Friday at this time')}>
          <Icon name="ghost" />
        </span>
      }
    >
      <RaceChart points={racePoints(live.stepIndex)} target={salesTarget} />
      <p className="st-legend-line">
        <i className="solid" /> {L('Laget i kveld', 'The team tonight')} <i className="dash" /> {L('Forrige fredag', 'Last Friday')}
      </p>
      <div className="minibars mt8">
        <span>{L('Salg', 'Sales')}</span>
        <Bar thin tone="sage" value={t.salesPct} />
        <b>{pct(Math.min(t.salesPct, 100))}</b>
        <span>{L('Dessert', 'Desserts')}</span>
        <Bar thin tone="sage" value={t.dessertPct} />
        <b>
          {num(t.desserts)}/{num(t.dessertTarget)}
        </b>
      </div>
    </Card>
  )
}

/** Kveldens spill – det Emma valgte før vakten, og det boksen på forsiden viser. */
function TonightGame({ live, game }: { live: LiveState; game: string }) {
  if (game === 'duell') {
    const d = duelAt(live)
    const lead = duelLead(d)
    return (
      <Card title={L('Duell mot {name}', 'Duel vs {name}', { name: d.opponent.name })} right={<span className="st-pill">{L('Kveldens spill', "Tonight's game")}</span>} className="st-feature">
        <p className="st-feature-big">
          {leaderText(d, false)}
          {lead > 0 && <small> · {L('{pct} foran', 'by {pct}', { pct: pct(lead) })}</small>}
        </p>
        <DuelBars duel={d} />
        <p className="st-muted small mt8">
          {L('Desserter.', 'Desserts.')} {duelRule()}
        </p>
      </Card>
    )
  }
  if (game === 'makker') {
    const p = pairAt(live)
    return (
      <Card title={L('Makker med {name}', 'Buddy: {name}', { name: nameOf(p.partnerId) })} right={<span className="st-pill">{L('Kveldens spill', "Tonight's game")}</span>} className="st-feature">
        <p className="st-feature-big row gap8">
          <FaceStack ids={[config.persona.id, p.partnerId]} size={26} />
          <span className="num">
            {num(p.count)} / {num(p.goal)}
          </span>
          <small>{p.reached ? L('fullført!', 'done!') : L('desserter sammen', 'desserts together')}</small>
        </p>
        <div className="st-beads" aria-hidden="true">
          {Array.from({ length: p.goal }, (_, i) => (
            <i key={i} data-who={p.beads[i] ?? 'none'} />
          ))}
        </div>
      </Card>
    )
  }
  return <Team live={live} />
}

export function CompetitionDetail({ live }: { live: LiveState }) {
  const { demo, settings, quiet, toggleQuiet } = useStore()
  if (quiet)
    return (
      <>
        <CalmSwitch calm onToggle={toggleQuiet} />
        <Card className="st-empty">
          <Icon name="calm" />
          <p>{L('Konkurransene er skjult i kveld. Skru av rolig modus for å se dem igjen.', 'The competitions are hidden tonight. Turn off calm mode to see them again.')}</p>
        </Card>
      </>
    )
  const b = bingoAt(live)
  const camp = campaignAt(live, settings.campaign === 'med')
  return (
    <>
      <TonightGame live={live} game={demo.game} />
      {demo.game !== 'laget' && <Team live={live} />}
      <Card title={L('Vaktbingo', 'Shift bingo')} right={<span className="st-note num">{b.count}/9</span>}>
        <BingoBoard state={b} />
      </Card>
      {settings.campaign === 'med' && (
        <Card title={L('Ukens rett · {dish}', 'Dish of the week · {dish}', { dish: td(campaign.dish) })} right={<span className="st-note num">{num(camp.units)}/{num(camp.target)}</span>}>
          <Bar tone="sage" value={camp.pct} />
          <p className="st-muted small mt8">
            {L('Laget sammen, {week}. Du har solgt {n} i kveld.', "Whole team, {week}. You've sold {n} tonight.", { week: td(campaign.weekLabel), n: num(camp.myUnits) })}
          </p>
        </Card>
      )}
      <CalmSwitch calm={false} onToggle={toggleQuiet} />
    </>
  )
}
