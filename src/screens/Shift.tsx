import { useState } from 'react'
import { colleagueName, config } from '../config.ts'
import { periodGoals, tonight } from '../data/demoData.ts'
import type { GameId, ShiftStep, StepKind } from '../data/demoData.ts'
import { bingoAt, campaignAt, duelAt, duelLead, duelOpponentId, duelShare, ghostAt, historyBest, hrZone, lastFriday, lastStepIndex, liveAt, pairAt, prizeById, salesTarget, teamAt, teamPeriod } from '../lib/calc.ts'
import type { LiveState } from '../lib/calc.ts'
import { L, td } from '../i18n.ts'
import { capitalize, dateLong, kr, num, pct, km as fmtKm } from '../lib/format.ts'
import { navigate } from '../router.ts'
import { useStore } from '../state.tsx'
import { SalesSlots } from '../charts.tsx'
import { DuelBars, duelRule, leaderText } from '../duel.tsx'
import { FlowRings, RingLegend, Rings, TableCountdown, ringColors } from '../rings.tsx'
import type { LegendItem, RingSpec } from '../rings.tsx'
import { Bar, CountUp, Icon, Sheet, TopBar } from '../ui.tsx'
import { BingoBoard, Face, FaceStack, GameCards, InviteRow, RaceChart, nameOf } from '../game-ui.tsx'
import { DesignA, DesignB, DesignC, DesignD, designParam } from '../designs/Directions.tsx'
import type { LiveVM } from '../designs/Directions.tsx'
import { ShiftOverview } from '../shift/Overview.tsx'

const kindIcon: Record<StepKind, string> = {
  seat: 'guests',
  order: 'receipt',
  bottle: 'bottle',
  rush: 'flame',
  quiet: 'leaf',
  kudos: 'heart',
  duel: 'duel',
  team: 'team',
  pay: 'coins',
  end: 'sparkle',
}

const partyTable = new Map<string, number>(tonight.steps.flatMap((st) => (st.seat ?? []).map((x) => [x.party, x.table] as [string, number])))
const tableSet = (ts: (number | undefined)[]) => [...new Set(ts.filter((t): t is number => t !== undefined))]
const tableList = (ts: number[]) => ts.join(L(' og ', ' and '))

/** Tittelen på hendelsen, tilpasset spillet. Duell- og lagsteg får en nøytral tittel når de ikke gjelder. */
export function eventFor(step: ShiftStep, live: LiveState, game: GameId, quiet: boolean): { title: string; icon: string } {
  const offDuel = step.kind === 'duel' && (game !== 'duell' || quiet)
  const offTeam = step.kind === 'team' && quiet
  if (!offDuel && !offTeam) return { title: td(step.title), icon: kindIcon[step.kind] }
  if (!quiet && game === 'makker') {
    const p = pairAt(live)
    return { title: L('Makker: {n}/{goal} desserter sammen', 'Buddy: {n}/{goal} desserts together', { n: num(p.count), goal: num(p.goal) }), icon: 'pair' }
  }
  if (!quiet && game === 'laget') return { title: L('Laget: {pct} av målet', 'Team: {pct} of the goal', { pct: pct(Math.min(100, teamAt(live).salesPct)) }), icon: 'team' }
  const paid = tableSet((step.pay ?? []).map((p) => partyTable.get(p.party)))
  if ((step.pay ?? []).length) return { title: L('Bord {t} har betalt', paid.length > 1 ? 'Tables {t} have paid' : 'Table {t} has paid', { t: tableList(paid) }), icon: kindIcon.pay }
  const ordered = tableSet((step.orders ?? []).map((o) => partyTable.get(o.party)))
  return { title: L('Ny bestilling på bord {t}', ordered.length > 1 ? 'New order at tables {t}' : 'New order at table {t}', { t: tableList(ordered) }), icon: kindIcon.order }
}

// Den Emma inviterte til duellen (valgt før vakten)
const opponentName = () => colleagueName(duelOpponentId())
const teamIds = [config.persona.id, ...config.colleagues.map((c) => c.id)]

export interface RingOpts {
  calm: boolean
  game: GameId
  giftId: string
}

