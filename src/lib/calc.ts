// Alle tall i appen beregnes her fra rådataene i demoData.ts.

import { colleagueName, config } from '../config.ts'
import {
  bingo,
  campaign,
  employer,
  gameNight,
  history,
  lastCampaign,
  medals,
  profileXp,
  leaderCards,
  pair,
  periodGoals,
  rewardCatalog,
  premiumBottleThreshold,
  products,
  team,
  tonight,
  wineColors,
  wineNames,
} from '../data/demoData.ts'
import type { MedalMetric } from '../data/demoData.ts'
import type { Allergy, Category, HistoryShift, ItemCounts, Kudos, KudosCategory, MomentId, Product, ShiftStep } from '../data/demoData.ts'
// Tekst som bygges her (takkekort, typetrekk) lages på gjeldende språk når funksjonen kalles.
// Data som bare sendes videre (rettnavn, ønsker, hendelser …) er norsk – appen oversetter med td() når den tegner.
import { L, td } from '../i18n.ts'
import { capitalize, weekdayByCol } from './format.ts'

export const productById = new Map<string, Product>(products.map((p) => [p.id, p]))

function product(id: string): Product {
  const p = productById.get(id)
  if (!p) throw new Error(`Ukjent produkt: ${id}`)
  return p
}

// ── Tid ─────────────────────────────────────────────────────────────────────

