// Månedshistorien: kort som spilles som en historie (tidslinje øverst), med trykk, sveip, tastatur og pause.
// Hvert kort spilles første gang det vises; tilbake viser det ferdige kortet. «Se igjen» spiller alt på nytt.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { config } from '../config.ts'
import { L } from '../i18n.ts'
import { monthStory } from '../lib/calc.ts'
import { capitalize, monthName } from '../lib/format.ts'
import { PlaybackPaused, useReducedMotion } from '../lib/motion.ts'
import { navigate } from '../router.ts'
import { useShifts } from '../shifts.ts'
import { useStore } from '../state.tsx'
import { Icon } from '../ui.tsx'
import { BgShapes } from './art/kit.tsx'
import type { Mode } from './parts.tsx'
import { slideDefs } from './slides.tsx'
import './wrapped.css'

/** Måneden historien sist ble lukket fra – Historikk gir fokus tilbake til inngangen. */
export const returnFocus = { month: null as string | null }

export function Story({ month }: { month: string }) {
  const { settings } = useStore()
  const { listed } = useShifts()
  const rm = useReducedMotion()
  // Samme vakter som Historikk viser (kveldens vakt teller når den er lagret).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const s = useMemo(() => monthStory(month, listed), [month, listed.length])
  const name = monthName(`${month}-01`)
  const defs = useMemo(() => (s ? slideDefs.filter((d) => !d.when || d.when({ s, watch: settings.watch })) : []), [s, settings.watch])
  const track = useRef<HTMLDivElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [played, setPlayed] = useState<Set<number>>(() => new Set())
  const [playing, setPlaying] = useState<number | null>(null)
  const [run, setRun] = useState(0)
  const [pausedBtn, setPausedBtn] = useState(false)
  const [held, setHeld] = useState(false)
  const [hidden, setHidden] = useState(false)
  const last = defs.length - 1
  const def = defs[active]
  // Et kort uten tidslinje (Del) står uansett – det settes aldri på pause, så alt på det spilles ferdig.
  const timed = !!def?.dur && !rm
  const paused = timed && (pausedBtn || held || hidden)

  // Et tomt måned-kort finnes ikke – tilbake til historikken.
  useEffect(() => {
    if (!s) navigate('/historikk')
  }, [s])

  // Kortet som vises, spilles første gang.
  useEffect(() => {
    if (!played.has(active)) {
      setPlayed((p) => new Set(p).add(active))
      setPlaying(active)
    } else setPlaying((p) => (p === active ? p : null))
  }, [active, played, run])

  // Et nytt kort spilles alltid: pausen gjelder kortet den ble satt på (ellers står neste kort tomt, fryst før inngangen).
  useEffect(() => setPausedBtn(false), [active])

  // Hvilket kort er mest synlig i sporet.
  useEffect(() => {
    const el = track.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index))
      },
      { root: el, threshold: 0.55 },
    )
    el.querySelectorAll('.wslide').forEach((n) => obs.observe(n))
    return () => obs.disconnect()
  }, [defs.length, run])

  // Fanen skjules: pause.
  useEffect(() => {
    const on = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])

  // Fokus inn i historien, resten av appen utilgjengelig mens den er åpen.
  useEffect(() => {
    const behind = [...document.querySelectorAll<HTMLElement>('.screen, .tabbar')]
    behind.forEach((el) => (el.inert = true))
    root.current?.focus()
    return () => behind.forEach((el) => (el.inert = false))
  }, [])

  // Fokus skal aldri falle ut av historien: forsvinner kontrollen som hadde fokus (kort blir inert,
  // knapp fjernes, «Se igjen» lager kortene på nytt), får dialogen fokus igjen.
  useEffect(() => {
    const el = root.current
    const a = document.activeElement
    if (!el) return
    if (!a || a === document.body || !el.contains(a) || a.closest('[inert]')) el.focus({ preventScroll: true })
  })

  const go = useCallback(
    (i: number) => {
      const el = track.current
      if (!el) return
      const n = Math.max(0, Math.min(last, i))
      el.scrollTo({ left: n * el.clientWidth, behavior: rm ? 'auto' : 'smooth' })
    },
    [last, rm],
  )
  const close = useCallback(() => {
    returnFocus.month = month
    navigate('/historikk')
  }, [month])
  const replay = () => {
    setPlayed(new Set())
    setPlaying(null)
    setRun((r) => r + 1)
    setPausedBtn(false)
    const el = track.current
    if (el) el.scrollTo({ left: 0, behavior: 'auto' })
    setActive(0)
  }

  // Tastatur lyttes på hele dokumentet, så snarveiene virker selv om fokus et øyeblikk er borte.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t !== document.body && !root.current?.contains(t)) return
      if (e.key === 'Tab') {
        // Dialogen er modal: Tab går i ring blant kontrollene i historien og havner aldri bak den.
        const el = root.current
        if (!el) return
        const list = [...el.querySelectorAll<HTMLElement>('button, a[href], input, [tabindex]:not([tabindex="-1"])')].filter(
          (x) => !x.closest('[inert]') && !x.hasAttribute('disabled') && x.getClientRects().length > 0,
        )
        const a = document.activeElement as HTMLElement | null
        const first = list[0]
        const end = list[list.length - 1]
        if (!first || !a) return
        if (e.shiftKey ? a === first || a === el || !el.contains(a) : a === end || !el.contains(a)) {
          e.preventDefault()
          ;(e.shiftKey ? end : first).focus()
        }
        return
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') go(active + 1)
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(active - 1)
      else if (e.key === 'Home') go(0)
      else if (e.key === 'End') go(last)
      else if (e.key === 'Escape') close()
      else if ((e.key === ' ' || e.key === 'k') && !t.closest('button, input')) setPausedBtn((p) => !p)
      else return
      e.preventDefault()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [active, last, go, close])

  const mode = (i: number): Mode => (rm ? 'done' : i === playing ? 'play' : played.has(i) ? 'done' : 'pre')
  // Sett før: kortet er vist og brukeren har gått videre (gjettingen er da avgjort, også ved redusert bevegelse).
  const seen = (i: number) => played.has(i) && i !== playing

  // Trykk: venstre 30 % = forrige, resten = neste. Hold inne = pause. Bare hovedknappen.
  const press = useRef<{ x: number; y: number; timer: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !e.isPrimary) return
    if ((e.target as HTMLElement).closest('button, a, input, [role=checkbox], [role=switch]')) return
    // Slippet havner alltid her, også om pekeren er flyttet ut av kortet.
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* ikke støttet */
    }
    const timer = window.setTimeout(() => setHeld(true), 250)
    press.current = { x: e.clientX, y: e.clientY, timer }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const p = press.current
    press.current = null
    if (!p) return
    window.clearTimeout(p.timer)
    if (held) {
      setHeld(false)
      return
    }
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) return
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    go(x < 0.3 ? active - 1 : active + 1)
  }
  const onPointerCancel = () => {
    if (press.current) window.clearTimeout(press.current.timer)
    press.current = null
    setHeld(false)
  }

  if (!s) return null
  return (
    <div
      className="wrapped"
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={L('Månedsoppsummering for {m}', 'Monthly summary for {m}', { m: name })}
      tabIndex={-1}
      data-ink={def?.ink ?? 'light'}
      data-paused={paused ? 'true' : 'false'}
    >
      <div className="w-top">
        <div className="w-progress" aria-hidden="true">
          {defs.map((d, i) => (
            <span key={i} className={i < active || (i === active && (!d.dur || rm)) ? 'done' : ''}>
              {i === active && d.dur && !rm && (
                <i
                  key={`${run}-${active}`}
                  className="w-fill"
                  style={{ '--dur': d.dur + 'ms' } as CSSProperties}
                  onAnimationEnd={(e) => {
                    if (e.target === e.currentTarget && e.animationName === 'wFill') go(active + 1)
                  }}
                />
              )}
            </span>
          ))}
        </div>
        <div className="w-bar">
          <span className="w-brand">
            {config.appName} · {capitalize(name)}
          </span>
          {timed && (
            <button className="w-iconbtn" onClick={() => setPausedBtn((p) => !p)} aria-label={pausedBtn ? L('Spill av', 'Play') : L('Pause', 'Pause')}>
              <Icon name={pausedBtn ? 'play' : 'pause'} />
            </button>
          )}
          <button className="w-iconbtn" onClick={close} aria-label={L('Lukk', 'Close')}>
            <Icon name="x" />
          </button>
        </div>
      </div>

      <PlaybackPaused.Provider value={paused}>
        <div className="w-track" ref={track} tabIndex={-1} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onContextMenu={(e) => e.preventDefault()}>
          {defs.map((d, i) => {
            const m = mode(i)
            const B = d.Body
            return (
              <section
                key={`${run}-${d.id}`}
                className="wslide"
                data-index={i}
                data-tone={d.tone}
                data-mode={m}
                role="group"
                aria-roledescription={L('lysbilde', 'slide')}
                aria-label={L('{i} av {n}: {title}', '{i} of {n}: {title}', { i: i + 1, n: defs.length, title: d.title() })}
                inert={i !== active}
              >
                <BgShapes />
                <div className="w-content" key={m === 'pre' ? 'pre' : `r${run}`}>
                  <B s={s} mode={m} seen={seen(i)} watch={settings.watch} active={i === active} onReplay={replay} onResume={() => setPausedBtn(false)} onClose={close} />
                </div>
              </section>
            )
          })}
        </div>
      </PlaybackPaused.Provider>

      {/* aria-disabled i stedet for disabled: knappen beholder fokus ved første og siste kort */}
      <button className="w-nav prev" onClick={() => active > 0 && go(active - 1)} aria-disabled={active === 0 || undefined} aria-label={L('Forrige kort', 'Previous card')}>
        <Icon name="chevL" />
      </button>
      <button className="w-nav next" onClick={() => active < last && go(active + 1)} aria-disabled={active === last || undefined} aria-label={L('Neste kort', 'Next card')}>
        <Icon name="chevR" />
      </button>
      <p className="sr-only" aria-live="polite">
        {def ? L('{i} av {n}: {text}', '{i} of {n}: {text}', { i: active + 1, n: defs.length, text: def.aria(s) }) : ''}
      </p>
    </div>
  )
}
