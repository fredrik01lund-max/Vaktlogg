import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { employer, gameNight } from './data/demoData.ts'
import type { GameId, KudosCategory } from './data/demoData.ts'
import { lastStepIndex, liveAt, setInvites } from './lib/calc.ts'
import type { Invites, SentCard } from './lib/calc.ts'
import { setClock } from './lib/clock.ts'
import { notificationsFor, startNotifications } from './lib/live.ts'
import type { ToastMsg } from './lib/live.ts'
import type { Order } from './lib/wallet.ts'
import { navigate } from './router.ts'
import { clearSeen } from './lib/motion.ts'
import { setLang } from './i18n.ts'
import type { Lang } from './i18n.ts'

export type ShareLevel = 'meg' | 'utvalgte' | 'alle'
export type PrivacyMetric = 'salg' | 'tips' | 'skritt' | 'puls'
export type CalmScope = 'vakt' | 'uke' | 'til-av'

export interface Settings {
  watch: boolean
  calm: boolean
  calmScope: CalmScope
  campaign: 'ubesvart' | 'med' | 'nei'
  privacy: Record<PrivacyMetric, { level: ShareLevel; chosen: string[] }>
  /** Introkortet for nye lesere av prototypen er lukket. */
  introDismissed: boolean
  /** Språk i appen: norsk eller engelsk (for å vise prototypen til folk som ikke leser norsk). */
  lang: Lang
  /** Sir Domeos guide til demolinjen er vist (eller hoppet over). */
  guideSeen: boolean
  /** Svaret på Sir Domeos spørsmål: omvisning, eller utforske selv (da er han ikke med i månedsoppsummeringen). */
  guide: 'unset' | 'tour' | 'self'
}

export interface Demo {
  phase: 'pre' | 'live' | 'done'
  step: number
  saved: boolean
  /** Kveldens spill: styrer den innerste ringen. */
  game: GameId
  /** Ros Emma har gitt i kveld. Uten kategori = et raskt «takk» fra vaktsiden. */
  givenKudos: { to: string; category?: KudosCategory }[]
  /** Lagpremien Kari har lagt på lagringen. */
  teamGiftId: string
  /** Takkekort Kari har skrevet i demoen. */
  sentCards: SentCard[]
  /** Konvolutten fra Kari er åpnet. */
  cardOpened: boolean
  /** Vakten ble avsluttet i rolig modus eller med «Rolig» som spill – resultatene vises først når Emma vil. */
  quietShift: boolean
  /** Kollegaene Emma inviterte til Duell og Makker før vakten. */
  invites: Invites
  /** Bestillinger fra Personalmenyen i demoen. */
  orders: Order[]
}

const defaultSettings: Settings = {
  watch: true,
  calm: false,
  calmScope: 'vakt',
  campaign: 'ubesvart',
  privacy: {
    salg: { level: 'utvalgte', chosen: ['jonas', 'ingrid'] },
    tips: { level: 'meg', chosen: [] },
    skritt: { level: 'meg', chosen: [] },
    puls: { level: 'meg', chosen: [] },
  },
  introDismissed: false,
  lang: 'no',
  guideSeen: false,
  guide: 'unset',
}

const defaultDemo: Demo = {
  phase: 'pre',
  step: -1,
  saved: false,
  game: gameNight.defaultForEmma,
  givenKudos: [],
  teamGiftId: employer.teamGift.prizeId,
  sentCards: [],
  cardOpened: false,
  quietShift: false,
  invites: { ...gameNight.defaultInvites },
  orders: [],
}

const STORAGE_KEY = 'vaktlogg:v4'

// Bare lette innstillinger lagres lokalt. Appen virker like godt uten.
function load(): { settings: Settings; demo: Demo } {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { settings: defaultSettings, demo: defaultDemo }
    const parsed = JSON.parse(raw)
    const demo: Demo = { ...defaultDemo, ...parsed.demo }
    if (!Array.isArray(demo.sentCards)) demo.sentCards = []
    demo.sentCards = demo.sentCards.filter((c) => c && typeof c === 'object' && typeof c.to === 'string')
    if (demo.step > lastStepIndex) demo.step = lastStepIndex
    demo.invites = { ...defaultDemo.invites, ...parsed.demo?.invites }
    if (!Array.isArray(demo.orders)) demo.orders = []
    demo.orders = demo.orders.filter((o) => o && typeof o === 'object' && typeof o.item === 'string')
    return {
      settings: { ...defaultSettings, ...parsed.settings, privacy: { ...defaultSettings.privacy, ...parsed.settings?.privacy } },
      demo,
    }
  } catch {
    return { settings: defaultSettings, demo: defaultDemo }
  }
}