export function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function minToTime(m: number): string {
  const h = Math.floor(m / 60)
  const mm = Math.round(m % 60)
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function shiftHours(start: string, end: string): number {
  return (toMin(end) - toMin(start)) / 60
}

/** Lineær interpolasjon i en kurve av [klokkeslett, andel]. */
export function curveAt(curve: [string, number][], minutes: number): number {
  if (minutes <= toMin(curve[0][0])) return curve[0][1]
  for (let i = 1; i < curve.length; i++) {
    const t0 = toMin(curve[i - 1][0])
    const t1 = toMin(curve[i][0])
    if (minutes <= t1) return curve[i - 1][1] + ((curve[i][1] - curve[i - 1][1]) * (minutes - t0)) / (t1 - t0)
  }
  return curve[curve.length - 1][1]
}

// ── Varer ───────────────────────────────────────────────────────────────────

export interface ProductLine {
  id: string
  name: string
  category: Product['category']
  qty: number
  sales: number
}

export interface ItemStats {
  sales: number
  desserts: number
  mains: number
  premiumBottles: number
  redBottles: number
  bottles: number
  campaignUnits: number
  campaignSales: number
  lines: ProductLine[]
}

export function addItems(target: ItemCounts, add: ItemCounts): void {
  for (const [id, qty] of Object.entries(add)) target[id] = (target[id] ?? 0) + qty
}

export function itemStats(items: ItemCounts): ItemStats {
  const s: ItemStats = { sales: 0, desserts: 0, mains: 0, premiumBottles: 0, redBottles: 0, bottles: 0, campaignUnits: 0, campaignSales: 0, lines: [] }
  for (const [id, qty] of Object.entries(items)) {
    if (!qty) continue
    const p = product(id)
    const sales = p.price * qty
    s.sales += sales
    if (p.category === 'dessert') s.desserts += qty
    if (p.category === 'hovedrett') s.mains += qty
    if (p.category === 'vinflaske') {
      s.bottles += qty
      if (p.price > premiumBottleThreshold) s.premiumBottles += qty
      if (p.wine && wineColors[p.wine] === 'rod') s.redBottles += qty
    }
    if (p.campaignUnits && p.id === campaign.productId) {
      s.campaignUnits += p.campaignUnits * qty
      s.campaignSales += sales
    }
    s.lines.push({ id, name: p.name, category: p.category, qty, sales })
  }
  s.lines.sort((a, b) => b.sales - a.sales || b.qty - a.qty)
  return s
}

// ── Vaktoppsummering ────────────────────────────────────────────────────────

export interface ShiftActivitySummary {
  steps: number
  km: number
  hrAvg: number
  hrMax: number
  hrMaxAt: string
  highlight: string
}

export interface ShiftSummary {
  id: string
  date: string
  start: string
  end: string
  hours: number
  guests: number
  tips: number
  sales: number
  avgCheck: number
  desserts: number
  premiumBottles: number
  redBottles: number
  campaignUnits: number
  campaignSales: number
  items: ItemCounts
  lines: ProductLine[]
  activity: ShiftActivitySummary
  kudos: Kudos[]
  moments: MomentId[]
  isTonight: boolean
}

export const stepsToKm = (steps: number): number => (steps * config.persona.strideMeters) / 1000

export function summarizeHistory(h: HistoryShift): ShiftSummary {
  const st = itemStats(h.items)
  return {
    id: h.id,
    date: h.date,
    start: h.start,
    end: h.end,
    hours: shiftHours(h.start, h.end),
    guests: h.guests,
    tips: h.tips,
    sales: st.sales,
    avgCheck: st.sales / h.guests,
    desserts: st.desserts,
    premiumBottles: st.premiumBottles,
    redBottles: st.redBottles,
    campaignUnits: st.campaignUnits,
    campaignSales: st.campaignSales,
    items: h.items,
    lines: st.lines,
    activity: { ...h.activity, km: stepsToKm(h.activity.steps) },
    kudos: h.kudos,
    moments: h.moments ?? [],
    isTonight: false,
  }
}

export const historySummaries: ShiftSummary[] = history.map(summarizeHistory)

// ── Kveldens vakt, steg for steg ────────────────────────────────────────────

export const tonightSteps: ShiftStep[] = tonight.steps
export const lastStepIndex = tonightSteps.length - 1
const startMin = toMin(tonight.start)
const endMin = toMin(tonight.end)
export const halfHourSlots = Math.round((endMin - startMin) / 30)

export interface LiveActivity {
  steps: number
  km: number
  hr: number
  /** Hvilken pulsmåling (hvert kvarter fra vaktstart) som gjelder nå. */
  hrIdx: number
  hrAvg: number
  hrMax: number
  hrMaxAt: string
}

export interface TableDot {
  /** Selskapet – stabil nøkkel også når en walk-in kommer inn i rekken. */
  id: string
  table: number
  walkIn: boolean
  status: 'done' | 'active' | 'upcoming'
}

/** Alle bordsettinger i kveld, i rekkefølge. Reserverte er kjent før vakten. */
const allSeatings = tonightSteps.flatMap((st, i) => (st.seat ?? []).map((s) => ({ ...s, stepIndex: i })))
export const reservedSeatings = allSeatings.filter((s) => !s.walkIn).length

export interface LiveState {
  stepIndex: number
  time: string
  minutes: number
  items: ItemCounts
  stats: ItemStats
  guests: number
  tips: number
  tablesServed: number
  openTables: number[]
  salesBySlot: number[]
  events: ShiftStep[]
  kudos: Kudos[]
  activity: LiveActivity
  /** Nedtelling: reserverte bord + walk-ins som har kommet. */
  tables: TableDot[]
  tablesLeft: number
  walkIns: number
}

/** Skritt og puls på et vilkårlig minutt – demoklokka bruker dette mellom hendelsene. */
export function activityAt(minutes: number): LiveActivity {
  const { stepsPerHalfHour, heartRate } = tonight.activity
  const elapsed = Math.max(0, Math.min(minutes, endMin) - startMin)
  const full = Math.floor(elapsed / 30)
  let steps = 0
  for (let i = 0; i < full && i < stepsPerHalfHour.length; i++) steps += stepsPerHalfHour[i]
  if (full < stepsPerHalfHour.length) steps += Math.round((stepsPerHalfHour[full] * (elapsed % 30)) / 30)
  const idx = Math.min(heartRate.length - 1, Math.floor(elapsed / 15))
  const samples = heartRate.slice(0, idx + 1)
  let max = samples[0]
  let maxAt = 0
  samples.forEach((v, i) => {
    if (v > max) {
      max = v
      maxAt = i
    }
  })
  return {
    steps,
    km: stepsToKm(steps),
    hr: heartRate[idx],
    hrIdx: idx,
    hrAvg: Math.round(samples.reduce((a, b) => a + b, 0) / samples.length),
    hrMax: max,
    hrMaxAt: minToTime(startMin + maxAt * 15),
  }
}

/** Pulsmålingene for hele kvelden (hvert kvarter, 16:00–23:30). */
export const hrSeries: number[] = tonight.activity.heartRate

export type HrZone = 'rolig' | 'aktiv' | 'rush'
export function hrZone(hr: number): HrZone {
  return hr >= config.hrZones.rush ? 'rush' : hr >= config.hrZones.aktiv ? 'aktiv' : 'rolig'
}

const liveCache = new Map<number, LiveState>()

/** Tilstanden etter at steg `stepIndex` er spilt av (-1 = vakten har så vidt startet). */
export function liveAt(stepIndex: number): LiveState {
  const cached = liveCache.get(stepIndex)
  if (cached) return cached
  const items: ItemCounts = {}
  const parties = new Map<string, { table: number; guests: number; paid: boolean }>()
  const salesBySlot = new Array<number>(halfHourSlots).fill(0)
  let guests = 0
  let tips = 0
  let tablesServed = 0
  const kudos: Kudos[] = []
  const events = tonightSteps.slice(0, stepIndex + 1)
  for (const step of events) {
    for (const s of step.seat ?? []) {
      parties.set(s.party, { table: s.table, guests: s.guests, paid: false })
      guests += s.guests
    }
    for (const o of step.orders ?? []) {
      addItems(items, o.items)
      const slot = Math.min(halfHourSlots - 1, Math.floor((toMin(step.time) - startMin) / 30))
      salesBySlot[slot] += itemStats(o.items).sales
    }
    for (const p of step.pay ?? []) {
      const party = parties.get(p.party)
      if (party) party.paid = true
      tips += p.tip
      tablesServed += 1
    }
    if (step.kudos) kudos.push(step.kudos)
  }
  const time = stepIndex < 0 ? tonight.start : tonightSteps[stepIndex].time
  const minutes = toMin(time)
  const state: LiveState = {
    stepIndex,
    time,
    minutes,
    items,
    stats: itemStats(items),
    guests,
    tips,
    tablesServed,
    openTables: [...parties.values()].filter((p) => !p.paid).map((p) => p.table),
    salesBySlot,
    events,
    kudos,
    activity: activityAt(minutes),
    tables: [],
    tablesLeft: 0,
    walkIns: 0,
  }
  state.tables = allSeatings
    .filter((s) => !s.walkIn || s.stepIndex <= stepIndex)
    .map((s) => ({
      id: s.party,
      table: s.table,
      walkIn: !!s.walkIn,
      status: s.stepIndex > stepIndex ? 'upcoming' : parties.get(s.party)?.paid ? 'done' : 'active',
    }))
  state.tablesLeft = state.tables.filter((t) => t.status !== 'done').length
  state.walkIns = state.tables.filter((t) => t.walkIn).length
  liveCache.set(stepIndex, state)
  return state
}

// ── Vaktsiden: fire temaer (helse, salg, konkurranse, gjester) ──────────────

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

export type Course = 'forrett' | 'hovedrett' | 'dessert'

/** Ett selskap ved et bord i kveld – fra bookingen og kassen. */
export interface TableInfo {
  party: string
  table: number
  guests: number
  /** Satt (aktive og ferdige) eller reservert (senere i kveld). */
  time: string
  status: 'active' | 'upcoming' | 'done'
  /** Hvor langt bordet har kommet i måltidet (siste rett som er bestilt). */
  course: Course | null
  sales: number
  tip: number | null
  /** Når bordet betalte. */
  paidAt: string | null
  /** Venter for lenge akkurat nå (forsinket). */
  late: { what: string; minutes: number } | null
  allergies: Allergy[]
  wishes: string[]
}

/**
 * Bordene i kveld slik servitøren ser dem: aktive, reserverte senere i kveld, og ferdige.
 * Walk-ins vises først når de er satt (ingen vet om dem før).
 */
export function tablesAt(live: LiveState): TableInfo[] {
  const byParty = new Map<string, TableInfo>()
  tonightSteps.forEach((st, i) => {
    const now = i <= live.stepIndex
    for (const s of st.seat ?? []) {
      if (!now && s.walkIn) continue
      byParty.set(s.party, {
        party: s.party,
        table: s.table,
        guests: s.guests,
        time: st.time,
        status: now ? 'active' : 'upcoming',
        course: null,
        sales: 0,
        tip: null,
        paidAt: null,
        late: null,
        allergies: s.allergies ?? [],
        wishes: s.wishes ?? [],
      })
    }
    if (!now) return
    for (const o of st.orders ?? []) {
      const t = byParty.get(o.party)
      if (!t) continue
      t.sales += itemStats(o.items).sales
      for (const id of Object.keys(o.items)) {
        const c = product(id).category
        const rank = (x: Course | null) => (x === 'dessert' ? 3 : x === 'hovedrett' ? 2 : x === 'forrett' ? 1 : 0)
        if ((c === 'forrett' || c === 'hovedrett' || c === 'dessert') && rank(c) > rank(t.course)) t.course = c
      }
    }
    for (const w of st.waiting ?? []) {
      const t = byParty.get(w.party)
      if (t) t.late = { what: w.what, minutes: live.minutes - toMin(w.since) }
    }
    for (const id of st.served ?? []) {
      const t = byParty.get(id)
      if (t) t.late = null
    }
    for (const p of st.pay ?? []) {
      const t = byParty.get(p.party)
      if (!t) continue
      t.status = 'done'
      t.tip = p.tip
      t.paidAt = st.time
      t.late = null
    }
  })
  return [...byParty.values()]
}

// ── Bordkartet: Emmas seksjon ──

export type FloorStatus = 'active' | 'late' | 'paid' | 'free'

export interface FloorTable {
  table: number
  /** Plasser ved bordet (største selskap i kveld). */
  seats: number
  status: FloorStatus
  /** Selskapet som sitter der nå (eller nettopp betalte). */
  party: TableInfo | null
  /** Neste booking på bordet. */
  next: TableInfo | null
}

/** Bordene i seksjonen i kveld (fra bookingen), i nummerrekkefølge. */
export const sectionTables = [...new Set(tonightSteps.flatMap((st) => (st.seat ?? []).map((s) => s.table)))].sort((a, b) => a - b)
/** Et betalt bord står som «betalt» (gult) en halvtime – så er det ryddet og ledig. */
const PAID_SHOWN_MIN = 30

export function floorAt(live: LiveState): FloorTable[] {
  const all = tablesAt(live)
  return sectionTables.map((table) => {
    const here = all.filter((t) => t.table === table)
    const seats = Math.max(...tonightSteps.flatMap((st) => (st.seat ?? []).filter((s) => s.table === table).map((s) => s.guests)))
    const active = here.find((t) => t.status === 'active') ?? null
    const paid = here.filter((t) => t.status === 'done' && t.paidAt && live.minutes - toMin(t.paidAt) < PAID_SHOWN_MIN).at(-1) ?? null
    const next = here.filter((t) => t.status === 'upcoming').sort((a, b) => a.time.localeCompare(b.time))[0] ?? null
    const party = active ?? paid
    const status: FloorStatus = active ? (active.late ? 'late' : 'active') : paid ? 'paid' : 'free'
    return { table, seats, status, party, next }
  })
}

export interface StressState {
  /** Ett felt per kvarter fra vaktstart til nå. */
  cells: { time: string; hr: number; zone: HrZone }[]
  minutes: Record<HrZone, number>
  now: HrZone
  peak: { hr: number; time: string }
}

/** Stress anslått fra pulsen (soner i config.hrZones). Bare for Emma selv – aldri sammenlignet med andre. */
export function stressAt(live: LiveState): StressState {
  const cells = hrSeries.slice(0, live.activity.hrIdx + 1).map((hr, i) => ({ time: hhmm(startMin + i * 15), hr, zone: hrZone(hr) }))
  const minutes: Record<HrZone, number> = { rolig: 0, aktiv: 0, rush: 0 }
  for (const c of cells) minutes[c.zone] += 15
  const peak = cells.reduce((a, c) => (c.hr > a.hr ? c : a), cells[0])
  return { cells, minutes, now: cells.at(-1)!.zone, peak: { hr: peak.hr, time: peak.time } }
}

export interface MovementState {
  /** Skritt per halvtime fra vaktstart; halvtimen som pågår teller så langt den har kommet. */
  slots: number[]
  current: number
  peak: { steps: number; from: string; to: string } | null
}

export function movementAt(live: LiveState): MovementState {
  const per = tonight.activity.stepsPerHalfHour
  const elapsed = Math.max(0, Math.min(live.minutes, endMin) - startMin)
  const current = Math.min(per.length - 1, Math.floor(elapsed / 30))
  const slots = per.map((v, i) => (i < current ? v : i === current ? Math.round((v * (elapsed - i * 30)) / 30) : 0))
  let best = -1
  slots.forEach((v, i) => {
    if (i < current && (best < 0 || v > slots[best])) best = i
  })
  return { slots, current, peak: best < 0 ? null : { steps: slots[best], from: hhmm(startMin + best * 30), to: hhmm(startMin + best * 30 + 30) } }
}

export function summarizeTonight(): ShiftSummary {
  const live = liveAt(lastStepIndex)
  const all = activityAt(endMin)
  const highlightStep = [...tonightSteps].reverse().find((s) => toMin(s.time) <= toMin(all.hrMaxAt)) ?? tonightSteps[0]
  return {
    id: tonight.id,
    date: tonight.date,
    start: tonight.start,
    end: tonight.end,
    hours: shiftHours(tonight.start, tonight.end),
    guests: live.guests,
    tips: live.tips,
    sales: live.stats.sales,
    avgCheck: live.stats.sales / live.guests,
    desserts: live.stats.desserts,
    premiumBottles: live.stats.premiumBottles,
    redBottles: live.stats.redBottles,
    campaignUnits: live.stats.campaignUnits,
    campaignSales: live.stats.campaignSales,
    items: live.items,
    lines: live.stats.lines,
    activity: {
      steps: all.steps,
      km: all.km,
      hrAvg: all.hrAvg,
      hrMax: all.hrMax,
      hrMaxAt: all.hrMaxAt,
      highlight: highlightStep.title,
    },
    kudos: [...live.kudos, ...tonight.kudosAfter],
    moments: [...new Set(tonightSteps.flatMap((st) => st.moments ?? []))],
    isTonight: true,
  }
}

export const tonightSummary = summarizeTonight()

// ── Rekorder ────────────────────────────────────────────────────────────────

export type RecordMetric = 'premiumBottles' | 'sales' | 'desserts' | 'avgCheck'

// title og short er norske nøkler i i18n-data.ts – vis dem med td().
export const recordDefs: { metric: RecordMetric; title: string; short: string }[] = [
  { metric: 'premiumBottles', title: 'Flest flasker over 1 500 kr', short: 'Flasker over 1 500 kr' },
  { metric: 'sales', title: 'Høyeste salg på én vakt', short: 'Høyeste salg' },
  { metric: 'desserts', title: 'Flest desserter', short: 'Flest desserter' },
  { metric: 'avgCheck', title: 'Høyeste snittbong per gjest', short: 'Høyeste snittbong' },
]

export interface PersonalRecord {
  metric: RecordMetric
  title: string
  value: number
  shift: ShiftSummary
}

/** Beste verdi per kategori. Ved likhet gjelder første gang rekorden ble satt. */
export function computeRecords(shifts: ShiftSummary[]): PersonalRecord[] {
  const sorted = [...shifts].sort((a, b) => a.date.localeCompare(b.date))
  return recordDefs.map((d) => {
    let best = sorted[0]
    for (const s of sorted) if (s[d.metric] > best[d.metric]) best = s
    return { metric: d.metric, title: d.title, value: best[d.metric], shift: best }
  })
}

/** De første vaktene i appen gir grunnlaget; rekorder markeres først etter så mange vakter. */
export const recordsAfterShifts = 3

/** Hvilke rekorder ble satt på hver vakt (strengt bedre enn alle tidligere vakter i appen). */
export function recordsSetByShift(shifts: ShiftSummary[]): Map<string, RecordMetric[]> {
  const sorted = [...shifts].sort((a, b) => a.date.localeCompare(b.date))
  const result = new Map<string, RecordMetric[]>()
  sorted.forEach((s, i) => {
    if (i < recordsAfterShifts) return result.set(s.id, [])
    const set = recordDefs
      .filter((d) => sorted.slice(0, i).every((prev) => s[d.metric] > prev[d.metric]))
      .map((d) => d.metric)
    result.set(s.id, set)
  })
  return result
}

/** Beste verdier fra historikken før kveldens vakt. */
export const historyBest: Record<RecordMetric, number> = Object.fromEntries(
  computeRecords(historySummaries).map((r) => [r.metric, r.value]),
) as Record<RecordMetric, number>

/** Live-verdi for en rekordkategori. Snittbong teller først når vakten er ferdig. */
export function liveMetric(live: LiveState, metric: RecordMetric): number {
  switch (metric) {
    case 'premiumBottles':
      return live.stats.premiumBottles
    case 'sales':
      return live.stats.sales
    case 'desserts':
      return live.stats.desserts
    case 'avgCheck':
      return live.stepIndex === lastStepIndex && live.guests ? live.stats.sales / live.guests : 0
  }
}

// ── Duell (prosent over eget snitt) ─────────────────────────────────────────

export interface DuelSide {
  name: string
  count: number
  avg: number
  /** Andel av eget snitt, i prosent (100 = som vanlig). */
  ofAvg: number
  /** Prosent over (eller under) eget snitt. */
  overAvg: number
}

export interface DuelState {
  opponentId: string
  me: DuelSide
  opponent: DuelSide
  leader: 'me' | 'opponent' | 'tie'
}

// ── Invitasjoner: hvem Emma har invitert til Duell og Makker før vakten ─────
// Settes fra state.tsx ved hver tegning (som språket), så alle beregninger følger valget.

export type Invites = { duell: string; makker: string }
let invites: Invites = { ...gameNight.defaultInvites }
export function setInvites(next: Invites) {
  invites = next
}
export const duelOpponentId = (): string => invites.duell
export const pairPartnerId = (): string => invites.makker

const avgOf = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const myDessertAvg = avgOf(historySummaries.map((s) => s.desserts))
const dessertAvgOf = (id: string) => avgOf(team.colleagues[id].dessertHistory)
const dessertTimesOf = (id: string) => team.colleagues[id].dessertTimes

function duelSide(name: string, count: number, avg: number): DuelSide {
  const ofAvg = (count / avg) * 100
  return { name, count, avg, ofAvg, overAvg: ofAvg - 100 }
}

/** Andel av duellringen som er din: din %-av-vanlig mot motstanderens. */
export function duelShare(d: DuelState): number {
  const total = d.me.ofAvg + d.opponent.ofAvg
  return total > 0 ? d.me.ofAvg / total : 0.5
}

/** Hvor mange prosentpoeng lederen ligger foran (målt mot hver sin vanlige kveld). */
export function duelLead(d: DuelState): number {
  return Math.abs(Math.round(d.me.ofAvg) - Math.round(d.opponent.ofAvg))
}

export function duelAt(live: LiveState): DuelState {
  const id = duelOpponentId()
  const me = duelSide(config.persona.firstName, live.stats.desserts, myDessertAvg)
  const opponent = duelSide(colleagueName(id), countUpTo(dessertTimesOf(id), live.minutes), dessertAvgOf(id))
  const diff = Math.round(me.ofAvg) - Math.round(opponent.ofAvg)
  return { opponentId: id, me, opponent, leader: diff > 0 ? 'me' : diff < 0 ? 'opponent' : 'tie' }
}

// ── Lagmål (hele vaktlaget, ingen individuell rangering) ────────────────────

const colleagueIds = Object.keys(team.colleagues)
const lastFridaySummary = historySummaries.find((s) => s.id === team.lastFridayShiftId)!

export const lastFriday = {
  date: lastFridaySummary.date,
  sales: lastFridaySummary.sales + colleagueIds.reduce((a, id) => a + team.colleagues[id].lastFriday.sales, 0),
  desserts: lastFridaySummary.desserts + colleagueIds.reduce((a, id) => a + team.colleagues[id].lastFriday.desserts, 0),
}

/** Lagmålet avledes: forrige fredag + 5 %, rundet til nærmeste 5 000 kr. */
export const salesTarget = Math.round((lastFriday.sales * team.goal.stretch) / team.goal.roundTo) * team.goal.roundTo

/** Antall av en liste klokkeslett som er passert. */
const countUpTo = (times: string[], minutes: number) => times.filter((t) => toMin(t) <= minutes).length

export interface TeamState {
  sales: number
  desserts: number
  salesTarget: number
  dessertTarget: number
  salesPct: number
  dessertPct: number
  reachedSales: boolean
  reachedDesserts: boolean
  members: number
}

export function teamAt(live: LiveState): TeamState {
  const sFrac = curveAt(team.salesCurve, live.minutes)
  const done = live.stepIndex >= lastStepIndex
  let sales = live.stats.sales
  // Hver kollega har egne dessert-tidspunkter (de kan inviteres til duell og makker).
  let desserts = live.stats.desserts
  for (const id of colleagueIds) {
    const c = team.colleagues[id]
    sales += done ? c.tonight.sales : Math.round(c.tonight.sales * sFrac)
    desserts += countUpTo(c.dessertTimes, live.minutes)
  }
  const { dessertTarget } = team.goal
  return {
    sales,
    desserts,
    salesTarget,
    dessertTarget,
    salesPct: (sales / salesTarget) * 100,
    dessertPct: (desserts / dessertTarget) * 100,
    reachedSales: sales >= salesTarget,
    reachedDesserts: desserts >= dessertTarget,
    members: colleagueIds.length + 1,
  }
}

// ── Kampanje (satt av restauranten, aldri skritt eller puls) ────────────────

export interface CampaignState {
  units: number
  target: number
  pct: number
  myUnits: number
  mySales: number
  reached: boolean
  /** Stempler på kortet (ett per campaign.stampSize porsjoner). */
  stamps: number
  stampsTotal: number
  /** Stempler som allerede var der før kveldens vakt. */
  stampsBefore: number
  /** Antall lodd i trekningen (ett per deltaker). */
  tickets: number
}

export function campaignAt(live: LiveState | null, joined: boolean): CampaignState {
  const minutes = live ? live.minutes : toMin(tonight.start)
  const done = live ? live.stepIndex >= lastStepIndex : false
  const frac = live ? (done ? 1 : curveAt(team.salesCurve, minutes)) : 0
  const colleagues = colleagueIds.reduce((a, id) => a + Math.round(team.colleagues[id].tonight.campaignUnits * frac), 0)
  const myUnits = live ? live.stats.campaignUnits : 0
  const mySales = live ? live.stats.campaignSales : 0
  const units = campaign.soldBeforeTonight + colleagues + (joined ? myUnits : 0)
  return {
    units,
    target: campaign.targetUnits,
    pct: (units / campaign.targetUnits) * 100,
    myUnits,
    mySales,
    reached: units >= campaign.targetUnits,
    stamps: Math.floor(Math.min(units, campaign.targetUnits) / campaign.stampSize),
    stampsTotal: Math.ceil(campaign.targetUnits / campaign.stampSize),
    stampsBefore: Math.floor(campaign.soldBeforeTonight / campaign.stampSize),
    tickets: campaign.participants.length + (joined ? 1 : 0),
  }
}

/** Forrige ukes rett: Emmas porsjoner hentes fra historikken den uka. */
export function lastCampaignResult() {
  const mine = historySummaries
    .filter((s) => s.date >= lastCampaign.from && s.date <= lastCampaign.to)
    .reduce((a, s) => a + (s.items[lastCampaign.productId] ?? 0), 0)
  const units = lastCampaign.soldByOthers + mine
  return { units, mine, target: lastCampaign.targetUnits, reached: units >= lastCampaign.targetUnits, drawn: lastCampaign.drawn }
}

// ── Spøkelsesfredag: laget mot forrige fredags lag ──────────────────────────

export interface GhostState {
  /** Hvor forrige fredags lag var på samme klokkeslett. */
  sales: number
  /** Andel av lagmålet (posisjon på lagringen). */
  frac: number
  gap: number
  ahead: boolean
  /** Ærlig «nesten»: under 2 % av målet fra hverandre, etter kl. 18. */
  near: boolean
}

export function ghostAt(live: LiveState): GhostState {
  const sales = Math.round(lastFriday.sales * curveAt(team.lastFridayCurve, live.minutes))
  const gap = teamAt(live).sales - sales
  return {
    sales,
    frac: sales / salesTarget,
    gap,
    ahead: gap > 0,
    near: Math.abs(gap) < 0.02 * salesTarget && live.minutes >= toMin('18:00') && live.stepIndex < lastStepIndex,
  }
}

/** Steget der laget går forbi spøkelset (true bare på selve steget). */
export const ghostPassed = (prev: LiveState, next: LiveState) => !ghostAt(prev).ahead && ghostAt(next).ahead

// ── Makker: felles dessertmål for to ────────────────────────────────────────

/** Tidspunktene Emma solgte desserter i kveld (fra bestillingene i stegene). */
export const myDessertTimes: string[] = tonightSteps.flatMap((st) =>
  (st.orders ?? []).flatMap((o) => Array.from({ length: itemStats(o.items).desserts }, () => st.time)),
)


export interface PairState {
  partnerId: string
  goal: number
  count: number
  /** Desserter i rekkefølgen de ble solgt, med hvem som solgte. */
  beads: ('me' | 'partner')[]
  reached: boolean
  frac: number
}

/** Felles mål for Emma og makkeren hun inviterte: 10 % over summen av deres vanlige kvelder. */
export const pairGoal = (partnerId = pairPartnerId()) => Math.ceil((myDessertAvg + dessertAvgOf(partnerId)) * pair.stretch)

export function pairAt(live: LiveState): PairState {
  const partnerId = pairPartnerId()
  const goal = pairGoal(partnerId)
  const beads = [
    ...myDessertTimes.filter((t) => toMin(t) <= live.minutes).map((t) => ({ t: toMin(t), who: 'me' as const })),
    ...dessertTimesOf(partnerId).filter((t) => toMin(t) <= live.minutes).map((t) => ({ t: toMin(t), who: 'partner' as const })),
  ]
    .sort((a, b) => a.t - b.t)
    .map((b) => b.who)
  return { partnerId, goal, count: beads.length, beads, reached: beads.length >= goal, frac: beads.length / goal }
}

/** Hvor mange desserter Emma trenger for å komme likt med motstanderen (målt mot vanlig kveld). */
export function duelToEven(d: DuelState): number {
  return Math.max(0, Math.ceil((d.opponent.ofAvg / 100) * d.me.avg) - d.me.count)
}

// ── Vaktbingo ───────────────────────────────────────────────────────────────

export interface BingoState {
  filled: Partial<Record<MomentId, { by: string; at: string }>>
  count: number
  /** Fullførte linjer (rader, kolonner, diagonaler) som lister av rutene. */
  lines: MomentId[][]
  full: boolean
}

const allLines: MomentId[][] = (() => {
  const g = bingo.grid
  const rows = g
  const cols = [0, 1, 2].map((c) => g.map((r) => r[c]))
  return [...rows, ...cols, [g[0][0], g[1][1], g[2][2]], [g[0][2], g[1][1], g[2][0]]]
})()

/** Alle utfyllinger i kveld, i tidsrekkefølge. Første som fyller en rute, eier den. */
const bingoEvents: { tile: MomentId; by: string; at: string }[] = (() => {
  const ev: { tile: MomentId; by: string; at: string }[] = [{ tile: 'fri', by: 'lag', at: tonight.start }]
  const me = config.persona.id
  for (const st of tonightSteps) {
    for (const m of st.moments ?? []) ev.push({ tile: m, by: me, at: st.time })
    if (st.kudos && (st.kudos.category === 'Reddet rushet' || st.kudos.category === 'Beste hjelper')) ev.push({ tile: 'hjelp', by: me, at: st.time })
  }
  ev.push(...bingo.colleagueMoments)
  ev.push(...bingo.teamMoments.map((t) => ({ ...t, by: 'lag' })))
  return ev.sort((a, b) => toMin(a.at) - toMin(b.at))
})()

export function bingoAt(live: LiveState): BingoState {
  const filled: BingoState['filled'] = {}
  for (const e of bingoEvents) if (toMin(e.at) <= live.minutes && !filled[e.tile]) filled[e.tile] = { by: e.by, at: e.at }
  const lines = allLines.filter((l) => l.every((t) => filled[t]))
  const count = Object.keys(filled).length
  return { filled, count, lines, full: count === 9 }
}

// ── Premier fra arbeidsgiver ────────────────────────────────────────────────

export const prizeById = (id: string) => rewardCatalog.find((r) => r.id === id) ?? rewardCatalog[0]


// ── Premier over en periode ─────────────────────────────────────────────────

export type PeriodDot = { date: string; state: 'ja' | 'nei' | 'kveld' | 'senere' }
export interface PeriodState {
  dots: PeriodDot[]
  count: number
  target: number
  left: number
  reached: boolean
  /** Kveldens vakt teller med (avgjort). */
  tonightCounts: boolean
}

function periodState(dots: PeriodDot[], target: number, tonightCounts: boolean): PeriodState {
  const count = dots.filter((d) => d.state === 'ja').length
  return { dots, count, target, left: Math.max(0, target - count), reached: count >= target, tonightCounts }
}

/**
 * Lagets månedsmål: helgevakter der laget nådde lagmålet.
 * Kvelden teller i det øyeblikket lagmålet er nådd (live), og regnes som ikke nådd først når vakten er over.
 */
export function teamPeriod(live: LiveState | null, done: boolean): PeriodState {
  const reached = !!live && teamAt(live).reachedSales
  const dots: PeriodDot[] = periodGoals.team.shifts.map((date) => {
    if (date in periodGoals.team.before) return { date, state: periodGoals.team.before[date] ? 'ja' : 'nei' }
    if (date === tonight.date) return { date, state: reached ? 'ja' : done ? 'nei' : 'kveld' }
    return { date, state: 'senere' }
  })
  return periodState(dots, periodGoals.team.target, reached)
}

/** Høstens mål for laget: september + oktober så langt + kvelden når lagmålet er nådd. */
export interface YearGoalState {
  /** Lagets salg i år, med kvelden så langt. */
  sold: number
  target: number
  frac: number
  /** Hvor langt laget «skulle» vært i dag hvis salget var jevnt gjennom året. */
  pace: number
  ahead: boolean
  /** Kveldens bidrag fra hele laget. */
  tonight: number
  daysLeft: number
  reached: boolean
}

/** Gullmedaljen: årets lagmål (en sum for hele serveringslaget). Bare lagets samlede tall – aldri én person. */
export function yearGoalAt(live: LiveState | null): YearGoalState {
  const y = periodGoals.year
  const tonightSales = live ? teamAt(live).sales : 0
  const sold = y.soldBeforeTonight + tonightSales
  const day = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)))
  const total = (day(y.to) - day(y.from)) / 86400000 + 1
  const gone = (day(tonight.date) - day(y.from)) / 86400000 + 1
  const pace = gone / total
  const frac = sold / y.target
  return { sold, target: y.target, frac, pace, ahead: frac >= pace, tonight: tonightSales, daysLeft: total - gone, reached: frac >= 1 }
}

