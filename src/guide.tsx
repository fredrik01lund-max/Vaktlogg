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
import { D3D_BODY, D3D_PX, D3D_SIZE, Domeo3D } from './domeo3d.tsx'
import type { Aim, Hand, Mood, Move } from './domeo3d.tsx'
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

/** Sir Domeo flat: sølvklokke med brune øyne under sølvlokk, handlebar-bart, monokkel, vinrød sløyfe, frakkeermer og lakksko. */
export function Domeo({ mood = 'wave', size = 84, talkKey = 0 }: { mood?: Mood; size?: number; talkKey?: number }) {
  const id = useId()
  const closed = mood === 'cheer'
  const eye = (cx: number, shut: boolean) =>
    shut ? (
      <path d={`M${cx - 5} 53q5-5.5 10 0`} stroke="#3A2622" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    ) : (
      <g>
        <ellipse cx={cx} cy="52" rx="6.2" ry="7.4" fill="#FBFAF7" stroke="#8F96A0" strokeWidth="0.8" />
        <circle cx={cx + 0.3} cy="53" r="4.2" fill="#8C5430" />
        <circle cx={cx + 0.3} cy="53" r="2.2" fill="#120B08" />
        <circle cx={cx - 1.2} cy="51.2" r="1.2" fill="#fff" />
        {/* Øyelokket i sølv */}
        <path d={`M${cx - 6.4} 50.4a6.4 7.6 0 0 1 12.8 0q-6.4-2.6-12.8 0z`} fill={`url(#${id}c)`} stroke="#8F96A0" strokeWidth="0.6" />
      </g>
    )
  return (
    <svg className={`domeo mood-${mood}`} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}c`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#C4C8CF" />
          <stop offset="0.32" stopColor="#FFFFFF" />
          <stop offset="0.68" stopColor="#E7E9ED" />
          <stop offset="1" stopColor="#A9AFB8" />
        </linearGradient>
        <linearGradient id={`${id}p`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#B5BAC3" />
        </linearGradient>
      </defs>
      {/* Skygge */}
      <ellipse cx="50" cy="96" rx="26" ry="3.5" fill="#2A2830" opacity="0.14" />
      {/* Bukser, hvite gamasjer og lakksko */}
      <path d="M41 80v7M59 80v7" stroke="#302E33" strokeWidth="5" strokeLinecap="round" />
      <rect x="37.6" y="85.5" width="6.8" height="3.4" rx="1.2" fill="#F3F1EC" />
      <rect x="55.6" y="85.5" width="6.8" height="3.4" rx="1.2" fill="#F3F1EC" />
      <ellipse cx="39" cy="91.5" rx="7" ry="3.8" fill="#1B1A1E" />
      <ellipse cx="61" cy="91.5" rx="7" ry="3.8" fill="#1B1A1E" />
      <ellipse cx="36.5" cy="90.4" rx="2.2" ry="0.9" fill="#fff" opacity="0.55" />
      <ellipse cx="58.5" cy="90.4" rx="2.2" ry="0.9" fill="#fff" opacity="0.55" />
      {/* Brettet */}
      <ellipse cx="50" cy="77" rx="46" ry="6" fill={`url(#${id}p)`} stroke="#8F96A0" strokeOpacity="0.45" />
      {/* Venstre arm hviler: frakkeerme, mansjett og hanske */}
      <path d="M18 77q-7 2-8 9" stroke="#302E33" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <circle cx="9.6" cy="89" r="4.6" fill="#fff" stroke="#2A2830" strokeOpacity="0.18" />
      {/* Lokket – munnen hans – med ansiktet, barten og monokkelen. Det hopper litt når han snakker. */}
      <g className="k-lid" key={talkKey}>
        <path d="M16 74a34 40 0 0 1 68 0z" fill={`url(#${id}c)`} stroke="#8F96A0" strokeOpacity="0.4" />
        <path d="M26 57q3-14 17-20" stroke="#fff" strokeOpacity="0.9" strokeWidth="3" strokeLinecap="round" fill="none" />
        <rect x="14.5" y="71.5" width="71" height="4.2" rx="2.1" fill={`url(#${id}p)`} stroke="#8F96A0" strokeOpacity="0.4" strokeWidth="0.8" />
        <rect x="47.8" y="29.5" width="4.4" height="6" fill={`url(#${id}p)`} />
        <circle cx="50" cy="27.5" r="4.6" fill={`url(#${id}c)`} stroke="#8F96A0" strokeOpacity="0.5" strokeWidth="0.8" />
        <path d="M33 41.6q6-3.6 12-1M55 40.6q6-2.6 12 1" stroke="#4A2A1C" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <g className="k-eyes">
          {eye(39, mood === 'wink' || closed)}
          {eye(61, closed)}
        </g>
        <ellipse cx="27.5" cy="61.5" rx="5" ry="2.8" fill="#FF8FB0" opacity="0.5" />
        <ellipse cx="72.5" cy="61.5" rx="5" ry="2.8" fill="#FF8FB0" opacity="0.5" />
        {/* Monokkel med kjede */}
        <circle cx="61" cy="52" r="8.6" fill="#fff" fillOpacity="0.14" stroke="#E9B65C" strokeWidth="1.8" />
        <path d="M67.5 57.5q4 5 3 11" stroke="#E9B65C" strokeWidth="0.9" strokeLinecap="round" fill="none" />
        {/* Handlebar-bart med krøller */}
        <path
          d="M50 64.6c-2.6-2.8-7.4-3.6-11.6-1.6-2.8 1.3-5 .9-6.2-1-.8 3.1 1.6 5.4 5.4 5.6 4.6.3 9.4-.8 12.4-2.4 3 1.6 7.8 2.7 12.4 2.4 3.8-.2 6.2-2.5 5.4-5.6-1.2 1.9-3.4 2.3-6.2 1-4.2-2-9-1.2-11.6 1.6z"
          fill="#4A2A1C"
        />
        <path d="M32.4 62.1c-1.8-.6-2.6-2.4-1.6-3.8 1-1.3 3-1 3.2.5M67.6 62.1c1.8-.6 2.6-2.4 1.6-3.8-1-1.3-3-1-3.2.5" stroke="#4A2A1C" strokeWidth="1.7" strokeLinecap="round" fill="none" />
      </g>
      {/* Vinrød sløyfe */}
      <path d="M50 83c-3-2.6-6-4-8-3.6-1 .4-1 6.8 0 7.2 2 .4 5-1 8-3.6zM50 83c3-2.6 6-4 8-3.6 1 .4 1 6.8 0 7.2-2 .4-5-1-8-3.6z" fill="#94284C" />
      <ellipse cx="50" cy="83" rx="2" ry="2.4" fill="#7A2040" />
      {/* Høyre arm: vinker eller peker */}
      <g className="k-arm-r">
        <path d="M82 77q8-2 9.5-13" stroke="#302E33" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        <circle cx="92" cy="60.5" r="4.8" fill="#fff" stroke="#2A2830" strokeOpacity="0.18" />
      </g>
      {/* Gnist ved hodet */}
      <path className="k-spark" d="M88 16c.6 3 2 4.4 5 5-3 .6-4.4 2-5 5-.6-3-2-4.4-5-5 3-.6 4.4-2 5-5z" fill="#F5C64D" />
    </svg>
  )
}