function persist(settings: Settings, demo: Demo) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, demo }))
  } catch {
    /* privat modus o.l. – ignorer */
  }
}

export interface Toast extends ToastMsg {
  id: number
}

interface Store {
  settings: Settings
  demo: Demo
  playing: boolean
  toasts: Toast[]
  updateSettings: (patch: Partial<Settings>) => void
  setPrivacy: (metric: PrivacyMetric, level: ShareLevel, chosen?: string[]) => void
  startShift: () => void
  advance: () => void
  jumpToEnd: () => void
  finishShift: () => void
  togglePlay: () => void
  reset: () => void
  /** Omvisningen: spol vakten frem til et travelt øyeblikk og hold klokka i ro (false = la den gå igjen). */
  holdShift: (hold: boolean) => void
  saveShift: () => void
  /** Rolig modus eller «Rolig» som kveldens spill: ingen konkurranse vises. */
  quiet: boolean
  toggleQuiet: () => void
  setGame: (game: GameId) => void
  /** Inviter en kollega til Duell eller Makker. */
  setInvite: (game: keyof Invites, id: string) => void
  /** Teller opp hver gang avspillingen starter vakten på nytt (vaktsiden tegnes da fra start). */
  loop: number
  setTeamGift: (prizeId: string) => void
  sendCard: (card: SentCard) => void
  openCard: () => void
  giveKudos: (to: string, category?: KudosCategory) => void
  pushToasts: (msgs: ToastMsg[]) => void
  dismissToast: (id: number) => void
  /** Bestill fra Personalmenyen. Gir bestillingen tilbake (med id). */
  placeOrder: (order: Omit<Order, 'id'>) => Order
  /** Kari godkjenner et vaktønske. */
  approveOrder: (id: number) => void
}

const Ctx = createContext<Store | null>(null)

/** Bytt mellom Emmas og Karis telefon i demoen. */
export function setMode(mode: 'emma' | 'kari') {
  navigate(mode === 'kari' ? '/sjef' : '/vakt')
}

/** Manuell styring (?manuell): Spill av + Neste i demolinjen, slik testene og presentatører kan gå steg for steg. */
export const MANUAL = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('manuell')
export const PLAY_INTERVAL_MS = 3600

// Automatisk avspilling: vakten 16:00–23:30 går på to minutter og starter så på nytt.
const LOOP_MS = 120_000
const HOLD_MS = 6_000
const startMin = liveAt(-1).minutes
const endMin = liveAt(lastStepIndex).minutes
const stepMin = Array.from({ length: lastStepIndex + 1 }, (_, i) => liveAt(i).minutes)
const RATE = (endMin - startMin) / (LOOP_MS - HOLD_MS)
const TICK_MS = 250
const minutesAt = (step: number) => (step < 0 ? startMin : stepMin[step])
/** Omvisningen spoler vakten frem hit (20:30). */
const TOUR_MIN = 20 * 60 + 30

