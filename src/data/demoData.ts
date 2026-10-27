// ─────────────────────────────────────────────────────────────────────────────
//  ALLE DEMO-DATA FOR VAKTLOGG  (fiktive)
//
//  Her ligger bare rådata: meny, hva som ble solgt, tips, aktivitet og ros.
//  Summer, snitt, rekorder, duell, lagmål, kampanje og månedsoppsummering
//  beregnes i src/lib/calc.ts, slik at tallene alltid stemmer med hverandre.
//  Kjør `npm run verify` etter endringer for å se de beregnede tallene.
// ─────────────────────────────────────────────────────────────────────────────

export type Category = 'forrett' | 'hovedrett' | 'dessert' | 'vinglass' | 'vinflaske' | 'ol' | 'cocktail'
export type WineColor = 'rod' | 'hvit' | 'musserende'
export type KudosCategory = 'Beste hjelper' | 'Rolig under press' | 'Reddet rushet'

export interface Product {
  id: string
  name: string
  category: Category
  price: number
  /** Nøkkel som samler glass og flaske av samme vin. */
  wine?: string
  /** Hvor mange «glass» varen teller i kampanjen (flaske = 5 glass). */
  campaignUnits?: number
}

export interface Kudos {
  from: string // kollega-id fra config.ts
  category: KudosCategory
  message?: string
}

/** Antall solgte enheter per produkt-id. */
export type ItemCounts = Record<string, number>

export interface ShiftActivity {
  steps: number
  hrAvg: number
  hrMax: number
  hrMaxAt: string
  /** Hva som skjedde da pulsen var høyest. */
  highlight: string
}

export interface HistoryShift {
  id: string
  date: string // ÅÅÅÅ-MM-DD
  start: string
  end: string
  guests: number
  tips: number
  items: ItemCounts
  activity: ShiftActivity
  kudos: Kudos[]
  /** Øyeblikk fra restaurantens reservasjoner (f.eks. bursdag) – brukes på postkortet i månedshistorien. */
  moments?: MomentId[]
}

export type StepKind = 'seat' | 'order' | 'bottle' | 'rush' | 'quiet' | 'kudos' | 'duel' | 'team' | 'pay' | 'end'

export interface ShiftStep {
  time: string
  kind: StepKind
  title: string
  /**
   * Nye bordsettinger. `party` er en intern nøkkel for selskapet.
   * `walkIn` = kom uten reservasjon. Alle andre var reservert før vakten, og
   * antallet reservasjoner utgjør startpunktet for nedtellingen «bord igjen».
   */
  seat?: { party: string; table: number; guests: number; walkIn?: boolean; allergies?: Allergy[]; wishes?: string[] }[]
  orders?: { party: string; items: ItemCounts }[]
  /** Betaling med tips via kortterminal. */
  pay?: { party: string; tip: number }[]
  /** Bord som venter for lenge (fra kassen/kjøkkenskjermen): hva de venter på og siden når. */
  waiting?: { party: string; what: string; since: string }[]
  /** Ventingen er over for disse selskapene (maten kom, regningen ble levert). */
  served?: string[]
  kudos?: Kudos
  /** Serveringsøyeblikk fra bookingsystemet (brukes av vaktbingo og takkekort). */
  moments?: MomentId[]
}

/** Allergi eller kosthold fra bookingen (eller notert ved bordet): hva og hvor mange ved bordet. */
export interface Allergy {
  what: string
  guests: number
}

/** Øyeblikk på vaktbingo-brettet. Ingen handler om alkohol eller pris. */
export type MomentId = 'bursdag' | 'allergi' | 'stamgjest' | 'lop' | 'fri' | 'hjelp' | 'alkoholfri' | 'fullthus' | 'gjesteros'

// ── Meny ────────────────────────────────────────────────────────────────────

export const wineNames: Record<string, string> = {
  husets_hvit: 'Husets hvitvin',
  gruner: 'Grüner Veltliner',
  cotes: 'Côtes du Rhône',
  pinot: 'Pinot Noir, Bourgogne',
  cremant: 'Crémant de Loire',
  prosecco: 'Prosecco',
  rioja: 'Rioja Reserva',
  chablis: 'Chablis',
  amarone: 'Amarone',
  barolo: 'Barolo',
  meursault: 'Meursault',
  champagne: 'Champagne Brut',
}

export const wineColors: Record<string, WineColor> = {
  husets_hvit: 'hvit',
  gruner: 'hvit',
  cotes: 'rod',
  pinot: 'rod',
  cremant: 'musserende',
  prosecco: 'musserende',
  rioja: 'rod',
  chablis: 'hvit',
  amarone: 'rod',
  barolo: 'rod',
  meursault: 'hvit',
  champagne: 'musserende',
}

export const products: Product[] = [
  { id: 'loksuppe', name: 'Løksuppe gratinée', category: 'forrett', price: 145 },
  { id: 'ceviche', name: 'Steinbitceviche', category: 'forrett', price: 165 },
  { id: 'tartar', name: 'Tartar av okse', category: 'forrett', price: 185 },
  { id: 'blaskjell', name: 'Blåskjell, liten', category: 'forrett', price: 155 },
  { id: 'burrata', name: 'Burrata med tomat', category: 'forrett', price: 175 },

  { id: 'moules', name: 'Moules frites', category: 'hovedrett', price: 285 },
  { id: 'steak', name: 'Steak frites', category: 'hovedrett', price: 365 },
  { id: 'torsk', name: 'Torsk med beurre blanc', category: 'hovedrett', price: 345 },
  { id: 'and', name: 'Andebryst', category: 'hovedrett', price: 375, campaignUnits: 1 },
  { id: 'coq', name: 'Coq au vin', category: 'hovedrett', price: 315 },
  { id: 'risotto', name: 'Soppisotto', category: 'hovedrett', price: 265 },
  { id: 'entrecote', name: 'Entrecôte 300 g', category: 'hovedrett', price: 395 },

  { id: 'brulee', name: 'Crème brûlée', category: 'dessert', price: 125 },
  { id: 'fondant', name: 'Sjokoladefondant', category: 'dessert', price: 145 },
  { id: 'tatin', name: 'Tarte tatin', category: 'dessert', price: 135 },
  { id: 'sorbet', name: 'Sitronsorbet', category: 'dessert', price: 115 },

  { id: 'hvit_gl', name: 'Husets hvitvin, glass', category: 'vinglass', price: 119, wine: 'husets_hvit' },
  { id: 'gruner_gl', name: 'Grüner Veltliner, glass', category: 'vinglass', price: 139, wine: 'gruner' },
  { id: 'cotes_gl', name: 'Côtes du Rhône, glass', category: 'vinglass', price: 129, wine: 'cotes' },
  { id: 'pinot_gl', name: 'Pinot Noir, glass', category: 'vinglass', price: 159, wine: 'pinot' },
  { id: 'cremant_gl', name: 'Crémant, glass', category: 'vinglass', price: 149, wine: 'cremant' },

  { id: 'prosecco', name: 'Prosecco, flaske', category: 'vinflaske', price: 495, wine: 'prosecco' },
  { id: 'gruner_fl', name: 'Grüner Veltliner, flaske', category: 'vinflaske', price: 649, wine: 'gruner' },
  { id: 'cotes_fl', name: 'Côtes du Rhône, flaske', category: 'vinflaske', price: 595, wine: 'cotes' },
  { id: 'rioja', name: 'Rioja Reserva, flaske', category: 'vinflaske', price: 795, wine: 'rioja' },
  { id: 'chablis', name: 'Chablis, flaske', category: 'vinflaske', price: 895, wine: 'chablis' },
  { id: 'pinot_fl', name: 'Pinot Noir, flaske', category: 'vinflaske', price: 1090, wine: 'pinot' },
  { id: 'amarone', name: 'Amarone, flaske', category: 'vinflaske', price: 1550, wine: 'amarone' },
  { id: 'barolo', name: 'Barolo, flaske', category: 'vinflaske', price: 1650, wine: 'barolo' },
  { id: 'meursault', name: 'Meursault, flaske', category: 'vinflaske', price: 1750, wine: 'meursault' },
  { id: 'champagne', name: 'Champagne Brut, flaske', category: 'vinflaske', price: 1900, wine: 'champagne' },

  { id: 'pils', name: 'Pils fra fat', category: 'ol', price: 99 },
  { id: 'ipa', name: 'IPA', category: 'ol', price: 119 },

  { id: 'negroni', name: 'Negroni', category: 'cocktail', price: 175 },
  { id: 'espresso', name: 'Espresso martini', category: 'cocktail', price: 185 },
  { id: 'french75', name: 'French 75', category: 'cocktail', price: 165 },
]

