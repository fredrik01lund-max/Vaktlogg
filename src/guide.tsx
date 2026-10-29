// Klappen: regissøren som forklarer demolinjen – den mørke linjen under appen som styrer «filmen».
// Han svever i 3D over skjermen: først midt på (historien og språket), så over knappene han forklarer.
// Vises første gang prototypen åpnes, kan hoppes over, og hentes frem igjen fra demolinjen.
// Den flate Klappen (SVG) brukes i demolinjen og som reserve uten WebGL.

import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { L } from './i18n.ts'
import { MANUAL, useStore } from './state.tsx'
import { K3D_SIZE, Klappen3D } from './klappen3d.tsx'
import './guide.css'

// ── Liten felles tilstand: overlever at appen tegnes på nytt når språket byttes ──
type GuideState = { open: boolean; step: number }
let state: GuideState = { open: false, step: 0 }
let autoTried = false
const subs = new Set<() => void>()
const setGuide = (next: GuideState) => {
  state = next
  subs.forEach((f) => f())
}
export const openGuide = () => setGuide({ open: true, step: 0 })
export function useGuide(): GuideState {
  return useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => state,
  )
}

type Mood = 'wave' | 'point' | 'wink' | 'clap'

/** Klappen: en pastell filmklapper med store øyne, røde kinn og en klapperstang som klapper. */
export function Klappen({ mood = 'wave', size = 84, clapKey = 0 }: { mood?: Mood; size?: number; clapKey?: number }) {
  const id = useId()
  return (
    <svg className={`klappen mood-${mood}`} width={size} height={size * 1.1} viewBox="0 0 100 110" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFD7AE" />
          <stop offset="1" stopColor="#F7AFCB" />
        </linearGradient>
        <pattern id={`${id}s`} width="14" height="16" patternUnits="userSpaceOnUse" patternTransform="skewX(-28)">
          <rect width="14" height="16" fill="#FFF6EE" />
          <rect width="7" height="16" fill="#6E2A3C" />
        </pattern>
      </defs>
      {/* Skygge */}
      <ellipse cx="50" cy="104" rx="26" ry="4" fill="#6E2A3C" opacity="0.12" />
      {/* Bein */}
      <rect x="34" y="92" width="9" height="11" rx="4.5" fill="#F29BBD" />
      <rect x="57" y="92" width="9" height="11" rx="4.5" fill="#F29BBD" />
      {/* Armer: venstre hviler, høyre vinker eller peker */}
      <path className="k-arm-l" d="M17 66c-7 2-10 7-9 12" stroke="#F29BBD" strokeWidth="7" strokeLinecap="round" fill="none" />
      <g className="k-arm-r">
        <path d="M83 64c7-3 11-9 10-16" stroke="#F29BBD" strokeWidth="7" strokeLinecap="round" fill="none" />
      </g>
      {/* Kroppen med stripebåndet øverst */}
      <rect x="14" y="40" width="72" height="56" rx="16" fill={`url(#${id}b)`} />
      <path d="M14 56V52a12 12 0 0 1 12-12h48a12 12 0 0 1 12 12v4z" fill={`url(#${id}s)`} />
      <rect x="14" y="40" width="72" height="56" rx="16" fill="none" stroke="#6E2A3C" strokeOpacity="0.14" strokeWidth="1.5" />
      {/* Klapperstangen – hengslet til venstre, klapper ved hvert nytt kort */}
      <g className="k-stick" key={clapKey}>
        <rect x="12" y="24" width="76" height="13" rx="5" fill={`url(#${id}s)`} stroke="#6E2A3C" strokeWidth="1.5" />
        <circle cx="18" cy="37" r="3.2" fill="#6E2A3C" />
      </g>
      {/* Ansiktet */}
      <g className="k-eyes">
        {mood === 'wink' ? (
          <path d="M31 70q6-6 12 0" stroke="#4A1B2A" strokeWidth="3" strokeLinecap="round" fill="none" />
        ) : (
          <g>
            <ellipse cx="37" cy="70" rx="7.5" ry="8.5" fill="#fff" />
            <circle cx="38.5" cy="71" r="4.6" fill="#4A1B2A" />
            <circle cx="40" cy="69" r="1.6" fill="#fff" />
          </g>
        )}
        <ellipse cx="63" cy="70" rx="7.5" ry="8.5" fill="#fff" />
        <circle cx="64.5" cy="71" r="4.6" fill="#4A1B2A" />
        <circle cx="66" cy="69" r="1.6" fill="#fff" />
      </g>
      <ellipse cx="27" cy="82" rx="5.5" ry="3.2" fill="#F07FA6" opacity="0.55" />
      <ellipse cx="73" cy="82" rx="5.5" ry="3.2" fill="#F07FA6" opacity="0.55" />
      {mood === 'wave' || mood === 'clap' ? (
        <path d="M44 81q6 7 12 0z" fill="#4A1B2A" stroke="#4A1B2A" strokeWidth="2" strokeLinejoin="round" />
      ) : (
        <path d="M45 82q5 4 10 0" stroke="#4A1B2A" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      )}
      {/* Gnist ved hodet */}
      <path className="k-spark" d="M92 16c.6 3 2 4.4 5 5-3 .6-4.4 2-5 5-.6-3-2-4.4-5-5 3-.6 4.4-2 5-5z" fill="#F5C64D" />
    </svg>
  )
}

