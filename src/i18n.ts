// Språk: norsk (standard) eller engelsk – for å vise prototypen til folk som ikke leser norsk.
//
//  • L('Norsk tekst', 'English text')        – tekst i appen. Begge språk står ved siden av hverandre i koden.
//  • L('Bord {n}', 'Table {n}', { n: 13 })    – med innfylte verdier ({navn} → verdi).
//  • td('Norsk tekst fra data')               – tekst som kommer fra demodataene eller beregningene
//                                               (hendelser, retter, ros, ønsker …). Engelsk står i i18n-data.ts.
//
// Språket byttes på Meg-siden. Hele appen tegnes på nytt (App nøkles på språket), så alt følger med.

import { dataEn } from './i18n-data.ts'

export type Lang = 'no' | 'en'

let current: Lang = 'no'

export function setLang(lang: Lang) {
  current = lang
  if (typeof document !== 'undefined') document.documentElement.lang = lang === 'en' ? 'en' : 'nb'
}

export const getLang = (): Lang => current
export const isEn = (): boolean => current === 'en'

function fill(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}

/** Tekst i appen på gjeldende språk. */
export function L(no: string, en: string, vars?: Record<string, string | number>): string {
  return fill(current === 'en' ? en : no, vars)
}

/** Tekst fra demodata/beregninger: engelsk fra ordlisten i i18n-data.ts (faller tilbake til norsk). */
export function td(no: string, vars?: Record<string, string | number>): string {
  return fill(current === 'en' ? (dataEn[no] ?? no) : no, vars)
}

/** Mangler i ordlisten (for sjekkskriptet). */
export const missingData = (texts: string[]): string[] => texts.filter((s) => !(s in dataEn))
