// Sjekker at all tekst fra demodataene, config.ts og calc.ts som appen viser med td(), har engelsk i src/i18n-data.ts.
// Kjører også en røyktest på engelsk: varsler, takkekort og månedstypen (som lages med L() i calc.ts/live.ts)
// skal ikke inneholde norsk.
// Kjør: node scripts/i18n-data-check.ts   (Node 22.18+ / 24 kjører TypeScript direkte)

import { config } from '../src/config.ts'
import {
  bingo,
  campaign,
  duel,
  employer,
  history,
  lastCampaign,
  leaderCards,
  periodGoals,
  personalChallenge,
  products,
  rewardCatalog,
  tonight,
  wineNames,
} from '../src/data/demoData.ts'
import type { GameId, LeaderCardCategory } from '../src/data/demoData.ts'
import { composeCard, historySummaries, kudosCategories, lastStepIndex, monthStory, recordDefs, teamComparison, tonightSummary } from '../src/lib/calc.ts'
import { notificationsFor, startNotifications } from '../src/lib/live.ts'
import { dataEn } from '../src/i18n-data.ts'
import { missingData, setLang, td } from '../src/i18n.ts'

// ── 1. Samle all tekst appen viser med td() ─────────────────────────────────
// Ikke med: egennavn som er like på begge språk (appnavn, restaurant, by, personnavn) og tall som «2026».

const found = new Map<string, Set<string>>()
function add(where: string, ...texts: (string | undefined)[]) {
  for (const t of texts) {
    if (!t) continue
    if (!found.has(t)) found.set(t, new Set())
    found.get(t)!.add(where)
  }
}

// config.ts
add('config.appTagline', config.appTagline)
add('config.demoLabel', config.demoLabel)
add('config.employer.role', config.employer.role)
add('config.persona.role', config.persona.role)
add('config.persona.section', config.persona.section)
for (const c of config.colleagues) add('config.colleagues[].section', c.section)
for (const p of Object.values(config.personaTitles)) add('config.personaTitles[].title', p.title)
add('config.kudosIcon (kategorier)', ...Object.keys(config.kudosIcon))

// demoData.ts: menyen
add('wineNames', ...Object.values(wineNames))
for (const p of products) add('products[].name', p.name)

// demoData.ts: tidligere vakter
for (const h of history) {
  add('history[].activity.highlight', h.activity.highlight)
  for (const k of h.kudos) {
    add('history[].kudos[].category', k.category)
    add('history[].kudos[].message', k.message)
  }
}

// demoData.ts: kveldens vakt
for (const st of tonight.steps) {
  add('tonight.steps[].title', st.title)
  for (const s of st.seat ?? []) {
    add('tonight.steps[].seat[].wishes', ...(s.wishes ?? []))
    for (const a of s.allergies ?? []) add('tonight.steps[].seat[].allergies[].what', a.what)
  }
  for (const w of st.waiting ?? []) add('tonight.steps[].waiting[].what', w.what)
  if (st.kudos) {
    add('tonight.steps[].kudos.category', st.kudos.category)
    add('tonight.steps[].kudos.message', st.kudos.message)
  }
}
for (const k of tonight.kudosAfter) {
  add('tonight.kudosAfter[].category', k.category)
  add('tonight.kudosAfter[].message', k.message)
}

// demoData.ts: spill, kampanje, premier og mål
add('duel.title', duel.title)
add('campaign', campaign.title, campaign.dish, campaign.week, campaign.unitLabel, campaign.weekLabel)
add('lastCampaign', lastCampaign.week, lastCampaign.dish)
add('bingo.week', bingo.week)
for (const r of rewardCatalog) add('rewardCatalog[].title', r.title)
add('periodGoals.monthName', periodGoals.monthName)
add('periodGoals.team.rule', periodGoals.team.rule)
add('periodGoals.personal.rule', periodGoals.personal.rule)
const y = periodGoals.year
add('periodGoals.year', y.setBy, y.rule, y.trip.place, y.trip.when)
for (const p of y.trip.plan) add('periodGoals.year.trip.plan[]', p.title, p.text)
add('periodGoals.year.trip.why[]', ...y.trip.why)
add('employer.agreement.with', employer.agreement.with)
for (const c of leaderCards) add('leaderCards[]', c.category, c.message)
add('personalChallenge.title', personalChallenge.title)

