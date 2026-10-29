import { useEffect, useRef, useState } from 'react'
import { config } from './config.ts'
import { lastStepIndex, tonightSteps, tonightSummary } from './lib/calc.ts'
import { navigate, useRoute } from './router.ts'
import { MANUAL, StoreProvider, setMode, useStore } from './state.tsx'
import { useClockTime } from './lib/clock.ts'
import { promptInstall, useCanInstall } from './lib/install.ts'
import type { Toast } from './state.tsx'
import { Icon } from './ui.tsx'
import './toast.css'
import { DemoGuide, Klappen, openGuide } from './guide.tsx'
import { Goals } from './screens/Goals.tsx'
import { History, HistoryDetail } from './screens/History.tsx'
import { Me } from './screens/Me.tsx'
import { StaffMenu } from './staffmenu.tsx'
import { recordDetails } from './screens/Report.tsx'
import { EndReport } from './report/EndReport.tsx'
import { ShiftLive, ShiftStart } from './screens/Shift.tsx'
import { Wrapped } from './screens/Wrapped.tsx'
import { Employer } from './screens/Employer.tsx'
import { Face, FaceStack } from './game-ui.tsx'
import { useShifts } from './shifts.ts'
import { ShiftDetail } from './shift/Detail.tsx'
import { topicById } from './shift/topics.ts'
import { designParam } from './designs/Directions.tsx'
import { L, td } from './i18n.ts'

// Fanene lages ved hver tegning, så navnene følger valgt språk. «Goals» heter det samme på begge språk.
const tabList = () => [
  { id: 'vakt', label: L('Vakt', 'Shift'), icon: 'clock' },
  { id: 'historikk', label: L('Historikk', 'History'), icon: 'calendar' },
  { id: 'mal', label: 'Goals', icon: 'target' },
  { id: 'meg', label: L('Meg', 'Me'), icon: 'user' },
]

function ShiftTab({ topic }: { topic?: string }) {
  const { demo } = useStore()
  const { all, recordsSet } = useShifts()
  const detail = topic && topicById(topic) && designParam() === 'bokser' ? topicById(topic)!.id : null
  // Detaljsidene finnes bare under vakt – ellers tilbake til Vakt.
  useEffect(() => {
    if (topic && (!detail || demo.phase !== 'live')) navigate('/vakt')
  }, [topic, detail, demo.phase])
  if (demo.phase === 'pre') return <ShiftStart />
  if (demo.phase === 'live') return detail ? <ShiftDetail topic={detail} /> : <ShiftLive />
  // Sluttrapporten: onepageren for kvelden (kan deles)
  return <EndReport summary={tonightSummary} records={recordDetails(tonightSummary, all, recordsSet.get(tonightSummary.id) ?? [])} isTonight />
}

const toastIcon: Record<Toast['kind'], string> = { record: 'trophy', kudos: 'heart', duel: 'duel', team: 'team', info: 'check' }
const toastTone: Record<Toast['kind'], string> = { record: 'gold', kudos: 'sage', duel: '', team: 'sage', info: 'neutral' }

/** Varselet følger fingeren: sveip opp eller til siden for å fjerne det, slipp kort for å la det ligge. */
function useSwipeAway(onAway: (dir: 'left' | 'right' | 'up') => void) {
  const start = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  const moved = useRef(false)
  return {
    dragging: !!drag,
    moved,
    style: drag ? { transform: `translate(${drag.x}px, ${drag.y}px)`, opacity: Math.max(0.2, 1 - Math.max(Math.abs(drag.x) / 260, -drag.y / 120)), transition: 'none' } : undefined,
    handlers: {
      onPointerDown: (e: React.PointerEvent) => {
        start.current = { x: e.clientX, y: e.clientY, moved: false }
        moved.current = false
        e.currentTarget.setPointerCapture(e.pointerId)
      },
      onPointerMove: (e: React.PointerEvent) => {
        const s = start.current
        if (!s) return
        const dx = e.clientX - s.x
        const dy = e.clientY - s.y
        if (!s.moved && Math.hypot(dx, dy) < 6) return
        s.moved = moved.current = true
        // Til siden fritt, opp fritt, ned bare litt (det er ingen vei ned)
        setDrag({ x: dx, y: dy < 0 ? dy : dy * 0.15 })
      },
      onPointerUp: (e: React.PointerEvent) => {
        const s = start.current
        start.current = null
        if (!s || !s.moved) return
        const dx = e.clientX - s.x
        const dy = e.clientY - s.y
        setDrag(null)
        if (dy < -36 && Math.abs(dy) > Math.abs(dx)) onAway('up')
        else if (Math.abs(dx) > 72) onAway(dx < 0 ? 'left' : 'right')
      },
      onPointerCancel: () => {
        start.current = null
        setDrag(null)
      },
    },
  }
}