/** «Flasker over 1 500 kr» teller vinflasker med pris over denne grensen. */
export const premiumBottleThreshold = 1500

// ── Historikk: Emmas 14 forrige vakter ──────────────────────────────────────

export const history: HistoryShift[] = [
  {
    id: '2026-09-03', date: '2026-09-03', start: '16:00', end: '22:00', guests: 34, tips: 1660,
    items: { loksuppe: 3, ceviche: 2, tartar: 3, blaskjell: 1, burrata: 2, moules: 4, steak: 6, torsk: 7, and: 3, coq: 5, risotto: 2, entrecote: 6, brulee: 5, fondant: 2, tatin: 1, cotes_fl: 3, rioja: 1, pinot_fl: 1, barolo: 1, pils: 4, negroni: 3, french75: 2 },
    activity: { steps: 9640, hrAvg: 96, hrMax: 132, hrMaxAt: '19:30', highlight: 'Seks gjester kom samtidig uten reservasjon' },
    kudos: [],
  },
  {
    id: '2026-09-04', date: '2026-09-04', start: '16:00', end: '23:30', guests: 49, tips: 2710,
    items: { loksuppe: 1, tartar: 5, blaskjell: 2, burrata: 3, moules: 7, steak: 13, torsk: 2, and: 6, coq: 7, risotto: 7, entrecote: 6, brulee: 6, fondant: 3, tatin: 1, sorbet: 2, prosecco: 1, cotes_fl: 3, rioja: 1, chablis: 1, pinot_fl: 1, barolo: 1, champagne: 2, pils: 5, ipa: 2, espresso: 6 },
    activity: { steps: 12980, hrAvg: 101, hrMax: 144, hrMaxAt: '19:00', highlight: 'Rushtid med fullt hus' },
    kudos: [],
  },
  {
    id: '2026-09-08', date: '2026-09-08', start: '16:00', end: '22:00', guests: 22, tips: 1180,
    items: { loksuppe: 2, ceviche: 1, tartar: 2, blaskjell: 2, burrata: 2, moules: 6, steak: 4, torsk: 4, coq: 1, risotto: 4, entrecote: 2, brulee: 1, fondant: 2, tatin: 1, hvit_gl: 1, gruner_gl: 2, cotes_gl: 1, pinot_gl: 1, cremant_gl: 1, cotes_fl: 2, pinot_fl: 1, pils: 4, ipa: 1, negroni: 2, french75: 2 },
    activity: { steps: 7820, hrAvg: 91, hrMax: 121, hrMaxAt: '18:45', highlight: 'Et stort selskap i seksjon 1 trengte en hånd' },
    kudos: [],
  },
  {
    id: '2026-09-11', date: '2026-09-11', start: '16:00', end: '23:30', guests: 51, tips: 3190,
    items: { loksuppe: 1, tartar: 4, blaskjell: 3, burrata: 4, moules: 9, steak: 14, torsk: 6, and: 7, coq: 3, risotto: 6, entrecote: 4, brulee: 2, fondant: 4, tatin: 4, sorbet: 1, gruner_fl: 1, cotes_fl: 3, rioja: 2, chablis: 1, amarone: 1, barolo: 1, champagne: 2, pils: 2, ipa: 3, espresso: 6 },
    activity: { steps: 13380, hrAvg: 103, hrMax: 147, hrMaxAt: '20:15', highlight: 'To bord ville betale mens kjøkkenet ropte «service»' },
    kudos: [{ from: 'ingrid', category: 'Rolig under press', message: 'Du holdt hodet kaldt da kjøkkenet lå etter.' }],
  },
  {
    id: '2026-09-12', date: '2026-09-12', start: '16:00', end: '23:30', guests: 53, tips: 3410,
    items: { loksuppe: 4, tartar: 9, burrata: 4, moules: 7, steak: 12, torsk: 12, and: 1, coq: 4, risotto: 8, entrecote: 9, brulee: 7, fondant: 5, tatin: 2, sorbet: 1, prosecco: 1, gruner_fl: 1, cotes_fl: 2, rioja: 3, chablis: 1, barolo: 1, champagne: 1, pils: 9, ipa: 2, negroni: 5, espresso: 1 },
    activity: { steps: 13920, hrAvg: 104, hrMax: 149, hrMaxAt: '19:45', highlight: 'Lørdagsrush: hele seksjonen satt på en halvtime' },
    kudos: [{ from: 'sander', category: 'Beste hjelper', message: 'Takk for at du bar ut maten min i rushet.' }],
  },
  {
    id: '2026-09-16', date: '2026-09-16', start: '16:00', end: '22:00', guests: 25, tips: 1850,
    items: { loksuppe: 3, tartar: 2, blaskjell: 4, burrata: 2, moules: 2, steak: 2, torsk: 5, and: 5, coq: 6, risotto: 3, entrecote: 1, fondant: 4, tatin: 1, hvit_gl: 12, gruner_gl: 4, cotes_gl: 4, pinot_gl: 3, cremant_gl: 2, prosecco: 2, cotes_fl: 1, rioja: 1, pils: 5, ipa: 1, negroni: 2, espresso: 3 },
    activity: { steps: 8290, hrAvg: 92, hrMax: 125, hrMaxAt: '19:15', highlight: 'Et firmaselskap ved langbordet' },
    kudos: [],
  },
  {
    id: '2026-09-18', date: '2026-09-18', start: '16:00', end: '23:30', guests: 47, tips: 3330,
    items: { loksuppe: 5, ceviche: 3, tartar: 4, blaskjell: 3, burrata: 3, moules: 3, steak: 12, torsk: 9, and: 5, coq: 3, risotto: 8, entrecote: 6, brulee: 7, fondant: 2, sorbet: 1, cotes_fl: 2, chablis: 5, amarone: 1, barolo: 1, pils: 1, ipa: 4, espresso: 5 },
    activity: { steps: 12410, hrAvg: 99, hrMax: 141, hrMaxAt: '18:50', highlight: 'Tre bord satt på ti minutter' },
    kudos: [],
  },
  {
    id: '2026-09-19', date: '2026-09-19', start: '16:00', end: '23:30', guests: 52, tips: 3980,
    items: { loksuppe: 11, tartar: 2, blaskjell: 4, burrata: 2, moules: 11, steak: 10, torsk: 5, and: 8, coq: 5, risotto: 3, entrecote: 9, brulee: 9, fondant: 3, tatin: 1, prosecco: 3, gruner_fl: 1, cotes_fl: 2, pinot_fl: 1, champagne: 3, pils: 7, ipa: 3, espresso: 5, french75: 3 },
    activity: { steps: 14060, hrAvg: 104, hrMax: 148, hrMaxAt: '20:00', highlight: 'Bursdagsselskap med kake og sang' },
    moments: ['bursdag'],
    kudos: [{ from: 'jonas', category: 'Reddet rushet', message: 'Du tok to av bordene mine uten å blunke.' }],
  },
  {
    id: '2026-09-24', date: '2026-09-24', start: '16:00', end: '22:00', guests: 36, tips: 2690,
    items: { loksuppe: 2, ceviche: 4, tartar: 2, blaskjell: 1, burrata: 3, moules: 5, steak: 7, torsk: 7, and: 3, coq: 7, risotto: 3, entrecote: 4, fondant: 4, tatin: 2, sorbet: 1, cotes_fl: 1, rioja: 1, chablis: 1, pinot_fl: 2, amarone: 1, pils: 5, ipa: 1, negroni: 2, espresso: 2 },
    activity: { steps: 10120, hrAvg: 97, hrMax: 135, hrMaxAt: '19:20', highlight: 'Kortterminalen streiket i ti minutter' },
    kudos: [],
  },
  {
    id: '2026-09-25', date: '2026-09-25', start: '16:00', end: '23:30', guests: 50, tips: 2620,
    items: { loksuppe: 3, ceviche: 2, tartar: 6, blaskjell: 1, burrata: 3, moules: 6, steak: 8, torsk: 13, and: 4, coq: 11, risotto: 4, entrecote: 3, brulee: 7, fondant: 2, tatin: 2, sorbet: 1, prosecco: 2, cotes_fl: 1, rioja: 2, chablis: 1, pinot_fl: 1, amarone: 1, barolo: 1, champagne: 1, pils: 9, ipa: 1, negroni: 1, espresso: 5 },
    activity: { steps: 13010, hrAvg: 101, hrMax: 145, hrMaxAt: '19:10', highlight: 'Fullt hus og kø ved baren' },
    kudos: [{ from: 'ingrid', category: 'Beste hjelper', message: 'Du dekket på nytt for meg tre ganger!' }],
  },
  {
    id: '2026-10-02', date: '2026-10-02', start: '16:00', end: '23:30', guests: 48, tips: 2670,
    items: { loksuppe: 5, tartar: 8, blaskjell: 3, burrata: 2, moules: 8, steak: 10, torsk: 11, and: 6, coq: 3, risotto: 3, entrecote: 6, brulee: 4, fondant: 3, tatin: 3, sorbet: 1, gruner_fl: 1, cotes_fl: 3, rioja: 1, chablis: 1, pinot_fl: 1, barolo: 1, champagne: 1, pils: 7, ipa: 3, negroni: 3, espresso: 3 },
    activity: { steps: 12620, hrAvg: 100, hrMax: 143, hrMaxAt: '19:30', highlight: 'Rushtid etter en konsert i nærheten' },
    kudos: [],
  },
  {
    id: '2026-10-03', date: '2026-10-03', start: '16:00', end: '23:30', guests: 50, tips: 3050,
    items: { tartar: 3, blaskjell: 6, burrata: 3, moules: 8, steak: 9, torsk: 5, and: 4, coq: 6, risotto: 7, entrecote: 10, brulee: 6, fondant: 3, tatin: 3, cotes_fl: 1, rioja: 2, chablis: 3, pinot_fl: 1, amarone: 1, barolo: 1, meursault: 1, champagne: 1, ipa: 5, espresso: 2 },
    activity: { steps: 13540, hrAvg: 102, hrMax: 146, hrMaxAt: '20:10', highlight: 'Fire bord satt på ett kvarter' },
    kudos: [{ from: 'jonas', category: 'Rolig under press' }],
  },
  {
    id: '2026-10-07', date: '2026-10-07', start: '16:00', end: '22:00', guests: 23, tips: 1350,
    items: { loksuppe: 2, ceviche: 2, tartar: 2, blaskjell: 1, burrata: 3, moules: 3, steak: 5, torsk: 6, coq: 1, risotto: 1, entrecote: 6, fondant: 3, tatin: 1, hvit_gl: 3, gruner_gl: 1, cotes_gl: 2, pinot_gl: 1, cremant_gl: 1, cotes_fl: 2, rioja: 1, pils: 4, ipa: 1, negroni: 1, espresso: 3 },
    activity: { steps: 7610, hrAvg: 90, hrMax: 119, hrMaxAt: '18:30', highlight: 'Et bord med åtte gjester kom en time for tidlig' },
    kudos: [],
  },
  {
    id: '2026-10-09', date: '2026-10-09', start: '16:00', end: '23:30', guests: 47, tips: 3090,
    items: { loksuppe: 7, tartar: 4, blaskjell: 3, burrata: 3, moules: 12, steak: 13, torsk: 6, and: 5, coq: 5, risotto: 4, entrecote: 2, brulee: 3, fondant: 5, sorbet: 2, rioja: 3, chablis: 3, pinot_fl: 1, meursault: 1, champagne: 1, pils: 6, ipa: 3, espresso: 3 },
    activity: { steps: 12290, hrAvg: 100, hrMax: 142, hrMaxAt: '19:05', highlight: 'Rushtid og to allergibestillinger samtidig' },
    kudos: [],
  },
]

