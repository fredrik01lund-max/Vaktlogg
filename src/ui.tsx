import { useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { config } from './config.ts'
import { num } from './lib/format.ts'
import { L } from './i18n.ts'
import { DUR, PlaybackPaused, easeData, reduced, useReducedMotion } from './lib/motion.ts'

// ── Ikoner (enkle strek-ikoner, 24×24) ──────────────────────────────────────

export const paths: Record<string, ReactNode> = {
  expand: <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />,
  crown: <path d="M4 8.5 8.5 12 12 5.5l3.5 6.5L20 8.5 18.5 18h-13z" />,
  glass: <><path d="M7 3h10l-1 7a4 4 0 0 1-8 0z" /><path d="M12 14v6M8.5 21h7" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></>,
  user: <><circle cx="12" cy="8.5" r="4" /><path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" /></>,
  chevR: <path d="m9 5 7 7-7 7" />,
  chevL: <path d="m15 5-7 7 7 7" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  play: <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none" />,
  pause: <><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /></>,
  next: <><path d="M5 5v14l10-7z" fill="currentColor" stroke="none" /><path d="M18.5 5v14" strokeWidth="2.6" /></>,
  more: <><circle cx="5" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="19" cy="12" r="1.6" fill="currentColor" /></>,
  reset: <><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4.5h4.5" /></>,
  end: <><path d="M4 5l8 7-8 7zM12 5l8 7-8 7z" fill="currentColor" stroke="none" /></>,
  stop: <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" stroke="none" />,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M16 5.5h3a3 3 0 0 1-3 4M8 5.5H5a3 3 0 0 0 3 4M12 13v4M8.5 20h7l-.8-3h-5.4z" /></>,
  // Duellen handler om desserter, så den bruker iskrem-ikonet.
  // To mot hverandre med lyn mellom (samme motiv som spillikonet)
  duel: <><circle cx="6" cy="8.5" r="2.6" /><circle cx="18" cy="8.5" r="2.6" /><path d="M1.8 19.5c.4-3 2-4.6 4.2-4.6s3.4 1.2 3.9 3.2M22.2 19.5c-.4-3-2-4.6-4.2-4.6s-3.4 1.2-3.9 3.2" /><path d="M13 3.5 10.6 10h2.8L11 16.5" /></>,
  team: <><circle cx="9" cy="9" r="3.2" /><circle cx="17" cy="10" r="2.5" /><path d="M3.5 19c.8-3.2 3-4.8 5.5-4.8s4.7 1.6 5.5 4.8M15 14.5c2.6-.3 4.6 1 5.4 3.8" /></>,
  tag: <><path d="M3.5 12.5V5a1.5 1.5 0 0 1 1.5-1.5h7.5l8 8-9 9z" /><circle cx="8" cy="8" r="1.4" fill="currentColor" /></>,
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />,
  steps: <><path d="M8 3.5c1.8 0 2.6 2 2.4 4.4-.2 2-1 3.6-2.6 3.6S5.5 10 5.6 8C5.7 5.6 6.4 3.5 8 3.5zM6 14h4l-.4 2.6a1.8 1.8 0 0 1-3.5-.1z" /><path d="M16 8.5c1.6 0 2.4 1.9 2.4 4.1 0 1.9-.9 3.4-2.4 3.4s-2.3-1.6-2.2-3.4c.1-2.2.7-4.1 2.2-4.1zM14 18.5h4l-.3 1.6a1.8 1.8 0 0 1-3.5 0z" /></>,
  pulse: <path d="M3 12h4l2-5 4 10 2-5h6" />,
  bottle: <><path d="M10 3h4v4.5l1.5 2.5V20a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V10L10 7.5z" /><path d="M8.5 13h7" /></>,
  dessert: <><path d="M7.5 10a4.5 4.5 0 0 1 9 0" /><path d="M7 10h10l-5 10.5z" /><path d="M9.5 13.5h5" /></>,
  coins: <><ellipse cx="12" cy="6.5" rx="7" ry="3" /><path d="M5 6.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5M5 11.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" /></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  guests: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1-3.6 3.7-5.5 7-5.5s6 1.9 7 5.5" /></>,
  star: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M4 4l16 16M9.9 6A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.8 3.6M6.2 7.6A16 16 0 0 0 2.5 12s3.5 6.5 9.5 6.5a9 9 0 0 0 4-.9" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  download: <><path d="M12 3.5V15M7.5 10.5 12 15l4.5-4.5" /><path d="M5 17v2a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-2" /></>,
  share: <><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8" /><path d="M5 12v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-7" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" strokeWidth="2.6" />,
  moon: <path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z" />,
  watch: <><rect x="6.5" y="6.5" width="11" height="11" rx="3" /><path d="M9 6.5 9.5 3h5l.5 3.5M9 17.5l.5 3.5h5l.5-3.5M12 9.5V12l1.5 1" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5v.5" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z" /></>,
  alert: <><path d="M12 4.2 21 19.5H3z" /><path d="M12 10v4.3M12 16.9v.2" /></>,
  note: <><path d="M5.5 3.5h13v17h-13z" /><path d="M9 8.5h6M9 12h6M9 15.5h3.5" /></>,
  sparkle: <path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7zM19 16c.3 1.6 1 2.4 2.5 2.6-1.5.3-2.2 1-2.5 2.6-.3-1.6-1-2.3-2.5-2.6 1.5-.2 2.2-1 2.5-2.6z" />,
  save: <><path d="M5 4h11l3 3v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" /><path d="M8 4v5h7V4M8 20v-6h8v6" /></>,
  building: <><path d="M4 20.5V8l8-4.5L20 8v12.5" /><path d="M2.5 20.5h19M9 20.5v-5h6v5M8 11h.01M12 11h.01M16 11h.01" /></>,
  flame: <path d="M12 21c-3.6 0-6-2.5-6-5.8 0-3.3 2.6-5 3.4-8.2C11.5 8.5 12 10 12 11.5c1.2-.6 2-2 2-3.5 2.4 1.7 4 4.4 4 7.2 0 3.3-2.4 5.8-6 5.8z" />,
  leaf: <><path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z" /><path d="M5 19 13 11" /></>,
  // ── Spill, lag og premier ──
  gift: <><path d="M4.5 10.5h15v10h-15z" /><path d="M3.5 7h17v3.5h-17z" /><path d="M12 7v13.5" /><path d="M12 7c-1.6-3-5.5-3.4-5.5-1.1S10 7 12 7zM12 7c1.6-3 5.5-3.4 5.5-1.1S14 7 12 7z" /></>,
  giftOpen: <><path d="M4.5 11h15v9.5h-15z" /><path d="M12 11v9.5" /><path d="m3.6 7.6 16.5-3.2.6 3.3L4.2 11z" /><path d="M12.2 5.9c-.6-2.4-3.6-3.6-4.4-1.9" /></>,
  ghost: <><path d="M6 20.5V11a6 6 0 0 1 12 0v9.5l-2-1.6-2 1.6-2-1.6-2 1.6-2-1.6z" /><circle cx="10" cy="11" r="1" fill="currentColor" /><circle cx="14" cy="11" r="1" fill="currentColor" /></>,
  envelope: <><rect x="3" y="6" width="18" height="13" rx="2.2" /><path d="m3.6 7.2 8.4 6.3 8.4-6.3" /></>,
  pizza: <><path d="M12 21 3.6 6.8a17 17 0 0 1 16.8 0z" /><path d="M5.4 9.6a14 14 0 0 1 13.2 0" /><circle cx="10.2" cy="12.4" r="1.1" fill="currentColor" /><circle cx="13.6" cy="14.6" r="1.1" fill="currentColor" /></>,
  chefhat: <><path d="M7.5 17.5h9v3h-9z" /><path d="M7.5 17.5v-4.2A4 4 0 1 1 9.6 6a4 4 0 0 1 4.8 0 4 4 0 1 1 2.1 7.3v4.2" /></>,
  plane: <><path d="M21 15.5 13.5 11V5.5a1.5 1.5 0 0 0-3 0V11L3 15.5V17l7.5-2.2V19l-2 1.5V22l3.5-1 3.5 1v-1.5l-2-1.5v-4.2L21 17z" /></>,
  film: <><path d="M4 10h16v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z" /><path d="M4 10l-.6-3.2a1 1 0 0 1 .8-1.2l13.6-2.4a1 1 0 0 1 1.2.8L19.6 7z" /><path d="M8 5.2l2.4 3.4M13 4.3l2.4 3.4" /></>,
  popcorn: <><path d="M6 9.5h12l-1.6 11h-8.8z" /><path d="M10 9.5l.6 11M14 9.5l-.6 11" /><path d="M6.6 9.5a2.4 2.4 0 0 1 2-4 3 3 0 0 1 5.6-.4 2.4 2.4 0 0 1 3.3 4.4" /></>,
  pot: <><path d="M4.5 10.5h15V16a4 4 0 0 1-4 4h-7a4 4 0 0 1-4-4z" /><path d="M2.5 10.5h19M9.5 7c0-1.1 1-1.5 1-2.6M13.5 7c0-1.1 1-1.5 1-2.6" /></>,
  coffee: <><path d="M5 9h11v5.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" /><path d="M16 10.5h1.4a2.5 2.5 0 0 1 0 5H16" /><path d="M9 3.5v3M12.5 3.5v3" /></>,
  ticket: <><path d="M3.5 7.5h17v3a1.7 1.7 0 0 0 0 3.2v3h-17v-3a1.7 1.7 0 0 0 0-3.2z" /><path d="M14.5 8v1.5M14.5 11.3v1.4M14.5 14.6V16" /></>,
  plate: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.6" /></>,
  // To sammen over en felles perlerad (samme motiv som spillikonet)
  pair: <><circle cx="7.5" cy="5.5" r="2.4" /><circle cx="16.5" cy="5.5" r="2.4" /><path d="M3.2 14c.4-2.6 2-4 4.3-4s3.9 1.4 4.3 4M11.7 14c.4-2.6 2-4 4.3-4s3.9 1.4 4.3 4" /><rect x="2.5" y="16.5" width="19" height="5" rx="2.5" /><circle cx="7" cy="19" r=".9" fill="currentColor" /><circle cx="12" cy="19" r=".9" fill="currentColor" /></>,
  // Rolig: bare din egen ring – én person i ringen
  calm: <><path d="M19.4 16.5A8.5 8.5 0 1 1 17.8 5.6" /><circle cx="12" cy="10" r="2.4" /><path d="M8 17c.6-2.2 2.1-3.4 4-3.4s3.4 1.2 4 3.4" /></>,
  grid: <><rect x="3.5" y="3.5" width="17" height="17" rx="3" /><path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17" /></>,
  medal: <><circle cx="12" cy="15" r="5.2" /><path d="M8.3 3.5 10.4 10M15.7 3.5 13.6 10" /></>,
  cake: <><path d="M3.5 20.5h17M5 20.5v-6h14v6" /><path d="M5 14.5c1.5 1.2 3 1.2 4.6 0s3-1.2 4.5 0 3 1.2 4.9 0" /><path d="M12 14.5v-4" /><path d="M12 8.2a1.4 1.4 0 0 1-1-2.3L12 4l1 1.9a1.4 1.4 0 0 1-1 2.3z" /></>,
  door: <><path d="M6.5 20.5v-16a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16" /><path d="M3.5 20.5h17" /><circle cx="14.5" cy="12.5" r="1" fill="currentColor" /></>,
  repeat: <><path d="m16.5 3.5 3 3-3 3" /><path d="M4.5 11.5v-1a4 4 0 0 1 4-4h11" /><path d="m7.5 20.5-3-3 3-3" /><path d="M19.5 12.5v1a4 4 0 0 1-4 4h-11" /></>,
  run: <><circle cx="14.5" cy="4.6" r="1.9" /><path d="m8 21 3.2-6.2 3 2.6V21" /><path d="M5.5 11.4 9 8.6l4.2 1 2.4 3 3 .4" /><path d="m11.2 14.8 2-5.2" /></>,
  helping: <><path d="M3.5 13.5 7 10l3 1.5 3.5-2.5 7 4" /><path d="m7 15.5 3.2 3.2a1.4 1.4 0 0 0 2-2l1 1a1.4 1.4 0 0 0 2-2l.8.8a1.4 1.4 0 0 0 2-2l-3.5-3.5" /></>,
  leafglass: <><path d="M7.5 3.5h7l-.9 7.5a2.6 2.6 0 0 1-5.2 0z" /><path d="M11 13.6v6.9M8 20.5h6" /><path d="M15.6 5.6c2.8-.3 4.4 1.1 4.4 4-2.8.3-4.4-1.2-4.4-4z" /></>,
  house: <><path d="M3.5 11 12 4l8.5 7" /><path d="M5.5 9.6v10.9h13V9.6" /><path d="M9.5 20.5v-5h5v5" /></>,
  chatheart: <><path d="M4 5.5h16v10.2h-9.6L6 19.6v-3.9H4z" /><path d="M12 13.4s-3-1.8-3-3.6a1.6 1.6 0 0 1 3-.8 1.6 1.6 0 0 1 3 .8c0 1.8-3 3.6-3 3.6z" /></>,
  // Tilbakemelding: idé, forbedring, feil og prat
  bulb: <><path d="M15 14c.2-1 .7-1.7 1.5-2.5A5.6 5.6 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6M10 21.5h4" /></>,
  wrench: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z" />,
  bug: <><rect x="7" y="7" width="10" height="13" rx="5" /><path d="M12 11v9M7 12H3.5M20.5 12H17M7.6 16.5 4.5 18.5M16.4 16.5l3.1 2M9 7.5 7.5 4.5M15 7.5l1.5-3" /></>,
  chat: <><path d="M4 5.5h16v10.2h-9.6L6 19.6v-3.9H4z" /><path d="M8 9.5h8M8 12.5h5" /></>,
}

export function Icon({ name, className }: { name: keyof typeof paths | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {paths[name]}
    </svg>
  )
}

// ── Tall som teller opp ─────────────────────────────────────────────────────

export interface CountOpts {
  /** Varighet i ms (standard: ett demosteg). */
  duration?: number
  /** Venter før tellingen starter – brukes for «årsak før virkning». */
  delay?: number
  ease?: (t: number) => number
  /** Høyst så mange oppdateringer per sekund (skritteller som tikker jevnt). */
  fps?: number
}

/**
 * Teller fra viste verdi til ny verdi. Kommer en ny verdi midt i tellingen,
 * fortsetter den derfra. Ingen telling ved første visning (med mindre `initial` er satt)
 * eller ved redusert bevegelse.
 */
export function useCountUp(value: number, opts: CountOpts | number = {}, initial?: number): number {
  const o: CountOpts = typeof opts === 'number' ? { duration: opts } : opts
  const duration = o.duration ?? DUR.data
  const delay = o.delay ?? 0
  const ease = o.ease ?? easeData
  const fps = o.fps
  const rm = useReducedMotion()
  // Inni en historie: pause (knapp, hold inne, skjult fane) stopper tellingen der den er.
  const clock = useContext(PlaybackPaused)
  const paused = useRef(clock)
  useEffect(() => {
    paused.current = clock
  }, [clock])
  const start = reduced() ? value : (initial ?? value)
  const [shown, setShown] = useState(start)
  const cur = useRef(start)
  useEffect(() => {
    const a = cur.current
    if (rm || a === value) {
      cur.current = value
      setShown(value)
      return
    }
    let start = performance.now() + delay
    let prev = performance.now()
    let raf = 0
    let lastWrite = 0
    let lastShown = Math.round(a)
    const tick = (now: number) => {
      // Tid på pause (eller et hopp etter skjult fane) skyver starten – tellingen fortsetter der den stoppet.
      const dt = now - prev
      prev = now
      if (paused.current !== null && (paused.current || dt > 250)) {
        start += dt
        if (paused.current) {
          raf = requestAnimationFrame(tick)
          return
        }
      }
      const t = Math.max(0, Math.min(1, (now - start) / duration))
      const v = a + (value - a) * ease(t)
      cur.current = v
      const rounded = Math.round(v)
      const due = !fps || now - lastWrite >= 1000 / fps || t === 1
      if (rounded !== lastShown && due) {
        lastShown = rounded
        lastWrite = now
        setShown(v)
      }
      if (t < 1) raf = requestAnimationFrame(tick)
      else setShown(value)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration, delay, ease, fps, rm])
  return shown
}

export function CountUp({ value, format = num, from, duration, delay, ease, fps }: { value: number; format?: (n: number) => string; from?: number } & CountOpts) {
  const v = useCountUp(value, { duration, delay, ease, fps }, from)
  return <span className="num">{format(v)}</span>
}

/**
 * Et element som animerer bare hvis det skulle det da det ble laget (avgjørelsen låses).
 * Brukes med en nøkkel som endres når innholdet endres – da lages et nytt element, og bare det beveger seg.
 */
export function Fx({ cls, on, className, children, 'aria-hidden': ariaHidden }: { cls: string; on: boolean; className?: string; children: ReactNode; 'aria-hidden'?: boolean }) {
  const [animate] = useState(on)
  const c = [className, animate ? cls : ''].filter(Boolean).join(' ')
  return (
    <span className={c || undefined} aria-hidden={ariaHidden || undefined}>
      {children}
    </span>
  )
}

/** Er elementet synlig i skjermen? (Én gang – for avsløringer som skal sees.) */
export function useInView<T extends Element>(threshold = 0.6): [(el: T | null) => void, boolean] {
  const [inView, setInView] = useState(false)
  const obs = useRef<IntersectionObserver | null>(null)
  const ref = useCallback(
    (el: T | null) => {
      obs.current?.disconnect()
      if (!el || inView) return
      if (typeof IntersectionObserver === 'undefined') {
        setInView(true)
        return
      }
      obs.current = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            setInView(true)
            obs.current?.disconnect()
          }
        },
        { threshold },
      )
      obs.current.observe(el)
    },
    [inView, threshold],
  )
  useEffect(() => () => obs.current?.disconnect(), [])
  return [ref, inView]
}