/** Ditt månedsmål: vakter over ditt eget dessertsnitt – du konkurrerer bare med deg selv. */
export function personalPeriod(done: boolean): PeriodState {
  const inMonth = (d: string) => d >= periodGoals.from && d <= periodGoals.to
  const tonightOver = tonightSummary.desserts > myDessertAvg
  const dots: PeriodDot[] = [
    ...historySummaries.filter((s) => inMonth(s.date)).map((s): PeriodDot => ({ date: s.date, state: s.desserts > myDessertAvg ? 'ja' : 'nei' })),
    { date: tonight.date, state: done ? (tonightOver ? 'ja' : 'nei') : 'kveld' },
    ...periodGoals.personal.planned.map((date): PeriodDot => ({ date, state: 'senere' })),
  ]
  return periodState(dots, periodGoals.personal.target, done && tonightOver)
}

export function leaderCardsFor(shiftId: string, to = config.persona.id) {
  return leaderCards.filter((c) => c.shiftId === shiftId && c.to === to)
}

export type CardMoment = { time: string; table: number; tag: MomentId }
/** Et takkekort Kari skriver i demoen: mottaker, øyeblikket fra kvelden og en valgfri overraskelse. */
export interface SentCard {
  to: string
  moment: CardMoment | null
  giftId: string | null
}
export interface ThanksCard {
  moment: CardMoment | null
  category: string
  message: string
  giftId?: string
}

