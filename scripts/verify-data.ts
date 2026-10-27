// Skriver ut de beregnede demo-tallene og sjekker at de henger sammen.
// Kjør: npm run verify   (Node 22.18+ / 24 kjører TypeScript direkte)

import {
  campaignAt,
  computeRecords,
  duelAt,
  historyBest,
  historySummaries,
  lastFriday,
  lastStepIndex,
  reservedSeatings,
  liveAt,
  liveMetric,
  monthSummary,
  recordDefs,
  recordsSetByShift,
  teamAt,
  tonightSteps,
  tonightSummary,
} from '../src/lib/calc.ts'
import { bingoAt, ghostAt, lastCampaignResult, monthStory, movementAt, stressAt, tablesAt, floorAt, personalPeriod, teamPeriod, yearGoalAt, pairAt, pairGoal, prizeById, salesTarget, duelToEven, leaderCardsFor, myDessertTimes, setInvites, profileAt, levelFor } from '../src/lib/calc.ts'
import { profileXp, bingo, campaign, employer, lastCampaign, periodGoals, products, rewardCatalog, team, tonight as tonightData, gameNight } from '../src/data/demoData.ts'
import { kr, num, dec1 } from '../src/lib/format.ts'
import { teamMenuAt, walletAt } from '../src/lib/wallet.ts'
import { history, staffMenu } from '../src/data/demoData.ts'
import { readFileSync } from 'node:fs'

let failures = 0
function check(ok: boolean, msg: string) {
  console.log(`${ok ? '  ✓' : '  ✗'} ${msg}`)
  if (!ok) failures++
}
const between = (v: number, lo: number, hi: number) => v >= lo && v <= hi

console.log('\nHISTORIKK')
for (const s of historySummaries) {
  console.log(`  ${s.date}  ${kr(s.sales).padStart(10)}  ${String(s.guests).padStart(2)} gj  snitt ${num(s.avgCheck)}  dessert ${s.desserts}  fl>1500 ${s.premiumBottles}  tips ${s.tips}  skritt ${s.activity.steps}`)
}
check(historySummaries.length === 14, '14 tidligere vakter')

const t = tonightSummary
console.log('\nKVELDENS VAKT')
console.log(`  salg ${kr(t.sales)}, gjester ${t.guests}, snittbong ${kr(t.avgCheck)}, tips ${kr(t.tips)}`)
console.log(`  desserter ${t.desserts}, flasker >1500 ${t.premiumBottles}, rødvinsflasker ${t.redBottles}`)
console.log(`  skritt ${num(t.activity.steps)} (${dec1(t.activity.km)} km), puls snitt ${t.activity.hrAvg}, maks ${t.activity.hrMax} kl. ${t.activity.hrMaxAt} – ${t.activity.highlight}`)
// En travel fredag: 30 bord, mange små walk-in-bord – rekordsalg, men lavere snittbong enn vanlig
check(between(t.sales, 38000, 46000), 'totalsalg 38–46k (rekordkveld)')
check(between(t.guests, 80, 95), 'gjester 80–95')
check(between(t.avgCheck, 450, 550), 'snittbong 450–550 (mange små walk-in-bord)')
check(between(t.tips / t.sales, 0.08, 0.12), `tips ca. 10 % av omsetningen (${Math.round((t.tips / t.sales) * 100)} %)`)
check(between(t.premiumBottles, 3, 5), '3–5 flasker over 1 500 kr')
check(between(t.activity.steps, 11000, 15000), 'skritt 11–15k')
check(between(t.activity.hrAvg, 95, 105) && between(t.activity.hrMax, 140, 150), 'puls i spenn')