// ── Kveldens vakt: fredag 16. oktober ───────────────────────────────────────

export const tonight = {
  id: '2026-10-16',
  date: '2026-10-16',
  start: '16:00',
  end: '23:30',

  steps: [
    {
      time: '16:20', kind: 'seat', title: 'Bord 11: to gjester før teatret',
      seat: [
        { party: 'A', table: 11, guests: 2, wishes: ['Skal i teatret kl. 19 – rask servering'] },
        { party: 'R', table: 13, guests: 2 },
        { party: 'U', table: 14, guests: 2 },
        { party: 'W', table: 15, guests: 2, wishes: ['Tidlig middag – rekker kino kl. 18'] },
      ],
      orders: [{ party: 'A', items: { steak: 1, torsk: 1, cotes_gl: 1, gruner_gl: 1 } }],
    },
    {
      time: '16:45', kind: 'order', title: 'Bord 12 bestiller fire hovedretter',
      seat: [
        { party: 'B', table: 12, guests: 4, wishes: ['Barnestol til én'] },
        { party: 'Z', table: 16, guests: 3 },
        { party: 'AB', table: 17, guests: 2, walkIn: true },
      ],
      orders: [
        { party: 'B', items: { ceviche: 1, steak: 2, coq: 1, risotto: 1, cotes_gl: 2, pils: 2 } },
        { party: 'R', items: { moules: 1, coq: 1, hvit_gl: 2 } },
        { party: 'U', items: { tartar: 1, moules: 1, pils: 2 } },
        { party: 'W', items: { risotto: 1, torsk: 1, hvit_gl: 2 } },
        { party: 'AB', items: { pils: 2, tartar: 1 } },
      ],
    },
    {
      time: '17:15', kind: 'seat', title: 'Bord 14: to glass Pinot Noir',
      seat: [{ party: 'C', table: 14, guests: 2, wishes: ['Ønsket vindusbord'] }],
      orders: [
        { party: 'C', items: { entrecote: 1, risotto: 1, pinot_gl: 2 } },
        { party: 'Z', items: { loksuppe: 1, steak: 2, coq: 1 } },
      ],
      pay: [{ party: 'U', tip: 60 }, { party: 'W', tip: 80 }],
    },
    {
      time: '17:40', kind: 'bottle', title: 'Bursdag på 15: champagne og Barolo',
      moments: ['bursdag'],
      seat: [
        { party: 'D', table: 15, guests: 6, wishes: ['Bursdag – lys i desserten'] },
        { party: 'AE', table: 17, guests: 2 },
      ],
      orders: [
        { party: 'D', items: { champagne: 1, barolo: 1, steak: 3, and: 2, torsk: 1 } },
        { party: 'AE', items: { ceviche: 1, entrecote: 1, pinot_gl: 2 } },
      ],
      pay: [{ party: 'R', tip: 80 }, { party: 'AB', tip: 30 }],
    },
    {
      time: '18:05', kind: 'order', title: 'Bord 13 satt – én gjest med allergi',
      moments: ['allergi'],
      seat: [{ party: 'E', table: 13, guests: 3, walkIn: true, allergies: [{ what: 'Nøtter', guests: 1 }] }],
      orders: [
        { party: 'E', items: { pils: 2, ipa: 1, moules: 2, steak: 1 } },
        { party: 'B', items: { brulee: 2 } },
      ],
      pay: [{ party: 'A', tip: 100 }, { party: 'Z', tip: 120 }],
    },
    {
      time: '18:30', kind: 'rush', title: 'Rushtid: tre bord på fem minutter',
      waiting: [{ party: 'E', what: 'hovedretten', since: '18:05' }],
      seat: [
        { party: 'F', table: 16, guests: 4, allergies: [{ what: 'Gluten', guests: 1 }] },
        { party: 'G', table: 17, guests: 2, wishes: ['Feirer bryllupsdag'] },
        { party: 'H', table: 11, guests: 4 },
      ],
      orders: [
        { party: 'F', items: { torsk: 2, coq: 1, risotto: 1, hvit_gl: 2 } },
        { party: 'G', items: { gruner_gl: 2, moules: 2 } },
        { party: 'H', items: { amarone: 1, steak: 2, and: 2 } },
      ],
      pay: [{ party: 'B', tip: 200 }, { party: 'AE', tip: 90 }],
    },
    {
      time: '18:50', kind: 'kudos', title: 'Ingrid sendte deg kudos',
      served: ['E'],
      seat: [{ party: 'AD', table: 12, guests: 2, walkIn: true }],
      orders: [
        { party: 'C', items: { fondant: 1 } },
        { party: 'AD', items: { negroni: 2 } },
      ],
      kudos: { from: 'ingrid', category: 'Reddet rushet', message: 'Du tok bord 22 for meg da jeg hadde tre bord på en gang. Tusen takk!' },
    },
    {
      time: '19:15', kind: 'duel', title: 'Status i dessertduellen',
      seat: [{ party: 'S', table: 13, guests: 2, walkIn: true }],
      orders: [{ party: 'S', items: { ipa: 2, moules: 1 } }],
      pay: [{ party: 'C', tip: 110 }, { party: 'E', tip: 0 }],
    },
    {
      time: '19:30', kind: 'seat', title: 'Bord 12 er satt igjen – fem gjester',
      seat: [
        { party: 'I', table: 12, guests: 5, allergies: [{ what: 'Laktose', guests: 2 }] },
        { party: 'AC', table: 17, guests: 3, walkIn: true },
      ],
      orders: [
        { party: 'I', items: { cotes_fl: 1, steak: 3, coq: 2 } },
        { party: 'D', items: { brulee: 2, tatin: 1 } },
      ],
      pay: [{ party: 'G', tip: 100 }, { party: 'AD', tip: 30 }],
    },
    {
      time: '19:45', kind: 'order', title: 'Bord 14 satt – fire gjester',
      seat: [{ party: 'J', table: 14, guests: 4, wishes: ['Én vegetar'] }],
      orders: [
        { party: 'J', items: { risotto: 1, torsk: 2, steak: 1, gruner_fl: 1 } },
        { party: 'F', items: { fondant: 1 } },
        { party: 'H', items: { tatin: 2 } },
        { party: 'AC', items: { prosecco: 1, ceviche: 1 } },
      ],
    },
    {
      time: '20:10', kind: 'quiet', title: 'Stille periode – bord 15 og 11 betalt',
      pay: [{ party: 'D', tip: 640 }, { party: 'H', tip: 410 }, { party: 'S', tip: 50 }],
    },
    {
      time: '20:15', kind: 'seat', title: 'Bord 13 satt igjen – to gjester',
      seat: [
        { party: 'K', table: 13, guests: 2, walkIn: true },
        { party: 'O', table: 11, guests: 2, walkIn: true },
      ],
      orders: [
        { party: 'K', items: { pils: 2, moules: 1, coq: 1 } },
        { party: 'O', items: { hvit_gl: 2, blaskjell: 1 } },
      ],
      pay: [{ party: 'F', tip: 170 }, { party: 'AC', tip: 60 }],
    },
    {
      time: '20:35', kind: 'bottle', title: 'Bord 17 bestiller Meursault og Barolo',
      waiting: [{ party: 'J', what: 'regningen', since: '20:15' }],
      seat: [
        { party: 'L', table: 17, guests: 6, allergies: [{ what: 'Gluten', guests: 1 }], wishes: ['Firmamiddag – én samlet regning'] },
        { party: 'X', table: 15, guests: 4, wishes: ['Overraskelse – sjefen fyller 50'] },
        { party: 'AA', table: 16, guests: 2, walkIn: true },
      ],
      orders: [
        { party: 'L', items: { meursault: 1, barolo: 1, entrecote: 2, coq: 2, torsk: 2 } },
        { party: 'X', items: { steak: 2, torsk: 1, coq: 1, cotes_gl: 2 } },
        { party: 'AA', items: { french75: 2 } },
      ],
    },
    {
      time: '20:55', kind: 'duel', title: 'Status i dessertduellen',
      served: ['J'],
      orders: [
        { party: 'I', items: { brulee: 1 } },
        { party: 'J', items: { fondant: 1 } },
      ],
    },
    {
      time: '21:15', kind: 'order', title: 'Bord 16 satt igjen – fire gjester',
      seat: [{ party: 'M', table: 16, guests: 4 }],
      orders: [{ party: 'M', items: { gruner_gl: 2, steak: 2, moules: 2 } }],
      pay: [{ party: 'I', tip: 230 }, { party: 'K', tip: 80 }, { party: 'O', tip: 40 }, { party: 'AA', tip: 30 }],
    },
    {
      time: '21:30', kind: 'seat', title: 'Andre sitting: fire bord på en gang',
      seat: [
        { party: 'N', table: 11, guests: 4, wishes: ['Stamgjester – liker bord 11'] },
        { party: 'P', table: 12, guests: 2 },
        { party: 'T', table: 13, guests: 2 },
        { party: 'V', table: 14, guests: 2, walkIn: true },
      ],
      orders: [
        { party: 'N', items: { espresso: 1, steak: 1, and: 1, risotto: 1, torsk: 1 } },
        { party: 'P', items: { entrecote: 1, risotto: 1, gruner_gl: 2 } },
        { party: 'T', items: { moules: 2, pils: 2 } },
        { party: 'V', items: { cotes_gl: 2, tartar: 1 } },
      ],
      pay: [{ party: 'J', tip: 190 }],
    },
    {
      time: '21:50', kind: 'team', title: 'Lagmålet nærmer seg',
      orders: [{ party: 'L', items: { brulee: 1 } }],
    },
    {
      time: '22:15', kind: 'order', title: 'Bord 11 deler to desserter',
      seat: [{ party: 'AF', table: 15, guests: 2, walkIn: true }],
      orders: [
        { party: 'N', items: { tatin: 1, fondant: 1 } },
        { party: 'AF', items: { espresso: 2 } },
      ],
      pay: [{ party: 'X', tip: 170 }],
    },
    {
      time: '22:40', kind: 'pay', title: 'Bord 17, 16 og 14 har betalt',
      pay: [{ party: 'L', tip: 560 }, { party: 'M', tip: 170 }, { party: 'V', tip: 40 }],
    },
    {
      time: '23:05', kind: 'pay', title: 'De siste bordene har betalt',
      pay: [{ party: 'N', tip: 200 }, { party: 'P', tip: 100 }, { party: 'T', tip: 70 }, { party: 'AF', tip: 30 }],
    },
    {
      time: '23:30', kind: 'end', title: 'Vakten er over – klar for oppgjør',
    },
  ] as ShiftStep[],

  /** Ros som kommer inn etter vakten. */
  kudosAfter: [
    { from: 'jonas', category: 'Beste hjelper', message: 'Takk for at du hjalp meg å bære ut til bord 31 midt i rushet.' },
  ] as Kudos[],

  /** Fra klokken (demo): skritt per halvtime fra 16:00, og puls hvert kvarter fra 16:00 til 23:30. */
  activity: {
    stepsPerHalfHour: [420, 610, 780, 820, 1050, 1180, 1120, 980, 760, 880, 940, 900, 820, 760, 690],
    heartRate: [84, 88, 92, 95, 93, 97, 99, 104, 106, 112, 131, 147, 128, 112, 108, 105, 101, 92, 104, 118, 109, 103, 106, 101, 98, 96, 94, 92, 90, 88, 86],
  },
}