/** Ringene for kvelden. Kveldens spill styrer den innerste ringen; Rolig viser bare din egen. */
export function ringsFor(live: LiveState, o: RingOpts): RingSpec[] {
  const rings: RingSpec[] = [{ id: 'rekord', value: live.stats.sales / historyBest.sales, color: ringColors.rekord, lapColor: ringColors.rekordLap, icon: 'star', label: L('Rekord', 'Record') }]
  if (o.calm || o.game === 'rolig') return rings
  const g = ghostAt(live)
  rings.push({
    id: 'lag',
    value: teamAt(live).salesPct / 100,
    color: ringColors.lag,
    lapColor: ringColors.lagLap,
    icon: 'team',
    label: L('Lagmål', 'Team goal'),
    // Spøkelset blir med til lagmålet er nådd – da toner det ut i stedet for å forsvinne brått.
    ghost: live.stepIndex >= 0 ? { frac: g.frac, ahead: g.ahead, near: g.near, gone: teamAt(live).reachedSales } : undefined,
  })
  if (o.game === 'duell') {
    const d = duelAt(live)
    rings.push({ id: 'duell', kind: 'duel', share: duelShare(d), leader: d.leader, color: ringColors.duell, colorB: ringColors.motstander, icon: 'duel', initialB: opponentName()[0], label: L('Duell', 'Duel') })
  }
  if (o.game === 'makker') {
    const p = pairAt(live)
    rings.push({ id: 'makker', kind: 'pair', beads: p.beads, goal: p.goal, reached: p.reached, icon: 'pair', label: L('Makker', 'Buddy'), initialB: nameOf(p.partnerId)[0] })
  }
  return rings
}

/** Tekstene under ringene. Over 100 % vises som «+12 %». Aldri «bak» – bare hvor langt man har kommet. */
export function legendFor(rings: RingSpec[], live: LiveState, done: boolean): LegendItem[] {
  const duel = duelAt(live)
  return rings.map((r) => {
    if (r.kind === 'duel') {
      const lead = duelLead(duel)
      return {
        id: 'duell',
        color: r.color,
        colorB: r.colorB,
        icon: r.icon,
        label: L('Duell', 'Duel'),
        value: leaderText(duel, done),
        sub: lead > 0 ? L('{pct} foran', 'by {pct}', { pct: pct(lead) }) : L('mot {name}', 'vs {name}', { name: opponentName() }),
        subNum: lead > 0 ? lead : undefined,
        done: done && duel.leader === 'me',
      }
    }
    if (r.kind === 'pair') {
      const p = pairAt(live)
      return {
        id: 'makker',
        color: '#f0cc5c',
        icon: 'pair',
        label: L('Makker', 'Buddy'),
        value: p.reached ? L('Fullført!', 'Done!') : `${num(p.count)}/${num(p.goal)}`,
        num: p.reached ? undefined : p.count,
        fmt: 'of',
        of: p.goal,
        sub: L('med {name}', 'with {name}', { name: nameOf(p.partnerId) }),
        done: p.reached,
      }
    }
    const over = r.value >= 1
    const extra = Math.round((r.value - 1) * 100)
    const rec = r.id === 'rekord'
    return {
      id: r.id,
      color: r.color,
      icon: r.icon,
      label: r.label,
      // Akkurat nådd (under 1 % over) vises som «Nådd!», ellers «+12 %».
      value: over ? (extra >= 1 ? `+${pct(extra)}` : rec ? L('Slått!', 'Beaten!') : L('Nådd!', 'Reached!')) : pct(r.value * 100),
      num: over ? (extra >= 1 ? extra : undefined) : r.value * 100,
      fmt: over ? 'plus' : 'pct',
      sub: over ? (extra >= 1 ? (rec ? L('over rekord', 'over record') : L('over målet', 'over goal')) : L('i kveld', 'tonight')) : rec ? L('av rekord', 'of record') : L('av målet', 'of goal'),
      done: over,
    }
  })
}

/** Laget mot spøkelset gjennom kvelden, til og med et gitt steg. */
export function racePoints(upTo: number) {
  return Array.from({ length: upTo + 2 }, (_, i) => liveAt(i - 1)).map((l) => ({ t: l.minutes, team: teamAt(l).sales, ghost: ghostAt(l).sales }))
}

/** Et lite hjerte som slår to ganger når klokka kobles til – «den er på» uten ord. Ikke ved første visning. */
function WatchBeat({ go }: { go: boolean }) {
  return (
    <span className={`watch-beat ${go ? 'go' : ''}`} aria-hidden="true">
      <Icon name="heart" />
    </span>
  )
}

// ── 1. Vaktstart ────────────────────────────────────────────────────────────