// Alle bord betalt, alle bestillinger hører til satte bord.
const seated = new Set<string>()
const paid = new Set<string>()
for (const s of tonightSteps) {
  for (const x of s.seat ?? []) seated.add(x.party)
  for (const o of s.orders ?? []) check(seated.has(o.party) && !paid.has(o.party), `bestilling ${s.time} parti ${o.party} hører til åpent bord`)
  for (const p of s.pay ?? []) paid.add(p.party)
}
check([...seated].every((p) => paid.has(p)), 'alle bord har betalt før vakten slutter')
check(liveAt(lastStepIndex).openTables.length === 0, 'ingen åpne bord ved slutt')
console.log(`  bord: ${reservedSeatings} reservert før vakten, ${liveAt(lastStepIndex).walkIns} walk-ins`)
check(liveAt(-1).tablesLeft === reservedSeatings, 'nedtellingen starter på antall reservasjoner')
{
  const seats = tonightSteps.flatMap((st) => (st.seat ?? []).map((x) => ({ ...x, time: st.time })))
  const walk = seats.filter((x) => x.walkIn)
  check(seats.length === 30 && walk.length === 10 && reservedSeatings === 20, `30 bord i løpet av kvelden: 20 reservert + 10 walk-ins (${seats.length}, ${walk.length})`)
  check(new Set(walk.map((x) => x.time)).size >= 8 && walk[0].time < '17:30' && walk.at(-1)!.time > '21:30', `walk-ins spredt utover kvelden (${walk.map((x) => x.time).join(', ')})`)
  // Ingen to selskaper ved samme bord samtidig (et bord kan settes igjen samme steg som det betales)
  const paidAt = new Map<string, string>()
  for (const st of tonightSteps) for (const p of st.pay ?? []) paidAt.set(p.party, st.time)
  const clash = seats.filter((a) => seats.some((b) => b !== a && b.table === a.table && b.time >= a.time && b.time < paidAt.get(a.party)!))
  check(clash.length === 0, `ingen bord er dobbeltbooket (${clash.map((x) => x.party).join(', ') || 'ok'})`)
}
check(liveAt(lastStepIndex).tablesLeft === 0, 'nedtellingen ender på 0 bord igjen')

console.log('\nREKORDER (før i kveld → etter)')
const all = [...historySummaries, t]
const after = computeRecords(all)
for (const d of recordDefs) {
  const r = after.find((x) => x.metric === d.metric)!
  console.log(`  ${d.title}: ${num(historyBest[d.metric])} → ${num(r.value)} (${r.shift.date})`)
}
const setTonight = recordsSetByShift(all).get(t.id) ?? []
console.log(`  satt i kveld: ${setTonight.join(', ')}`)
check(setTonight.includes('premiumBottles') && setTonight.includes('sales'), 'rekord i flasker og salg i kveld')

console.log('\nLIVE-HENDELSER')
let prev = liveAt(-1)
for (let i = 0; i <= lastStepIndex; i++) {
  const live = liveAt(i)
  const d = duelAt(live)
  const tm = teamAt(live)
  const crossed = recordDefs.filter((r) => r.metric !== 'avgCheck' && liveMetric(prev, r.metric) <= historyBest[r.metric] && liveMetric(live, r.metric) > historyBest[r.metric]).map((r) => r.metric)
  console.log(`  ${String(i + 1).padStart(2)} ${live.time} bord igjen ${String(live.tablesLeft).padStart(2)} ${tonightSteps[i].kind.padEnd(6)} salg ${kr(live.stats.sales).padStart(10)} | duell ${d.me.count}/${num(d.me.ofAvg)}% vs ${d.opponent.count}/${num(d.opponent.ofAvg)}% | lag ${num(tm.salesPct)}% ${tm.desserts}/${tm.dessertTarget} ${crossed.length ? '★ ' + crossed.join(',') : ''}${tm.reachedSales && !teamAt(prev).reachedSales ? ' ◆ lag-salg nådd' : ''}${tm.reachedDesserts && !teamAt(prev).reachedDesserts ? ' ◆ lag-dessert nådd' : ''}`)
  prev = live
}

const end = liveAt(lastStepIndex)
const duel = duelAt(end)
const tm = teamAt(end)
console.log('\nDUELL')
console.log(`  ${duel.me.name}: ${duel.me.count} desserter, snitt ${dec1(duel.me.avg)} → ${num(duel.me.overAvg)} % over`)
console.log(`  ${duel.opponent.name}: ${duel.opponent.count} desserter, snitt ${dec1(duel.opponent.avg)} → ${num(duel.opponent.overAvg)} % over`)
check(duel.leader === 'me', 'Emma vinner på handikap selv med færre desserter')
check(duel.opponent.count > duel.me.count, 'Jonas solgte flere desserter i antall')