// calc.ts
for (const d of recordDefs) add('recordDefs[]', d.title, d.short)
add('kudosCategories', ...kudosCategories)
for (const tag of ['bursdag', 'allergi', null] as const) {
  add('composeCard().category', composeCard({ to: config.persona.id, moment: tag ? { time: '17:40', table: 15, tag } : null, giftId: null }).category)
}
// Beregnede felt som sendes videre fra dataene (skal allerede være med over, men sjekkes som appen ser dem)
add('tonightSummary.activity.highlight', tonightSummary.activity.highlight)
for (const s of [...historySummaries, tonightSummary]) for (const l of s.lines) add('ShiftSummary.lines[].name', l.name)
for (const month of ['2026-09', '2026-10']) {
  const st = monthStory(month, [...historySummaries, tonightSummary])
  if (!st) continue
  add('monthStory().topWine.name', st.topWine.name)
  for (const k of st.kudos) add('monthStory().kudos[].category', k.category)
  for (const b of st.recordBests) add('monthStory().recordBests[].short', b.short)
  for (const m of st.topMains) add('monthStory().topMains[].name', m.name)
}

// Alle kategoriene et takkekort kan ha (typen LeaderCardCategory i demoData.ts)
const cardCategories: LeaderCardCategory[] = ['Gjestens kveld', 'Rolig under press', 'Beste hjelper', 'Hjalp et annet lag']
add('LeaderCardCategory', ...cardCategories)
// opponentName faller tilbake til «Kollega» (calc.ts) hvis motstanderen mangler i config.ts
add('opponentName (reserve)', 'Kollega')

const texts = [...found.keys()]
const missing = missingData(texts)
console.log(`\nTEKST FRA DATAENE: ${texts.length} ulike tekster, ${Object.keys(dataEn).length} i ordlisten`)
for (const t of missing) console.log(`  ✗ mangler: «${t}»  (${[...found.get(t)!].join(', ')})`)
const unused = Object.keys(dataEn).filter((k) => !found.has(k))
if (unused.length) console.log(`  · i ordlisten, men ikke funnet i dataene (ok hvis appen bruker dem direkte): ${unused.map((u) => `«${u}»`).join(', ')}`)

// ── 2. Røyktest på engelsk ──────────────────────────────────────────────────

setLang('en')
const norwegian = /[æøåÆØÅ]|\b(og|ikke|til|av|med|på|du|deg|din|ditt|dere|bord|gjest|gjester|kveld|kvelden|laget|vakt|vakten|ros|rekord|desserter|flasker|takk|sammen|fredag|nådd|har|er|fra)\b/
const english: { where: string; text: string }[] = []
const say = (where: string, text: string | undefined) => {
  if (text) english.push({ where, text })
}

for (const t of texts) say(`td(«${t}»)`, td(t))
const games: GameId[] = ['duell', 'makker', 'laget', 'rolig']
const teamPrizes = rewardCatalog.filter((r) => r.scope === 'lag').map((r) => r.id)
for (const game of games) {
  for (const calm of [false, true]) {
    for (const giftId of teamPrizes) {
      const opts = { calm, game, giftId }
      for (const m of startNotifications(opts)) say(`startNotifications(${game})`, `${m.title} | ${m.body}`)
      for (let i = 0; i <= lastStepIndex; i++) {
        for (const m of notificationsFor(i - 1, i, opts)) say(`notificationsFor(${tonight.steps[i].time}, ${game})`, `${m.title} | ${m.body}`)
      }
    }
  }
}
for (const tag of ['bursdag', 'allergi', null] as const) {
  const card = composeCard({ to: config.persona.id, moment: tag ? { time: '18:05', table: 13, tag } : null, giftId: null })
  say(`composeCard(${tag})`, card.message)
  say(`composeCard(${tag}).category`, td(card.category))
}
for (const month of ['2026-09', '2026-10']) {
  for (const list of [historySummaries, [...historySummaries, tonightSummary]]) {
    const p = monthStory(month, list)?.persona
    if (!p) continue
    say(`monthStory(${month}).persona.title`, p.title)
    for (const t of p.traits) say(`monthStory(${month}).persona.traits[${t.kind}]`, t.label)
  }
}
for (const r of teamComparison()) say('teamComparison().name', r.name)

// Fransk og egennavn som står likt på engelsk («Côtes du Rhône» er ikke norsk «du»).
const sameInEnglish = /Côtes du Rhône/g
const bad = english.filter((e) => norwegian.test(e.text.replace(sameInEnglish, '')))
const seen = new Set<string>()
console.log(`\nRØYKTEST PÅ ENGELSK: ${english.length} tekster`)
for (const e of bad) {
  const line = `  ✗ ${e.where}: ${e.text}`
  if (!seen.has(line)) console.log(line)
  seen.add(line)
}
// Noen eksempler, så det er lett å lese over formuleringene
const samples = [...new Set(english.filter((e) => !e.where.startsWith('td(')).map((e) => e.text))]
for (const s of samples) console.log(`  · ${s}`)
setLang('no')

const failures = missing.length + bad.length
console.log(failures ? `\n${missing.length} mangler i ordlisten, ${bad.length} engelske tekster med norsk` : `\n0 mangler – all tekst fra dataene har engelsk`)
process.exit(failures ? 1 : 0)
