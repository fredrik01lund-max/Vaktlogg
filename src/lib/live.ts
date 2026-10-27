// Lager korte varsler (toasts) når vakten går fra ett steg til det neste.
// Alt er avledet av tallene i calc.ts – ingen varsler er hardkodet med tall.
// Høyst ett varsel per steg, valgt etter fast prioritet, og ingen negative varsler.
// Tittel og tekst lages på gjeldende språk når varselet lages (L/td fra i18n.ts).

import { colleagueName, config } from '../config.ts'
import type { GameId } from '../data/demoData.ts'
import { bingoAt, duelAt, duelOpponentId, duelToEven, ghostPassed, historyBest, liveAt, liveMetric, pairAt, pairGoal, prizeById, recordDefs, teamAt, teamPeriod, tonightSteps } from './calc.ts'
import { periodGoals } from '../data/demoData.ts'
import { kr, num } from './format.ts'
import { L, td } from '../i18n.ts'

export type ToastKind = 'record' | 'kudos' | 'duel' | 'team' | 'info'

export interface ToastMsg {
  kind: ToastKind
  title: string
  body: string
  celebrate?: boolean
  /** Ansikter som vises i varselet (lagøyeblikk). */
  faces?: string[]
  /** Ikon i varselet (overstyrer ikonet for typen). */
  icon?: string
  /** Varselet hører til Karis telefon (ellers Emmas). */
  boss?: boolean
}

export interface NotifyOptions {
  calm: boolean
  game: GameId
  giftId: string
}

const allFaces = [config.persona.id, ...config.colleagues.map((c) => c.id)]

function recordBody(metric: string, value: number, prev: number): string {
  switch (metric) {
    case 'premiumBottles':
      return L('{value} flasker over 1 500 kr på én vakt. Forrige rekord var {prev}.', '{value} bottles over 1,500 kr in one shift. Your previous record was {prev}.', { value: num(value), prev: num(prev) })
    case 'sales':
      return L('Du har passert {prev} – ditt høyeste salg noensinne. Og vakten er ikke over.', "You've passed {prev} – your highest sales ever. And the shift isn't over yet.", { prev: kr(prev) })
    case 'desserts':
      return L('{value} desserter – forrige rekord var {prev}.', '{value} desserts – your previous record was {prev}.', { value: num(value), prev: num(prev) })
    default:
      return L('Ny personlig rekord.', 'New personal best.')
  }
}

/** Felles tekst i duellvarslene. */
const duelFair = () => L('Dere måles mot hver deres vanlige kveld.', "You're each measured against your own usual night.")