// Fire stopp: midt på skjermen (historien og språket), så over knappene han forklarer.
const steps = (): { target: string | null; mood: Mood; text: string; title?: string; lang?: boolean }[] => [
  {
    target: null,
    mood: 'wave',
    title: L('Hei! Jeg er Klappen.', 'Hi! I’m Clappy.'),
    text: L('Prototypen er en film om én fredagsvakt, og du er Emma. Jeg viser deg hvordan du styrer den.', 'The prototype is a film about one Friday shift, and you’re Emma. Let me show you how to run it.'),
    lang: true,
  },
  {
    target: 'start',
    mood: 'point',
    text: L('Trykk her, så spilles kvelden av på to minutter – om igjen til du trykker «Avslutt vakt».', 'Tap here and the evening plays in two minutes – over and over until you tap “End shift”.'),
  },
  {
    target: 'roles',
    mood: 'point',
    text: L('Her bytter du mellom Emmas telefon og sjefen Karis.', 'Switch between Emma’s phone and her manager Kari’s here.'),
  },
  {
    target: 'more',
    mood: 'wink',
    text: L('Her bytter du språk og starter alt på nytt. Den mørke linjen er ikke en del av appen – den styrer bare filmen.', 'Switch language and start over here. The dark bar isn’t part of the app – it just runs the film.'),
  },
]

const SIZE = K3D_SIZE
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
type Pos = { cx: number; cy: number; scale: number; bx: number; by: number; bw: number; tail: number }