/**
 * Teksten følger øyeblikket – aldri et salgstall. Meldingen lages på gjeldende språk;
 * kategorien er norsk (en nøkkel i i18n-data.ts) og oversettes med td() når den vises.
 */
export function composeCard(c: SentCard): ThanksCard {
  const base = { moment: c.moment, giftId: c.giftId ?? undefined }
  if (c.moment?.tag === 'bursdag')
    return {
      ...base,
      category: 'Gjestens kveld',
      // Samme tekst som det forberedte kortet i leaderCards (bord 15) – nøkkelen i i18n-data.ts.
      message: L('Bursdagsbordet på {table} stoppet meg i døra for å si takk. Du gjorde kvelden deres.', 'The birthday table at {table} stopped me at the door to say thank you. You made their evening.', { table: c.moment.table }),
    }
  if (c.moment?.tag === 'allergi')
    return {
      ...base,
      category: 'Gjestens kveld',
      message: L('Gjesten med allergi på bord {table} følte seg trygg hele kvelden. Takk!', 'The guest with an allergy at table {table} felt safe all evening. Thank you!', { table: c.moment.table }),
    }
  return { ...base, category: 'Beste hjelper', message: L('Takk for kvelden. Laget merket innsatsen din.', 'Thanks for tonight. The team noticed your effort.') }
}

