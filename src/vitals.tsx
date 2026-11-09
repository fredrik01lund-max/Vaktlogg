// Klokka på vaktsiden: puls og skritt, synlige og levende.
//  • Hjertet slår i takt med den målte pulsen (lub-dub). Det er den eneste løkken på skjermen.
//  • Fyllet i hjertet blir dypere med innsatsen (rolig → aktiv → rush).
//  • En liten pulskurve vokser mot høyre gjennom kvelden; toppen fra rushet blir stående.
//  • Skrittelleren tikker jevnt mellom hendelsene, som en skritteller.
// Alt leses fra demodataene via calc.ts, og ingenting av dette deles med noen.

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { L } from './i18n.ts'
import type { HrZone } from './lib/calc.ts'
import { hrSeries } from './lib/calc.ts'
import { num } from './lib/format.ts'
import { DUR, linear, useMounted, useReducedMotion } from './lib/motion.ts'
import { PLAY_INTERVAL_MS } from './state.tsx'
import { Fx, paths, useCountUp } from './ui.tsx'

export interface VitalsData {
  hr: number
  hrIdx: number
  zone: HrZone
  steps: number
}

// Lub-dub: et tydelig slag og et mindre ekko, så hvile. Bare skala – ingen blink.
const BEAT: Keyframe[] = [
  { transform: 'scale(1)', offset: 0, easing: 'ease-out' },
  { transform: 'scale(1.14)', offset: 0.12, easing: 'ease-out' },
  { transform: 'scale(1)', offset: 0.24, easing: 'ease-out' },
  { transform: 'scale(1.07)', offset: 0.36, easing: 'ease-out' },
  { transform: 'scale(1)', offset: 0.5 },
  { transform: 'scale(1)', offset: 1 },
]

/**
 * Hjerteslaget kjører som Web Animation (i nettleserens grafikk, ikke i React).
 * Takten følger pulsen via playbackRate, så slaget aldri hopper midt i.
 * Rolig: fullfører slaget og hviler. Ark over skjermen: pause.
 */
export function useHeartbeat(ref: RefObject<HTMLElement | null>, bpm: number, calm: boolean, paused: boolean) {
  const rm = useReducedMotion()
  const anim = useRef<Animation | null>(null)
  const rate = useRef(bpm / 60)
  rate.current = bpm / 60
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  // Opprett, fortsett eller la slaget hvile – alt i én effekt, så ingen tilstand kan bli hengende.
  useEffect(() => {
    const el = ref.current
    if (!el || rm || typeof el.animate !== 'function') {
      anim.current?.cancel()
      anim.current = null
      return
    }
    const a = anim.current
    if (calm) {
      // Fullfør slaget som pågår, og hvil. Starter rolig: ingen løkke i det hele tatt.
      if (a) {
        const t = Number(a.currentTime ?? NaN)
        if (Number.isFinite(t)) a.effect?.updateTiming({ iterations: Math.floor(t / DUR.beat) + 1 })
        else a.cancel()
      }
      return
    }
    let run = a
    if (!run || run.playState === 'finished' || run.playState === 'idle') {
      run?.cancel()
      run = el.animate(BEAT, { duration: DUR.beat, iterations: Infinity })
      anim.current = run
    } else run.effect?.updateTiming({ iterations: Infinity })
    run.playbackRate = rate.current
    if (pausedRef.current) run.pause()
    else run.play()
  }, [rm, calm, ref])
  useEffect(
    () => () => {
      anim.current?.cancel()
      anim.current = null
    },
    [],
  )
  useEffect(() => {
    const a = anim.current
    if (!a) return
    if (typeof a.updatePlaybackRate === 'function') a.updatePlaybackRate(bpm / 60)
    else a.playbackRate = bpm / 60
  }, [bpm])
  useEffect(() => {
    const a = anim.current
    if (!a || calm) return
    if (paused) a.pause()
    else a.play()
  }, [paused, calm])
}

/** Pulskurven for hele vakten på faste akser: den vokser mot høyre, gamle punkter flytter seg aldri. */
function HrTrace({ idx }: { idx: number }) {
  const W = 72
  const H = 22
  const n = hrSeries.length - 1
  const y = (v: number) => 20 - ((Math.max(80, Math.min(150, v)) - 80) / 70) * 18
  const d = hrSeries.map((v, i) => `${i ? 'L' : 'M'}${((i / n) * W).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const frac = Math.max(0, Math.min(1, idx / n))
  return (
    <span className="vt-trace" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="vt-line" style={{ clipPath: `inset(-2px ${((1 - frac) * 100).toFixed(2)}% -2px -2px)` }}>
        <path d={d} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <i className="vt-dot" style={{ left: `${frac * 100}%`, top: `${(y(hrSeries[idx] ?? hrSeries[0]) / H) * 100}%` }} />
    </span>
  )
}

export function Vitals({ v, playing, calm, paused, onOpen }: { v: VitalsData; playing: boolean; calm: boolean; paused: boolean; onOpen: () => void }) {
  const heart = useRef<HTMLSpanElement>(null)
  const mounted = useMounted()
  useHeartbeat(heart, v.hr, calm, paused)
  const hr = useCountUp(v.hr, { duration: 600 })
  // Under avspilling tikker skrittene jevnt gjennom hele intervallet og lander like før neste hendelse.
  const flowing = playing && !calm
  const steps = useCountUp(v.steps, flowing ? { duration: PLAY_INTERVAL_MS - 300, ease: linear, fps: 6 } : { duration: DUR.data })
  return (
    <button className="dD-vitals" data-zone={v.zone} onClick={onOpen} aria-label={L('Puls {hr} slag per minutt, {steps} skritt. Åpne detaljer', 'Heart rate {hr} beats per minute, {steps} steps. Open details', { hr: v.hr, steps: num(v.steps) })}>
      <span className="vt-cell">
        <span className="vt-heart" ref={heart} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
            {paths.heart}
          </svg>
        </span>
        <b className="vt-num num" aria-hidden="true">
          {num(hr)}
        </b>
        <HrTrace idx={v.hrIdx} />
      </span>
      <span className="vt-div" aria-hidden="true" />
      <span className="vt-cell">
        {/* Føttene tar ett skritt når tallet øker – aldri i løkke */}
        <Fx key={v.steps} cls="walk" on={mounted.current && !calm} className="vt-feet" aria-hidden>
          <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
            {paths.steps}
          </svg>
        </Fx>
        <b className="vt-num vt-steps num" aria-hidden="true">
          {num(steps)}
        </b>
      </span>
    </button>
  )
}