export function ShiftStart() {
  const { settings, updateSettings, demo, startShift, setGame, setInvite, quiet } = useStore()
  const [beat, setBeat] = useState(0)
  const p = config.persona
  const preview = ringsFor(liveAt(-1), { calm: quiet, game: demo.game, giftId: demo.teamGiftId })

  return (
    <>
      <TopBar />
      <p className="eyebrow">{capitalize(dateLong(tonight.date))}</p>
      <h1 className="hello mt8">
        {L('Hei', 'Hi')} <em>{p.firstName}</em>
      </h1>

      <div className="card mt16">
        <div className="row">
          <div className="icon-badge">
            <Icon name="clock" />
          </div>
          <div className="grow">
            <div className="num" style={{ fontSize: 'var(--fs-title)', fontWeight: 700 }}>
              {tonight.start}–{tonight.end}
            </div>
            <FaceStack ids={teamIds} size={22} label={L('Vaktlaget i kveld', "Tonight's team")} />
          </div>
          <button
            className="watch-toggle"
            role="switch"
            aria-checked={settings.watch}
            aria-label={L('Klokke', 'Watch')}
            onClick={() => {
              if (!settings.watch) setBeat((b) => b + 1)
              updateSettings({ watch: !settings.watch })
            }}
          >
            <Icon name="watch" />
            {settings.watch && beat > 0 && <WatchBeat key={beat} go />}
            <span className="switch" data-on={settings.watch} />
          </button>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>{L('Kveldens spill', "Tonight's game")}</h2>
          <button className="link" onClick={() => navigate('/mal')}>
            {L('Mål og premier', 'Goals & prizes')}
          </button>
        </div>
        <div className="card game-pick">
          {designParam() !== 'bokser' && <FlowRings rings={preview} size={112} stroke={10} gap={4} label={L('Kveldens ringer, ikke startet', "Tonight's rings, not started yet")} enter />}
          <GameCards value={demo.game} onChange={setGame} invites={demo.invites} />
          {(demo.game === 'duell' || demo.game === 'makker') && (
            <InviteRow key={demo.game} game={demo.game} invited={demo.invites[demo.game]} onInvite={(id) => setInvite(demo.game as 'duell' | 'makker', id)} />
          )}
        </div>
      </section>

      {/* Knappen ligger fast nederst – den skal aldri kreve scrolling */}
      <div className="start-cta">
        <button className="btn block" onClick={startShift} style={{ minHeight: 58 }}>
          <Icon name="play" /> {L('Start vakt', 'Start shift')}
        </button>
      </div>
    </>
  )
}

// ── 2. Under vakt ───────────────────────────────────────────────────────────
// Laget for et blikk på fem sekunder. Alt annet ligger ett trykk unna i «Mer om vakten».