// ── Vaktlaget ───────────────────────────────────────────────────────────────

/**
 * Kollegenes tall kommer fra deres egne apper. De vises bare samlet i lagmålet,
 * og enkeltvis bare for dem som deler (se config.ts).
 */
export const team = {
  /**
   * dessertHistory: desserter de siste 14 vaktene (siste = forrige fredag) – grunnlaget for handikapet i duellen
   * og for makkermålet. dessertTimes: når de solgte desserter i kveld. Alle kan inviteres til Duell eller Makker.
   */
  colleagues: {
    jonas: {
      tonight: { sales: 37400, desserts: 19, campaignUnits: 4 },
      lastFriday: { sales: 35850, desserts: 17 },
      dessertHistory: [15, 12, 16, 9, 18, 14, 13, 17, 10, 15, 16, 14, 12, 17],
      dessertTimes: ['17:40', '17:55', '18:10', '18:20', '18:35', '18:45', '19:00', '19:10', '19:30', '19:50', '20:05', '20:25', '20:40', '21:00', '21:20', '21:40', '22:00', '22:20', '22:45'],
    },
    ingrid: {
      tonight: { sales: 33200, desserts: 16, campaignUnits: 5 },
      lastFriday: { sales: 32120, desserts: 14 },
      dessertHistory: [11, 14, 12, 15, 13, 10, 14, 16, 12, 13, 14, 12, 15, 14],
      dessertTimes: ['17:50', '18:15', '18:40', '18:55', '19:05', '19:25', '19:40', '20:00', '20:20', '20:45', '21:05', '21:25', '21:45', '22:05', '22:25', '22:50'],
    },
    sander: {
      tonight: { sales: 30800, desserts: 15, campaignUnits: 3 },
      lastFriday: { sales: 29480, desserts: 13 },
      dessertHistory: [12, 10, 14, 11, 13, 9, 12, 14, 11, 12, 13, 10, 12, 13],
      dessertTimes: ['17:45', '18:05', '18:25', '18:50', '19:10', '19:20', '19:45', '20:10', '20:30', '20:50', '21:10', '21:35', '21:55', '22:15', '22:40'],
    },
    maja: {
      tonight: { sales: 34900, desserts: 17, campaignUnits: 4 },
      lastFriday: { sales: 33624, desserts: 15 },
      dessertHistory: [14, 13, 15, 12, 16, 14, 13, 15, 12, 14, 15, 13, 14, 15],
      dessertTimes: ['17:35', '18:00', '18:20', '18:30', '18:50', '19:15', '19:35', '19:55', '20:15', '20:35', '20:55', '21:15', '21:30', '21:50', '22:10', '22:30', '22:55'],
    },
  } as Record<string, { tonight: { sales: number; desserts: number; campaignUnits: number }; lastFriday: { sales: number; desserts: number }; dessertHistory: number[]; dessertTimes: string[] }>,

  /** Emmas vakt forrige fredag (fra historikken). */
  lastFridayShiftId: '2026-10-09',

  /** Lagmålet: forrige fredag + 5 %, rundet til nærmeste 5 000 kr (avledes i calc.ts). */
  goal: { stretch: 1.05, roundTo: 5000, dessertTarget: 80 },

  /**
   * Spøkelsesfredag: hvor stor andel av forrige fredags lagsalg som var gjort ved hvert
   * klokkeslett (tidlig teaterpublikum). Spøkelset på lagringen følger denne kurven.
   */
  lastFridayCurve: [['16:00', 0], ['17:00', 0.1], ['18:00', 0.29], ['19:00', 0.48], ['20:00', 0.645], ['21:00', 0.79], ['22:00', 0.92], ['23:00', 0.99], ['23:30', 1]] as [string, number][],

  /**
   * Hvor stor andel av kveldens salg som typisk er gjort ved et gitt klokkeslett.
   * Brukes til å vise kollegenes fremdrift live (de har egne vakter i demoen).
   */
  salesCurve: [['16:00', 0], ['17:00', 0.06], ['18:00', 0.18], ['19:00', 0.38], ['20:00', 0.58], ['21:00', 0.75], ['22:00', 0.9], ['23:00', 0.985], ['23:30', 1]] as [string, number][],
}