export function notificationsFor(prevIndex: number, nextIndex: number, opts: NotifyOptions): ToastMsg[] {
  const prev = liveAt(prevIndex)
  const next = liveAt(nextIndex)
  const step = tonightSteps[nextIndex]
  const play = !opts.calm
  // Kandidater i prioritert rekkefølge – den første som finnes, vises.
  const candidates: ToastMsg[] = []

  // 1. Lagmålet nås: kvelden teller mot månedens lagpremie.
  const tp = teamAt(prev)
  const tn = teamAt(next)
  if (play && tn.reachedSales && !tp.reachedSales) {
    const period = teamPeriod(next, false)
    const vars = { count: num(period.count), target: num(period.target), month: td(periodGoals.monthName), prize: td(prizeById(opts.giftId).title) }
    candidates.push({
      kind: 'team',
      icon: 'team',
      title: L('Lagmålet er nådd!', 'Team goal reached!'),
      body: L('{count} av {target} i {month} – {prize}', '{count} of {target} in {month} – {prize}', vars),
      celebrate: true,
      faces: allFaces,
    })
  }

  // 2. Personlige rekorder – vises også i rolig modus, de er ikke en konkurranse.
  for (const d of recordDefs) {
    if (d.metric === 'avgCheck') continue
    const best = historyBest[d.metric]
    if (liveMetric(prev, d.metric) <= best && liveMetric(next, d.metric) > best) {
      candidates.push({
        kind: 'record',
        title: L('Ny rekord: {record}', 'New record: {record}', { record: td(d.short).toLowerCase() }),
        body: recordBody(d.metric, liveMetric(next, d.metric), best),
        celebrate: play,
      })
    }
  }

  // 3. Makkeroppdraget fullført.
  if (play && opts.game === 'makker' && pairAt(next).reached && !pairAt(prev).reached) {
    const partner = pairAt(next).partnerId
    candidates.push({
      kind: 'team',
      icon: 'pair',
      title: L('Makkeroppdrag fullført!', 'Buddy goal reached!'),
      body: L('Du og {name} nådde {n} desserter sammen.', 'You and {name} hit {n} desserts together.', { name: colleagueName(partner), n: num(pairGoal()) }),
      celebrate: true,
      faces: [config.persona.id, partner],
    })
  }

  // 4. Fullt bingobrett for hele laget.
  if (play && bingoAt(next).full && !bingoAt(prev).full) {
    candidates.push({
      kind: 'team',
      icon: 'grid',
      title: L('Fullt bingobrett!', 'Full bingo board!'),
      body: L('Hele laget fylte brettet sammen i kveld.', 'The whole team filled the board together tonight.'),
      celebrate: true,
      faces: allFaces,
    })
  }

  // 5. Laget går forbi forrige fredag (spøkelset).
  if (play && opts.game !== 'rolig' && ghostPassed(prev, next)) {
    candidates.push({
      kind: 'team',
      icon: 'ghost',
      title: L('Forbi forrige fredag!', 'Ahead of last Friday!'),
      body: L('Laget er foran fredagslaget på samme klokkeslett.', "The team is ahead of last Friday's team at the same time of night."),
      celebrate: true,
      faces: allFaces,
    })
  }

  // 6. Ros fra kollega.
  if (step.kudos) {
    const k = step.kudos
    candidates.push({
      kind: 'kudos',
      title: L('Kudos fra {name}: «{category}»', 'Kudos from {name}: “{category}”', { name: colleagueName(k.from), category: td(k.category) }),
      body: k.message ? td(k.message) : '',
      faces: [k.from],
    })
  }

  // 7. Duellstatus – peker på oppgaven, aldri på at noen taper.
  if (play && opts.game === 'duell' && step.kind === 'duel') {
    const d = duelAt(next)
    const toEven = duelToEven(d)
    const over = num(Math.round(d.me.overAvg))
    if (d.leader === 'me')
      candidates.push({
        kind: 'duel',
        title: L('Du leder dessertduellen', "You're leading the dessert duel"),
        body: d.me.overAvg > 0 ? L('Du ligger {n} % over din vanlige kveld.', "You're {n}% above your usual night.", { n: over }) : duelFair(),
        faces: [config.persona.id, duelOpponentId()],
      })
    else if (toEven > 0)
      candidates.push({
        kind: 'duel',
        title: L('{n} desserter til jevnt', toEven === 1 ? '{n} more dessert to tie' : '{n} more desserts to tie', { n: num(toEven) }),
        body: duelFair(),
        faces: [config.persona.id, duelOpponentId()],
      })
  }

  return candidates.slice(0, 1)
}

export function startNotifications(opts: NotifyOptions): ToastMsg[] {
  if (opts.calm) return []
  if (opts.game === 'duell') {
    const opp = colleagueName(duelOpponentId())
    return [
      {
        kind: 'duel',
        title: L('{name} sa ja til duellen', '{name} accepted the duel', { name: opp }),
        body: L('Flest desserter i kveld. Den som går mest over sin vanlige kveld, vinner.', 'Most desserts tonight. Whoever beats their usual night by the most wins.'),
        faces: [config.persona.id, duelOpponentId()],
      },
    ]
  }
  if (opts.game === 'makker') {
    const partner = pairAt(liveAt(-1)).partnerId
    return [
      {
        kind: 'team',
        icon: 'pair',
        title: L('Du og {name} er makkere', 'You and {name} are buddies', { name: colleagueName(partner) }),
        body: L('Felles mål: {n} desserter sammen i kveld.', 'Shared goal: {n} desserts together tonight.', { n: num(pairGoal()) }),
        faces: [config.persona.id, partner],
      },
    ]
  }
  return []
}
