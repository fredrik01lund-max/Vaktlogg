// Felles deler for vaktsiden og detaljsidene: toppen, hjertet, skrittelleren og kortene.

import { useRef } from 'react'
import type { ReactNode } from 'react'
import { L } from '../i18n.ts'
import { activityAt, hrZone } from '../lib/calc.ts'
import { useClock, useClockTime } from '../lib/clock.ts'
import { num } from '../lib/format.ts'
import { DUR, linear } from '../lib/motion.ts'
import { PLAY_INTERVAL_MS } from '../state.tsx'
import { paths, useCountUp } from '../ui.tsx'
import { Odo } from '../designs/Directions.tsx'
import { useHeartbeat } from '../vitals.tsx'
import './shift.css'

/** Toppen på vaktsiden og detaljsidene: «Vakt pågår» og klokka. Under avspillingen går klokka jevnt (demoklokka). */
export function LiveHead({ time, children }: { time: string; children?: ReactNode }) {
  const clock = useClockTime()
  return (
    <header className="dA-head st-head">
      {children ?? (
        <span className="dA-live">
          <i /> {L('Vakt pågår', 'Shift in progress')}
        </span>
      )}
      <Odo text={clock ?? time} />
    </header>
  )
}

/** Hjertet som slår i takt med pulsen. Fyllet blir dypere jo høyere stresset er. */
export function Heart({ hr, calm, size = 28 }: { hr: number; calm: boolean; size?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  useHeartbeat(ref, hr, calm, false)
  return (
    <span className="st-heart" data-zone={hrZone(hr)} ref={ref} aria-hidden="true" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
        {paths.heart}
      </svg>
    </span>
  )
}

/** Skrittelleren: under avspilling tikker den jevnt med demoklokka, som en ekte skritteller. Rolig modus tikker ikke. */
export function Steps({ steps, playing, calm }: { steps: number; playing: boolean; calm: boolean }) {
  const clock = useClock()
  const flowing = playing && !calm
  const v = useCountUp(steps, flowing ? { duration: PLAY_INTERVAL_MS - 300, ease: linear, fps: 6 } : { duration: DUR.data })
  return <span className="num">{num(clock !== null && !calm ? Math.max(steps, activityAt(clock).steps) : v)}</span>
}

/** Kilometer gått – følger skrittelleren. */
export function useWalkedKm(km: number, calm: boolean): number {
  const clock = useClock()
  return clock !== null && !calm ? Math.max(km, activityAt(clock).km) : km
}

export function Card({ title, right, children, className }: { title?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`st-card ${className ?? ''}`}>
      {(title || right) && (
        <div className="st-card-head">
          {title && <h2>{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  )
}

/** Tall med forklaring under – samme utseende i alle temaene. */
export function Stat({ value, label, tone }: { value: ReactNode; label: string; tone?: string }) {
  return (
    <div className="st-stat" data-tone={tone}>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  )
}