/** Kortet en ansatt får etter vakten: det siste Kari skrev i demoen, ellers det forberedte kortet. */
export function cardFor(shiftId: string, sent: SentCard[], to = config.persona.id): ThanksCard | undefined {
  const mine = sent.filter((c) => c.to === to)
  if (mine.length) return composeCard(mine[mine.length - 1])
  return leaderCardsFor(shiftId, to)[0]
}

/**
 * Takkekort brukt denne uka (mandag–søndag) og hvem som har fått kort de siste 28 dagene.
 * Det forberedte kortet til Emma telles først når vakten er over, og bare hvis Kari ikke har skrevet et selv.
 */
export function cardsOverview(today: string, sent: SentCard[] = [], shiftDone = false) {
  const d = (s: string) => new Date(s + 'T12:00:00').getTime()
  const day = new Date(today + 'T12:00:00').getDay() || 7
  const monday = d(today) - (day - 1) * 86400000
  const scripted = shiftDone ? leaderCards.filter((c) => !sent.some((s) => s.to === c.to)).map((c) => ({ to: c.to, date: c.shiftId })) : []
  const log = [...employer.thanksLog, ...scripted, ...sent.map((c) => ({ to: c.to, date: today }))]
  const used = log.filter((l) => d(l.date) >= monday && d(l.date) <= d(today)).length
  const recent = new Set(log.filter((l) => d(today) - d(l.date) <= 28 * 86400000).map((l) => l.to))
  return { used, quota: employer.cardsPerWeek, recent }
}

