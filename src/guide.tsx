// Sir Domeo: guiden til prototypen – en serveringsklokke i 3D som svever over skjermen og peker på det han forklarer.
// Første gang spør han om du vil ha en omvisning. Ja: han tar deg gjennom de viktigste delene av appen –
// før vakten, under vakten, historikken og månedsoppsummeringen, Goals og Meg. Nei: han trekker seg tilbake.
// Han er programleder i månedsoppsummeringen (med mindre du valgte å utforske selv), gratulerer etter vakten,
// og sier fra på Karis telefon at lederens side er under arbeid.
// Lokket er munnen hans: det går opp og ned mens han snakker. Den flate Sir Domeo (SVG) brukes i demolinjen og uten WebGL.

import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { config } from './config.ts'
import { L } from './i18n.ts'
import { navigate, useRoute } from './router.ts'
import { MANUAL, useStore } from './state.tsx'
import { D3D_BODY, D3D_PX, D3D_SIZE, Domeo3D } from './domeo3d.tsx'
import type { Action, Aim, Hand, Mood } from './domeo3d.tsx'
import './guide.css'

// ── Liten felles tilstand: overlever at appen tegnes på nytt når språket byttes ──
type Mode = 'welcome' | 'self' | 'tour' | 'kari' | 'done'
type GuideState = { open: boolean; step: number; mode: Mode; bye?: number }
let state: GuideState = { open: false, step: 0, mode: 'welcome' }
let autoTried = false
/** Karis beskjed vises én gang per besøk i prototypen. */
let kariShown = false
/** Hvor langt omvisningen kom før den ble avbrutt – gir «Fortsett der vi slapp». */
let resumeAt = -1
const subs = new Set<() => void>()
const setGuide = (next: GuideState) => {
  state = next
  subs.forEach((f) => f())
}
/** Hent ham frem (demolinjen og ⋯-menyen): han spør om omvisning. */
export const openGuide = () => {
  if (state.open && state.mode === 'tour') resumeAt = state.step
  setGuide({ open: true, step: 0, mode: 'welcome' })
}
/** Be ham gå (f.eks. når sluttrapporten åpnes i stort format). */
export const dismissGuide = () => state.open && setGuide({ ...state, bye: (state.bye ?? 0) + 1 })
/** Ikke i testene eller med ?manuell – ?guide viser ham alltid. */
const gated = () => !new URLSearchParams(window.location.search).has('guide') && (MANUAL || navigator.webdriver)
/** Rett etter vakten: han kommer raskt, gratulerer og presenterer sluttrapporten. */
export function congratulate() {
  if (gated()) return
  if (state.open && state.mode === 'kari') return
  window.setTimeout(() => setGuide({ open: true, step: 0, mode: 'done' }), 300)
}

// Månedsoppsummeringen forteller hvilken side som vises, så han kan være programleder
type StoryState = { id: string | null; reveal: boolean }
let story: StoryState = { id: null, reveal: false }
const storySubs = new Set<() => void>()
const setStory = (next: StoryState) => {
  story = next
  storySubs.forEach((f) => f())
}
export const storyHost = (id: string | null) => {
  if (story.id !== id) setStory({ id, reveal: false })
}
/** Svaret på «Gjett!» er vist: «Voilà!» */
export const storyReveal = () => {
  if (story.id && !story.reveal) setStory({ ...story, reveal: true })
}
const useExternal = <T,>(set: Set<() => void>, get: () => T): T =>
  useSyncExternalStore(
    (f) => {
      set.add(f)
      return () => set.delete(f)
    },
    get,
  )
export const useGuide = () => useExternal(subs, () => state)

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

// ── Omvisningen ──
// Hvor han står: midt på (stor eller vanlig), ved en knapp i demolinjen, over eller under noe i appen,
// nede i hjørnet (detaljsider), som programleder i månedsoppsummeringen, eller under sluttrapporten.
type Place = 'big' | 'center' | 'bar' | 'stack' | 'corner' | 'story' | 'report'
type TourStep = {
  ch: number
  route: string
  /** Det han forklarer – han stiller seg over eller under det. */
  at?: string
  place?: Place
  aim?: string[]
  hand?: Hand
  /** «Prøv selv»: et trykk her tar omvisningen videre. */
  tap?: string[]
  /** Pulserende ring rundt noe han nevner, uten at det må trykkes. */
  ring?: string[]
  mood: Mood
  move: Action
  text: () => string
  /** «Neste» starter vakten (omvisningen går videre når den er i gang). */
  start?: boolean
  /** Månedsoppsummeringen: programlederen tar over, og omvisningen går videre når den lukkes. */
  story?: boolean
  last?: boolean
}
const MONTH = '/maned/2026-09'
const chapters = () => [L('Velkommen', 'Welcome'), L('Før vakten', 'Before the shift'), L('Under vakten', 'During the shift'), L('Historikk', 'History'), L('Måneden din', 'Your month'), 'Goals', L('Meg', 'Me'), L('Ferdig', 'Done')]
const games = [1, 2, 3, 4].map((n) => `.game-pick .game-card:nth-child(${n})`)
const tile = (t: string) => `.st-tile[data-topic=${t}]`

