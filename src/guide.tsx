// Sir Domeo: en liten serveringsklokke som forklarer demolinjen – den mørke linjen under appen som styrer demoen.
// Han svever i 3D over skjermen: først midt på (historien og språket), så over knappene han forklarer.
// Lokket er munnen hans: det går opp og ned mens han snakker, og løftes helt når han presenterer noe.
// Vises første gang prototypen åpnes, kan hoppes over, og hentes frem igjen fra demolinjen.
// På Karis telefon dukker han opp én gang per besøk og sier at lederens side er under arbeid.
// Rett etter vakten kommer han raskt, gratulerer Emma og presenterer sluttrapporten.
// Den flate Sir Domeo (SVG) brukes i demolinjen og som reserve uten WebGL.

import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { config } from './config.ts'
import { L } from './i18n.ts'
import { MANUAL, useStore } from './state.tsx'
import { D3D_SIZE, Domeo3D } from './domeo3d.tsx'
import type { Mood, Move } from './domeo3d.tsx'
import './guide.css'

// ── Liten felles tilstand: overlever at appen tegnes på nytt når språket byttes ──
type GuideState = { open: boolean; step: number; mode: 'tour' | 'kari' | 'done'; bye?: number }
let state: GuideState = { open: false, step: 0, mode: 'tour' }
let autoTried = false
/** Karis beskjed vises én gang per besøk i prototypen. */
let kariShown = false
const subs = new Set<() => void>()
const setGuide = (next: GuideState) => {
  state = next
  subs.forEach((f) => f())
}
export const openGuide = () => setGuide({ open: true, step: 0, mode: 'tour' })
/** Be ham gå (f.eks. når sluttrapporten åpnes i stort format). */
export const dismissGuide = () => state.open && setGuide({ ...state, bye: (state.bye ?? 0) + 1 })
/** Rett etter vakten: han kommer raskt, gratulerer og presenterer sluttrapporten. Ikke i testene eller med ?manuell. */
export function congratulate() {
  const force = new URLSearchParams(window.location.search).has('guide')
  if (!force && (MANUAL || navigator.webdriver)) return
  if (state.open && state.mode === 'kari') return
  window.setTimeout(() => setGuide({ open: true, step: 0, mode: 'done' }), 300)
}
export function useGuide(): GuideState {
  return useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => state,
  )
}