// ── Duell ───────────────────────────────────────────────────────────────────

export const duel = {
  metric: 'desserter',
  title: 'Flest desserter',
  challengedAt: '15:12',
  acceptedAt: '15:40',
}

// ── Restaurantens kampanje ──────────────────────────────────────────────────

/**
 * Ukens rett: et felles stempelkort for alle som er med. Alle deltakere får ett likt
 * lodd uansett hvor mye de selv solgte, og restauranten trekker vinnerne søndag.
 * Kampanjer kan aldri gjelde alkohol.
 */
export const campaign = {
  title: 'Ukens rett',
  productId: 'and',
  dish: 'Andebryst',
  week: '12.–18. oktober',
  targetUnits: 70,
  unitLabel: 'porsjoner',
  /** Ett stempel per så mange porsjoner. */
  stampSize: 5,
  /** Solgt av alle som er med, mandag–torsdag. */
  soldBeforeTonight: 34,
  winners: 2,
  /** Lagpremie når laget når ukens mål – et lite mål, en mindre premie. */
  prizeId: 'pizza',
  weekLabel: 'uke 42',
  drawDate: '2026-10-18',
  /** Kollegene som er med (Emma kommer i tillegg når hun sier ja). */
  participants: ['jonas', 'ingrid', 'sander', 'maja'],
}

