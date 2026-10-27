// Personalmenyen: poletter, stempelkort, skattefri gavegrense og Karis samlede oversikt.
// Alt avledes av staffMenu i demoData og kvelden i calc – ingen saldo er skrevet inn for hånd.

import { history, staffMenu, tonight } from '../data/demoData.ts'
import type { MenuItem } from '../data/demoData.ts'
import { lastStepIndex, liveAt, teamAt } from './calc.ts'

/** En bestilling Emma gjør i demoen (lagres i demo-tilstanden). */
export interface Order {
  id: number
  item: string
  date?: string
  /** Vaktønsker godkjennes av Kari. */
  approved?: boolean
}

export type Phase = 'pre' | 'live' | 'done'

export const menuItem = (id: string): MenuItem => staffMenu.items.find((i) => i.id === id)!

/** Vaktønsker må godkjennes av Kari; resten leveres med en gang. */
export const needsApproval = (itemId: string) => menuItem(itemId).deliver === 'vaktplan'

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

export interface WalletState {
  balance: number
  /** Poletter fra kvelden: stempelkortet (når vakten er ferdig) og lagmålet (når laget når det). */
  tonight: number
  tonightTeamGoal: boolean
  earnedTotal: number
  /** Stempler på kortet nå og vakter til neste polett. */
  stamps: number
  card: number
  shiftsToNext: number
  /** Skattefri gavegrense igjen i år. */
  giftRoomKr: number
  /** Sparemålet (gavekortet på 5 000 kr). */
  goal: MenuItem
}

/** Lommeboka på et gitt punkt i demoen, etter bestillingene Emma har gjort. */
export function walletAt(phase: Phase, step: number, orders: Order[]): WalletState {
  const card = staffMenu.stampCard
  const shiftsNow = history.length + (phase === 'done' ? 1 : 0)
  const stempelBefore = Math.floor(history.length / card)
  const stempelNow = Math.floor(shiftsNow / card)
  // Lagmålet nås i løpet av kvelden – polletten kommer i det laget når det (også i rolig modus).
  const live = phase === 'pre' ? null : liveAt(phase === 'done' ? lastStepIndex : step)
  const teamGoal = !!live && teamAt(live).reachedSales
  const tonight = stempelNow - stempelBefore + (teamGoal ? 1 : 0)
  const earnedTotal = stempelBefore + sum(Object.values(staffMenu.earnedBefore)) + tonight
  const spent = sum(orders.map((o) => menuItem(o.item).price))
  const stamps = shiftsNow % card
  return {
    balance: Math.max(0, earnedTotal - spent),
    tonight,
    tonightTeamGoal: teamGoal,
    earnedTotal,
    stamps,
    card,
    shiftsToNext: card - stamps,
    giftRoomKr: Math.max(0, staffMenu.giftLimitKr - staffMenu.otherGiftsKr - sum(orders.map((o) => menuItem(o.item).giftKr))),
    goal: staffMenu.items.find((i) => i.goal)!,
  }
}

/** De neste seks fredagene og lørdagene etter kvelden. */
export function weekendChoices(count = 6): string[] {
  const out: string[] = []
  const d = new Date(`${tonight.date}T12:00:00Z`)
  while (out.length < count) {
    d.setUTCDate(d.getUTCDate() + 1)
    if (d.getUTCDay() === 5 || d.getUTCDay() === 6) out.push(d.toISOString().slice(0, 10))
  }
  return out
}

/** Full dag (to har allerede fri), eller allerede en ønskefri samme måned. */
export function dateBlocked(date: string, orders: Order[]): 'full' | 'tatt' | null {
  if (staffMenu.fullDates.includes(date)) return 'full'
  if (orders.some((o) => o.item === 'onskefri' && o.date?.slice(0, 7) === date.slice(0, 7))) return 'tatt'
  return null
}

export interface TeamMenuState {
  budgetKr: number
  usedKr: number
  /** De mest bestilte rettene, uten navn. */
  popular: { item: MenuItem; count: number }[]
  /** Vaktønsker som venter på Kari (hun må vite hvem og hvilken dag). */
  pending: Order[]
}

/** Karis oversikt: budsjett og populære retter for hele laget – aldri hvem som har hvor mange poletter. */
export function teamMenuAt(orders: Order[]): TeamMenuState {
  const counts: Record<string, number> = { ...staffMenu.team.orders }
  for (const o of orders) counts[o.item] = (counts[o.item] ?? 0) + 1
  return {
    budgetKr: staffMenu.team.budgetKr,
    usedKr: sum(Object.entries(counts).map(([id, n]) => menuItem(id).costKr * n)),
    popular: Object.entries(counts)
      .map(([id, count]) => ({ item: menuItem(id), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3),
    pending: orders.filter((o) => needsApproval(o.item) && !o.approved),
  }
}