// Fem stopp: midt på skjermen (hvem du er, språket), så over knappene han forklarer.
// `anchor`: noe i appen han presenterer – da står boblen rett under det.
// `aim`: det han peker på (velgere), og `hand`: pekefinger eller flat hånd.
type Step = { target: string | null; anchor?: string; aim?: string[]; hand?: Hand; mood: Mood; move: Move; text: string; title?: string; lang?: boolean }
const steps = (): Step[] => [
  {
    target: null,
    mood: 'wave',
    move: 'tip',
    title: L('Sir Domeo, til tjeneste!', 'Sir Domeo, at your service!'),
    text: L('Du er Emma, servitør på en fredagsvakt. Trykk deg rundt i appen akkurat som hun ville gjort.', 'You’re Emma, a server on a Friday shift. Tap around the app just like she would.'),
    lang: true,
  },
  {
    target: 'start',
    aim: ["[data-guide='start']"],
    mood: 'point',
    move: 'watch',
    text: L('Start vakten her. Kvelden går av seg selv på to minutter – trykk på det du vil se mens den pågår.', 'Start the shift here. The evening runs by itself in two minutes – tap whatever you want to see while it’s on.'),
  },
  {
    target: 'start',
    aim: ["[data-guide='start']"],
    mood: 'wink',
    move: 'hop',
    text: L('Ferdig? Trykk «Avslutt vakt» her og få sluttrapporten. Historikk, Goals og Meg kan du se når som helst.', 'Done? Tap “End shift” here to get the shift report. History, Goals and Me are there any time.'),
  },
  {
    target: 'roles',
    aim: ["[data-guide='roles'] button:first-child", "[data-guide='roles'] button:last-child"],
    mood: 'point',
    move: 'pick',
    text: L('Her bytter du mellom Emmas telefon og sjefen Karis.', 'Switch between Emma’s phone and her manager Kari’s here.'),
  },
  {
    target: 'more',
    aim: ["[data-guide='more']"],
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
    aim: ['.er-peek-more'],
    hand: 'palm',
    mood: 'point',
    move: 'present',
    title: L('Gratulerer med en god vakt, {name}!', 'Congrats on a great shift, {name}!', { name: config.persona.firstName }),
    text: L('Voilà – her er sluttrapporten din. Trykk på den for å se hele.', 'Voilà – here’s your shift report. Tap it to see all of it.'),
  },
]