const tourSteps = (watchOn: boolean): TourStep[] => [
  {
    ch: 1,
    route: '/vakt',
    at: '.game-pick',
    aim: games,
    mood: 'point',
    move: 'pick',
    text: () => L('Du er Emma, og det er fredag på Brasserie Fjordgata. Før vakten velger du kveldens spill.', 'You’re Emma, and it’s Friday at Brasserie Fjordgata. Before the shift, you pick tonight’s game.'),
  },
  {
    ch: 1,
    route: '/vakt',
    at: '.invite',
    aim: ['.invite'],
    mood: 'point',
    move: 'hop',
    text: () => L('Spill er morsommere sammen. Velg hvem du vil invitere – Jonas har allerede sagt ja til en duell.', 'Games are more fun together. Choose who to invite – Jonas has already said yes to a duel.'),
  },
  {
    ch: 1,
    route: '/vakt',
    at: '.watch-toggle',
    aim: ['.watch-toggle'],
    tap: watchOn ? undefined : ['.watch-toggle'],
    mood: 'point',
    move: 'watch',
    text: () =>
      watchOn
        ? L('Her kobler du til smartklokka. Den er på, så under vakten får du puls, stress og skritt rett inn i appen.', 'Connect your smartwatch here. It’s on, so during the shift you get heart rate, stress and steps right in the app.')
        : L('Her kobler du til smartklokka. Skru den på, så får du puls, stress og skritt fra vakten rett inn i appen.', 'Connect your smartwatch here. Turn it on to get heart rate, stress and steps from the shift right in the app.'),
  },
  {
    ch: 1,
    route: '/vakt',
    at: '.screen .btn.block',
    aim: ['.screen .btn.block'],
    tap: ['.screen .btn.block', "[data-guide='start']"],
    start: true,
    mood: 'point',
    move: 'hop',
    text: () => L('Klar? Trykk på Start vakt!', 'Ready? Tap Start shift!'),
  },
  {
    ch: 2,
    route: '/vakt',
    place: 'center',
    aim: [tile('helse')],
    hand: 'palm',
    mood: 'wink',
    move: 'dance',
    text: () => L('Vakten er i gang! Boksene oppdaterer seg mens du jobber. La oss åpne Helse.', 'The shift is on! The boxes update while you work. Let’s open Health.'),
  },
  {
    ch: 2,
    route: '/vakt/helse',
    place: 'corner',
    aim: ['.st-hero', '.st-strip'],
    mood: 'point',
    move: 'pick',
    text: () =>
      L(
        'Her ser du pulsen din nå, stresset kvarter for kvarter – lav, middels eller høy – og skrittene dine. Alt kommer fra klokka.',
        'Here’s your heart rate right now, stress quarter by quarter – low, medium or high – and your steps. It all comes from the watch.',
      ),
  },
  {
    ch: 2,
    route: '/vakt',
    at: tile('konkurranse'),
    aim: [tile('konkurranse')],
    mood: 'point',
    move: 'monocle',
    text: () =>
      L(
        'Her er spillene: laget mot forrige fredag på samme tid, og om du ligger foran Jonas i duellen. Vil du ha en rolig kveld, kan du skjule alt.',
        'Here are the games: the team against last Friday at the same time, and whether you’re ahead of Jonas in the duel. Want a calm evening? You can hide all of it.',
      ),
  },
  {
    ch: 2,
    route: '/vakt',
    at: tile('salg'),
    aim: [tile('salg')],
    mood: 'point',
    move: 'hop',
    text: () =>
      L(
        'Salg viser hva du har solgt, tipsen og hvor nær du er rekorden din. Inni boksen ser du salget per halvtime.',
        'Sales shows what you’ve sold, your tips and how close you are to your record. Inside the box you’ll see sales per half hour.',
      ),
  },
  {
    ch: 2,
    route: '/vakt',
    at: tile('gjester'),
    aim: [tile('gjester')],
    mood: 'point',
    move: 'peek',
    text: () => L('Gjester er bordkartet ditt: hvem som venter, allergier og hvem som kommer senere.', 'Guests is your table map: who’s waiting, allergies and who’s coming later.'),
  },
  {
    ch: 2,
    route: '/vakt',
    at: '.kd-row',
    aim: ['.kd-person'],
    tap: ['.kd-person'],
    mood: 'point',
    move: 'dance',
    text: () => L('Og nå det beste: kudos! Trykk på en kollega for å sende ros – så mange ganger du vil.', 'And now the best part: kudos! Tap a colleague to send praise – as many times as you like.'),
  },
  {
    ch: 2,
    route: '/vakt',
    at: '.kd-row',
    mood: 'cheer',
    move: 'twirl',
    text: () => L('Herlig! Når noen sender deg kudos, regner det over skjermen. Alt samles i månedsoppsummeringen din.', 'Lovely! When someone sends you kudos, it rains across the screen. It all adds up in your monthly summary.'),
  },
  {
    ch: 3,
    route: '/vakt',
    at: "[data-tab='historikk']",
    aim: ["[data-tab='historikk']"],
    tap: ["[data-tab='historikk']"],
    mood: 'point',
    move: 'look',
    text: () => L('Vakten går videre av seg selv. Alt du gjør, lagres – trykk på Historikk, så tar vi en titt.', 'The shift keeps going by itself. Everything you do is saved – tap History and let’s take a look.'),
  },
  {
    ch: 3,
    route: '/historikk',
    at: '.screen .card.dark',
    aim: ['.screen .card.dark'],
    tap: ['.screen .card.dark'],
    mood: 'point',
    move: 'hop',
    text: () => L('Her er alle vaktene dine. Og se: september er klar – trykk på kortet!', 'Here are all your shifts. And look: September is ready – tap the card!'),
  },
  { ch: 4, route: MONTH, story: true, mood: 'wave', move: 'tip', text: () => '' },
  {
    ch: 5,
    route: '/mal',
    at: '.gl-records',
    // Nede i hjørnet: boblen skal ikke dekke lagmålet han forteller om
    place: 'corner',
    aim: ['.yg.tile', '.gl-others', '.gl-records'],
    mood: 'point',
    move: 'pick',
    text: () =>
      L(
        'Goals er det dere jobber mot: årets lagmål – en tur til Frankrike for hele laget – premier dere kan vinne sammen, og rekordene dine.',
        'Goals is what you work toward together: this year’s team goal – a trip to France for the whole team – prizes you can win together, and your records.',
      ),
  },
  {
    ch: 6,
    route: '/meg',
    at: '.lv-card',
    aim: ['.lv-card'],
    mood: 'point',
    move: 'tip',
    text: () => L('Dette er deg: nivået ditt og XP fra vaktene, pluss innstillinger som rolig modus.', 'This is you: your level and XP from your shifts, plus settings like calm mode.'),
  },
  {
    ch: 6,
    route: '/meg',
    at: '.pm-row',
    aim: ['.pm-row'],
    mood: 'point',
    move: 'hop',
    text: () =>
      L(
        'Og poletter! Du får dem for innsats – hver fjerde vakt, når laget når målet, eller når du tar en ekstra vakt. Bruk dem i Personalmenyen på fri, mat eller et gavekort.',
        'And tokens! You earn them for effort – every fourth shift, when the team hits its goal, or when you take an extra shift. Spend them in the Staff menu on time off, food or a gift card.',
      ),
  },
  {
    ch: 7,
    route: '/vakt',
    place: 'bar',
    at: "[data-guide='start']",
    aim: ["[data-guide='start']"],
    ring: ["[data-guide='start']"],
    mood: 'wink',
    move: 'dance',
    last: true,
    text: () =>
      L(
        'Det var omvisningen! Vakten går fortsatt – trykk Avslutt vakt når du vil se sluttrapporten. Nede i linjen kan du også se sjefen Karis telefon, bytte språk og starte på nytt. Trenger du meg, trykk på meg. God vakt!',
        'That’s the tour! The shift is still going – tap End shift whenever you want to see the shift report. Down in the bar you can also see Kari’s phone, switch language and start over. Need me? Tap me. Have a good shift!',
      ),
  },
]
/** Steget der vakten startes. */
const START = 3