export function ShiftLive() {
  const { settings, demo, finishShift, quiet, toggleQuiet, playing } = useStore()
  const [more, setMore] = useState<false | 'all' | 'bingo'>(false)
  const live = liveAt(demo.step)
  const step = demo.step >= 0 ? tonight.steps[demo.step] : null
  const atEnd = demo.step >= lastStepIndex
  const opts = { calm: quiet, game: demo.game, giftId: demo.teamGiftId }
  const event = step ? eventFor(step, live, demo.game, quiet) : { title: L('Vakten har startet', 'Your shift has started'), icon: 'sparkle' }
  const rings = ringsFor(live, opts)
  const bottleRecord = live.stats.premiumBottles > historyBest.premiumBottles
  const legend = legendFor(rings, live, false)

  const design = designParam()
  if (design === 'bokser') return <ShiftOverview />
  if (design) {
    const duel = duelAt(live)
    const team = teamAt(live)
    const camp = campaignAt(live, settings.campaign === 'med')
    const bingoState = bingoAt(live)
    const vm: LiveVM = {
      time: live.time,
      stepTitle: event.title,
      stepIcon: event.icon,
      sales: live.stats.sales,
      record: historyBest.sales,
      recordFrac: live.stats.sales / historyBest.sales,
      tips: live.tips,
      guests: live.guests,
      bottles: live.stats.premiumBottles,
      bottleRecord,
      bottleBest: historyBest.premiumBottles,
      tables: live.tables,
      tablesLeft: live.tablesLeft,
      walkIns: live.walkIns,
      calm: quiet,
      team,
      teamFriday: lastFriday.sales,
      duel: demo.game === 'duell' ? duel : null,
      share: duelShare(duel),
      lead: duelLead(duel),
      opponent: opponentName(),
      campaignUnits: settings.campaign === 'med' ? { units: camp.units, target: camp.target } : null,
      kudos: live.kudos.length,
      kudosFrom: live.kudos[0] ? colleagueName(live.kudos[0].from) : null,
      atEnd,
      rings,
      legend,
      team5: teamIds,
      // Alle ansiktene hopper samtidig når laget feirer: forbi spøkelset, fullt brett, gaven åpnet.
      bingo: bingoState,
      onBingo: () => setMore('bingo'),
      onMore: () => setMore('all'),
      onCalm: toggleQuiet,
      onFinish: finishShift,
      // Klokka: puls og skritt er Emmas egne tall og vises også i rolig modus.
      vitals: settings.watch ? { hr: live.activity.hr, hrIdx: live.activity.hrIdx, zone: hrZone(live.activity.hr), steps: live.activity.steps } : null,
      playing,
      paused: more !== false,
    }
    const View = design === 'a' ? DesignA : design === 'b' ? DesignB : design === 'c' ? DesignC : DesignD
    return (
      <>
        <View vm={vm} />
        {more && <MoreSheet live={live} focus={more} onClose={() => setMore(false)} />}
      </>
    )
  }

  // Original vaktside (?design=original) – beholdt for sammenligning.
  return (
    <>
      <div className="topbar">
        <span className="live-pill">
          <i /> {L('Vakt pågår', 'Shift in progress')}
        </span>
        <span className="row gap8">
          <span className="clock" aria-label={L('Klokken er {time}', 'The time is {time}', { time: live.time })}>
            {live.time}
          </span>
        </span>
      </div>

      <div className="card" style={{ paddingTop: 14, paddingBottom: 14 }}>
        <Rings rings={rings} size={212} stroke={14} label={`${L('Salg så langt {kr}', 'Sales so far {kr}', { kr: kr(live.stats.sales) })}. ${legend.map((l) => `${l.label}: ${l.value}`).join('. ')}`}>
          <div className="rc-num rc-big">
            <CountUp value={live.stats.sales} />
          </div>
          <div className="rc-cap">{L('kr solgt', 'kr sold')}</div>
        </Rings>
        <RingLegend items={legend} onClick={() => setMore('all')} />
      </div>

      <div className="mt10">
        <TableCountdown tables={live.tables} left={live.tablesLeft} walkIns={live.walkIns} />
      </div>

      <div className="event-line mt10" aria-live="polite">
        <Icon name={event.icon} />
        <span className="t">{step ? step.time : tonight.start}</span>
        <span key={demo.step} className="ticker-anim grow">
          {event.title}
        </span>
      </div>

      <div className="row gap8 mt10">
        {atEnd ? (
          <button className="btn block" onClick={finishShift} style={{ minHeight: 56 }}>
            <Icon name="receipt" /> {L('Avslutt og se oppgjøret', 'Finish and see your summary')}
          </button>
        ) : (
          <button className="btn secondary small grow" onClick={() => setMore('all')}>
            {L('Mer om vakten', 'Shift details')}
          </button>
        )}
      </div>

      {more && <MoreSheet live={live} focus={more} onClose={() => setMore(false)} />}
    </>
  )
}

