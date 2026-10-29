// Tall- og datoformat på gjeldende språk (i18n.ts).
// Norsk: mellomrom som tusenskille, komma som desimaltegn, «fredag 16. oktober».
// Engelsk: komma som tusenskille, punktum som desimaltegn, «Friday 16 October».

import { isEn } from '../i18n.ts'

const intNo = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 })
const dec1No = new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const intEn = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 })
const dec1En = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** Bytter tusenskille til vanlig hardt mellomrom og minus til typografisk minus. */
function clean(s: string): string {
  return s.replace(/[\u202f\u2009 ]/g, '\u00a0').replace(/^-/, '\u2212')
}

export const num = (n: number): string => clean((isEn() ? intEn : intNo).format(Math.round(n)))
export const dec1 = (n: number): string => clean((isEn() ? dec1En : dec1No).format(n))
export const kr = (n: number): string => `${num(n)}\u00a0kr`
export const pct = (n: number): string => (isEn() ? `${num(n)}%` : `${num(n)}\u00a0%`)
export const signedPct = (n: number): string => `${n >= 0 ? '+' : '−'}${pct(Math.abs(n))}`
export const km = (n: number): string => `${dec1(n)} km`

const weekdaysNo = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag']
const weekdaysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const monthsNo = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember']
const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const monthsShortNo = ['jan.', 'feb.', 'mar.', 'apr.', 'mai', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'des.']
const monthsShortEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const weekdays = () => (isEn() ? weekdaysEn : weekdaysNo)
const months = () => (isEn() ? monthsEn : monthsNo)
const monthsShort = () => (isEn() ? monthsShortEn : monthsShortNo)

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

/** Fredag eller lørdag (uavhengig av språk). */
export const isWeekend = (iso: string): boolean => [5, 6].includes(parseDate(iso).getDay())

export const weekday = (iso: string): string => weekdays()[parseDate(iso).getDay()]
export const weekdayShort = (iso: string): string => weekdays()[parseDate(iso).getDay()].slice(0, 3)
export const monthName = (iso: string): string => months()[parseDate(iso).getMonth()]

/** «fredag 16. oktober» / «Friday 16 October» */
export function dateLong(iso: string): string {
  const d = parseDate(iso)
  return isEn() ? `${weekdaysEn[d.getDay()]} ${d.getDate()} ${monthsEn[d.getMonth()]}` : `${weekdaysNo[d.getDay()]} ${d.getDate()}. ${monthsNo[d.getMonth()]}`
}

/** «fre. 16. okt.» / «Fri 16 Oct» */
export function dateShort(iso: string): string {
  const d = parseDate(iso)
  return isEn() ? `${weekdaysEn[d.getDay()].slice(0, 3)} ${d.getDate()} ${monthsShortEn[d.getMonth()]}` : `${weekdaysNo[d.getDay()].slice(0, 3)}. ${d.getDate()}. ${monthsShortNo[d.getMonth()]}`
}

/** «16. okt.» / «16 Oct» */
export function dayMonth(iso: string): string {
  const d = parseDate(iso)
  return isEn() ? `${d.getDate()} ${monthsShort()[d.getMonth()]}` : `${d.getDate()}. ${monthsShort()[d.getMonth()]}`
}

export const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

/** «3 ganger» – send inn ordene på gjeldende språk (f.eks. L('gang', 'time'), L('ganger', 'times')). */
export function plural(n: number, one: string, many: string): string {
  return `${num(n)} ${n === 1 ? one : many}`
}

// ── Til månedshistorien ─────────────────────────────────────────────────────

const numberWordsNo = ['null', 'én', 'to', 'tre', 'fire', 'fem', 'seks', 'sju', 'åtte', 'ni', 'ti', 'elleve', 'tolv']
const numberWordsEn = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
/** Små tall som ord («fire ganger» / «four times»), større som tall. */
export const numberWord = (n: number): string => (Number.isInteger(n) && n >= 0 && n <= 12 ? (isEn() ? numberWordsEn : numberWordsNo)[n] : num(n))

const ordinalsNo = ['', '', 'andre', 'tredje', 'fjerde', 'femte', 'sjette', 'sjuende', 'åttende', 'niende', 'tiende']
const ordinalsEn = ['', '', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth']
/** «hver femte» / «every fifth» – 2 til 10. */
export const ordinalWord = (n: number): string => (isEn() ? ordinalsEn : ordinalsNo)[n] ?? (isEn() ? `${num(n)}th` : `${num(n)}.`)

/** Ukedager med mandag først (kolonne 0). */
const byColNo = ['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag', 'søndag']
const byColEn = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const weekdayByCol = (col: number): string => (isEn() ? byColEn : byColNo)[col]
/** «fredagene» / «Fridays» */
export const weekdayPluralDef = (col: number): string => (isEn() ? byColEn[col] + 's' : byColNo[col] + 'ene')
/** Ukedagens forbokstav i kalenderen (M T O T F L S / M T W T F S S) */
export const weekdayLetter = (col: number): string => (isEn() ? 'MTWTFSS' : 'MTOTFLS')[col]

export const hoursText = (h: number): string => {
  const n = Number.isInteger(h) ? num(h) : dec1(h)
  return isEn() ? `${n} ${h === 1 ? 'hour' : 'hours'}` : `${n} timer`
}

/** «tor. 3.» / «Thu 3» */
export const dayLabel = (iso: string): string => (isEn() ? `${weekdayShort(iso)} ${parseDate(iso).getDate()}` : `${weekdayShort(iso)}. ${parseDate(iso).getDate()}.`)