console.log('\nLAGMÅL')
console.log(`  forrige fredag: ${kr(lastFriday.sales)}, ${lastFriday.desserts} desserter`)
console.log(`  i kveld: ${kr(tm.sales)} av ${kr(tm.salesTarget)}, ${tm.desserts} av ${tm.dessertTarget} desserter`)
check(tm.salesTarget > lastFriday.sales, 'salgsmål over forrige fredag')
check(tm.reachedSales && tm.reachedDesserts, 'begge lagmål nådd')

const c = campaignAt(end, true)
console.log('\nKAMPANJE')
console.log(`  ${c.units} av ${c.target} ${campaign.unitLabel}, Emma ${c.myUnits} ${campaign.unitLabel} (${kr(c.mySales)})`)

const m = monthSummary('2026-09')
console.log('\nSEPTEMBER')
console.log(`  ${m.count} vakter, ${m.hours} timer, ${kr(m.sales)}, ${num(m.steps)} skritt = ${dec1(m.km)} km (${dec1(m.marathons)} maraton)`)
console.log(`  mest solgte vin: ${m.topWine.name} (${m.topWine.bottles} fl, ${m.topWine.glasses} gl, ${kr(m.topWine.sales)})`)
console.log(`  beste vakt: ${m.bestShift.date} ${kr(m.bestShift.sales)}`)
console.log(`  ros: ${m.kudosTotal} – ${m.kudos.map((k) => `${k.category} ×${k.count}`).join(', ')}`)
check(m.count === 10, '10 vakter i september')