// ── Sammenligning innad i kveldens vakt ─────────────────────────────────────

export function teamComparison(): { id: string; name: string; sales: number | null; isMe: boolean }[] {
  const rows: { id: string; name: string; sales: number | null; isMe: boolean }[] = config.colleagues.map((c) => ({
    id: c.id,
    name: c.sharesSales ? c.name : L('Skjult', 'Hidden'),
    sales: c.sharesSales ? team.colleagues[c.id].tonight.sales : null,
    isMe: false,
  }))
  rows.push({ id: config.persona.id, name: config.persona.firstName, sales: tonightSummary.sales, isMe: true })
  // Alfabetisk, ikke rangert. Skjulte nederst.
  return rows.sort((a, b) => (a.sales === null ? 1 : 0) - (b.sales === null ? 1 : 0) || a.name.localeCompare(b.name, 'nb'))
}

// ── Morsomme koblinger (ren statistikk) ─────────────────────────────────────

export function funStats(s: ShiftSummary) {
  return {
    kmPerRedBottle: s.redBottles ? s.activity.km / s.redBottles : null,
    krPer1000Steps: s.activity.steps ? s.sales / (s.activity.steps / 1000) : null,
    highlight: { at: s.activity.hrMaxAt, hr: s.activity.hrMax, what: s.activity.highlight },
  }
}

// ── Månedsoppsummering ──────────────────────────────────────────────────────

export interface MonthSummary {
  month: string // ÅÅÅÅ-MM
  shifts: ShiftSummary[]
  count: number
  hours: number
  sales: number
  avgPerShift: number
  guests: number
  tips: number
  steps: number
  km: number
  marathons: number
  topWine: { key: string; name: string; glasses: number; bottles: number; sales: number }
  bestShift: ShiftSummary
  kudos: { category: KudosCategory; count: number; from: string[] }[]
  kudosTotal: number
}

export function monthSummary(month: string, shifts: ShiftSummary[] = historySummaries): MonthSummary {
  const list = shifts.filter((s) => s.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date))
  const sum = (f: (s: ShiftSummary) => number) => list.reduce((a, s) => a + f(s), 0)
  const wines = new Map<string, { glasses: number; bottles: number; sales: number }>()
  for (const s of list) {
    for (const l of s.lines) {
      const p = product(l.id)
      if (!p.wine) continue
      const w = wines.get(p.wine) ?? { glasses: 0, bottles: 0, sales: 0 }
      if (p.category === 'vinglass') w.glasses += l.qty
      else w.bottles += l.qty
      w.sales += l.sales
      wines.set(p.wine, w)
    }
  }
  // Mest solgt målt i glass (en flaske = 5 glass).
  const units = (w: { glasses: number; bottles: number }) => w.glasses + w.bottles * 5
  const [topKey, top] = [...wines.entries()].sort((a, b) => units(b[1]) - units(a[1]))[0] ?? ['', { glasses: 0, bottles: 0, sales: 0 }]
  const kudosMap = new Map<KudosCategory, string[]>()
  for (const s of list) for (const k of s.kudos) kudosMap.set(k.category, [...(kudosMap.get(k.category) ?? []), k.from])
  const steps = sum((s) => s.activity.steps)
  const km = stepsToKm(steps)
  const salesTotal = sum((s) => s.sales)
  return {
    month,
    shifts: list,
    count: list.length,
    hours: sum((s) => s.hours),
    sales: salesTotal,
    avgPerShift: salesTotal / list.length,
    guests: sum((s) => s.guests),
    tips: sum((s) => s.tips),
    steps,
    km,
    marathons: km / MARATHON_KM,
    topWine: { key: topKey, name: wineNames[topKey] ?? '', ...top },
    bestShift: list.reduce((best, s) => (s.sales > best.sales ? s : best), list[0]),
    kudos: [...kudosMap.entries()].map(([category, from]) => ({ category, count: from.length, from })),
    kudosTotal: list.reduce((a, s) => a + s.kudos.length, 0),
  }
}