/**
 * Varselet er en liten pille øverst (én linje), så det dekker minst mulig av det du ser på.
 * Trykk for å lese hele – trykk igjen eller sveip for å lukke. Det forsvinner av seg selv etter et par sekunder.
 */
function ToastItem({ t }: { t: Toast }) {
  const { dismissToast } = useStore()
  const [leaving, setLeaving] = useState<false | 'fade' | 'left' | 'right' | 'up'>(false)
  const [open, setOpen] = useState(false)
  const swipe = useSwipeAway((dir) => setLeaving(dir))
  const dragging = useRef(false)
  dragging.current = swipe.dragging
  useEffect(() => {
    // Mens fingeren holder varselet, forsvinner det ikke av seg selv. Åpnet får du tid til å lese.
    const a = window.setTimeout(() => !dragging.current && setLeaving((l) => l || 'fade'), open ? 6000 : t.celebrate ? 4200 : 3400)
    return () => window.clearTimeout(a)
  }, [t, open])
  useEffect(() => {
    if (!leaving) return
    const b = window.setTimeout(() => dismissToast(t.id), leaving === 'fade' ? 260 : 220)
    return () => window.clearTimeout(b)
  }, [leaving, t.id, dismissToast])
  return (
    <button
      className={`toast mini ${t.kind} ${open ? 'open' : ''} ${t.celebrate ? 'celebrate' : ''} ${leaving ? 'leaving' : ''} ${leaving && leaving !== 'fade' ? 'away-' + leaving : ''}`}
      style={swipe.style}
      {...swipe.handlers}
      onClick={() => {
        if (swipe.moved.current) return
        if (t.body && !open) setOpen(true)
        else setLeaving('fade')
      }}
      aria-expanded={t.body ? open : undefined}
      aria-label={L('{title}: {body} (trykk eller sveip for å lukke)', '{title}: {body} (tap or swipe to dismiss)', { title: t.title, body: t.body })}
    >
      <span className={`icon-badge ${toastTone[t.kind]}`}>
        <Icon name={t.icon ?? toastIcon[t.kind]} />
      </span>
      <span className="grow">
        <span className="tt">{t.title}</span>
        {t.body && open && <span className="tb">{t.body}</span>}
      </span>
      {t.faces && t.faces.length > 0 && (
        <span className="toast-faces">
          <FaceStack ids={t.faces} size={20} hop={t.celebrate ? t.id : undefined} />
        </span>
      )}
    </button>
  )
}

function Toasts({ boss }: { boss: boolean }) {
  const { toasts } = useStore()
  return (
    <div className="toasts" role="status" aria-live="polite">
      {/* Ett varsel om gangen, og bare varsler som hører til telefonen som vises. */}
      {toasts.filter((t) => !!t.boss === boss).slice(0, 1).map((t) => (
        <ToastItem key={t.id} t={t} />
      ))}
    </div>
  )
}

/** Bytt mellom Emmas og Karis telefon – ligger synlig i demo-kontrollen. */
function RoleSwitch({ boss }: { boss: boolean }) {
  return (
    <span className="role-switch" data-guide="roles" role="radiogroup" aria-label={L('Hvem sin telefon', 'Whose phone')}>
      <button role="radio" aria-checked={!boss} className={!boss ? 'on' : ''} onClick={() => setMode('emma')} aria-label={L('Emmas telefon', 'Emma’s phone')}>
        <Face id={config.persona.id} size={26} />
      </button>
      <button role="radio" aria-checked={boss} className={boss ? 'on' : ''} onClick={() => setMode('kari')} aria-label={L('Karis telefon', 'Kari’s phone')}>
        <Face id={config.employer.id} size={26} />
      </button>
    </span>
  )
}