// ── Små byggeklosser ────────────────────────────────────────────────────────

// Logoen: vakt-ring nesten full + V, på pastell oransje→rosa (samme som app-ikonet i public/)
export function Logo() {
  const id = useId()
  return (
    <svg className="logo" viewBox="0 0 512 512" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFC896" />
          <stop offset="0.55" stopColor="#FDB8B4" />
          <stop offset="1" stopColor="#F6A2C8" />
        </linearGradient>
        <linearGradient id={`${id}v`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A63F69" />
          <stop offset="1" stopColor="#6E2A3C" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="128" fill={`url(#${id}bg)`} />
      <circle cx="256" cy="256" r="168" fill="none" stroke="#fff" strokeOpacity="0.38" strokeWidth="40" />
      <path d="M393.6 352.4A168 168 0 1 1 374.8 137.2" fill="none" stroke="#fff" strokeWidth="40" strokeLinecap="round" />
      <circle cx="374.8" cy="137.2" r="30" fill="#fff" />
      <circle cx="374.8" cy="137.2" r="14" fill="#F59A6E" />
      <path d="M186 200L256 326L326 200" fill="none" stroke={`url(#${id}v)`} strokeWidth="56" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function TopBar({ right }: { right?: ReactNode }) {
  return (
    <div className="topbar">
      <div className="wordmark">
        <Logo />
        {config.appName}
      </div>
      {right}
    </div>
  )
}

export function Bar({ value, tone, thin, marker }: { value: number; tone?: 'sage' | 'gold'; thin?: boolean; marker?: number }) {
  const w = Math.max(0, Math.min(100, value))
  return (
    <div className={`bar ${tone ?? ''} ${thin ? 'thin' : ''}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${w}%` }} />
      {marker !== undefined && <i className="marker" style={{ left: `${Math.min(100, marker)}%` }} />}
    </div>
  )
}

export function Switch({ on, onChange, label, desc }: { on: boolean; onChange: (v: boolean) => void; label: ReactNode; desc?: ReactNode }) {
  return (
    <button className="switch-row" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className="grow">
        <span style={{ fontWeight: 600, display: 'block' }}>{label}</span>
        {desc && <span className="small muted" style={{ display: 'block', marginTop: 2 }}>{desc}</span>}
      </span>
      <span className="switch" data-on={on} />
    </button>
  )
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stat({ label, value, unit, sub, accent }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode; accent?: boolean }) {
  return (
    <div className={`stat ${accent ? 'accent' : ''}`}>
      <div className="label">{label}</div>
      <div className="value">
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  )
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [closing, setClosing] = useState(false)
  const done = useRef(false)
  const finish = useCallback(() => {
    if (done.current) return
    done.current = true
    onClose()
  }, [onClose])
  const close = useCallback(() => {
    if (closing) return
    if (reduced()) return finish()
    setClosing(true)
    window.setTimeout(finish, DUR.short + 120)
  }, [closing, finish])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])
  // Fokus inn i arket, resten av appen utilgjengelig mens det er åpent, og fokus tilbake etterpå.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const behind = [...document.querySelectorAll<HTMLElement>('.screen, .tabbar')]
    behind.forEach((el) => (el.inert = true))
    ref.current?.focus()
    return () => {
      behind.forEach((el) => (el.inert = false))
      previous?.focus?.()
    }
  }, [])
  const host = document.getElementById('app-overlays')
  const sheet = (
    <>
      <div className={`sheet-backdrop ${closing ? 'closing' : ''}`} onClick={close} />
      <div
        className={`sheet ${closing ? 'closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
        tabIndex={-1}
        onAnimationEnd={(e) => closing && e.target === e.currentTarget && finish()}
      >
        <div className="grabber" />
        <div className="sheet-head">
          <h2 className="h3">{title}</h2>
          <button className="icon-btn" onClick={close} aria-label={L('Lukk', 'Close')}>
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </>
  )
  // Ark legges utenfor skjermens scrollområde, så de alltid dekker hele telefonen.
  return host ? createPortal(sheet, host) : sheet
}

export function Check() {
  return (
    <span className="check">
      <Icon name="check" />
    </span>
  )
}

const confettiColors = ['#f08fb0', '#f5b46e', '#7cc9a1', '#ffb38a', '#f0cc5c']

export function Confetti({ count = 18 }: { count?: number }) {
  const [pieces] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      left: `${(i / count) * 100 + Math.random() * 5}%`,
      delay: `${Math.random() * 400}ms`,
      color: confettiColors[i % confettiColors.length],
      rot: `${Math.random() * 180}deg`,
    })),
  )
  const rm = useReducedMotion()
  if (rm) return null
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <i key={i} style={{ left: p.left, animationDelay: p.delay, background: p.color, rotate: p.rot }} />
      ))}
    </div>
  )
}