/** Andre nivå: forklaring av ringene, bingobrettet og alt som ikke trengs i et blikk. */
function MoreSheet({ live, focus, onClose }: { live: LiveState; focus: 'all' | 'bingo'; onClose: () => void }) {
  const { settings, demo, quiet } = useStore()
  const duel = duelAt(live)
  const team = teamAt(live)
  const ghost = ghostAt(live)
  const period = teamPeriod(live, false)
  const p = pairAt(live)
  const b = bingoAt(live)
  const camp = campaignAt(live, settings.campaign === 'med')
  const currentSlot = Math.min(live.salesBySlot.length - 1, Math.floor((live.minutes - 16 * 60) / 30))
  const play = !quiet

  const bingoCard = (
    <div className="card mt12">
      <div className="row between">
        <div className="eyebrow">{L('Vaktbingo · hele laget', 'Shift bingo · whole team')}</div>
        <b className="num">{b.count}/9</b>
      </div>
      <div className="mt12">
        <BingoBoard state={b} />
      </div>
    </div>
  )

  return (
    <Sheet title={focus === 'bingo' ? L('Vaktbingo', 'Shift bingo') : L('Mer om vakten', 'Shift details')} onClose={onClose}>
      {focus === 'bingo' ? (
        bingoCard
      ) : (
        <>
          <div className="list">
            <div className="hl-row" style={{ padding: '14px 16px' }}>
              <span className="rl-dot" style={{ background: ringColors.rekord, flex: 'none' }}>
                <Icon name="star" />
              </span>
              <div className="grow">
                <div className="ht">{L('Rekord-ringen', 'The record ring')}</div>
                <div className="hd num">{L('{a} av {b}', '{a} of {b}', { a: kr(live.stats.sales), b: kr(historyBest.sales) })}</div>
              </div>
            </div>
            {play && (
              <div className="hl-row" style={{ padding: '14px 16px' }}>
                <span className="rl-dot" style={{ background: ringColors.lag, flex: 'none' }}>
                  <Icon name="team" />
                </span>
                <div className="grow">
                  <div className="ht row gap8">
                    {L('Lagmål', 'Team goal')} · {kr(salesTarget)}
                    <span className={`ghost-chip ${ghost.ahead ? 'ahead' : ''}`} role="img" aria-label={ghost.ahead ? L('foran forrige fredag på samme tid', 'ahead of last Friday at this time') : L('bak forrige fredag på samme tid', 'behind last Friday at this time')}>
                      <Icon name="ghost" />
                    </span>
                  </div>
                  <div className="mt8">
                    <RaceChart points={racePoints(live.stepIndex)} target={salesTarget} />
                  </div>
                  <div className="minibars mt8">
                    <span>{L('Salg', 'Sales')}</span>
                    <Bar thin tone="sage" value={team.salesPct} />
                    <b>{pct(Math.min(team.salesPct, 100))}</b>
                    <span>{L('Dessert', 'Desserts')}</span>
                    <Bar thin tone="sage" value={team.dessertPct} />
                    <b>
                      {num(team.desserts)}/{num(team.dessertTarget)}
                    </b>
                  </div>
                  <button className="gift-line mt8" onClick={() => navigate('/mal')}>
                    <span className="gh-gift">
                      <Icon name="gift" />
                    </span>
                    <span className="small grow">
                      {capitalize(td(periodGoals.monthName))} <b className="num">{num(period.count)}/{num(period.target)}</b> · {td(prizeById(demo.teamGiftId).title)}
                    </span>
                    <Icon name="chevR" className="chev" />
                  </button>
                </div>
              </div>
            )}
            {play && demo.game === 'duell' && (
              <div className="hl-row" style={{ padding: '14px 16px' }}>
                <span className="rl-dot" style={{ background: ringColors.duell, flex: 'none' }}>
                  <Icon name="duel" />
                </span>
                <div className="grow">
                  <div className="ht">{L('Duell-ringen · desserter', 'The duel ring · desserts')}</div>
                  <div className="mt8">
                    <DuelBars duel={duel} />
                  </div>
                  <div className="hd">{duelRule()}</div>
                </div>
              </div>
            )}
            {play && demo.game === 'makker' && (
              <div className="hl-row" style={{ padding: '14px 16px' }}>
                <span className="rl-dot" style={{ background: '#f0cc5c', flex: 'none' }}>
                  <Icon name="pair" />
                </span>
                <div className="grow">
                  <div className="ht row gap8">
                    {L('Makker', 'Buddy')} <FaceStack ids={[config.persona.id, p.partnerId]} size={22} />
                  </div>
                  <div className="hd num">{L('{n} av {goal} desserter sammen', '{n} of {goal} desserts together', { n: num(p.count), goal: num(p.goal) })}</div>
                </div>
              </div>
            )}
          </div>

          {play && bingoCard}

          {live.kudos.length > 0 && (
            <div className="card tint-sage flat mt12">
              {live.kudos.map((k, i) => (
                <div key={i} className="row">
                  <Face id={k.from} size={36} />
                  <div className="grow">
                    <div style={{ fontWeight: 650 }}>
                      {colleagueName(k.from)}: {L('«{c}»', '“{c}”', { c: td(k.category) })}
                    </div>
                    <div className="small muted">{k.message && td(k.message)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="card mt12">
            <div className="eyebrow">{L('Salg per halvtime', 'Sales per half hour')}</div>
            <div className="mt12">
              <SalesSlots values={live.salesBySlot} current={currentSlot} />
            </div>
            <div className="row between small mt8">
              <span className="muted">{L('Flasker over 1 500 kr', 'Bottles over 1,500 kr')}</span>
              <b className="num">{num(live.stats.premiumBottles)}</b>
            </div>
            {settings.campaign === 'med' && (
              <div className="row between small mt8">
                <span className="muted">{L('Ukens rett', 'Dish of the week')}</span>
                <b className="num">{L('{n}/{total} stempler', '{n}/{total} stamps', { n: camp.stamps, total: camp.stampsTotal })}</b>
              </div>
            )}
          </div>

          {settings.watch && (
            <div className="card flat mt12 activity-row">
              <span className="row gap8">
                <Icon name="steps" className="chev" />
                <b className="num">{num(live.activity.steps)}</b>
                <span className="muted small num">{fmtKm(live.activity.km)}</span>
              </span>
              <span className="row gap8">
                <Icon name="pulse" className="chev" />
                <b className="num">{live.activity.hr}</b>
                <span className="muted small">{L('puls', 'bpm')}</span>
              </span>
            </div>
          )}
        </>
      )}
    </Sheet>
  )
}