function DemoControl({ boss }: { boss: boolean }) {
  const { demo, settings, updateSettings, playing, advance, togglePlay, jumpToEnd, finishShift, startShift, reset } = useStore()
  const [menu, setMenu] = useState(false)
  const [hidden, setHidden] = useState(false)
  const clock = useClockTime()
  const canInstall = useCanInstall()
  const stepLabel = demo.phase === 'pre' ? L('Før vakt', 'Before shift') : demo.phase === 'done' ? L('Ferdig', 'Done') : clock ?? tonightSteps[demo.step]?.time ?? tonightSummary.start
  const nextLabel = demo.phase === 'pre' ? L('Start', 'Start') : demo.step >= lastStepIndex ? L('Oppgjør', 'Summary') : L('Neste', 'Next')

  if (hidden) {
    return (
      <div className="demo-bar hidden">
        <div className="demo-ctl" style={{ padding: 3 }}>
          <button onClick={() => setHidden(false)} aria-label={L('Vis demo-kontroll', 'Show demo controls')}>
            <Icon name="more" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="demo-bar" aria-label={L('Demo-kontroll for presentasjonen', 'Demo controls for the presentation')}>
      {menu && (
        <div className="demo-menu" role="menu">
          <div className="hint">
            {L('Regissørens meny · styrer demoen, er ikke en del av appen', 'Director’s menu · runs the demo, not part of the app')}
          </div>
          <div className="demo-lang" role="radiogroup" aria-label="Språk · Language">
            <span aria-hidden="true">
              <Icon name="globe" />
            </span>
            {(['no', 'en'] as const).map((l) => (
              <button key={l} role="radio" aria-checked={settings.lang === l} onClick={() => updateSettings({ lang: l })}>
                {l === 'no' ? 'Norsk' : 'English'}
              </button>
            ))}
          </div>
          {MANUAL ? (
            <button
              role="menuitem"
              onClick={() => {
                setMenu(false)
                jumpToEnd()
              }}
              disabled={demo.phase === 'done'}
              style={demo.phase === 'done' ? { opacity: 0.4 } : undefined}
            >
              <Icon name="end" /> {L('Hopp til slutten av vakten', 'Skip to the end of the shift')}
            </button>
          ) : (
            demo.phase === 'live' && (
              // Vakten spilles av av seg selv – her kan presentatøren holde igjen et øyeblikk.
              <button
                role="menuitem"
                onClick={() => {
                  setMenu(false)
                  togglePlay()
                }}
              >
                <Icon name={playing ? 'pause' : 'play'} /> {playing ? L('Pause avspillingen', 'Pause the playback') : L('Fortsett avspillingen', 'Resume the playback')}
              </button>
            )
          )}
          <button
            role="menuitem"
            onClick={() => {
              setMenu(false)
              navigate('/maned/2026-09')
            }}
          >
            <Icon name="sparkle" /> {L('Åpne «Din september»', 'Open “Your September”')}
          </button>
          {canInstall && (
            <button
              role="menuitem"
              onClick={() => {
                setMenu(false)
                promptInstall()
              }}
            >
              <Icon name="download" /> {L('Installer som app', 'Install as an app')}
            </button>
          )}
          <button
            role="menuitem"
            onClick={() => {
              setMenu(false)
              reset()
            }}
          >
            <Icon name="reset" /> {L('Start demoen på nytt', 'Restart the demo')}
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setMenu(false)
              openGuide()
            }}
          >
            <Icon name="sparkle" /> {L('Vis Klappens guide', 'Show Clappy’s guide')}
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setMenu(false)
              setHidden(true)
            }}
          >
            <Icon name="eyeOff" /> {L('Skjul demo-knappen', 'Hide the demo button')}
          </button>
        </div>
      )}
      <DemoGuide boss={boss} />
      <div className="demo-ctl" aria-label={L('Demo-kontroll', 'Demo controls')}>
        <button className="kg-mini" onClick={openGuide} aria-label={L('Klappens guide: slik styrer du prototypen', 'Clappy’s guide: how to run the prototype')}>
          <Klappen mood="wink" size={30} />
        </button>
        <RoleSwitch boss={boss} />
        {/* Før vakten sier «Start vakt» nok – klokka vises når vakten går */}
        {demo.phase !== 'pre' && <span className="count">{stepLabel}</span>}
        {MANUAL
          ? demo.phase !== 'done' && (
              <>
                <button onClick={togglePlay} aria-label={playing ? L('Pause', 'Pause') : L('Spill av hele vakten', 'Play the whole shift')}>
                  <Icon name={playing ? 'pause' : 'play'} />
                </button>
                <button className="primary" data-guide="start" onClick={advance} aria-label={demo.phase === 'pre' ? L('Start vakt', 'Start shift') : L('Neste hendelse', 'Next event')}>
                  <Icon name="next" /> {nextLabel}
                </button>
              </>
            )
          : demo.phase === 'pre'
            ? (
                <button className="primary" data-guide="start" onClick={startShift}>
                  <Icon name="play" /> {L('Start vakt', 'Start shift')}
                </button>
              )
            : demo.phase === 'live' && (
                // Vakten går av seg selv og starter på nytt hvert andre minutt – helt til den avsluttes her.
                <button className="primary" data-guide="start" onClick={finishShift}>
                  <Icon name="stop" /> {L('Avslutt vakt', 'End shift')}
                </button>
              )}
        <button data-guide="more" onClick={() => setMenu((m) => !m)} aria-label={L('Flere demo-valg: språk og start på nytt', 'More demo options: language and restart')} aria-expanded={menu}>
          <Icon name={menu ? 'x' : 'more'} />
        </button>
      </div>
    </div>
  )
}

