// Tekstdelene på hvert kort: øyelinje, stort tall/ord, én kort linje, og scenen for illustrasjonen.

import type { CSSProperties, ReactNode } from 'react'
import { useCountUp } from '../ui.tsx'
import { linear } from '../lib/motion.ts'
import { num } from '../lib/format.ts'

export type Mode = 'pre' | 'play' | 'done'

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="w-eyebrow w-up">{children}</div>
}

/** Enheten kan følge tallet som vises underveis («1 gang», «2 ganger»). */
export type Unit = string | ((n: number) => string)

/**
 * Det store tallet (eller ordet). I «play» teller tallet fra 0 i samme takt som illustrasjonen
 * (små tall fra 1, så det aldri står «0 ganger» under en overskrift som sier det motsatte).
 */
export function Hero({
  value,
  text,
  unit,
  mode,
  duration = 900,
  delay = 0,
  ease = linear,
  format = num,
  variant,
  style,
}: {
  value?: number
  text?: string
  unit?: Unit
  mode: Mode
  duration?: number
  delay?: number
  ease?: (t: number) => number
  format?: (n: number) => string
  variant?: 'word' | 'q'
  style?: CSSProperties
}) {
  return (
    <div className={`w-hero ${variant ?? ''} w-up`} style={style}>
      {value !== undefined ? (
        <HeroNum value={value} unit={unit} from={mode === 'play' ? (value <= 5 ? Math.min(1, value) : 0) : undefined} duration={duration} delay={delay} ease={ease} format={format} />
      ) : (
        <>
          {text}
          {typeof unit === 'string' && <span className="w-unit"> {unit}</span>}
        </>
      )}
    </div>
  )
}

function HeroNum({ value, unit, from, duration, delay, ease, format }: { value: number; unit?: Unit; from?: number; duration: number; delay: number; ease: (t: number) => number; format: (n: number) => string }) {
  const v = useCountUp(value, { duration, delay, ease }, from)
  return (
    <>
      <span className="num">{format(v)}</span>
      {unit && <span className="w-unit"> {typeof unit === 'function' ? unit(Math.round(v)) : unit}</span>}
    </>
  )
}

export function Caption({ children, d }: { children: ReactNode; d?: number }) {
  return (
    <p className="w-caption w-up" style={d !== undefined ? ({ '--d': d + 'ms' } as CSSProperties) : undefined}>
      {children}
    </p>
  )
}

export function Stage({ children }: { children: ReactNode }) {
  return <div className="w-stage">{children}</div>
}