/** Forrige ukes rett – trekningen er gjort. Emmas porsjoner hentes fra historikken. */
export const lastCampaign = {
  week: '5.–11. oktober',
  productId: 'coq',
  dish: 'Coq au vin',
  targetUnits: 60,
  /** Solgt av de andre deltakerne den uka. */
  soldByOthers: 58,
  from: '2026-10-05',
  to: '2026-10-11',
  participants: ['emma', 'jonas', 'ingrid', 'sander', 'maja'],
  drawn: ['ingrid', 'sander'],
  prizeId: 'chefstable',
}

// ── Kveldens spill ──────────────────────────────────────────────────────────

/**
 * Ved vaktstart velger hver ansatt kveldens spill. Spillet styrer den innerste ringen.
 * Duell og Makker krever at begge har sagt ja. Rolig viser bare din egen ring.
 */
export type GameId = 'duell' | 'makker' | 'laget' | 'rolig'

export const gameNight = {
  options: ['duell', 'makker', 'laget', 'rolig'] as GameId[],
  /** Hvem Emma inviterer til Duell og Makker hvis hun ikke velger noen andre før vakten. */
  defaultInvites: { duell: 'jonas', makker: 'ingrid' },
  /** Emmas forrige valg er forhåndsvalgt. */
  defaultForEmma: 'duell' as GameId,
}

/** Makker: et felles dessertmål for to, satt 10 % over summen av deres vanlige kvelder. */
export const pair = {
  stretch: 1.1,
}

// ── Vaktbingo ───────────────────────────────────────────────────────────────

/** Ett felles brett for vaktlaget. Hvem som helst kan fylle en rute; ingen telling per person. */
export const bingo = {
  week: '12.–18. oktober',
  grid: [
    ['bursdag', 'allergi', 'stamgjest'],
    ['lop', 'fri', 'hjelp'],
    ['alkoholfri', 'fullthus', 'gjesteros'],
  ] as MomentId[][],
  /** Ruter kollegene fylte i kveld. */
  colleagueMoments: [
    { tile: 'lop', by: 'sander', at: '19:15' },
    { tile: 'alkoholfri', by: 'ingrid', at: '19:45' },
    { tile: 'stamgjest', by: 'maja', at: '20:10' },
    { tile: 'gjesteros', by: 'jonas', at: '21:15' },
  ] as { tile: MomentId; by: string; at: string }[],
  /** Ruter som fylles av hele laget (fra bookingsystemet). */
  teamMoments: [{ tile: 'fullthus', at: '19:30' }] as { tile: MomentId; at: string }[],
}

// ── Premier og anerkjennelse fra arbeidsgiver ───────────────────────────────

export type RewardScope = 'lag' | 'person' | 'trekning'

/**
 * Premiekatalogen arbeidsgiver kan velge fra. Ingen kronebeløp, ingen alkohol og ingen
 * privilegier som går på bekostning av kolleger (som vaktvalg).
 */