const SIZE = D3D_SIZE
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
type Pos = { cx: number; cy: number; scale: number; bx: number; by: number; bw: number; tail: number; dir: number; aims: Aim[] }

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
      const scale = anchor ? 1.05 : el ? 0.9 : 1.3
      // Kroppens mål i piksler ved denne skalaen
      const px = D3D_PX * scale
      const half = D3D_BODY.half * px
      const feet = D3D_BODY.feet * px
      const head = D3D_BODY.head * px
      const bw = Math.min(296, A.width - 24)
      say.style.width = `${bw}px`
      const bh = say.offsetHeight
      let cx: number
      let cy: number
      if (anchor) {
        // Boblen rett under det han presenterer, han selv under boblen ute til høyre – men over fanelinjen
        const r = anchor.getBoundingClientRect()
        cx = A.right - B.left - half - 14
        cy = Math.min(r.bottom - B.top + 10 + bh + 22 + head, A.bottom - B.top - feet - 4)
      } else if (el) {
        // Han står ved siden av knappen (der det er mest plass), med skoene på høyde med toppen av den
        const r = el.getBoundingClientRect()
        const left = r.left - A.left >= A.right - r.right
        cx = left ? r.left - B.left - half - 2 : r.right - B.left + half + 2
        cy = r.top - B.top - feet + 8
      } else {
        cx = A.left + A.width / 2 - B.left
        cy = A.top + A.height * 0.6 - B.top
      }
      cx = clamp(cx, A.left - B.left + half + 4, A.right - B.left - half - 4)
      const bx = clamp(cx - bw / 2, A.left - B.left + 12, A.right - B.left - 12 - bw)
      const by = Math.max(A.top - B.top + 12, cy - head - 22 - bh)
      // Det han peker på: midten av knappen, målt fra midten av lerretet hans (før skalering)
      const aims = (s.aim ?? []).flatMap((sel) => {
        const t = document.querySelector<HTMLElement>(sel)
        if (!t) return []
        const r = t.getBoundingClientRect()
        return [{ x: (r.left + r.width / 2 - (B.left + cx)) / scale, y: (r.top + r.height / 2 - (B.top + cy)) / scale }]
      })
      // Retningen han flyr, så han kan lene seg inn i svingen
      const dir = prevCx.current === null ? 0 : Math.sign(Math.round(cx - prevCx.current))
      prevCx.current = cx
      setPos({ cx, cy, scale, bx, by, bw, tail: clamp(cx - bx, 30, bw - 30), dir, aims })
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
            aims={leaving ? undefined : pos?.aims}
            hand={s.hand}
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