/** Sir Domeo flat: serveringsklokke i rosegull med store øyne, bart, monokkel, sløyfe og hvite hansker. */
export function Domeo({ mood = 'wave', size = 84, talkKey = 0 }: { mood?: Mood; size?: number; talkKey?: number }) {
  const id = useId()
  const closed = mood === 'cheer'
  const eye = (cx: number, shut: boolean) =>
    shut ? (
      <path d={`M${cx - 4.5} 57q4.5-6 9 0`} stroke="#33212A" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    ) : (
      <g>
        <ellipse cx={cx} cy="55" rx="4.6" ry="6" fill="#33212A" />
        <circle cx={cx + 1.6} cy="52.6" r="1.7" fill="#fff" />
        <circle cx={cx - 1.2} cy="57.4" r="0.9" fill="#fff" />
      </g>
    )
  return (
    <svg className={`domeo mood-${mood}`} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}d`} x1="0.1" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#FFE3D6" />
          <stop offset="1" stopColor="#FFB4A6" />
        </linearGradient>
        <linearGradient id={`${id}p`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#EAD9D6" />
        </linearGradient>
      </defs>
      {/* Skygge */}
      <ellipse cx="50" cy="96" rx="26" ry="3.5" fill="#6E2A3C" opacity="0.12" />
      {/* Bein og rosa sko */}
      <path d="M40 79v8M60 79v8" stroke="#F3AE9E" strokeWidth="4.5" strokeLinecap="round" />
      <ellipse cx="39" cy="90" rx="6.5" ry="4" fill="#F8A6C2" />
      <ellipse cx="61" cy="90" rx="6.5" ry="4" fill="#F8A6C2" />
      {/* Armer med hvite hansker: venstre hviler, høyre vinker eller peker */}
      <path d="M11 76q-5 3-5 10" stroke="#F3AE9E" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="6" cy="88" r="4.6" fill="#fff" stroke="#6E2A3C" strokeOpacity="0.15" />
      <g className="k-arm-r">
        <path d="M89 76q6-3 6-12" stroke="#F3AE9E" strokeWidth="4" strokeLinecap="round" fill="none" />
        <circle cx="95" cy="62" r="4.6" fill="#fff" stroke="#6E2A3C" strokeOpacity="0.15" />
      </g>
      {/* Lokket – munnen hans – med ansiktet, barten og monokkelen. Det hopper litt når han snakker. */}
      <g className="k-lid" key={talkKey}>
        <path d="M15 73a35 41 0 0 1 70 0z" fill={`url(#${id}d)`} />
        <path d="M24 58q4-15 19-20" stroke="#fff" strokeOpacity="0.75" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <rect x="13.5" y="70.5" width="73" height="4" rx="2" fill={`url(#${id}p)`} />
        <rect x="47.5" y="27" width="5" height="6" rx="1.5" fill={`url(#${id}p)`} />
        <circle cx="50" cy="25" r="5" fill={`url(#${id}p)`} stroke="#6E2A3C" strokeOpacity="0.12" />
        <path d="M34.5 45.5q4.5-2.5 9-.5M56.5 43.5q4.5-2.5 9 .5" stroke="#7A4E3C" strokeWidth="2" strokeLinecap="round" fill="none" />
        <g className="k-eyes">
          {eye(39, mood === 'wink' || closed)}
          {eye(61, closed)}
        </g>
        <ellipse cx="28" cy="63" rx="5" ry="2.8" fill="#FF8FB0" opacity="0.55" />
        <ellipse cx="72" cy="63" rx="5" ry="2.8" fill="#FF8FB0" opacity="0.55" />
        {/* Monokkel med kjede */}
        <circle cx="61" cy="55" r="8.2" fill="#fff" fillOpacity="0.16" stroke="#E9B65C" strokeWidth="1.8" />
        <path d="M66.5 61q5 4 6.5 9.5" stroke="#E9B65C" strokeWidth="0.9" strokeLinecap="round" fill="none" />
        {/* Bart med krøllete tupper */}
        <path
          d="M50 65.2c-2.4-2.4-6.6-3-10.4-1.4-2.4 1-4.4.8-5.4-.9-.7 2.6 1.4 4.6 4.6 4.8 4 .3 8.2-.7 11.2-2.1 3 1.4 7.2 2.4 11.2 2.1 3.2-.2 5.3-2.2 4.6-4.8-1 1.7-3 1.9-5.4.9-3.8-1.6-8-1-10.4 1.4z"
          fill="#7A4E3C"
        />
      </g>
      {/* Fatet og sløyfen */}
      <ellipse cx="50" cy="77" rx="44" ry="5.5" fill={`url(#${id}p)`} stroke="#6E2A3C" strokeOpacity="0.12" />
      <path d="M43 79.5l7 3.5-7 3.5zM57 79.5l-7 3.5 7 3.5z" fill="#F8A6C2" />
      <circle cx="50" cy="83" r="2.3" fill="#EE86A8" />
      {/* Gnist ved hodet */}
      <path className="k-spark" d="M88 18c.6 3 2 4.4 5 5-3 .6-4.4 2-5 5-.6-3-2-4.4-5-5 3-.6 4.4-2 5-5z" fill="#F5C64D" />
    </svg>
  )
}

// Fem stopp: midt på skjermen (hvem du er, språket), så over knappene han forklarer.
// `anchor`: noe i appen han presenterer – da står boblen rett under det.
type Step = { target: string | null; anchor?: string; mood: Mood; move: Move; text: string; title?: string; lang?: boolean }
const steps = (): Step[] => [
  {
    target: null,
    mood: 'wave',
    move: 'tip',
    title: L('Hei! Jeg er Sir Domeo.', 'Hi! I’m Sir Domeo.'),
    text: L('Du er Emma, servitør på en fredagsvakt. Trykk deg rundt i appen akkurat som hun ville gjort.', 'You’re Emma, a server on a Friday shift. Tap around the app just like she would.'),
    lang: true,
  },
  {
    target: 'start',
    mood: 'point',
    move: 'flip',
    text: L('Start vakten her. Kvelden går av seg selv på to minutter – trykk på det du vil se mens den pågår.', 'Start the shift here. The evening runs by itself in two minutes – tap whatever you want to see while it’s on.'),
  },
  {
    target: 'start',
    mood: 'wink',
    move: 'twirl',
    text: L('Ferdig? Trykk «Avslutt vakt» her og få sluttrapporten. Historikk, Goals og Meg kan du se når som helst.', 'Done? Tap “End shift” here to get the shift report. History, Goals and Me are there any time.'),
  },
  {
    target: 'roles',
    mood: 'point',
    move: 'look',
    text: L('Her bytter du mellom Emmas telefon og sjefen Karis.', 'Switch between Emma’s phone and her manager Kari’s here.'),
  },
  {
    target: 'more',
    mood: 'wink',
    move: 'dance',
    text: L('Her bytter du språk og starter alt på nytt. Den mørke linjen styrer bare demoen.', 'Switch language and start over here. The dark bar just runs the demo.'),
  },
]