export const rewardCatalog: { id: string; title: string; icon: string; scope: RewardScope }[] = [
  { id: 'frankrike', title: 'Firmatur til Frankrike', icon: 'medal', scope: 'lag' },
  { id: 'staffdinner', title: 'Staff dinner på restauranten', icon: 'chefhat', scope: 'lag' },
  { id: 'pizza', title: 'Pizza etter stengetid', icon: 'pizza', scope: 'lag' },
  { id: 'familymeal', title: 'Family meal søndag', icon: 'pot', scope: 'lag' },
  { id: 'kino', title: 'Kinokveld for laget', icon: 'film', scope: 'lag' },
  { id: 'frokost', title: 'Frokost før lørdagsvakta', icon: 'coffee', scope: 'lag' },
  { id: 'kinobilletter', title: 'Kinobilletter for to', icon: 'film', scope: 'person' },
  { id: 'brunsj', title: 'Brunsj for to', icon: 'coffee', scope: 'person' },
  { id: 'chefstable', title: "Chef's table for to", icon: 'chefhat', scope: 'trekning' },
]

/**
 * Premier for et mål over en periode – aldri for én enkelt vakt.
 * Laget: lagmålet nådd på et antall helgevakter i måneden (resultatene før i kveld).
 * Personlig: over ditt eget dessertsnitt på et antall vakter (regnes fra historikken).
 */
export const periodGoals = {
  month: '2026-10',
  monthName: 'oktober',
  from: '2026-10-01',
  to: '2026-10-31',
  team: {
    target: 6,
    rule: 'Lagmålet nådd på 6 av 10 helgevakter',
    /** Alle fredags- og lørdagsvakter i oktober. */
    shifts: ['2026-10-02', '2026-10-03', '2026-10-09', '2026-10-10', '2026-10-16', '2026-10-17', '2026-10-23', '2026-10-24', '2026-10-30', '2026-10-31'],
    /** Om laget nådde lagmålet på vaktene før i kveld. */
    before: { '2026-10-02': true, '2026-10-03': true, '2026-10-09': false, '2026-10-10': true } as Record<string, boolean>,
  },
  personal: {
    target: 5,
    prizeId: 'kinobilletter',
    rule: 'Over ditt eget dessertsnitt på 5 vakter',
    /** Emmas planlagte vakter resten av måneden. */
    planned: ['2026-10-17', '2026-10-23', '2026-10-30'],
  },
  /**
   * Gullmedaljen: årets lagmål, satt av ledelsen. Én sum for hele serveringslaget gjennom hele året –
   * det langsiktige målet som er bra både for laget og for restauranten. Den største premien.
   * Alle andre premier er kortere motivasjoner (måned, uke, deg selv).
   */
  year: {
    label: '2026',
    from: '2026-01-01',
    to: '2026-12-31',
    /** Omsetningsmål for hele serveringslaget i året. */
    target: 8_500_000,
    /** Lagets salg i år før i kveld (fra kassen). Kveldens salg legges til live. */
    soldBeforeTonight: 6_720_000,
    prizeId: 'frankrike',
    setBy: 'Ledelsen',
    rule: 'Serveringslaget selger for 8,5 mill. kr i 2026',
    trip: {
      days: 6,
      place: 'Bourgogne',
      when: 'mars 2027',
      plan: [
        { icon: 'plane', title: 'Reise og hotell', text: 'Hele serveringslaget reiser sammen. Restauranten betaler.' },
        { icon: 'leafglass', title: 'Tre dager med kurs', text: 'Hos en familieprodusent i Bourgogne: druer, kjeller og mat sammen med viner.' },
        { icon: 'sun', title: 'Tre dager ferie', text: 'Fri med laget – ingen program.' },
      ],
      why: [
        'Dere lærer mer om det dere serverer – det merker gjestene.',
        'Restauranten får et bedre år. Laget får reisen.',
      ],
    },
  },
}

export const employer = {
  /** Ordningen er avtalt med tillitsvalgt og evalueres. */
  agreement: { with: 'tillitsvalgt', agreedAt: '2026-09-28', evaluateAt: '2026-12-01' },
  cardsPerWeek: 3,
  /** Lagets premie for månedens mål (kan endres i Karis telefon). */
  teamGift: { prizeId: 'staffdinner', placedAt: '2026-09-30' },
  /** Takkekort sendt de siste 28 dagene (bare dato og mottaker). */
  thanksLog: [
    { to: 'jonas', date: '2026-09-26' },
    { to: 'ingrid', date: '2026-10-02' },
    { to: 'sander', date: '2026-10-13' },
  ],
}

export type LeaderCardCategory = 'Gjestens kveld' | 'Rolig under press' | 'Beste hjelper' | 'Hjalp et annet lag'

/**
 * Takkekort fra Kari: uanmeldt, for et konkret øyeblikk fra restaurantens reservasjoner –
 * aldri for et salgstall. Kan ha en liten overraskelse med.
 */
export const leaderCards: {
  id: string
  to: string
  shiftId: string
  moment: { time: string; table: number; tag: MomentId }
  category: LeaderCardCategory
  message: string
  giftId?: string
  sentAt: string
}[] = [
  {
    id: 'k-2026-10-16-emma',
    to: 'emma',
    shiftId: '2026-10-16',
    moment: { time: '17:40', table: 15, tag: 'bursdag' },
    category: 'Gjestens kveld',
    message: 'Bursdagsbordet på 15 stoppet meg i døra for å si takk. Du gjorde kvelden deres.',
    sentAt: '23:40',
  },
]

// ── Personlig utfordring ────────────────────────────────────────────────────

/** Emma har selv valgt å prøve å slå salgsrekorden sin denne vakten. */
export const personalChallenge = { metric: 'sales' as const, title: 'Slå salgsrekorden din' }

// ── Profilen: nivå og XP ────────────────────────────────────────────────────

/**
 * Alt på profilen blir XP: salg og tips fra alle vaktene, medaljer (milepæler) og trofeer
 * (personlige rekorder). Hvert nivå krever litt mer XP enn det forrige, så de første går fort.
 */
export const profileXp = {
  /** 1 XP per så mange kroner solgt */
  perSalesKr: 100,
  /** 1 XP per så mange kroner i tips */
  perTipsKr: 10,
  perMedal: 250,
  perTrophy: 500,
  /** XP fra nivå L til L+1 = levelBase + levelStep × L */
  levelBase: 200,
  levelStep: 100,
  /**
   * Emma har jobbet her i et år. Vaktene før appen ble tatt i bruk (fra kassesystemet) teller med på profilen,
   * sammen med vaktene i historikken og kvelden.
   */
  before: { shifts: 136, sales: 3_700_000, tips: 362_000, desserts: 1_310, km: 1_070, kudos: 22, guests: 5_480, trophies: 21 },
  titles: [
    { from: 1, title: 'Ny på gulvet' },
    { from: 5, title: 'Servitør' },
    { from: 10, title: 'Erfaren' },
    { from: 15, title: 'Salgsproff' },
    { from: 20, title: 'Legende' },
  ],
}