/** Etter vakten: har brukeren vært innom Historikk? Da slutter fanen å blinke. */
let historyVisited = false

/** Historikk-fanen begynner å blinke etter 10 sekunder på sluttrapporten – til den er besøkt. */
function useHistoryNudge(onReport: boolean, phase: string, tab: string): boolean {
  const [nudge, setNudge] = useState(false)
  if (phase !== 'done') historyVisited = false
  if (phase === 'done' && tab === 'historikk') historyVisited = true
  useEffect(() => {
    if (!onReport || historyVisited) return setNudge(false)
    const t = window.setTimeout(() => setNudge(true), 10_000)
    return () => window.clearTimeout(t)
  }, [onReport])
  return nudge && onReport && !historyVisited
}

function Shell() {
  const route = useRoute()
  const { demo, loop } = useStore()
  const [first, second] = route
  const overlayMonth = first === 'maned' ? second ?? '2026-09' : null
  const boss = first === 'sjef'
  const tabs = tabList()
  const tab = overlayMonth ? 'historikk' : tabs.some((t) => t.id === first) ? first : 'vakt'
  const nudge = useHistoryNudge(!boss && tab === 'vakt' && !second && demo.phase === 'done', demo.phase, tab)

  let screen
  if (boss) screen = <Employer />
  else if (tab === 'historikk' && second && !overlayMonth) screen = <HistoryDetail id={second} />
  else if (tab === 'historikk') screen = <History />
  else if (tab === 'mal') screen = <Goals />
  else if (tab === 'meg') screen = second === 'meny' ? <StaffMenu /> : <Me />
  else screen = <ShiftTab topic={tab === 'vakt' ? second : undefined} />

  return (
    <div className="stage">
      <aside className="stage-aside">
        <h1>{config.appName}</h1>
        <p>
          {L('«Strava for arbeidsdagen» – en klikkbar prototype for servitører og bartendere på {name}.', '“Strava for the workday” – a clickable prototype for servers and bartenders at {name}.', { name: config.restaurant.name })}
        </p>
        <p className="small">
          {L(
            'Trykk «Start vakt»: fredagsvakten spilles av på to minutter og starter på nytt til du trykker «Avslutt vakt». Utforsk appen fritt mens den går. E og K bytter mellom Emmas og Karis telefon. {label}.',
            'Tap “Start shift”: the Friday shift plays in two minutes and starts over until you tap “End shift”. Explore the app freely while it runs. E and K switch between Emma’s and Kari’s phones. {label}.',
            { label: td(config.demoLabel) },
          )}
        </p>
      </aside>
      <div className="device-col">
      <div className="device">
        <div className="notch" />
        <div className="app">
          <main className={`screen ${boss ? 'boss-screen' : ''} ${!boss && tab === 'vakt' && demo.phase === 'live' ? 'live' : ''}`} key={route.join('/') + (tab === 'vakt' || boss ? demo.phase + loop : '')}>
            <div className="fade-in">{screen}</div>
          </main>
          {!boss && (
          <nav className="tabbar" aria-label={L('Hovedmeny', 'Main menu')}>
            {tabs.map((t) => (
              <button key={t.id} className={`tab ${nudge && t.id === 'historikk' ? 'nudge' : ''}`} aria-current={tab === t.id ? 'page' : undefined} onClick={() => navigate(`/${t.id}`)}>
                <Icon name={t.icon} />
                {t.label}
                {t.id === 'vakt' && demo.phase === 'live' && tab !== 'vakt' && <i className="dot" />}
              </button>
            ))}
          </nav>
          )}
          {overlayMonth && <Wrapped month={overlayMonth} />}
          <div id="app-overlays" />
          {!overlayMonth && <Toasts boss={boss} />}
        </div>
      </div>
      <DemoControl boss={boss} />
      </div>
    </div>
  )
}

/** Bytter man språk, tegnes hele appen på nytt – da følger all tekst, også i animasjoner og hurtigminner. */
function Root() {
  const { settings } = useStore()
  return <Shell key={settings.lang} />
}

export default function App() {
  return (
    <StoreProvider>
      <Root />
    </StoreProvider>
  )
}