export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(load, [])
  const [settings, setSettings] = useState<Settings>(initial.settings)
  setLang(settings.lang)
  const [demo, setDemo] = useState<Demo>(initial.demo)
  setInvites(demo.invites)
  // Startes appen midt i en vakt, fortsetter avspillingen der den var.
  const [playing, setPlaying] = useState(() => !MANUAL && initial.demo.phase === 'live')
  const [loop, setLoop] = useState(0)
  const clockRef = useRef(minutesAt(initial.demo.step))
  const [toasts, setToasts] = useState<Toast[]>([])
  const ref = useRef({ settings, demo, playing })
  ref.current = { settings, demo, playing }
  const toastId = useRef(1)

  useEffect(() => persist(settings, demo), [settings, demo])

  const pushToasts = useCallback((msgs: ToastMsg[]) => {
    // Varsler hører til én telefon: Emmas varsler vises ikke mens Karis telefon er åpen, og omvendt.
    const boss = window.location.hash.startsWith('#/sjef')
    msgs = msgs.filter((m) => !!m.boss === boss)
    if (!msgs.length) return
    // Nye varsler erstatter gamle, så de aldri henger etter det som skjer på vakten.
    setToasts(msgs.map((m) => ({ ...m, id: toastId.current++ })))
  }, [])
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const isQuiet = (s: Settings, d: Demo) => s.calm || d.game === 'rolig'
  const notifyOpts = () => ({ calm: isQuiet(ref.current.settings, ref.current.demo), game: ref.current.demo.game, giftId: ref.current.demo.teamGiftId })

  // Demo-knappen tar deg til vaktsiden – men ikke når presentatøren ser Karis telefon.
  const goToShift = () => {
    const h = window.location.hash
    if (h.startsWith('#/sjef')) return
    if (!h.startsWith('#/vakt') && h !== '' && h !== '#/') navigate('/vakt')
  }

  const startShift = useCallback(() => {
    const d = ref.current.demo
    if (d.phase !== 'pre') return
    setDemo({ ...d, phase: 'live', step: -1 })
    clockRef.current = startMin
    // Tiden begynner å gå med en gang – ingen play-knapp
    if (!MANUAL) setPlaying(true)
    pushToasts(startNotifications(notifyOpts()))
    goToShift()
  }, [pushToasts])

  const finishShift = useCallback(() => {
    setPlaying(false)
    const d = ref.current.demo
    setDemo({ ...d, phase: 'done', step: lastStepIndex, quietShift: isQuiet(ref.current.settings, d) })
    goToShift()
    if (ref.current.settings.calm && ref.current.settings.calmScope === 'vakt') {
      // «Rolig modus for denne vakten» skrus av når vakten er over.
      setSettings((s) => ({ ...s, calm: false }))
    }
  }, [])

  /** Ett steg frem i vakten. Manuell styring tar deg til vaktsiden; den automatiske avspillingen lar deg utforske i fred. */
  const stepForward = useCallback(
    (nav: boolean) => {
      const d = ref.current.demo
      const next = d.step + 1
      setDemo({ ...d, step: next })
      const msgs = notificationsFor(d.step, next, notifyOpts())
      // Et feirende varsel kommer like etter at ringen har feiret, så øyet ser ringen først.
      if (msgs.some((m) => m.celebrate)) window.setTimeout(() => pushToasts(msgs), 1100)
      else pushToasts(msgs)
      if (nav) goToShift()
    },
    [pushToasts],
  )

  const advance = useCallback(() => {
    const d = ref.current.demo
    if (d.phase === 'pre') return startShift()
    if (d.phase === 'done') return setPlaying(false)
    if (d.step >= lastStepIndex) return finishShift()
    stepForward(true)
  }, [startShift, finishShift, stepForward])

  const jumpToEnd = useCallback(() => {
    finishShift()
  }, [finishShift])

  const togglePlay = useCallback(() => {
    const { demo: d, playing: p } = ref.current
    if (d.phase === 'done') return
    if (!p && d.phase === 'pre') startShift()
    setPlaying(!p)
  }, [startShift])

  // Manuell avspilling (?manuell): ett steg om gangen.
  useEffect(() => {
    if (!MANUAL || !playing) return
    const t = window.setTimeout(advance, demo.phase === 'live' && demo.step >= lastStepIndex ? 2200 : PLAY_INTERVAL_MS)
    return () => window.clearTimeout(t)
  }, [playing, demo.step, demo.phase, advance])

  // Automatisk avspilling: klokka går jevnt, hendelsene skjer når klokka passerer dem.
  // Etter to minutter starter vakten på nytt – helt til Emma trykker «Avslutt vakt».
  useEffect(() => {
    if (MANUAL || demo.phase !== 'live') {
      setClock(null)
      return
    }
    setClock(clockRef.current)
    if (!playing) return
    let last = performance.now()
    let holdUntil = 0
    const id = window.setInterval(() => {
      const now = performance.now()
      // Skjult fane: klokka hopper ikke frem når den kommer tilbake
      const dt = Math.min(now - last, 1000)
      last = now
      const d = ref.current.demo
      const m = Math.min(endMin, clockRef.current + dt * RATE)
      clockRef.current = m
      setClock(m)
      if (d.step < lastStepIndex && stepMin[d.step + 1] <= m) stepForward(false)
      else if (m >= endMin) {
        if (!holdUntil) holdUntil = now + HOLD_MS
        else if (now >= holdUntil) {
          // Ny runde: samme vakt fra start, med animasjonene som første gang
          clearSeen()
          setToasts([])
          clockRef.current = startMin
          setClock(startMin)
          setDemo((x) => ({ ...x, step: -1 }))
          setLoop((n) => n + 1)
          window.setTimeout(() => pushToasts(startNotifications(notifyOpts())), 500)
        }
      }
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [playing, demo.phase, loop, stepForward, pushToasts])

  const reset = useCallback(() => {
    clearSeen()
    setPlaying(false)
    clockRef.current = startMin
    setToasts([])
    setDemo(defaultDemo)
    setSettings((s) => ({ ...s, calm: false, campaign: 'ubesvart', introDismissed: false }))
    setMode('emma')
    navigate('/vakt')
  }, [])

  const holdShift = useCallback((hold: boolean) => {
    const d = ref.current.demo
    if (d.phase !== 'live') return
    if (!hold) {
      if (!MANUAL) setPlaying(true)
      return
    }
    // Rundt halv ni er det mest å se i boksene
    const busy = stepMin.findIndex((m) => m >= TOUR_MIN)
    if (busy > d.step) {
      setDemo({ ...d, step: busy })
      clockRef.current = stepMin[busy]
      if (!MANUAL) setClock(stepMin[busy])
    }
    setPlaying(false)
  }, [])

  const store: Store = {
    settings,
    demo,
    playing,
    toasts,
    updateSettings: (patch) => setSettings((s) => ({ ...s, ...patch })),
    setPrivacy: (metric, level, chosen) =>
      setSettings((s) => ({ ...s, privacy: { ...s.privacy, [metric]: { level, chosen: chosen ?? s.privacy[metric].chosen } } })),
    startShift,
    advance,
    jumpToEnd,
    finishShift,
    togglePlay,
    reset,
    holdShift,
    saveShift: () => setDemo((d) => ({ ...d, saved: true })),
    quiet: isQuiet(settings, demo),
    // Månen på vaktsiden: på en «Rolig»-kveld bytter den til Laget, ellers skrus rolig modus av og på.
    toggleQuiet: () => {
      if (ref.current.demo.game === 'rolig') {
        setDemo((d) => ({ ...d, game: 'laget' }))
        setSettings((s) => ({ ...s, calm: false }))
      } else setSettings((s) => ({ ...s, calm: !s.calm }))
    },
    // «Rolig» er et likeverdig spill – det endrer ikke Emmas egne innstillinger for rolig modus.
    setGame: (game) => setDemo((d) => ({ ...d, game })),
    setInvite: (game, id) => setDemo((d) => ({ ...d, invites: { ...d.invites, [game]: id } })),
    loop,
    setTeamGift: (teamGiftId) => setDemo((d) => ({ ...d, teamGiftId })),
    sendCard: (card) => setDemo((d) => ({ ...d, sentCards: [...d.sentCards, card] })),
    openCard: () => setDemo((d) => ({ ...d, cardOpened: true })),
    giveKudos: (to, category) => setDemo((d) => ({ ...d, givenKudos: [...d.givenKudos, { to, category }] })),
    pushToasts,
    dismissToast,
    placeOrder: (order) => {
      const o: Order = { ...order, id: Date.now() }
      setDemo((d) => ({ ...d, orders: [...d.orders, o] }))
      return o
    },
    approveOrder: (id) => setDemo((d) => ({ ...d, orders: d.orders.map((o) => (o.id === id ? { ...o, approved: true } : o)) })),
  }

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore utenfor StoreProvider')
  return s
}
