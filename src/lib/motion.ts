// Felles tempo for all bevegelse i appen.
// Ett demosteg bruker DUR.data med easeData (samme kurve som tallene), så ringer,
// tall og forklaringer lander på samme bilde. Varighetene speiler CSS-tokenene i styles.css.

import { createContext, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'

export const DUR = { micro: 120, short: 200, medium: 300, long: 450, data: 900, reveal: 1200, beat: 1000 }

/** easeOutCubic – samme som --ease-data. */
export const easeData = (t: number) => 1 - Math.pow(1 - t, 3)
export const linear = (t: number) => t

/**
 * Avspillingsklokke for historier (månedshistorien): true = pause. Tellere (useCountUp) og tidsur inni står stille sammen
 * med CSS-animasjonene. null = ingen klokke (resten av appen), da teller alt som før.
 */
export const PlaybackPaused = createContext<boolean | null>(null)

const query = '(prefers-reduced-motion: reduce)'

/** Redusert bevegelse akkurat nå (for kode utenfor komponenter). */
export function reduced(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.(query).matches
}

function subscribe(cb: () => void) {
  const mq = window.matchMedia?.(query)
  mq?.addEventListener?.('change', cb)
  return () => mq?.removeEventListener?.('change', cb)
}

/** Reaktiv: endres med en gang brukeren skrur av/på redusert bevegelse i systemet. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, reduced, () => false)
}

/** Forrige verdi (undefined ved første visning). */
export function usePrev<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined)
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref.current
}

/** Er komponenten vist minst én gang? Brukes for å slippe animasjon ved første visning. */
export function useMounted() {
  const ref = useRef(false)
  useEffect(() => {
    ref.current = true
    return () => {
      ref.current = false
    }
  }, [])
  return ref
}

// «Sett i denne økten» – så avsløringer bare spilles første gang. Nullstilles når demoen startes på nytt.
const seen = new Set<string>()
const seenValues = new Map<string, number>()

/** true første gang en nøkkel vises i økten (trygg i StrictMode: merkes etter visning). */
export function useFirstVisit(key: string, enabled = true): boolean {
  const [first] = useState(() => enabled && !seen.has(key))
  useEffect(() => {
    if (enabled) seen.add(key)
  }, [key, enabled])
  return first
}

/** Er nøkkelen sett i økten? (Les én gang ved opprettelse.) */
export function useUnseen(key: string, enabled = true): boolean {
  const [first] = useState(() => enabled && !seen.has(key))
  return first
}
export function markSeen(key: string) {
  seen.add(key)
}

export function seenValue(key: string): number | undefined {
  return seenValues.get(key)
}
export function rememberValue(key: string, v: number) {
  seenValues.set(key, v)
}

export function clearSeen() {
  seen.clear()
  seenValues.clear()
}

type DocWithVT = Document & { startViewTransition?: (cb: () => void) => unknown }

/** Kjør en tilstandsendring som en View Transition der nettleseren støtter det. */
export function withViewTransition(fn: () => void) {
  const d = document as DocWithVT
  if (d.startViewTransition && !reduced()) d.startViewTransition(() => flushSync(fn))
  else fn()
}