// Programlederen i månedsoppsummeringen: én kort replikk per side
const storyLines = (): Record<string, { text: string; move: Action; mood: Mood }> => ({
  apning: { text: L('God kveld, og velkommen til september! Her er måneden din.', 'Good evening, and welcome to September! Here’s your month.'), move: 'tip', mood: 'wave' },
  gjester: { text: L('Så mange gjester – du kunne fylt restauranten flere ganger!', 'So many guests – you could have filled the restaurant several times!'), move: 'look', mood: 'point' },
  gjett: { text: L('Endelig noe jeg kan: lokk! Gjett hva du bar ut mest.', 'Finally something I know about: lids! Guess what you carried out most.'), move: 'monocle', mood: 'point' },
  gikk: { text: L('Og alt sammen til fots – i arbeidssko!', 'And all of it on foot – in work shoes!'), move: 'hop', mood: 'wink' },
  ros: { text: L('Kollegene dine takket deg igjen og igjen. Det kassen ikke kan måle, teller her.', 'Your colleagues thanked you again and again. What the till can’t measure counts here.'), move: 'stache', mood: 'wink' },
  type: { text: L('Og her er typen din – trommevirvel, takk!', 'And here’s your type – drumroll, please!'), move: 'dance', mood: 'cheer' },
  del: { text: L('Vil du, kan du dele et kort med vaktlaget. Du velger selv hva som vises.', 'If you like, share a card with the team. You choose what it shows.'), move: 'present', mood: 'point' },
})