export const kudosCategories: KudosCategory[] = ['Beste hjelper', 'Rolig under press', 'Reddet rushet']

// ── Månedshistorien («Din september») ───────────────────────────────────────
// Alt avledes av vaktene i måneden. Personlige rekorder regnes mot hele historikken.

export const MARATHON_KM = 42.195
/** Rekorder som feires i historien – flaskerekorden feires aldri (ingen salgskonkurranse på alkohol). */
export const storyRecordMetrics: RecordMetric[] = ['sales', 'desserts', 'avgCheck']

export interface CalendarCell {
  day: number
  date: string
  col: number
  row: number
  worked: boolean
  hours?: number
}
export interface MonthCalendar {
  cells: CalendarCell[]
  rows: number
  firstCol: number
  days: number
  topWeekday: { col: number; worked: number; inMonth: number }
  allOfTopWeekday: boolean
  weekendShare: number
}

export function monthCalendar(month: string, list: ShiftSummary[]): MonthCalendar {
  const [y, mo] = month.split('-').map(Number)
  const firstCol = (new Date(y, mo - 1, 1, 12).getDay() + 6) % 7
  const days = new Date(y, mo, 0).getDate()
  const cells: CalendarCell[] = Array.from({ length: days }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, '0')}`
    const shift = list.find((s) => s.date === date)
    return { day: i + 1, date, col: (firstCol + i) % 7, row: Math.floor((firstCol + i) / 7), worked: !!shift, hours: shift?.hours }
  })
  const weekdays = Array.from({ length: 7 }, (_, col) => ({ col, worked: cells.filter((c) => c.col === col && c.worked).length, inMonth: cells.filter((c) => c.col === col).length }))
  const topWeekday = weekdays.reduce((b, w) => (w.worked > b.worked ? w : b))
  const weekend = cells.filter((c) => c.worked && (c.col === 4 || c.col === 5)).length
  return {
    cells,
    rows: Math.ceil((firstCol + days) / 7),
    firstCol,
    days,
    topWeekday,
    allOfTopWeekday: topWeekday.worked === topWeekday.inMonth && topWeekday.worked >= 3,
    weekendShare: list.length ? weekend / list.length : 0,
  }
}

export interface ItemQty {
  id: string
  name: string
  qty: number
}
/** Solgte retter per kategori i en periode, mest solgt først. */
export function itemsByCategory(list: ShiftSummary[]): Partial<Record<Category, ItemQty[]>> {
  const qty = new Map<string, number>()
  for (const s of list) for (const [id, n] of Object.entries(s.items)) qty.set(id, (qty.get(id) ?? 0) + (n ?? 0))
  const out: Partial<Record<Category, ItemQty[]>> = {}
  for (const [id, n] of qty) {
    if (!n) continue
    const p = product(id)
    ;(out[p.category] ??= []).push({ id, name: p.name, qty: n })
  }
  for (const k of Object.keys(out) as Category[]) out[k]!.sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name, 'nb'))
  return out
}

export interface RecordLadder {
  baseline: { date: string; value: number }
  steps: { date: string; value: number }[]
}
/** Rekordtrappen: rekordene satt i måneden, med forrige rekord som første trinn. */
export function recordLadder(metric: RecordMetric, month: string, shifts: ShiftSummary[] = historySummaries): RecordLadder | null {
  const set = recordsSetByShift(shifts)
  const sorted = [...shifts].sort((a, b) => a.date.localeCompare(b.date))
  const steps = sorted.filter((s) => s.date.startsWith(month) && set.get(s.id)?.includes(metric)).map((s) => ({ date: s.date, value: s[metric] }))
  if (!steps.length) return null
  const before = sorted.filter((s) => s.date < steps[0].date)
  if (!before.length) return null
  const base = before.reduce((b, s) => (s[metric] > b[metric] ? s : b))
  return { baseline: { date: base.date, value: base[metric] }, steps }
}

/** Andre rekorder satt i måneden (siste per type), uten salg og uten flasker. */
export interface RecordBest {
  metric: RecordMetric
  short: string
  value: number
  date: string
}
export function monthRecordBests(month: string, shifts: ShiftSummary[] = historySummaries): RecordBest[] {
  const set = recordsSetByShift(shifts)
  const sorted = [...shifts].sort((a, b) => a.date.localeCompare(b.date))
  return storyRecordMetrics
    .filter((m) => m !== 'sales')
    .map((metric): RecordBest | null => {
      const s = [...sorted].reverse().find((x) => x.date.startsWith(month) && set.get(x.id)?.includes(metric))
      return s ? { metric, short: recordDefs.find((d) => d.metric === metric)!.short, value: s[metric], date: s.date } : null
    })
    .filter((x): x is RecordBest => x !== null)
}

export interface MonthWalk {
  cumKm: number[]
  laps: number
  target: number
  kmLeft: number
  flags: { at: number; reached: boolean; date: string | null; n: number }[]
  nearly: number | null
}
export function monthWalk(m: MonthSummary): MonthWalk {
  let acc = 0
  const cumKm = m.shifts.map((s) => stepsToKm((acc += s.activity.steps)))
  const laps = Math.max(1, Math.ceil(m.km / MARATHON_KM))
  const target = laps * MARATHON_KM
  const flags = Array.from({ length: laps }, (_, k) => {
    const at = (k + 1) * MARATHON_KM
    const idx = cumKm.findIndex((c) => c >= at)
    return { at, reached: m.km >= at, date: idx >= 0 ? m.shifts[idx].date : null, n: k + 1 }
  })
  return { cumKm, laps, target, kmLeft: target - m.km, flags, nearly: m.marathons % 1 >= 0.9 ? Math.ceil(m.marathons) : null }
}

export interface KudosNote extends Kudos {
  date: string
}

export interface MonthPersona {
  key: string
  title: string
  icon: string
  fromKudos: boolean
  traits: { kind: 'dag' | 'helg' | 'ros' | 'rett'; label: string; icon: string }[]
}
/**
 * Månedstypen bygges bare av ros, kalender og meny – aldri av aktivitet, salg eller tips.
 * Tittel og trekk er ferdig tekst på gjeldende språk (td() på dem i appen er ufarlig).
 */
export function monthPersona(kudosNotes: KudosNote[], calendar: MonthCalendar, topMains: ItemQty[]): MonthPersona {
  const ranked = kudosCategories
    .map((category) => {
      const hits = kudosNotes.filter((k) => k.category === category)
      return { category, n: hits.length, first: hits[0]?.date ?? '9999' }
    })
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n || a.first.localeCompare(b.first))
  const key: string = ranked[0]?.category ?? (calendar.weekendShare >= 0.5 ? 'helg' : 'grunnfjell')
  const meta = config.personaTitles[key]
  const traits: MonthPersona['traits'] = []
  if (calendar.allOfTopWeekday) {
    // «Fredagsfast» / «Friday regular»
    const day = capitalize(weekdayByCol(calendar.topWeekday.col))
    traits.push({ kind: 'dag', label: L('{day}sfast', '{day} regular', { day }), icon: 'calendar' })
  } else if (calendar.weekendShare >= 0.5 && key !== 'helg') traits.push({ kind: 'helg', label: L('Helgehelt', 'Weekend hero'), icon: 'calendar' })
  if (ranked[1]) traits.push({ kind: 'ros', label: td(ranked[1].category), icon: config.kudosIcon[ranked[1].category] ?? 'heart' })
  // «Steak frites-sjef» / «Steak frites pro»
  if (topMains[0]) traits.push({ kind: 'rett', label: L('{dish}-sjef', '{dish} pro', { dish: td(topMains[0].name) }), icon: 'plate' })
  return { key, title: td(meta.title), icon: meta.icon, fromKudos: !!ranked[0], traits: traits.slice(0, 3) }
}

export interface MonthStory extends MonthSummary {
  calendar: MonthCalendar
  houses: number[]
  fullHouses: number
  receipt: { id: string; date: string; sales: number; record: boolean }[]
  topMains: ItemQty[]
  mainsTotal: number
  desserts: { total: number; items: ItemQty[] }
  ladder: RecordLadder | null
  recordBests: RecordBest[]
  walk: MonthWalk
  kudosNotes: KudosNote[]
  persona: MonthPersona
}

export function monthStory(month: string, shifts: ShiftSummary[] = historySummaries): MonthStory | null {
  // En måned uten vakter har ingen historie (Historikk tar over).
  if (!shifts.some((s) => s.date.startsWith(month))) return null
  const m = monthSummary(month, shifts)
  const list = m.shifts
  const calendar = monthCalendar(month, list)
  const seats = config.restaurant.seats
  const full = Math.floor(m.guests / seats)
  const houses = [...Array(full).fill(seats), ...(m.guests % seats ? [m.guests % seats] : [])]
  const set = recordsSetByShift(shifts)
  const cats = itemsByCategory(list)
  const mains = cats.hovedrett ?? []
  const desserts = cats.dessert ?? []
  const kudosNotes = list.flatMap((s) => s.kudos.map((k) => ({ ...k, date: s.date })))
  const topMains = mains.slice(0, 3)
  return {
    ...m,
    calendar,
    houses,
    fullHouses: full,
    receipt: list.map((s) => ({ id: s.id, date: s.date, sales: s.sales, record: set.get(s.id)?.includes('sales') ?? false })),
    topMains,
    mainsTotal: mains.reduce((a, x) => a + x.qty, 0),
    desserts: { total: list.reduce((a, s) => a + s.desserts, 0), items: desserts },
    ladder: recordLadder('sales', month, shifts),
    recordBests: monthRecordBests(month, shifts),
    walk: monthWalk(m),
    kudosNotes,
    persona: monthPersona(kudosNotes, calendar, topMains),
  }
}
export { myDessertAvg, dessertAvgOf }

// ── Profilen: nivå og XP ────────────────────────────────────────────────────

export interface MedalState {
  id: string
  title: string
  icon: string
  goal: number
  value: number
  reached: boolean
  /** Nådd med kveldens vakt */
  tonight: boolean
}

export interface ProfileState {
  xp: number
  level: number
  title: string
  /** XP inn i nåværende nivå, og hvor mye nivået krever */
  into: number
  need: number
  parts: { sales: number; tips: number; medals: number; trophies: number }
  totals: Record<MedalMetric, number>
  medals: MedalState[]
  medalCount: number
  trophies: number
  /** XP og nivå kvelden ga (0 før vakten er lagret) */
  tonightXp: number
  levelUp: boolean
}

/** Alt Emma har gjort på et år: vaktene før appen (profileXp.before) + vaktene i appen. */
function careerTotals(shifts: ShiftSummary[]): Record<MedalMetric, number> {
  const b = profileXp.before
  const sum = (f: (s: ShiftSummary) => number) => shifts.reduce((a, s) => a + f(s), 0)
  return {
    shifts: b.shifts + shifts.length,
    sales: b.sales + sum((s) => s.sales),
    tips: b.tips + sum((s) => s.tips),
    desserts: b.desserts + sum((s) => s.desserts),
    km: b.km + sum((s) => s.activity.km),
    kudos: b.kudos + sum((s) => s.kudos.length),
    guests: b.guests + sum((s) => s.guests),
  }
}

/** Nivået for en XP-sum: hvert nivå krever levelBase + levelStep × nivå. */
export function levelFor(xp: number): { level: number; into: number; need: number } {
  let level = 1
  let rest = xp
  for (;;) {
    const need = profileXp.levelBase + profileXp.levelStep * level
    if (rest < need) return { level, into: rest, need }
    rest -= need
    level++
  }
}

function xpOf(shifts: ShiftSummary[]) {
  const totals = careerTotals(shifts)
  const reached = medals.filter((m) => totals[m.metric] >= m.goal)
  const trophies = profileXp.before.trophies + [...recordsSetByShift(shifts).values()].reduce((a, v) => a + v.length, 0)
  const parts = {
    sales: Math.floor(totals.sales / profileXp.perSalesKr),
    tips: Math.floor(totals.tips / profileXp.perTipsKr),
    medals: reached.length * profileXp.perMedal,
    trophies: trophies * profileXp.perTrophy,
  }
  return { totals, reached, trophies, parts, xp: parts.sales + parts.tips + parts.medals + parts.trophies }
}

/** Profilen: alle vaktene (med kvelden når den er lagret) blir XP, medaljer og et salgsnivå. */
export function profileAt(shifts: ShiftSummary[]): ProfileState {
  const now = xpOf(shifts)
  const hasTonight = shifts.some((s) => s.id === tonightSummary.id)
  const before = hasTonight ? xpOf(shifts.filter((s) => s.id !== tonightSummary.id)) : now
  const lv = levelFor(now.xp)
  const title = [...profileXp.titles].reverse().find((t) => lv.level >= t.from)!.title
  return {
    xp: now.xp,
    ...lv,
    title,
    parts: now.parts,
    totals: now.totals,
    medals: medals.map((m) => ({
      id: m.id,
      title: m.title,
      icon: m.icon,
      goal: m.goal,
      value: now.totals[m.metric],
      reached: now.totals[m.metric] >= m.goal,
      tonight: now.totals[m.metric] >= m.goal && before.totals[m.metric] < m.goal,
    })),
    medalCount: now.reached.length,
    trophies: now.trophies,
    tonightXp: now.xp - before.xp,
    levelUp: lv.level > levelFor(before.xp).level,
  }
}