/** Klappen svever over skjermen dit han forklarer noe, med en snakkeboble som følger ham. */
export function DemoGuide() {
  const { settings, updateSettings } = useStore()
  const g = useGuide()
  const ref = useRef<HTMLDivElement>(null)
  const sayRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<Pos | null>(null)
  const [leaving, setLeaving] = useState(false)
  const list = steps()
  const s = list[Math.min(g.step, list.length - 1)]

  // Første besøk: Klappen dukker opp av seg selv (ikke i testene eller med ?manuell). ?guide viser ham alltid.
  useEffect(() => {
    if (autoTried) return
    autoTried = true
    const force = new URLSearchParams(window.location.search).has('guide')
    // Tidtakeren avbrytes ikke: appen tegnes på nytt ved språkbytte, og Klappen skal komme bare én gang
    if (force || (!settings.guideSeen && !MANUAL && !navigator.webdriver)) window.setTimeout(openGuide, 700)
  }, [settings.guideSeen])

  // Plasser Klappen: midt på skjermen, eller rett over knappen han forklarer. Boblen over ham, innenfor appen.
  useLayoutEffect(() => {
    if (!g.open) return
    const place = () => {
      const bar = ref.current?.parentElement
      const app = document.querySelector<HTMLElement>('.app')
      const say = sayRef.current
      if (!bar || !app || !say) return
      const B = bar.getBoundingClientRect()
      const A = app.getBoundingClientRect()
      const scale = s.target ? 0.8 : 1.3
      const w = SIZE * scale * 0.6
      const h = SIZE * scale
      let cx: number
      let cy: number
      const el = s.target ? bar.querySelector<HTMLElement>(`[data-guide='${s.target}']`) : null
      if (el) {
        const r = el.getBoundingClientRect()
        cx = r.left + r.width / 2 - B.left
        // Føttene står rett over knappen (det nederste av lerretet er luft)
        cy = r.top - B.top - 2 - h * 0.38
      } else {
        cx = A.left + A.width / 2 - B.left
        cy = A.top + A.height * 0.6 - B.top
      }
      cx = clamp(cx, A.left - B.left + w / 2 + 4, A.right - B.left - w / 2 - 4)
      const bw = Math.min(296, A.width - 24)
      say.style.width = `${bw}px`
      const bh = say.offsetHeight
      const bx = clamp(cx - bw / 2, A.left - B.left + 12, A.right - B.left - 12 - bw)
      const by = Math.max(A.top - B.top + 12, cy - h * 0.46 - 6 - bh)
      setPos({ cx, cy, scale, bx, by, bw, tail: clamp(cx - bx, 26, bw - 26) })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [g.open, g.step, s.target, settings.lang])

  // Knappen han forklarer, får en myk ring i demolinjen
  useEffect(() => {
    const bar = ref.current?.parentElement
    if (!bar) return
    if (g.open && s.target) bar.dataset.guideStep = s.target
    else delete bar.dataset.guideStep
    return () => {
      delete bar.dataset.guideStep
    }
  }, [g.open, s.target])

  const close = () => {
    setLeaving(true)
    window.setTimeout(() => {
      setLeaving(false)
      setPos(null)
      setGuide({ open: false, step: 0 })
      if (!settings.guideSeen) updateSettings({ guideSeen: true })
    }, 320)
  }

  if (!g.open) return null
  const last = g.step >= list.length - 1
  return (
    <div className={`kg-layer ${leaving ? 'leaving' : ''} ${pos ? 'placed' : ''}`} ref={ref} role="dialog" aria-label={L('Klappens guide til prototypen', 'Clappy’s guide to the prototype')}>
      <div
        className="kg-float"
        style={pos ? { left: pos.cx - SIZE / 2, top: pos.cy - SIZE / 2, transform: `scale(${pos.scale})` } : undefined}
      >
        <div className="kg-bob">
          <Klappen3D mood={leaving && last ? 'clap' : s.mood} spinKey={g.step} leaving={leaving} fallback={<Klappen mood={s.mood} clapKey={g.step} size={100} />} />
        </div>
      </div>
      <div className="kg-say" ref={sayRef} style={pos ? { left: pos.bx, top: pos.by, width: pos.bw, ['--tail' as string]: `${pos.tail}px` } : undefined}>
        <div className="kg-text" key={g.step}>
          {s.title && <b>{s.title}</b>}
          <p>{s.text}</p>
          {s.lang && (
            <div className="kg-lang" role="radiogroup" aria-label="Språk · Language">
              {(['no', 'en'] as const).map((l) => (
                <button key={l} role="radio" aria-checked={settings.lang === l} onClick={() => updateSettings({ lang: l })}>
                  {l === 'no' ? 'Norsk' : 'English'}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="kg-foot">
          <span className="kg-dots" aria-label={L('{n} av {t}', '{n} of {t}', { n: g.step + 1, t: list.length })}>
            {list.map((_, i) => (
              <i key={i} className={i === g.step ? 'on' : ''} />
            ))}
          </span>
          {!last && (
            <button className="kg-skip" onClick={close}>
              {L('Hopp over', 'Skip')}
            </button>
          )}
          <button className="kg-next" onClick={() => (last ? close() : setGuide({ open: true, step: g.step + 1 }))}>
            {last ? L('Action!', 'Action!') : L('Neste', 'Next')}
          </button>
        </div>
      </div>
    </div>
  )
}