// Karis telefon: lederens side er ikke ferdig – vi vil ha innspill
const kariSteps = (): Step[] => [
  {
    target: null,
    mood: 'wave',
    move: 'shrug',
    title: L('Lederens side er under arbeid', 'The manager’s side is a work in progress'),
    text: L('Denne delen er ikke ferdig utviklet ennå. Vi vil gjerne ha innspill: hva bør Kari se og gjøre her?', 'This part isn’t finished yet. We’d love your input: what should Kari see and do here?'),
  },
]

// Rett etter vakten: gratulerer og løfter lokket for sluttrapporten
const doneSteps = (): Step[] => [
  {
    target: null,
    anchor: '.er-peek',
    mood: 'point',
    move: 'present',
    title: L('Gratulerer med en god vakt, {name}!', 'Congrats on a great shift, {name}!', { name: config.persona.firstName }),
    text: L('Voilà – her er sluttrapporten din. Trykk på den for å se hele.', 'Voilà – here’s your shift report. Tap it to see all of it.'),
  },
]

const SIZE = D3D_SIZE
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
type Pos = { cx: number; cy: number; scale: number; bx: number; by: number; bw: number; tail: number; dir: number }

/** Sir Domeo svever over skjermen dit han forklarer noe, med en snakkeboble som følger ham. */
export function DemoGuide({ boss, onReport }: { boss: boolean; onReport: boolean }) {
  const { settings, updateSettings } = useStore()
  const g = useGuide()
  const ref = useRef<HTMLDivElement>(null)
  const sayRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<Pos | null>(null)
  const [leaving, setLeaving] = useState(false)
  const prevCx = useRef<number | null>(null)
  const list = g.mode === 'kari' ? kariSteps() : g.mode === 'done' ? doneSteps() : steps()
  const s = list[Math.min(g.step, list.length - 1)]

  // Første besøk: han dukker opp av seg selv (ikke i testene eller med ?manuell). ?guide viser ham alltid.
  useEffect(() => {
    if (autoTried) return
    autoTried = true
    const force = new URLSearchParams(window.location.search).has('guide')
    // Tidtakeren avbrytes ikke: appen tegnes på nytt ved språkbytte, og han skal komme bare én gang
    if (force || (!settings.guideSeen && !MANUAL && !navigator.webdriver)) window.setTimeout(() => !state.open && openGuide(), 700)
  }, [settings.guideSeen])

  // Karis telefon: han dukker opp og sier at siden er under arbeid (én gang per besøk)
  useEffect(() => {
    if (!boss) {
      if (state.open && state.mode === 'kari') setGuide({ open: false, step: 0, mode: 'tour' })
      return
    }
    const force = new URLSearchParams(window.location.search).has('guide')
    if (kariShown || (state.open && state.mode !== 'done') || (!force && (MANUAL || navigator.webdriver))) return
    kariShown = true
    window.setTimeout(() => setGuide({ open: true, step: 0, mode: 'kari' }), 600)
  }, [boss])

  // Etter vakten: han går når Emma forlater sluttrapporten, eller åpner den i stort format
  useEffect(() => {
    if (!onReport && state.open && state.mode === 'done') close()
  }, [onReport]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (g.bye) close()
  }, [g.bye]) // eslint-disable-line react-hooks/exhaustive-deps
  // Tok gratulasjonen over for omvisningen, regnes omvisningen som sett
  useEffect(() => {
    if (g.open && g.mode === 'done' && !settings.guideSeen) updateSettings({ guideSeen: true })
  }, [g.open, g.mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Plasser ham: midt på skjermen, rett over knappen han forklarer, eller under det han presenterer.
  // Boblen står alltid over ham, innenfor appen.
  useLayoutEffect(() => {
    if (!g.open) return
    const place = () => {
      const bar = ref.current?.parentElement
      const app = document.querySelector<HTMLElement>('.app')
      const say = sayRef.current
      if (!bar || !app || !say) return
      const B = bar.getBoundingClientRect()
      const A = app.getBoundingClientRect()
      const anchor = s.anchor ? document.querySelector<HTMLElement>(s.anchor) : null
      const el = s.target ? bar.querySelector<HTMLElement>(`[data-guide='${s.target}']`) : null
      const scale = anchor ? 1.05 : el ? 0.8 : 1.3
      const w = SIZE * scale * 0.72
      const h = SIZE * scale
      const bw = Math.min(296, A.width - 24)
      say.style.width = `${bw}px`
      const bh = say.offsetHeight
      let cx: number
      let cy: number
      if (anchor) {
        // Boblen rett under det han presenterer, han selv under boblen ute til høyre – men over fanelinjen
        const r = anchor.getBoundingClientRect()
        cx = A.right - B.left - h / 2 - 2
        cy = Math.min(r.bottom - B.top + 10 + bh + 6 + h * 0.36, A.bottom - B.top - h * 0.24)
      } else if (el) {
        const r = el.getBoundingClientRect()
        cx = r.left + r.width / 2 - B.left
        // Skoene står rett over knappen (det nederste av lerretet er luft)
        cy = r.top - B.top - 2 - h * 0.2
      } else {
        cx = A.left + A.width / 2 - B.left
        cy = A.top + A.height * 0.6 - B.top
      }
      cx = clamp(cx, A.left - B.left + w / 2 + 4, A.right - B.left - w / 2 - 4)
      const bx = clamp(cx - bw / 2, A.left - B.left + 12, A.right - B.left - 12 - bw)
      const by = Math.max(A.top - B.top + 12, cy - h * 0.36 - 6 - bh)
      // Retningen han flyr, så han kan lene seg inn i svingen
      const dir = prevCx.current === null ? 0 : Math.sign(Math.round(cx - prevCx.current))
      prevCx.current = cx
      setPos({ cx, cy, scale, bx, by, bw, tail: clamp(cx - bx, 30, bw - 30), dir })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [g.open, g.step, g.mode, s.target, settings.lang])

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

  function close() {
    if (!state.open) return
    setLeaving(true)
    window.setTimeout(() => {
      setLeaving(false)
      setPos(null)
      prevCx.current = null
      const wasTour = state.mode === 'tour'
      setGuide({ open: false, step: 0, mode: 'tour' })
      if (wasTour && !settings.guideSeen) updateSettings({ guideSeen: true })
    }, 320)
  }

  if (!g.open) return null
  const last = g.step >= list.length - 1
  // Han snakker omtrent så lenge det tar å lese boblen (lokket går opp og ned imens)
  const talk = Math.min(3600, 600 + ((s.title ?? '') + s.text).length * 22)
  const key = g.step + (g.mode === 'kari' ? 100 : g.mode === 'done' ? 200 : 0)
  return (
    <div className={`kg-layer ${leaving ? 'leaving' : ''} ${pos ? 'placed' : ''}`} ref={ref} role="dialog" aria-label={L('Sir Domeos guide til prototypen', 'Sir Domeo’s guide to the prototype')}>
      <div
        className="kg-float"
        style={pos ? { left: pos.cx - SIZE / 2, top: pos.cy - SIZE / 2, transform: `scale(${pos.scale})` } : undefined}
      >
        <div className="kg-bob">
          <Domeo3D
            mood={leaving && last && g.mode !== 'kari' ? 'cheer' : s.mood}
            move={leaving ? 'twirl' : s.move}
            actionKey={key + (leaving ? 1000 : 0)}
            dir={pos?.dir ?? 0}
            talk={leaving ? 0 : talk}
            leaving={leaving}
            fallback={<Domeo mood={s.mood} talkKey={key} size={100} />}
          />
        </div>
      </div>
      <div className="kg-say" ref={sayRef} style={pos ? { left: pos.bx, top: pos.by, width: pos.bw, ['--tail' as string]: `${pos.tail}px` } : undefined}>
        <div className="kg-text" key={key}>
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
          <span className="kg-dots" aria-label={list.length > 1 ? L('{n} av {t}', '{n} of {t}', { n: g.step + 1, t: list.length }) : undefined}>
            {list.length > 1 && list.map((_, i) => <i key={i} className={i === g.step ? 'on' : ''} />)}
          </span>
          {!last && (
            <button className="kg-skip" onClick={close}>
              {L('Hopp over', 'Skip')}
            </button>
          )}
          <button className="kg-next" onClick={() => (last ? close() : setGuide({ open: true, step: g.step + 1, mode: g.mode }))}>
            {g.mode === 'kari' ? L('Skjønner!', 'Got it!') : g.mode === 'done' ? L('Takk!', 'Thanks!') : last ? 'Voilà!' : L('Neste', 'Next')}
          </button>
        </div>
        {/* Halen på boblen peker ned mot ham */}
        <svg className="kg-tail" width="30" height="18" viewBox="0 0 30 18" aria-hidden="true">
          <path className="f" d="M0 0C7 1 12 6 13 17C16 8 22 2 30 0Z" />
          <path className="o" d="M0 .6C7 1.6 12 6 13 17C16 8 22 2.6 30 .6" />
        </svg>
      </div>
    </div>
  )
}