// Karis telefon: lederens side er ikke ferdig – vi vil ha innspill
const kariText = () => ({
  title: L('Lederens side er under arbeid', 'The manager’s side is a work in progress'),
  text: L('Denne delen er ikke ferdig utviklet ennå. Vi vil gjerne ha innspill: hva bør Kari se og gjøre her?', 'This part isn’t finished yet. We’d love your input: what should Kari see and do here?'),
})
// Rett etter vakten: gratulerer og løfter lokket for sluttrapporten
const doneText = () => ({
  title: L('Gratulerer med en god vakt, {name}!', 'Congrats on a great shift, {name}!', { name: config.persona.firstName }),
  text: L('Voilà – her er sluttrapporten din. Trykk på den for å se hele.', 'Voilà – here’s your shift report. Tap it to see all of it.'),
})

type Btn = { label: string; kind: 'next' | 'alt' | 'skip'; onClick: () => void }
type View = {
  key: string
  place: Place
  at?: string
  aim?: string[]
  hand?: Hand
  ring?: string[]
  tap?: string[]
  mood: Mood
  move: Action
  eyebrow?: string
  title?: string
  text: string
  note?: string
  lang?: boolean
  buttons: Btn[]
  /** Spørsmålet i starten: knappene under hverandre. */
  choices?: boolean
  /** Programlederen: liten boble uten knapper som blekner når han har snakket ferdig. */
  host?: boolean
}

const SIZE = D3D_SIZE
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)
type Pos = { cx: number; cy: number; scale: number; bx: number; by: number; bw: number; tail: number; dir: number; up: boolean; aims: Aim[] }