console.log('\nKVELDENS SPILL OG PREMIER')
check(salesTarget === 170000, `lagmålet avledes til 170 000 kr (${kr(salesTarget)})`)
check(myDessertTimes.length === tonightSummary.desserts, `Emmas dessert-tidspunkter (${myDessertTimes.length}) = kveldens desserter`)
for (const [id, col] of Object.entries(team.colleagues)) {
  check(col.dessertHistory.length === 14 && col.dessertHistory[13] === col.lastFriday.desserts, `${id}: 14 vakter i historikken, siste = forrige fredag`)
  check(col.dessertTimes.length === col.tonight.desserts && col.dessertTimes.every((t, i) => i === 0 || t > col.dessertTimes[i - 1]), `${id}: dessert-tidspunkter = kveldens desserter, i rekkefølge`)
}
// Alle kollegaer kan inviteres: duell og makker regnes ut for hver av dem
for (const id of Object.keys(team.colleagues)) {
  setInvites({ duell: id, makker: id })
  const d = duelAt(liveAt(lastStepIndex))
  const reached = Array.from({ length: lastStepIndex + 1 }, (_, i) => liveAt(i)).find((l) => pairAt(l).reached)
  console.log(`  invitert ${id}: duell ${Math.round(d.me.ofAvg)} % mot ${Math.round(d.opponent.ofAvg)} % (${d.leader}), makkermål ${pairGoal()} nådd kl. ${reached?.time ?? '–'}`)
  check(d.opponentId === id && d.opponent.name !== id && pairAt(liveAt(lastStepIndex)).partnerId === id, `${id}: duell og makker følger invitasjonen`)
}
setInvites({ ...gameNight.defaultInvites })
const stepTimes = new Set(tonightData.steps.map((x) => x.time))
const allLive = Array.from({ length: lastStepIndex + 1 }, (_, i) => liveAt(i))
// Spøkelse
let passes = 0
let passAt = ''
const nearAt: string[] = []
for (let i = 0; i <= lastStepIndex; i++) {
  const g0 = ghostAt(liveAt(i - 1))
  const g1 = ghostAt(liveAt(i))
  if (!g0.ahead && g1.ahead) {
    passes++
    passAt = liveAt(i).time
  }
  if (g1.near) nearAt.push(liveAt(i).time)
}
console.log(`  spøkelse: forbi kl. ${passAt}, nesten kl. ${nearAt.join(', ')}, slutt ${kr(ghostAt(liveAt(lastStepIndex)).sales)}`)
check(passes === 1, 'laget går forbi spøkelset nøyaktig én gang')
check(ghostAt(liveAt(lastStepIndex)).sales === 162000, 'spøkelset ender på forrige fredags sum')
// Makker
const reachedPair = allLive.find((l) => pairAt(l).reached)
console.log(`  makker: mål ${pairGoal()}, nådd kl. ${reachedPair?.time}, slutt ${pairAt(liveAt(lastStepIndex)).count}`)
check(pairGoal() === 26 && !!reachedPair, 'makkermålet er 26 og nås i løpet av vakten')
// Bingo
const fullAt = allLive.find((l) => bingoAt(l).full)
const firstLine = allLive.find((l) => bingoAt(l).lines.length > 0)
console.log(`  bingo: første linje kl. ${firstLine?.time}, fullt brett kl. ${fullAt?.time}`)
check(!!fullAt && fullAt.time !== tonightData.end, 'bingobrettet blir fullt under vakten')
check([...bingo.colleagueMoments, ...bingo.teamMoments].every((m) => stepTimes.has(m.at)), 'alle bingo-tidspunkter er på hendelser i demoen')
// Gave
const tpPre = teamPeriod(null, false)
const tpDone = teamPeriod(liveAt(lastStepIndex), true)
const tpReachedAt = allLive.find((l) => teamPeriod(l, false).count === tpDone.count)
console.log(`  kvelden teller for laget fra kl. ${tpReachedAt?.time}`)
check(!!tpReachedAt && tpReachedAt.time !== tonightData.end, 'kvelden teller mot lagpremien så snart lagmålet er nådd')
const mpPre = personalPeriod(false)
const mpDone = personalPeriod(true)
console.log(`  lagpremie (${periodGoals.monthName}): «${prizeById(employer.teamGift.prizeId).title}» – ${tpPre.count} → ${tpDone.count} av ${tpDone.target} helgevakter`)
console.log(`  egen premie: «${prizeById(periodGoals.personal.prizeId).title}» – ${mpPre.count} → ${mpDone.count} av ${mpDone.target} vakter over eget dessertsnitt`)
check(tpDone.count === tpPre.count + 1 && !tpDone.reached, 'kvelden teller mot lagpremien, men måneden er ikke ferdig')
check(mpDone.count === mpPre.count + 1 && !mpDone.reached, 'kvelden teller mot egen premie, men måneden er ikke ferdig')
check(tpDone.dots.length === periodGoals.team.shifts.length && periodGoals.team.shifts.includes(tonightData.date), 'kveldens vakt er én av månedens helgevakter')
// Gullmedaljen: årets lagmål (omsetning for hele laget)
const yPre = yearGoalAt(null)
const yDone = yearGoalAt(liveAt(lastStepIndex))
console.log(`  årets lagmål: «${prizeById(periodGoals.year.prizeId).title}» – ${kr(yPre.sold)} → ${kr(yDone.sold)} av ${kr(yDone.target)} (${Math.round(yDone.frac * 100)} %, skjema ${Math.round(yDone.pace * 100)} %, ${yDone.daysLeft} dager igjen)`)
check(yDone.sold - yPre.sold === teamAt(liveAt(lastStepIndex)).sales, 'kvelden legger lagets salg til årets mål')
check(yDone.ahead && !yDone.reached, 'laget ligger foran skjema, men årets mål er ikke nådd ennå')
check(rewardCatalog.find((r) => r.id === periodGoals.year.prizeId)?.scope === 'lag', 'årets premie er for hele laget')
check([employer.teamGift.prizeId, periodGoals.personal.prizeId].every((id) => rewardCatalog.some((r) => r.id === id)), 'premiene finnes i katalogen')
check(rewardCatalog.every((r) => !/vin|øl|champagne|kr\b/i.test(r.title)), 'premiekatalogen har verken alkohol eller kronebeløp')
// Ukens rett
const andProduct = products.find((p) => p.id === campaign.productId)!
check(['forrett', 'hovedrett', 'dessert'].includes(andProduct.category), 'Ukens rett er mat, ikke alkohol')
const cWith = campaignAt(liveAt(lastStepIndex), true)
const cWithout = campaignAt(liveAt(lastStepIndex), false)
console.log(`  ukens rett: ${cWith.units}/${cWith.target} med Emma (${cWith.stamps}/${cWith.stampsTotal} stempler), ${cWithout.units} uten`)
check(cWith.units === 55 && cWithout.units === 50, 'Ukens rett: 55 av 70 med Emma, 50 uten')
const lc = lastCampaignResult()
check(lc.reached && lastCampaign.drawn.every((d) => lastCampaign.participants.includes(d)), `forrige ukes rett nådde målet (${lc.units}/${lc.target}) og vinnerne var med`)
// Takkekort
const card = leaderCardsFor(tonightData.id)[0]
check(!!card && tonightData.steps.some((st) => st.time === card.moment.time && (st.seat ?? []).some((x) => x.table === card.moment.table)), 'takkekortet peker på et ekte øyeblikk i kvelden')
check(!!card && card.sentAt > tonightData.end, 'takkekortet kommer etter vakten')
// Duell
const d1915 = duelAt(liveAt(7))
console.log(`  duell kl. 19:15: ${num(d1915.me.ofAvg)} % mot ${num(d1915.opponent.ofAvg)} %, ${duelToEven(d1915)} til jevnt`)


