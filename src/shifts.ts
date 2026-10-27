import { historySummaries, recordsSetByShift, tonightSummary } from './lib/calc.ts'
import type { ShiftSummary } from './lib/calc.ts'
import { useStore } from './state.tsx'

/** Vaktene appen kjenner til akkurat nå (kveldens vakt teller når den er avsluttet). */
export function useShifts() {
  const { demo } = useStore()
  const done = demo.phase === 'done'
  const all: ShiftSummary[] = done ? [...historySummaries, tonightSummary] : historySummaries
  const listed: ShiftSummary[] = done && demo.saved ? all : historySummaries
  return { all, listed, recordsSet: recordsSetByShift(all), tonightDone: done }
}