/** Sir Domeo svever over skjermen dit han forklarer noe, med en snakkeboble som følger ham. */
export function DemoGuide({ boss, onReport }: { boss: boolean; onReport: boolean }) {
  const { settings, updateSettings, demo, startShift, reset, holdShift } = useStore()
  const g = useGuide()
  const st = useExternal(storySubs, () => story)
  const route = useRoute()
  const path = '/' + (route.length ? route.join('/') : 'vakt')
  const ref = useRef<HTMLDivElement>(null)
  const sayRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<Pos | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [away, setAway] = useState(false)
  const [faded, setFaded] = useState(false)
  const prevCx = useRef<number | null>(null)
  const held = useRef(false)
  const storyOpened = useRef(false)
  const steps = tourSteps(settings.watch)
  const touring = g.open && g.mode === 'tour'
  const ts = touring ? steps[Math.min(g.step, steps.length - 1)] : null
  // Programleder i månedsoppsummeringen – men ikke for den som valgte å utforske selv
  const hostOn = settings.guide !== 'self' && !gated()
  const onStory = route[0] === 'maned' && !!st.id && hostOn && (!g.open || touring)

  const go = (step: number) => setGuide({ open: true, step, mode: 'tour' })
  function close() {
    if (!state.open) return
    setLeaving(true)
    window.setTimeout(() => {
      setLeaving(false)
      setPos(null)
      prevCx.current = null
      setGuide({ open: false, step: 0, mode: 'welcome' })
    }, 320)
  }
  const startTour = () => {
    updateSettings({ guide: 'tour', guideSeen: true })
    resumeAt = -1
    if (demo.phase !== 'pre') reset()
    go(0)
  }
  const chooseSelf = () => {
    updateSettings({ guide: 'self', guideSeen: true })
    resumeAt = -1
    setGuide({ open: true, step: 0, mode: 'self' })
  }
  const endTour = () => {
    resumeAt = g.step
    close()
  }
  const next = () => {
    if (!ts) return
    if (ts.last) {
      resumeAt = -1
      return close()
    }
    if (ts.start && demo.phase === 'pre') return startShift()
    go(g.step + 1)
  }
  // «Fortsett der vi slapp» passer bare om vakten er i samme fase som da han slapp
  const canResume = resumeAt > 0 && (resumeAt <= START ? demo.phase === 'pre' : demo.phase === 'live')

  // Første besøk: han spør om omvisning (ikke i testene eller med ?manuell). ?guide viser ham alltid.
  useEffect(() => {
    if (autoTried) return
    autoTried = true
    const force = new URLSearchParams(window.location.search).has('guide')
    // Tidtakeren avbrytes ikke: appen tegnes på nytt ved språkbytte, og han skal komme bare én gang
    if (force || (settings.guide === 'unset' && !gated())) window.setTimeout(() => !state.open && openGuide(), 700)
  }, [settings.guide])

  // Karis telefon: han dukker opp og sier at siden er under arbeid (én gang per besøk)
  useEffect(() => {
    if (!boss) {
      if (state.open && state.mode === 'kari') setGuide({ open: false, step: 0, mode: 'welcome' })
      return
    }
    if (kariShown || (state.open && state.mode !== 'done') || gated()) return
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

  // Omvisningen: appen går dit han skal forklare noe
  useEffect(() => {
    if (!ts) return
    if (ts.story ? !path.startsWith('/maned') : path !== ts.route) navigate(ts.route)
  }, [g.open, g.mode, g.step]) // eslint-disable-line react-hooks/exhaustive-deps

  // Vakten startet (knappen eller «Neste») → videre. Starter demoen på nytt midt i, slutter omvisningen.
  useEffect(() => {
    if (!ts) return
    if (ts.start && demo.phase === 'live') go(g.step + 1)
    else if (g.step > START && demo.phase === 'pre') close()
  }, [demo.phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Under omvisningen står klokka i ro rundt halv ni, så boksene har noe å vise. Etterpå går den videre.
  useEffect(() => {
    if (ts && ts.ch >= 2 && demo.phase === 'live' && !held.current) {
      held.current = true
      holdShift(true)
    }
    if (!touring && held.current) {
      held.current = false
      holdShift(false)
    }
  }, [touring, g.step, demo.phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Månedsoppsummeringen: omvisningen går videre når den lukkes
  useEffect(() => {
    if (!ts?.story) {
      storyOpened.current = false
      return
    }
    if (path.startsWith('/maned')) storyOpened.current = true
    else if (storyOpened.current) {
      storyOpened.current = false
      go(g.step + 1)
    }
  }, [path, g.step, touring]) // eslint-disable-line react-hooks/exhaustive-deps

  // Har man trykket seg bort fra stedet han forklarer, spør han om dere skal fortsette (etter et lite øyeblikk)
  useEffect(() => {
    if (!ts || ts.story || path === ts.route) return setAway(false)
    const t = window.setTimeout(() => setAway(true), 450)
    return () => window.clearTimeout(t)
  }, [path, g.step, touring]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Hva han sier og gjør akkurat nå ──
  let view: View | null = null
  if (onStory && st.id) {
    const line = storyLines()[st.id]
    if (line) {
      const reveal = st.id === 'gjett' && st.reveal
      view = {
        key: `story-${st.id}${reveal ? '-svar' : ''}`,
        place: 'story',
        mood: reveal ? 'cheer' : line.mood,
        move: reveal ? 'present' : line.move,
        text: reveal ? 'Voilà!' : line.text,
        host: true,
        buttons: touring && st.id === 'del' ? [{ label: L('Videre til Goals', 'On to Goals'), kind: 'next', onClick: () => go(g.step + 1) }] : [],
      }
    }
  } else if (g.open && g.mode === 'welcome') {
    view = {
      key: 'welcome',
      place: 'big',
      mood: 'wave',
      move: 'tip',
      title: L('Sir Domeo, til tjeneste!', 'Sir Domeo, at your service!'),
      text: L(
        'Dette er Vaktlogg – en app som viser arbeidsdagen din som servitør, litt som Strava. Skal jeg vise deg rundt? Det tar tre–fire minutter.',
        'This is Vaktlogg – an app that shows your workday as a server, a bit like Strava. Shall I show you around? It takes three or four minutes.',
      ),
      note: demo.phase !== 'pre' ? L('Omvisningen starter demoen på nytt.', 'The tour starts the demo over.') : undefined,
      lang: true,
      choices: true,
      buttons: [
        ...(canResume ? [{ label: L('Fortsett der vi slapp', 'Continue where we left off'), kind: 'next' as const, onClick: () => go(resumeAt) }] : []),
        { label: L('Ja, vis meg rundt', 'Yes, show me around'), kind: canResume ? 'alt' : 'next', onClick: startTour },
        { label: L('Nei takk, jeg utforsker selv', 'No thanks, I’ll explore myself'), kind: 'skip', onClick: chooseSelf },
      ],
    }
  } else if (g.open && g.mode === 'self') {
    view = {
      key: 'self',
      place: 'bar',
      at: "[data-guide='start']",
      aim: ["[data-guide='start']"],
      mood: 'wink',
      move: 'tip',
      text: L('Som du vil! Den mørke linjen nederst styrer demoen – start vakten der. Trenger du meg, trykk på meg nederst.', 'As you wish! The dark bar at the bottom runs the demo – start the shift there. Need me? Tap me down there.'),
      buttons: [{ label: L('Skjønner!', 'Got it!'), kind: 'next', onClick: close }],
    }
  } else if (ts && !ts.story) {
    const inCh = steps.filter((x) => x.ch === ts.ch)
    view = away
      ? {
          key: 'away',
          place: 'center',
          mood: 'wave',
          move: 'look',
          text: L('Skal vi fortsette omvisningen?', 'Shall we continue the tour?'),
          buttons: [
            { label: L('Avslutt omvisning', 'End tour'), kind: 'skip', onClick: endTour },
            { label: L('Fortsett', 'Continue'), kind: 'next', onClick: () => navigate(ts.route) },
          ],
        }
      : {
          key: `tour-${g.step}`,
          place: ts.place ?? (ts.at ? 'stack' : 'center'),
          at: ts.at,
          aim: ts.aim,
          hand: ts.hand,
          tap: ts.tap,
          ring: ts.ring,
          mood: ts.mood,
          move: ts.move,
          eyebrow: L('{ch} · {n} av {t}', '{ch} · {n} of {t}', { ch: chapters()[ts.ch], n: inCh.indexOf(ts) + 1, t: inCh.length }),
          text: ts.text(),
          // «Prøv selv»: ingen «Neste» – omvisningen går videre når du trykker på riktig sted
          buttons: ts.last
            ? [{ label: L('Takk, Sir!', 'Thanks, Sir!'), kind: 'next', onClick: next }]
            : [
                { label: L('Avslutt omvisning', 'End tour'), kind: 'skip', onClick: endTour },
                ...(ts.tap ? [] : [{ label: L('Neste', 'Next'), kind: 'next' as const, onClick: next }]),
              ],
        }
  } else if (g.open && g.mode === 'kari') {
    view = { key: 'kari', place: 'center', mood: 'wave', move: 'shrug', ...kariText(), buttons: [{ label: L('Skjønner!', 'Got it!'), kind: 'next', onClick: close }] }
  } else if (g.open && g.mode === 'done') {
    view = {
      key: 'done',
      place: 'report',
      at: '.er-peek',
      aim: ['.er-peek-more'],
      hand: 'palm',
      mood: 'point',
      move: 'present',
      ...doneText(),
      buttons: [{ label: L('Takk!', 'Thanks!'), kind: 'next', onClick: close }],
    }
  }
  const vkey = view?.key ?? ''

  // «Prøv selv»: en myk, pulserende ring rundt det han ber deg trykke på – trykket tar omvisningen videre
  useEffect(() => {
    const ring = view?.tap ?? view?.ring
    if (!ring?.length) return
    const sel = ring.join(',')
    let marked: Element[] = []
    const mark = () => {
      marked.forEach((e) => e.classList.remove('kg-ring'))
      marked = [...document.querySelectorAll(sel)]
      marked.forEach((e) => e.classList.add('kg-ring'))
    }
    mark()
    const t = window.setTimeout(mark, 400)
    const tap = view?.tap?.join(',')
    const step = g.step
    const onClick = (e: MouseEvent) => {
      if (!tap || !(e.target as Element | null)?.closest?.(tap)) return
      // Vakten starter av seg selv når knappen trykkes; ellers går vi videre litt etter at trykket har vist seg
      if (ts?.start) return
      window.setTimeout(() => state.open && state.mode === 'tour' && state.step === step && go(step + 1), ts?.tap?.includes('.kd-person') ? 1300 : 0)
    }
    document.addEventListener('click', onClick, true)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('click', onClick, true)
      marked.forEach((e) => e.classList.remove('kg-ring'))
    }
  }, [vkey, path]) // eslint-disable-line react-hooks/exhaustive-deps

  // Programlederens boble blekner når han har snakket ferdig, så siden synes
  useEffect(() => {
    setFaded(false)
    if (!view?.host || view.buttons.length) return
    const t = window.setTimeout(() => setFaded(true), talkFor(view) + 1700)
    return () => window.clearTimeout(t)
  }, [vkey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Plasser ham og boblen. Boblen står over ham (eller under, når han står under det han forklarer), innenfor appen.
  useLayoutEffect(() => {
    if (!view) return
    const v = view
    let tries = 0
    let retry = 0
    const place = () => {
      const bar = ref.current?.parentElement
      const app = document.querySelector<HTMLElement>('.app')
      const say = sayRef.current
      if (!bar || !app || !say) return
      const el = v.at ? document.querySelector<HTMLElement>(v.at) : null
      // Siden er ikke tegnet ennå (rett etter et sidebytte): prøv igjen straks
      if (v.at && !el) {
        if (tries++ < 12) retry = window.setTimeout(place, 120)
        return
      }
      const B = bar.getBoundingClientRect()
      const A = app.getBoundingClientRect()
      const tabs = document.querySelector('.tabbar')?.getBoundingClientRect()
      const floor = tabs && tabs.height ? tabs.top : A.bottom
      const kind = v.place
      const scale = { big: 1.3, center: 1.05, bar: 0.9, stack: 0.85, corner: 0.8, story: 0.62, report: 1.05 }[kind]
      const px = D3D_PX * scale
      const half = D3D_BODY.half * px
      const feet = D3D_BODY.feet * px
      const head = D3D_BODY.head * px
      const bw = Math.min(v.host ? 250 : 296, A.width - 24)
      say.style.width = `${bw}px`
      const bh = say.offsetHeight
      let cx = A.left + A.width / 2 - B.left
      let cy = A.top + A.height * 0.6 - B.top
      let up = false
      let right = false
      if (kind === 'report' && el) {
        // Boblen rett under sluttrapporten, han selv under boblen ute til høyre – men over fanelinjen
        const r = el.getBoundingClientRect()
        cx = A.right - B.left - half - 14
        cy = Math.min(r.bottom - B.top + 10 + bh + 22 + head, A.bottom - B.top - feet - 4)
      } else if (kind === 'bar' && el) {
        // Ved siden av knappen i demolinjen (der det er mest plass), med skoene på høyde med toppen av den
        const r = el.getBoundingClientRect()
        const left = r.left - A.left >= A.right - r.right
        cx = left ? r.left - B.left - half - 2 : r.right - B.left + half + 2
        cy = r.top - B.top - feet + 8
      } else if (kind === 'stack' && el) {
        // Over eller under det han forklarer – der det er plass til ham og boblen
        const r = el.getBoundingClientRect()
        const need = bh + 22 + head + feet + 4
        // Boblen kan gjerne dekke fanelinjen et øyeblikk – bare ikke det han forklarer
        const below = A.bottom - r.bottom >= need || (A.bottom - r.bottom > r.top - A.top && r.top - A.top < need)
        cx = (r.width < A.width * 0.6 ? r.left + r.width / 2 : r.left + r.width * 0.78) - B.left
        if (below) {
          up = true
          cy = r.bottom - B.top + 6 + head
        } else cy = r.top - B.top - 4 - feet
      } else if (kind === 'corner' || kind === 'story') {
        // Nede til høyre, med boblen over seg – i månedsoppsummeringen litt over bildeteksten
        cx = A.right - B.left - half - 10
        cy = (kind === 'story' ? A.bottom - 58 : floor - 8) - B.top - feet
        right = true
      }
      cx = clamp(cx, A.left - B.left + half + 4, A.right - B.left - half - 4)
      const bx = right ? A.right - B.left - 12 - bw : clamp(cx - bw / 2, A.left - B.left + 12, A.right - B.left - 12 - bw)
      const by = clamp(up ? cy + feet + 20 : cy - head - 22 - bh, A.top - B.top + 12, A.bottom - B.top - 8 - bh)
      // Det han peker på: midten av elementet, målt fra midten av lerretet hans (før skalering)
      const aims = (v.aim ?? []).flatMap((sel) => {
        const t = document.querySelector<HTMLElement>(sel)
        if (!t) return []
        const r = t.getBoundingClientRect()
        return [{ x: (r.left + r.width / 2 - (B.left + cx)) / scale, y: (r.top + r.height / 2 - (B.top + cy)) / scale }]
      })
      // Retningen han flyr, så han kan lene seg inn i svingen
      const dir = prevCx.current === null ? 0 : Math.sign(Math.round(cx - prevCx.current))
      prevCx.current = cx
      setPos({ cx, cy, scale, bx, by, bw, tail: clamp(cx - bx, 30, bw - 30), dir, up, aims })
    }
    place()
    // Sidene glir inn – mål en gang til når de har landet
    const settle = window.setTimeout(place, 450)
    window.addEventListener('resize', place)
    return () => {
      window.clearTimeout(retry)
      window.clearTimeout(settle)
      window.removeEventListener('resize', place)
    }
  }, [vkey, path, settings.lang, demo.phase]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!view) return null
  const talk = talkFor(view)
  const key = hash(vkey)
  const cls = ['kg-say', pos?.up ? 'up' : '', view.host ? 'host' : '', view.host && !view.buttons.length ? 'quiet' : '', faded ? 'faded' : ''].filter(Boolean).join(' ')
  return (
    <div className={`kg-layer ${leaving ? 'leaving' : ''} ${pos ? 'placed' : ''}`} ref={ref} role="dialog" aria-label={L('Sir Domeos guide til prototypen', 'Sir Domeo’s guide to the prototype')}>
      <div
        className="kg-float"
        style={pos ? { left: pos.cx - SIZE / 2, top: pos.cy - SIZE / 2, transform: `scale(${pos.scale})` } : undefined}
      >
        <div className="kg-bob">
          <Domeo3D
            mood={leaving && view.buttons.some((b) => b.kind === 'next') && g.mode !== 'kari' ? 'cheer' : view.mood}
            move={leaving ? 'twirl' : view.move}
            actionKey={key + (leaving ? 1000 : 0)}
            dir={pos?.dir ?? 0}
            talk={leaving ? 0 : talk}
            aims={leaving ? undefined : pos?.aims}
            hand={view.hand}
            leaving={leaving}
            fallback={<Domeo mood={view.mood} talkKey={key} size={100} />}
          />
        </div>
      </div>
      <div className={cls} ref={sayRef} style={pos ? { left: pos.bx, top: pos.by, width: pos.bw, ['--tail' as string]: `${pos.tail}px` } : undefined}>
        <div className="kg-text" key={vkey}>
          {view.eyebrow && <span className="kg-eyebrow">{view.eyebrow}</span>}
          {view.title && <b>{view.title}</b>}
          <p>{view.text}</p>
          {view.note && <p className="kg-note">{view.note}</p>}
          {view.lang && (
            <div className="kg-lang" role="radiogroup" aria-label="Språk · Language">
              {(['no', 'en'] as const).map((l) => (
                <button key={l} role="radio" aria-checked={settings.lang === l} onClick={() => updateSettings({ lang: l })}>
                  {l === 'no' ? 'Norsk' : 'English'}
                </button>
              ))}
            </div>
          )}
        </div>
        {view.buttons.length > 0 && (
          <div className={`kg-foot ${view.choices ? 'choices' : ''}`}>
            {view.buttons.map((b) => (
              <button key={b.label} className={b.kind === 'skip' ? 'kg-skip' : b.kind === 'alt' ? 'kg-alt' : 'kg-next'} onClick={b.onClick}>
                {b.label}
              </button>
            ))}
          </div>
        )}
        {/* Halen på boblen peker mot ham */}
        <svg className="kg-tail" width="30" height="18" viewBox="0 0 30 18" aria-hidden="true">
          <path className="f" d="M0 0C7 1 12 6 13 17C16 8 22 2 30 0Z" />
          <path className="o" d="M0 .6C7 1.6 12 6 13 17C16 8 22 2.6 30 .6" />
        </svg>
      </div>
    </div>
  )
}

/** Han snakker omtrent så lenge det tar å lese boblen (lokket går opp og ned imens). */
function talkFor(v: View) {
  return Math.min(3600, 600 + ((v.title ?? '') + v.text).length * 22)
}