// ── MÅNEDSHISTORIE («Din september») ──
{
  console.log('\nMÅNEDSHISTORIE')
  const st = monthStory('2026-09')!
  const cal = st.calendar
  const worked = cal.cells.filter((c) => c.worked).map((c) => c.day)
  console.log(`  kalender: start kolonne ${cal.firstCol}, ${cal.days} dager, ${cal.rows} rader; vakter ${worked.join(', ')}`)
  check(cal.cells.filter((c) => c.worked).length === st.count, 'kalenderen har like mange vaktdager som måneden har vakter')
  console.log(`  mest brukte ukedag: kolonne ${cal.topWeekday.col} (${cal.topWeekday.worked}/${cal.topWeekday.inMonth}), helgeandel ${cal.weekendShare}`)
  check(st.houses.reduce((a, h) => a + h, 0) === st.guests, `husene summerer til gjestene (${st.houses.join(' + ')} = ${st.guests})`)
  check(st.receipt.reduce((a, r) => a + r.sales, 0) === st.sales, `kassalappen summerer til ${st.sales} kr`)
  console.log(`  rekordrader på kassalappen: ${st.receipt.filter((r) => r.record).map((r) => r.date.slice(8)).join(', ')}`)
  check(st.desserts.items.reduce((a, d) => a + d.qty, 0) === st.desserts.total, `dessertbrettet summerer til ${st.desserts.total}`)
  console.log(`  hovedretter: ${st.topMains.map((m) => `${m.name} ${m.qty}`).join(', ')} (av ${st.mainsTotal})`)
  check(st.topMains.length >= 3 && st.topMains[0].qty > st.topMains[1].qty, 'gjettelek: tre retter og en klar vinner')
  const l = st.ladder!
  console.log(`  rekordtrapp: ${l.baseline.value} → ${l.steps.map((x) => x.value).join(' → ')}`)
  check(l.steps.every((x, i) => x.value > (i ? l.steps[i - 1].value : l.baseline.value)), 'rekordtrappen stiger for hvert trinn')
  check(l.steps.at(-1)!.value === computeRecords(historySummaries).find((r) => r.metric === 'sales')!.value || l.steps.at(-1)!.date < '2026-10-01', 'siste trinn er rekorden som gjaldt da')
  check(!st.recordBests.some((b) => b.metric === 'premiumBottles'), 'flaskerekorden feires ikke i historien')
  const w = st.walk
  console.log(`  gangsti: ${st.km.toFixed(1)} km, ${w.laps} maratonløp-mål, ${w.kmLeft.toFixed(2)} km igjen, første flagg ${w.flags[0].date}`)
  check(Math.abs(w.cumKm.at(-1)! - st.km) < 1e-9, 'gangstien ender på månedens km')
  check(st.kudosNotes.length === st.kudosTotal, 'alle meldinger med ros er med')
  console.log(`  type: ${st.persona.title} – ${st.persona.traits.map((t) => t.label).join(', ')}`)
  const zeroed = historySummaries.map((h) => ({ ...h, sales: 0, tips: 0, activity: { ...h.activity, steps: 0, hrAvg: 0, hrMax: 0 } }))
  const z = monthStory('2026-09', zeroed)!
  check(JSON.stringify(z.persona) === JSON.stringify(st.persona), 'typen bygger aldri på salg, tips, skritt eller puls')
  const okt = monthStory('2026-10')!
  check(okt.ladder === null && okt.count > 0, `oktober: ${okt.count} vakter, ingen rekordtrapp (${okt.persona.title})`)
  // Kveldens vakt teller når den er lagret (Historikk sender med useShifts().listed).
  const oktMed = monthStory('2026-10', [...historySummaries, tonightSummary])
  check(!!oktMed && oktMed.count === 5 && oktMed.shifts.some((x) => x.id === tonightSummary.id), `oktober med kvelden: ${oktMed?.count} vakter, kvelden er med`)
  check(!!oktMed?.ladder && oktMed.ladder.steps.some((x) => x.date === tonightSummary.date), `oktober med kvelden: rekordtrapp (${oktMed?.ladder?.baseline.value} → ${oktMed?.ladder?.steps.map((x) => x.value).join(' → ')})`)
  // En måned uten vakter har ingen historie – ruten sender til Historikk i stedet for å krasje.
  let tom: ReturnType<typeof monthStory> | 'krasj' = 'krasj'
  try {
    tom = monthStory('2026-08')
  } catch {
    /* sjekkes under */
  }
  check(tom === null, 'august (ingen vakter): monthStory gir null uten å krasje')
  // Ingen alkohol i historien: høydepunktene (sitatet på postkortet) nevner ikke drikke.
  const drikke = /vin|flask|champagne|øl\b|cocktail|prosecco|drink/i
  const fulle = [...historySummaries, tonightSummary].filter((h) => drikke.test(h.activity.highlight))
  check(fulle.length === 0, `ingen høydepunkter om drikke${fulle.length ? ` (${fulle.map((h) => `${h.date}: ${h.activity.highlight}`).join('; ')})` : ''}`)
  // topWine finnes fortsatt i månedsoppsummeringen, men ingen kort eller delefakta trenger den.
  check(typeof st.topWine?.name === 'string', `monthStory har fortsatt topWine (${st.topWine.name}) – brukes ikke i historien`)
  const kort = ['src/wrapped/slides.tsx', 'src/wrapped/art/SharePoster.tsx'].map((f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')).join('\n')
  check(!/topWine|\bwine\b/.test(kort), 'ingen vin på kortene eller delekortet')
}


// ── VAKTSIDEN: fire temaer (Helse, Salg, Konkurranse, Gjester) ──
{
  console.log('\nVAKTSIDEN – BOKSENE')
  const end = liveAt(lastStepIndex)
  const all = tablesAt(end)
  const seatings = tonightData.steps.flatMap((st) => st.seat ?? [])
  check(all.length === seatings.length && all.every((t) => t.status === 'done'), `etter vakten: alle ${all.length} selskaper har betalt`)
  check(all.reduce((a, t) => a + t.sales, 0) === end.stats.sales, `salget per bord summerer til kveldens salg (${kr(end.stats.sales)})`)
  check(all.reduce((a, t) => a + (t.tip ?? 0), 0) === end.tips, `tips per bord summerer til kveldens tips (${num(end.tips)})`)
  // Allergien i bookingen hører til steget der «allergi»-øyeblikket skjer
  const allergyStep = tonightData.steps.find((st) => st.moments?.includes('allergi'))!
  check(!!allergyStep.seat?.some((x) => x.allergies?.length), `allergi-øyeblikket (${allergyStep.time}) har et bord med registrert allergi`)
  const notes = seatings.flatMap((x) => [...(x.wishes ?? []), ...(x.allergies ?? []).map((a) => a.what)])
  // Hele ord («vindusbord» er ikke vin)
  check(!notes.some((n) => /(^|[^a-zæøå])(vin|øl|drink|cocktail|champagne|prosecco)([^a-zæøå]|$)|flask/i.test(n)), 'ingen bordnotater handler om alkohol')
  check(seatings.every((x) => (x.allergies ?? []).every((a) => a.guests >= 1 && a.guests <= x.guests)), 'allergier gjelder aldri flere gjester enn det sitter ved bordet')
  // Underveis: aktive + senere = bord igjen; walk-ins vises ikke før de er satt
  for (const i of [-1, 4, 10, 16]) {
    const l = liveAt(i)
    const t = tablesAt(l)
    const active = t.filter((x) => x.status === 'active').length
    const upcoming = t.filter((x) => x.status === 'upcoming').length
    check(active + upcoming === l.tablesLeft, `kl. ${l.time}: ${active} aktive + ${upcoming} senere = ${l.tablesLeft} bord igjen`)
  }
  // Bordkartet: forsinkelser gjelder bord som sitter der, og alle fire statuser dukker opp i løpet av kvelden
  const seatedBy = (party: string, i: number) => tonightData.steps.slice(0, i + 1).some((st) => st.seat?.some((x) => x.party === party))
  check(tonightData.steps.every((st, i) => (st.waiting ?? []).every((w) => seatedBy(w.party, i) && w.since <= st.time)), 'forsinkelser gjelder bord som allerede er satt')
  const statuses = new Set(Array.from({ length: lastStepIndex + 1 }, (_, i) => floorAt(liveAt(i)).map((f) => f.status)).flat())
  check(['active', 'late', 'paid', 'free'].every((x) => statuses.has(x as never)), `bordkartet viser aktiv, forsinket, betalt og ledig i løpet av kvelden`)
  check(floorAt(liveAt(lastStepIndex)).every((f) => f.status !== 'active' && f.status !== 'late'), 'ingen bord sitter igjen etter siste betaling')
  // Helse: stress og bevegelse
  const st = stressAt(end)
  check(st.minutes.rolig + st.minutes.aktiv + st.minutes.rush === st.cells.length * 15, `stress: ${st.cells.length} kvarter fordelt på lav/middels/høy`)
  console.log(`  stress hele vakten: lav ${st.minutes.rolig} min, middels ${st.minutes.aktiv} min, høy ${st.minutes.rush} min; høyest ${st.peak.hr} kl. ${st.peak.time}`)
  const mv = movementAt(end)
  check(mv.slots.reduce((a, v) => a + v, 0) === end.activity.steps, `skritt per halvtime summerer til ${num(end.activity.steps)}`)
  console.log(`  mest i bevegelse: ${mv.peak?.from}–${mv.peak?.to} (${num(mv.peak?.steps ?? 0)} skritt)`)
}

{
  console.log('\nPROFIL – NIVÅ OG XP')
  const before = profileAt(historySummaries)
  const after = profileAt([...historySummaries, tonightSummary])
  for (const [name, pr] of [['før kvelden', before], ['etter kvelden', after]] as const)
    console.log(`  ${name}: ${num(pr.xp)} XP = salg ${num(pr.parts.sales)} + tips ${num(pr.parts.tips)} + ${pr.medalCount} medaljer ${num(pr.parts.medals)} + ${pr.trophies} trofeer ${num(pr.parts.trophies)} → nivå ${pr.level} «${pr.title}» (${num(pr.into)}/${num(pr.need)})`)
  check(after.parts.sales + after.parts.tips + after.parts.medals + after.parts.trophies === after.xp, 'XP = salg + tips + medaljer + trofeer')
  check(after.totals.sales === profileXp.before.sales + historySummaries.reduce((a, x) => a + x.sales, 0) + tonightSummary.sales && after.totals.tips === profileXp.before.tips + historySummaries.reduce((a, x) => a + x.tips, 0) + tonightSummary.tips, 'totalt solgt og tips = året før appen + alle vaktene i appen')
  check(after.totals.shifts > 140 && after.totals.shifts < 200, `et år med vakter (${after.totals.shifts})`)
  check(before.tonightXp === 0 && after.tonightXp === after.xp - before.xp && after.tonightXp > 0, `kvelden gir +${num(after.tonightXp)} XP`)
  check(after.levelUp && after.level === before.level + 1, `kvelden gir nytt nivå (${before.level} → ${after.level})`)
  const newMedals = after.medals.filter((m) => m.tonight).map((m) => m.title)
  check(newMedals.length === 1, `én ny medalje i kveld: ${newMedals.join(', ')}`)
  check(after.trophies === before.trophies + (recordsSetByShift([...historySummaries, tonightSummary]).get(tonightSummary.id)?.length ?? 0), 'trofeer = personlige rekorder satt')
  // Nivåtrappen: hvert nivå krever mer enn forrige, og levelFor er sammenhengende
  check(levelFor(299).level === 1 && levelFor(300).level === 2 && levelFor(after.xp - after.into).into === 0, 'nivåtrappen henger sammen')
}
{
  console.log('\nPERSONALMENYEN – POLETTER')
  const pre = walletAt('pre', -1, [])
  const done = walletAt('done', lastStepIndex, [])
  console.log(`  før kvelden: ${pre.balance} poletter (stempelkort ${pre.stamps}/${pre.card}); etter: ${done.balance} (+${done.tonight}${done.tonightTeamGoal ? ', lagmålet' : ''})`)
  check(pre.earnedTotal === Math.floor(history.length / staffMenu.stampCard) + Object.values(staffMenu.earnedBefore).reduce((a, b) => a + b, 0), 'før kvelden: én polett per 4. vakt i historikken + de andre reglene')
  check(done.tonight === 1 && done.tonightTeamGoal && teamAt(liveAt(lastStepIndex)).reachedSales, 'lagmålet nås i kveld og gir 1 polett')
  check(done.balance === pre.balance + done.tonight, `saldo etter kvelden = før + kvelden (${pre.balance} → ${done.balance})`)
  const wish = staffMenu.items.find((i) => i.id === 'onskefri')!
  check(done.balance >= wish.price && pre.balance >= wish.price, `Emma har råd til ønskefri (${wish.price}) – demoen kan vise godkjenningen hos Kari`)
  check(staffMenu.items.every((i) => i.costKr / i.price <= 85), 'ingen rett koster restauranten mer enn 85 kr per polett (≈ 4 000 kr for 50 poletter)')
  const goal = staffMenu.items.filter((i) => i.goal)
  check(goal.length === 1 && goal[0].costKr === staffMenu.giftLimitKr && goal[0].giftKr === staffMenu.giftLimitKr, 'sparemålet er hele den skattefrie gavegrensen')
  check(pre.giftRoomKr > 0 && pre.giftRoomKr < goal[0].giftKr, `gavegrensen: ${kr(pre.giftRoomKr)} igjen i år, så gavekortet viser skatteadvarselen`)
  const t = teamMenuAt([])
  check(t.usedKr <= t.budgetKr, `laget har brukt ${kr(t.usedKr)} av ${kr(t.budgetKr)}`)
  const lvl = profileAt([...historySummaries, tonightSummary]).level
  const secret = staffMenu.items.filter((i) => i.minLevel)
  check(secret.some((i) => i.minLevel! <= lvl) && secret.some((i) => i.minLevel! > lvl), `hemmelig meny: én rett åpen og én låst på LVL ${lvl}`)
  check(staffMenu.items.every((i) => !/vin|øl|cocktail|alkohol(?!fri)/i.test(i.title + ' ' + i.desc)), 'ingen alkohol på menyen')
  check(!staffMenu.rules.some((r) => /salg|tips|kudos/i.test(r.title)), 'ingen poletter for salg, tips eller kudos')
}
console.log(failures ? `\n${failures} sjekk(er) feilet` : '\nAlle sjekker OK')
process.exit(failures ? 1 : 0)