export type MedalMetric = 'shifts' | 'sales' | 'tips' | 'desserts' | 'km' | 'kudos' | 'guests'

/** Medaljer: milepæler over alle vaktene. */
export const medals: { id: string; title: string; icon: string; metric: MedalMetric; goal: number }[] = [
  { id: 'vakt10', title: '10 vakter', icon: 'clock', metric: 'shifts', goal: 10 },
  { id: 'vakt100', title: '100 vakter', icon: 'calendar', metric: 'shifts', goal: 100 },
  { id: 'vakt200', title: '200 vakter', icon: 'calendar', metric: 'shifts', goal: 200 },
  { id: 'salg1m', title: '1 million solgt', icon: 'receipt', metric: 'sales', goal: 1_000_000 },
  { id: 'salg2m', title: '2,5 millioner solgt', icon: 'receipt', metric: 'sales', goal: 2_500_000 },
  { id: 'salg5m', title: '5 millioner solgt', icon: 'receipt', metric: 'sales', goal: 5_000_000 },
  { id: 'tips100', title: '100 000 kr i tips', icon: 'coins', metric: 'tips', goal: 100_000 },
  { id: 'tips400', title: '400 000 kr i tips', icon: 'coins', metric: 'tips', goal: 400_000 },
  { id: 'dessert1000', title: '1 000 desserter', icon: 'dessert', metric: 'desserts', goal: 1_000 },
  { id: 'maraton', title: 'Et maraton gått', icon: 'steps', metric: 'km', goal: 42.2 },
  { id: 'km1000', title: '1 000 km gått', icon: 'steps', metric: 'km', goal: 1_000 },
  { id: 'ros25', title: 'Kudos 25 ganger', icon: 'heart', metric: 'kudos', goal: 25 },
  { id: 'gjester5000', title: '5 000 gjester', icon: 'guests', metric: 'guests', goal: 5_000 },
]

// ── Personalmenyen: poletter og belønninger ────────────────────────────────

/**
 * XP er nivået (status) og brukes aldri opp. Poletter er det du bestiller med, og de tjenes bare på det
 * du styrer selv – aldri på salg, tips eller kudos. Restauranten setter sammen menyen.
 */
export type MenuCat = 'tid' | 'smak' | 'gaver' | 'hemmelig'
export type MenuDelivery = 'vaktplan' | 'kjokken' | 'bord' | 'sms' | 'lagkassa'
export type PolettRule = 'stempel' | 'lagmal' | 'fremgang' | 'dekke'

export interface MenuItem {
  id: string
  cat: MenuCat
  title: string
  /** Én linje om hva du får. */
  desc: string
  icon: string
  /** Pris i poletter. */
  price: number
  /** Hva det koster restauranten (kr) – Karis budsjett. */
  costKr: number
  /** Verdi som teller mot den skattefrie gavegrensen (kr). */
  giftKr: number
  deliver: MenuDelivery
  /** Velg en fredag eller lørdag. */
  date?: boolean
  /** Hemmelig meny: låses opp av nivået. */
  minLevel?: number
  /** Sparemålet: hele gavegrensen i ett gavekort. */
  goal?: boolean
}

export const staffMenu = {
  /** Skattefrie gaver fra jobben per år (gavekort som ikke kan veksles inn regnes som gave). */
  giftLimitKr: 5000,
  /** Andre gaver fra jobben i år (sommergave og bursdagsgave) – de teller mot den samme grensen. */
  otherGiftsKr: 2200,
  /** Hver 4. fullførte vakt gir en polett. */
  stampCard: 4,
  rules: [
    { id: 'stempel' as PolettRule, title: 'Hver 4. vakt', icon: 'check' },
    { id: 'lagmal' as PolettRule, title: 'Laget når lagmålet', icon: 'team' },
    { id: 'fremgang' as PolettRule, title: '5 vakter på rad over eget snitt', icon: 'repeat' },
    { id: 'dekke' as PolettRule, title: 'Tar en vakt for en kollega', icon: 'helping' },
  ],
  /** Poletter tjent før kvelden utenom stempelkortet (det regnes ut fra vaktene i historikken). */
  earnedBefore: { lagmal: 3, fremgang: 1, dekke: 1 },
  /** Fredager og lørdager der to allerede har fri. */
  fullDates: ['2026-10-24'],
  items: [
    { id: 'onskefri', cat: 'tid', title: 'Ønskefri fredag eller lørdag', desc: 'Maks én per måned', icon: 'house', price: 8, costKr: 0, giftKr: 0, deliver: 'vaktplan', date: true },
    { id: 'seksjon', cat: 'tid', title: 'Velg seksjon på neste vakt', desc: 'Settes rett i vaktplanen', icon: 'grid', price: 2, costKr: 0, giftKr: 0, deliver: 'vaktplan' },
    { id: 'favoritt', cat: 'smak', title: 'Kokken lager favoritten din', desc: 'Til personalmaten etter vakta', icon: 'chefhat', price: 2, costKr: 60, giftKr: 150, deliver: 'kjokken' },
    { id: 'middag', cat: 'smak', title: 'Middag for to', desc: 'Tre retter, alkoholfritt', icon: 'plate', price: 8, costKr: 400, giftKr: 1200, deliver: 'bord' },
    { id: 'sko', cat: 'gaver', title: 'Gavekort på arbeidssko', desc: '1 000 kr til nye sko', icon: 'steps', price: 12, costKr: 1000, giftKr: 1000, deliver: 'sms' },
    { id: 'gavekort', cat: 'gaver', title: 'Gavekort på 5 000 kr', desc: 'Sparemålet ditt', icon: 'gift', price: 60, costKr: 5000, giftKr: 5000, deliver: 'sms', goal: true },
    { id: 'lagkassa', cat: 'gaver', title: 'Gi til lagkassa', desc: '80 kr til personalfesten', icon: 'team', price: 1, costKr: 80, giftKr: 0, deliver: 'lagkassa' },
    { id: 'kokkensbord', cat: 'hemmelig', title: 'Kokkens bord', desc: 'Middag for to ved kjøkkenbenken', icon: 'sparkle', price: 10, costKr: 500, giftKr: 1500, deliver: 'bord', minLevel: 40 },
    { id: 'ukensrett', cat: 'hemmelig', title: 'Lag ukens rett med kokken', desc: 'Din rett på menyen i en uke', icon: 'pot', price: 15, costKr: 300, giftKr: 0, deliver: 'kjokken', minLevel: 50 },
  ] as MenuItem[],
  /** Karis budsjett for høsten, og hva resten av laget har bestilt (antall – aldri hvem). */
  team: { budgetKr: 15000, orders: { lagkassa: 9, favoritt: 7, onskefri: 5, seksjon: 4, middag: 2 } as Record<string, number> },
}
