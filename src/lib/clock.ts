// Demoklokka: den virtuelle vakten går av seg selv når Emma starter vakten.
// Klokka tikker jevnt fra 16:00 til 23:30 på to minutter; hendelsene i vakten skjer når klokka passerer dem.
// Komponenter som viser klokka eller skritt abonnerer her, så resten av appen ikke tegnes på nytt hvert tikk.

import { useSyncExternalStore } from 'react'

let minutes: number | null = null
const subs = new Set<() => void>()

/** null = klokka går ikke (før vakt, etter vakt eller manuell styring). */
export function setClock(m: number | null) {
  if (m === minutes) return
  minutes = m
  subs.forEach((f) => f())
}
export const getClock = () => minutes

function subscribe(f: () => void) {
  subs.add(f)
  return () => {
    subs.delete(f)
  }
}

/** Minuttene på den virtuelle vakten akkurat nå, eller null når klokka står. */
export function useClock(): number | null {
  return useSyncExternalStore(subscribe, getClock, getClock)
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Klokkeslettet i hele fem minutter, så sifrene ruller rolig (ca. hvert sekund). */
export function useClockTime(): string | null {
  const m = useClock()
  if (m === null) return null
  const five = Math.floor(m / 5) * 5
  return `${pad(Math.floor(five / 60))}:${pad(five % 60)}`
}
