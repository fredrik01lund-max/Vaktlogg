// Sir Domeo: guiden til prototypen – en serveringsklokke i 3D som svever over skjermen og peker på det han forklarer.
// Første gang spør han om du vil ha en omvisning. Ja: han tar deg gjennom de viktigste delene av appen –
// før vakten, under vakten, historikken og månedsoppsummeringen, Goals og Meg. Nei: han trekker seg tilbake.
// Han er programleder i månedsoppsummeringen (med mindre du valgte å utforske selv), gratulerer etter vakten,
// og sier fra på Karis telefon at lederens side er under arbeid.
// Lokket er munnen hans: det går opp og ned mens han snakker. Den flate Sir Domeo (SVG) brukes i demolinjen og uten WebGL.

import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { colleagueName, config } from './config.ts'
import { L } from './i18n.ts'
import { navigate, useRoute } from './router.ts'
import { MANUAL, useStore } from './state.tsx'
import { D3D_BODY, D3D_PX, D3D_SIZE, Domeo3D, HOME_PX, onBody, preloadDomeo } from './domeo3d.tsx'
import type { Action, Aim, Hand, Leaving, Mood } from './domeo3d.tsx'
import { reduced } from './lib/motion.ts'
import './guide.css'

// ── Liten felles tilstand: overlever at appen tegnes på nytt når språket byttes ──
type Mode = 'welcome' | 'self' | 'tour' | 'kari' | 'done' | 'help'
/** `extra`: hvilken boble i en ekstra forklaring («Mer om XP») som vises. */
type GuideState = { open: boolean; step: number; mode: Mode; bye?: number; extra?: number }
let state: GuideState = { open: false, step: 0, mode: 'welcome' }
let autoTried = false
/** Karis beskjed vises én gang per besøk i prototypen. */
let kariShown = false
/** Stoppet omvisningen kom fra – noen replikker henger sammen med det forrige stoppet. */
let lastStep = -1
const subs = new Set<() => void>()
const setGuide = (next: GuideState) => {
  state = next
  subs.forEach((f) => f())
}
/** Hent ham frem (demolinjen og ⋯-menyen): han forklarer siden du er på, og kan vise deg rundt herfra. */
export const openGuide = () => setGuide({ open: true, step: 0, mode: 'help' })
/** Be ham gå (f.eks. når sluttrapporten åpnes i stort format). */
export const dismissGuide = () => state.open && setGuide({ ...state, bye: (state.bye ?? 0) + 1 })
/** Ikke i testene eller med ?manuell – ?guide viser ham alltid. */
const gated = () => !new URLSearchParams(window.location.search).has('guide') && (MANUAL || navigator.webdriver)
/** Demoen er startet på nytt: han dukker opp og spør om omvisning, akkurat som når appen åpnes. */
export function welcome() {
  if (gated()) return
  window.setTimeout(() => setGuide({ open: true, step: 0, mode: 'welcome' }), 500)
}
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
/** Svaret på «Gjett!» er vist: «Voilà!» Kortet sier selv hvilket det er – det kan komme før historien har sagt fra om kortet. */
export const storyReveal = (id: string) => {
  if (story.id !== id || !story.reveal) setStory({ id, reveal: true })
}
/** Demolinjen skjules: han går uten avskjed (og omvisningen avsluttes). */
export const endGuide = () => state.open && setGuide({ open: false, step: 0, mode: 'welcome' })
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
/** Ekstra forklaring for de nysgjerrige: en knapp i boblen åpner noen bobler til, så tilbake til omvisningen. */
type Extra = { at: string; aim?: string[]; mood: Mood; move: Action; text: () => string }
type More = { label: () => string; title: () => string; steps: Extra[] }
type TourStep = {
  ch: number
  route: string
  /** Det han forklarer – han stiller seg over eller under det. */
  at?: string
  place?: Place
  aim?: string[]
  hand?: Hand
  /** «Prøv selv»: et trykk her tar omvisningen videre (etter `tapDelay` ms, så trykket rekker å vise seg). */
  tap?: string[]
  tapDelay?: number
  /** Pulserende ring rundt noe han nevner, uten at det må trykkes. */
  ring?: string[]
  /** Detaljsider: rull så dette ligger øverst, så boblen får plass under det han forklarer. */
  scroll?: string
  mood: Mood
  move: Action
  text: () => string
  /** Hører til før eller under vakten – omvisningen følger vakten om den startes eller nullstilles utenom. */
  phase?: 'pre' | 'live'
  /** «Neste» starter vakten (omvisningen går videre når den er i gang). */
  start?: boolean
  /** «Mer om …»: en grundigere forklaring for den som vil vite mer. */
  more?: More
  /** Månedsoppsummeringen: programlederen tar over, og omvisningen går videre når den lukkes. */
  story?: boolean
  last?: boolean
}
const MONTH = '/maned/2026-09'
const chapters = () => [L('Velkommen', 'Welcome'), L('Før vakten', 'Before the shift'), L('Under vakten', 'During the shift'), L('Historikk', 'History'), L('Måneden din', 'Your month'), 'Goals', L('Meg', 'Me'), L('Ferdig', 'Done')]
const tile = (t: string) => `.st-tile[data-topic=${t}]`
const tab = (t: string) => `[data-tab='${t}']`
const section = (n: number) => `.st-detail > section:nth-of-type(${n})`
// XP: status som samler seg opp. Tallene står i profileXp i demoData.ts.
const moreXp: More = {
  label: () => L('Mer om XP', 'More about XP'),
  title: () => L('Mer om XP', 'More about XP'),
  steps: [
    {
      at: '.lv-card',
      aim: ['.lv-card .lv-top'],
      mood: 'point',
      move: 'monocle',
      text: () => L('XP er nivået ditt – status som samler seg opp og aldri brukes opp. Du får 1 XP for hver 100 kr du selger og for hver 10 kr i tips.', 'XP is your level – status that builds up and is never spent. You get 1 XP for every 100 kr you sell and every 10 kr in tips.'),
    },
    {
      at: '.lv-card',
      aim: ['.lv-card .lv-stat:nth-of-type(1)', '.lv-card .lv-stat:nth-of-type(2)'],
      mood: 'point',
      move: 'pick',
      text: () => L('Medaljer får du for milepæler, som 100 vakter eller et maraton gått (250 XP). Hver nye personlige rekord gir et trofé (500 XP).', 'Medals come from milestones, like 100 shifts or a marathon walked (250 XP). Every new personal record gives a trophy (500 XP).'),
    },
    {
      at: '.lv-card',
      aim: ['.lv-card .lv-top'],
      mood: 'wink',
      move: 'tip',
      text: () => L('Hvert nivå krever litt mer XP enn det forrige, så de første går fort. Trykk på kortet når som helst for å se hvor XP-en din kommer fra.', 'Each level takes a little more XP than the last, so the first ones go fast. Tap the card any time to see where your XP comes from.'),
    },
    {
      at: '.pm-row',
      aim: ['.pm-row'],
      mood: 'wink',
      move: 'stache',
      text: () => L('Og nivået låser opp noe: på LVL 40 og 50 åpnes hemmelige retter i Personalmenyen.', 'And your level unlocks things: at LVL 40 and 50, secret dishes open up in the Staff menu.'),
    },
  ],
}
// Poletter: det du bestiller med. Reglene står i staffMenu i demoData.ts.
const moreTokens: More = {
  label: () => L('Mer om poletter', 'More about tokens'),
  title: () => L('Mer om poletter', 'More about tokens'),
  steps: [
    {
      at: '.pm-wallet',
      aim: ['.pm-bal'],
      mood: 'point',
      move: 'monocle',
      text: () => L('Poletter er det du bestiller med. Ulikt XP brukes de opp – og du tjener dem bare på det du styrer selv, aldri på salg, tips eller kudos.', 'Tokens are what you order with. Unlike XP they get spent – and you only earn them for things you control, never for sales, tips or kudos.'),
    },
    {
      at: '.pm-wallet',
      aim: ['.pm-two .pm-box:first-child'],
      mood: 'point',
      move: 'hop',
      text: () =>
        L(
          'Hver 4. vakt fyller stempelkortet. Du får også poletter når laget når lagmålet, etter fem vakter på rad over ditt eget snitt, og når du tar en vakt for en kollega.',
          'Every 4th shift fills the stamp card. You also earn tokens when the team hits its goal, after five shifts in a row above your own average, and when you cover a shift for a colleague.',
        ),
    },
    {
      at: '.pm-tabs',
      aim: ['.pm-tabs'],
      mood: 'point',
      move: 'pick',
      text: () =>
        L(
          'Menyen har fire faner: Tid (ønskefri og seksjon – rett i vaktplanen når Kari har godkjent), Smak, Gaver og Hemmelig, som låses opp av nivået ditt.',
          'The menu has four tabs: Time (a day off or your section – straight into the rota once Kari approves), Taste, Gifts and Secret, which your level unlocks.',
        ),
    },
    {
      at: '.pm-wallet',
      aim: ['.pm-two .pm-box:last-child'],
      mood: 'wink',
      move: 'tip',
      text: () =>
        L(
          'Du kan også spare: 60 poletter blir et gavekort på 5 000 kr. Det er grensen for skattefrie gaver fra jobben, så appen sier fra hvis du er i ferd med å gå over.',
          'You can also save up: 60 tokens become a 5,000 kr gift card. That’s the limit for tax-free gifts from work, so the app tells you if you’re about to go over.',
        ),
    },
  ],
}

/** Det omvisningen trenger å vite om demoen: er klokka på, hvilket spill er valgt, og med hvem. */
type TourCtx = { watchOn: boolean; game: string; mate: string; fromKudos: boolean; phase: string }

// Der det går, trykker du selv på knappene – omvisningen går videre av seg selv når du gjør det.
// «Neste» står bare der det ikke finnes noe å trykke på.
const tourSteps = ({ watchOn, game, mate, fromKudos, phase }: TourCtx): TourStep[] => [
  {
    ch: 1,
    phase: 'pre',
    route: '/vakt',
    at: '.game-pick',
    aim: ['.game-pick .game-card:nth-child(1)', '.game-pick .game-card:nth-child(2)'],
    tap: ['.game-pick .game-card:nth-child(1)', '.game-pick .game-card:nth-child(2)'],
    tapDelay: 700,
    mood: 'point',
    move: 'pick',
    text: () => L('Du er Emma, og det er fredag på Brasserie Fjordgata. Før vakten velger du kveldens spill – trykk på Duell eller Makker.', 'You’re Emma, and it’s Friday at Brasserie Fjordgata. Before the shift, you pick tonight’s game – tap Duel or Buddy.'),
  },
  game === 'duell' || game === 'makker'
    ? {
        ch: 1,
        phase: 'pre',
        route: '/vakt',
        at: '.invite',
        aim: ['.invite .inv-faces'],
        tap: ['.invite .inv-face'],
        tapDelay: 1400,
        mood: 'point',
        move: 'hop',
        text: () =>
          game === 'makker'
            ? L('Spill er morsommere sammen. Trykk på kollegaen du vil være makker med.', 'Games are more fun together. Tap the colleague you want as your buddy.')
            : L('Spill er morsommere sammen. Trykk på kollegaen du vil utfordre.', 'Games are more fun together. Tap the colleague you want to challenge.'),
      }
    : {
        ch: 1,
        phase: 'pre',
        route: '/vakt',
        at: '.game-pick',
        aim: ['.game-pick'],
        mood: 'point',
        move: 'look',
        text: () =>
          game === 'laget'
            ? L('Laget spiller sammen mot forrige fredag – da trenger du ingen invitasjon.', 'The team plays together against last Friday – no invitation needed.')
            : L('Rolig er en kveld uten konkurranse – da trenger du ingen invitasjon.', 'Calm is an evening without competition – no invitation needed.'),
      },
  {
    ch: 1,
    phase: 'pre',
    route: '/vakt',
    at: '.watch-toggle',
    aim: ['.watch-toggle'],
    tap: watchOn ? undefined : ['.watch-toggle'],
    tapDelay: 900,
    mood: 'point',
    move: 'watch',
    text: () =>
      watchOn
        ? L('Her kobler du til smartklokka. Den er på, så under vakten får du puls, stress og skritt rett inn i appen.', 'Connect your smartwatch here. It’s on, so during the shift you get heart rate, stress and steps right in the app.')
        : L('Her kobler du til smartklokka. Skru den på, så får du puls, stress og skritt fra vakten rett inn i appen.', 'Connect your smartwatch here. Turn it on to get heart rate, stress and steps from the shift right in the app.'),
  },
  {
    ch: 1,
    phase: 'pre',
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
    phase: 'live',
    route: '/vakt',
    at: tile('helse'),
    aim: [tile('helse')],
    tap: [tile('helse')],
    mood: 'point',
    move: 'dance',
    text: () => L('Vakten er i gang! Boksene oppdaterer seg mens du jobber. Trykk på Helse for å se mer.', 'The shift is on! The boxes update while you work. Tap Health to see more.'),
  },
  {
    ch: 2,
    phase: 'live',
    route: '/vakt/helse',
    place: 'corner',
    scroll: '.st-hero',
    aim: ['.st-hero', section(2)],
    tap: [tab('vakt')],
    mood: 'point',
    move: 'pick',
    text: () =>
      L(
        'Her ser du pulsen din nå, stresset kvarter for kvarter og skrittene dine – alt fra klokka. Trykk på Vakt nederst for å gå tilbake.',
        'Here’s your heart rate right now, stress quarter by quarter and your steps – all from the watch. Tap Shift at the bottom to go back.',
      ),
  },
  {
    ch: 2,
    phase: 'live',
    route: '/vakt',
    at: tile('konkurranse'),
    aim: [tile('konkurranse')],
    tap: [tile('konkurranse')],
    mood: 'point',
    move: 'peek',
    text: () => L('Så Konkurranse – trykk på boksen.', 'Next, Competition – tap the box.'),
  },
  {
    ch: 2,
    phase: 'live',
    route: '/vakt/konkurranse',
    place: 'corner',
    scroll: '.st-feature',
    aim: ['.st-feature', section(2)],
    tap: [tab('vakt')],
    mood: 'point',
    move: 'monocle',
    text: () =>
      game === 'makker'
        ? L('Her er spillene: makkermålet med {name}, og laget mot forrige fredag på samme tid. Trykk på Vakt for å gå tilbake.', 'Here are the games: your buddy goal with {name}, and the team against last Friday at the same time. Tap Shift to go back.', { name: mate })
        : L('Her er spillene: duellen mot {name}, og laget mot forrige fredag på samme tid. Trykk på Vakt for å gå tilbake.', 'Here are the games: the duel with {name}, and the team against last Friday at the same time. Tap Shift to go back.', { name: mate }),
  },
  {
    ch: 2,
    phase: 'live',
    route: '/vakt',
    at: tile('salg'),
    aim: [tile('salg')],
    tap: [tile('salg')],
    mood: 'point',
    move: 'hop',
    text: () => L('Og Salg – trykk på boksen.', 'And Sales – tap the box.'),
  },
  {
    ch: 2,
    phase: 'live',
    route: '/vakt/salg',
    place: 'corner',
    scroll: '.st-hero',
    aim: ['.st-hero', section(2), section(3)],
    tap: [tab('vakt')],
    mood: 'point',
    move: 'pick',
    text: () =>
      L(
        'Her ser du hva du har solgt, tipsen, rekorden din og salget per halvtime. Trykk på Vakt for å gå tilbake.',
        'Here’s what you’ve sold, your tips, your record and sales per half hour. Tap Shift to go back.',
      ),
  },
  {
    ch: 2,
    phase: 'live',
    route: '/vakt',
    at: tile('gjester'),
    aim: [tile('gjester')],
    mood: 'point',
    move: 'look',
    text: () => L('Gjester er bordkartet ditt: hvem som venter, allergier og hvem som kommer senere.', 'Guests is your table map: who’s waiting, allergies and who’s coming later.'),
  },
  {
    ch: 2,
    phase: 'live',
    route: '/vakt',
    at: '.kd-row',
    aim: ['.kd-person'],
    tap: ['.kd-person'],
    tapDelay: 1300,
    mood: 'point',
    move: 'dance',
    text: () => L('Og nå det beste: kudos! Trykk på en kollega for å sende ros – så mange ganger du vil.', 'And now the best part: kudos! Tap a colleague to send praise – as many times as you like.'),
  },
  {
    ch: 3,
    route: '/vakt',
    at: tab('historikk'),
    aim: [tab('historikk')],
    tap: [tab('historikk')],
    mood: 'cheer',
    move: 'twirl',
    text: () =>
      fromKudos
        ? L('Herlig! Når noen sender deg kudos, regner det over skjermen. Alt du gjør, lagres – trykk på Historikk.', 'Lovely! When someone sends you kudos, it rains across the screen. Everything you do is saved – tap History.')
        : L('Alt du gjør, lagres – trykk på Historikk.', 'Everything you do is saved – tap History.'),
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
    route: '/historikk',
    at: tab('mal'),
    aim: [tab('mal')],
    tap: [tab('mal')],
    mood: 'point',
    move: 'look',
    text: () => L('Så Goals – trykk på fanen.', 'Next, Goals – tap the tab.'),
  },
  {
    ch: 5,
    route: '/mal',
    at: '.gl-records',
    // Nede i hjørnet: boblen skal ikke dekke lagmålet han forteller om
    place: 'corner',
    aim: ['.yg.tile', '.gl-others', '.gl-records'],
    tap: [tab('meg')],
    mood: 'point',
    move: 'pick',
    text: () =>
      L(
        'Goals er det dere jobber mot: årets lagmål – en tur til Frankrike for hele laget – premier dere kan vinne sammen, og rekordene dine. Trykk på Meg.',
        'Goals is what you work toward together: this year’s team goal – a trip to France for the whole team – prizes you can win together, and your records. Tap Me.',
      ),
  },
  {
    ch: 6,
    route: '/meg',
    at: '.pm-row',
    aim: ['.lv-card', '.pm-row'],
    tap: ['.pm-row'],
    more: moreXp,
    mood: 'point',
    move: 'pick',
    text: () =>
      L(
        'Dette er deg: nivået ditt og XP fra vaktene. Poletter får du for innsats – hver fjerde vakt, når laget når målet, eller når du tar en ekstra vakt. Trykk på Personalmenyen.',
        'This is you: your level and XP from your shifts. Tokens you earn for effort – every fourth shift, when the team hits its goal, or when you take an extra shift. Tap the Staff menu.',
      ),
  },
  {
    ch: 6,
    route: '/meg/meny',
    place: 'corner',
    aim: ['.pm-wallet'],
    tap: [tab('vakt')],
    more: moreTokens,
    mood: 'wink',
    move: 'stache',
    text: () => L('Her bruker du poletter: fri, mat, gaver – eller spar til et gavekort. Trykk på Vakt for å gå tilbake til vakten.', 'Here’s where you spend tokens: time off, food, gifts – or save up for a gift card. Tap Shift to go back to the shift.'),
  },
  {
    ch: 7,
    route: '/vakt',
    // Avslutningen følger vakten: før, under eller etter
    place: 'bar',
    at: phase === 'done' ? '.kg-mini' : "[data-guide='start']",
    aim: [phase === 'done' ? '.kg-mini' : "[data-guide='start']"],
    ring: phase === 'done' ? [] : ["[data-guide='start']"],
    mood: 'wink',
    move: 'dance',
    last: true,
    text: () =>
      phase === 'live'
        ? L(
            'Det var omvisningen! Vakten går fortsatt – trykk Avslutt vakt når du vil se sluttrapporten. Nede i linjen kan du også se sjefen Karis telefon, bytte språk og starte på nytt. Trenger du meg, trykk på meg. God vakt!',
            'That’s the tour! The shift is still going – tap End shift whenever you want to see the shift report. Down in the bar you can also see Kari’s phone, switch language and start over. Need me? Tap me. Have a good shift!',
          )
        : phase === 'pre'
          ? L(
              'Det var omvisningen! Trykk Start vakt nede i linjen når du er klar. Der kan du også se sjefen Karis telefon, bytte språk og starte på nytt. Trenger du meg, trykk på meg.',
              'That’s the tour! Tap Start shift down in the bar when you’re ready. There you can also see Kari’s phone, switch language and start over. Need me? Tap me.',
            )
          : L(
              'Det var omvisningen! Trykk deg rundt som du vil. Nede i linjen kan du se sjefen Karis telefon, bytte språk og starte på nytt. Trenger du meg, trykk på meg.',
              'That’s the tour! Tap around as you like. Down in the bar you can see Kari’s phone, switch language and start over. Need me? Tap me.',
            ),
  },
]
/** Stoppet i omvisningen som passer der du er nå (−1 = ingen), så han kan vise deg rundt herfra. */
const stepFor = (steps: TourStep[], path: string, phase: string): number => {
  const fits = (x: TourStep) => !x.phase || x.phase === phase
  const exact = steps.findIndex((x) => !x.last && fits(x) && (x.story ? path.startsWith('/maned') : x.route === path))
  if (exact >= 0) return exact
  if (path === '/vakt/gjester') return steps.findIndex((x) => x.at === tile('gjester'))
  if (path.startsWith('/historikk/')) return steps.findIndex((x) => x.route === '/historikk')
  return -1
}
/** Kort om siden du er på – det han sier når du trykker på ham, eller har trykket deg bort fra omvisningen. */
const helpText = (path: string, phase: string): string => {
  if (path === '/vakt')
    return phase === 'pre'
      ? L('Her gjør du klar vakten: velg kveldens spill og hvem du spiller med, koble til klokka, og trykk Start vakt.', 'Here you get ready for the shift: pick tonight’s game and who you play with, connect your watch, and tap Start shift.')
      : phase === 'live'
        ? L('Vakten pågår. Boksene viser helse, salg, konkurranse og gjester – trykk på en for å se mer. Nederst sender du kudos til kollegene.', 'The shift is on. The boxes show health, sales, competition and guests – tap one to see more. At the bottom you send kudos to your colleagues.')
        : L('Dette er sluttrapporten fra kvelden. Trykk på den for å se hele.', 'This is tonight’s shift report. Tap it to see all of it.')
  if (path === '/vakt/helse') return L('Helse viser pulsen din nå, stresset kvarter for kvarter og skrittene dine – alt fra klokka.', 'Health shows your heart rate right now, stress quarter by quarter and your steps – all from the watch.')
  if (path === '/vakt/konkurranse') return L('Konkurranse viser kveldens spill og laget mot forrige fredag. Vil du ha en rolig kveld, kan du skjule alt nederst på siden.', 'Competition shows tonight’s game and the team against last Friday. Want a calm evening? You can hide all of it at the bottom of the page.')
  if (path === '/vakt/salg') return L('Salg viser hva du har solgt, tipsen, rekorden din og salget per halvtime – og hvert bord lenger ned.', 'Sales shows what you’ve sold, your tips, your record and sales per half hour – and each table further down.')
  if (path === '/vakt/gjester') return L('Gjester er bordkartet ditt: hvem som venter, allergier og hvem som kommer senere.', 'Guests is your table map: who’s waiting, allergies and who’s coming later.')
  if (path === '/historikk') return L('Historikk har alle vaktene dine. Trykk på en vakt for å se den, og øverst ligger månedsoppsummeringen.', 'History has all your shifts. Tap a shift to see it, and the monthly summary is at the top.')
  if (path.startsWith('/historikk/')) return L('Dette er en tidligere vakt, med rapporten slik den var den kvelden.', 'This is an earlier shift, with the report as it was that evening.')
  if (path.startsWith('/maned')) return L('Dette er månedsoppsummeringen. Trykk til høyre for neste side og til venstre for forrige, og lukk med krysset.', 'This is the monthly summary. Tap the right side for the next page and the left for the previous one, and close with the cross.')
  if (path === '/mal') return L('Goals er det dere jobber mot: årets lagmål, premier dere kan vinne sammen, og rekordene dine.', 'Goals is what you work toward: this year’s team goal, prizes you can win together, and your records.')
  if (path === '/meg') return L('Dette er deg: nivået og XP fra vaktene, poletter i Personalmenyen, og innstillinger som rolig modus og klokka.', 'This is you: your level and XP from your shifts, tokens in the Staff menu, and settings like calm mode and the watch.')
  if (path === '/meg/meny') return L('Personalmenyen: her bruker du poletter på fri, mat og gaver – eller sparer til et gavekort.', 'The Staff menu: here you spend tokens on time off, food and gifts – or save up for a gift card.')
  if (path.startsWith('/sjef')) return L('Dette er sjefen Karis telefon. Den delen er under arbeid – trykk på Emma nederst for å gå tilbake.', 'This is the manager Kari’s phone. That part is a work in progress – tap Emma at the bottom to go back.')
  return L('Trykk deg rundt som du vil. Den mørke linjen nederst styrer demoen.', 'Tap around as you like. The dark bar at the bottom runs the demo.')
}


// Programlederen i månedsoppsummeringen: én kort replikk per side
const storyLines = (touring: boolean): Record<string, { text: string; move: Action; mood: Mood }> => ({
  apning: { text: L('God kveld, og velkommen til september! Her er måneden din.', 'Good evening, and welcome to September! Here’s your month.'), move: 'tip', mood: 'wave' },
  gjester: { text: L('Så mange gjester – du kunne fylt restauranten flere ganger!', 'So many guests – you could have filled the restaurant several times!'), move: 'look', mood: 'point' },
  gjett: { text: L('Endelig noe jeg kan: lokk! Gjett hva du bar ut mest.', 'Finally something I know about: lids! Guess what you carried out most.'), move: 'monocle', mood: 'point' },
  gikk: { text: L('Og alt sammen til fots – i arbeidssko!', 'And all of it on foot – in work shoes!'), move: 'hop', mood: 'wink' },
  ros: { text: L('Kollegene dine takket deg igjen og igjen. Det kassen ikke kan måle, teller her.', 'Your colleagues thanked you again and again. What the till can’t measure counts here.'), move: 'stache', mood: 'wink' },
  type: { text: L('Og her er typen din – trommevirvel, takk!', 'And here’s your type – drumroll, please!'), move: 'dance', mood: 'cheer' },
  del: touring
    ? { text: L('Vil du, kan du dele et kort med vaktlaget. Trykk på krysset når du er ferdig.', 'If you like, share a card with the team. Tap the cross when you’re done.'), move: 'present', mood: 'point' }
    : { text: L('Vil du, kan du dele et kort med vaktlaget. Du velger selv hva som vises.', 'If you like, share a card with the team. You choose what it shows.'), move: 'present', mood: 'point' },
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
  scroll?: string
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
/** Et sted for ham: midten (piksler i demolinjen) og skalaen. */
type Spot = { cx: number; cy: number; scale: number }
/** `from`: han starter hjemme i demolinjen og flyr ut. `back`: han flyr hjem. `home`: denne gangen kom han fra demolinjen. */
type Pos = Spot & { bx: number; by: number; bw: number; tail: number; up: boolean; aims: Aim[]; from?: Spot; back?: Spot; home: boolean }
/** Der han står nå. Appen tegnes på nytt når språket byttes – da skal han bli stående, ikke fly ut av demolinjen igjen. */
let lastSpot: Spot | null = null

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
  const [leaving, setLeaving] = useState<Leaving>(false)
  const [away, setAway] = useState(false)
  const [faded, setFaded] = useState(false)
  const [tapGone, setTapGone] = useState(false)
  const held = useRef(false)
  const storyOpened = useRef(false)
  const steps = tourSteps({ watchOn: settings.watch, game: demo.game, mate: colleagueName(demo.invites[demo.game === 'makker' ? 'makker' : 'duell']), fromKudos: lastStep === 11, phase: demo.phase })
  // Stoppet som passer der du er nå
  const here = stepFor(steps, path, demo.phase)
  const touring = g.open && g.mode === 'tour'
  const ts = touring ? steps[Math.min(g.step, steps.length - 1)] : null
  // Har siden et eget stopp i omvisningen (ikke bare et i nærheten, som en tidligere vakt eller Gjester)?
  const hereOwn = !!ts && here >= 0 && here !== g.step && (steps[here].story ? path.startsWith('/maned') : steps[here].route === path)
  // Programleder i månedsoppsummeringen – men ikke for den som valgte å utforske selv
  const hostOn = settings.guide !== 'self' && !gated()
  const onStory = route[0] === 'maned' && !!st.id && hostOn && (!g.open || touring)

  const go = (step: number) => {
    lastStep = state.open && state.mode === 'tour' ? state.step : -1
    setGuide({ open: true, step, mode: 'tour' })
  }
  /** Plassen hans i demolinjen, der han bor – eller ingenting (skjult linje, eller redusert bevegelse). */
  const homeSpot = (): Spot | undefined => {
    const bar = ref.current?.parentElement
    const h = bar?.querySelector('.kg-home')?.getBoundingClientRect()
    if (!bar || !h?.width || reduced()) return undefined
    const B = bar.getBoundingClientRect()
    return { cx: h.left + h.width / 2 - B.left, cy: h.top + h.height / 2 - B.top, scale: HOME_PX / D3D_PX }
  }
  // Avskjeden: han flyr hjem til demolinjen (eller krymper bort der den ikke syns), og så lukkes guiden –
  // med mindre noe nytt åpnet seg imens (f.eks. «Start demoen på nytt», eller du trykket på ham igjen)
  const closingFrom = useRef<GuideState | null>(null)
  function close() {
    if (!state.open || closingFrom.current === state) return
    const at = state
    closingFrom.current = at
    const back = pos ? homeSpot() : undefined
    setLeaving(back ? 'home' : 'away')
    if (back) setPos((p) => p && { ...p, back })
    window.setTimeout(
      () => {
        if (closingFrom.current !== at) return
        closingFrom.current = null
        lastSpot = null
        setLeaving(false)
        setPos(null)
        setGuide({ open: false, step: 0, mode: 'welcome' })
      },
      back ? 480 : 400,
    )
  }
  const closeRef = useRef(close)
  closeRef.current = close
  // Åpnet noe seg mens han gikk, blir han: avskjeden avbrytes, og han flyr dit han skal i stedet for hjem
  useEffect(() => {
    if (!closingFrom.current || closingFrom.current === g) return
    closingFrom.current = null
    setLeaving(false)
    setPos((p) => p && { ...p, back: undefined })
  }, [g])
  const startTour = () => {
    // Klokka står av når omvisningen starter – du skrur den på selv
    if (demo.phase !== 'pre') reset()
    updateSettings({ guide: 'tour', guideSeen: true, watch: false })
    go(0)
  }
  // «Vis meg rundt herfra»: omvisningen begynner der du er, ikke fra start
  const startHere = () => {
    updateSettings({ guide: 'tour', guideSeen: true })
    go(here)
  }
  const chooseSelf = () => {
    updateSettings({ guide: 'self', guideSeen: true })
    setGuide({ open: true, step: 0, mode: 'self' })
  }
  const endTour = () => close()
  const next = () => {
    if (!ts) return
    if (ts.last) return close()
    if (ts.start && demo.phase === 'pre') return startShift()
    go(g.step + 1)
  }

  // Hver gang appen åpnes, dukker han opp og spør om omvisning (ikke i testene eller med ?manuell; ?guide viser ham alltid).
  // Åpnes appen på Karis telefon, kommer beskjeden derfra i stedet.
  useEffect(() => {
    if (autoTried) return
    autoTried = true
    // Tidtakeren avbrytes ikke: appen tegnes på nytt ved språkbytte, og han skal komme bare én gang
    if (gated()) return
    preloadDomeo()
    window.setTimeout(() => !state.open && setGuide({ open: true, step: 0, mode: 'welcome' }), 700)
  }, [])

  // Karis telefon: han dukker opp og sier at siden er under arbeid (én gang per besøk)
  useEffect(() => {
    if (!boss) {
      if (state.open && state.mode === 'kari') setGuide({ open: false, step: 0, mode: 'welcome' })
      return
    }
    if (kariShown || (state.open && state.mode !== 'done') || gated()) return
    kariShown = true
    let shown = false
    const t = window.setTimeout(() => {
      shown = true
      setGuide({ open: true, step: 0, mode: 'kari' })
    }, 600)
    return () => {
      window.clearTimeout(t)
      if (!shown) kariShown = false
    }
  }, [boss])

  // Etter vakten: han går når Emma forlater sluttrapporten, eller åpner den i stort format
  useEffect(() => {
    if (!onReport && g.open && g.mode === 'done') close()
  }, [onReport, g.open, g.mode]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (g.bye) close()
  }, [g.bye]) // eslint-disable-line react-hooks/exhaustive-deps

  // Omvisningen: appen går dit han skal forklare noe
  useEffect(() => {
    if (!ts) return
    if (ts.story ? !path.startsWith('/maned') : path !== ts.route) navigate(ts.route)
  }, [g.open, g.mode, g.step]) // eslint-disable-line react-hooks/exhaustive-deps

  // Omvisningen følger vakten: startes vakten (også før han ber om det) eller nullstilles demoen,
  // hopper han til stoppet som passer – aldri en ring rundt «Avslutt vakt» når han mente «Start vakt».
  useEffect(() => {
    if (!ts?.phase || ts.phase === demo.phase || demo.phase === 'done') return
    const m = stepFor(steps, '/vakt', demo.phase)
    // Startet vakten før han rakk klokka, kobler han den til – så Helse har noe å vise
    if (demo.phase === 'live' && !settings.watch) updateSettings({ watch: true })
    if (m >= 0) go(m)
  }, [demo.phase, g.step, touring]) // eslint-disable-line react-hooks/exhaustive-deps

  // Under omvisningen står klokka i ro rundt halv ni, så boksene har noe å vise. Etterpå går den videre.
  // Startes vakten senere i omvisningen (f.eks. på siste stopp), går den fra start som vanlig.
  useEffect(() => {
    if (ts && ts.ch === 2 && demo.phase === 'live' && !held.current) {
      held.current = true
      holdShift(true)
    }
    if ((!touring || ts?.last) && held.current) {
      held.current = false
      holdShift(false)
    }
  }, [touring, g.step, demo.phase]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () => () => {
      if (!held.current) return
      held.current = false
      holdShift(false)
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  )

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
    const line = storyLines(touring)[st.id]
    if (line) {
      const reveal = st.id === 'gjett' && st.reveal
      view = {
        key: `story-${st.id}${reveal ? '-svar' : ''}`,
        place: 'story',
        mood: reveal ? 'cheer' : line.mood,
        move: reveal ? 'present' : line.move,
        text: reveal ? 'Voilà!' : line.text,
        host: true,
        // I omvisningen: ringen viser krysset som lukker – da går omvisningen videre
        ring: touring && st.id === 'del' ? ['.wrapped .w-bar .w-iconbtn:last-child'] : undefined,
        buttons: [],
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
        { label: L('Ja, vis meg rundt', 'Yes, show me around'), kind: 'next', onClick: startTour },
        { label: L('Nei takk, jeg utforsker selv', 'No thanks, I’ll explore myself'), kind: 'skip', onClick: chooseSelf },
      ],
    }
  } else if (g.open && g.mode === 'help') {
    view = {
      key: `help-${path}-${demo.phase}`,
      place: 'corner',
      mood: 'wave',
      move: 'tip',
      eyebrow: L('Her er du', 'You are here'),
      text: helpText(path, demo.phase),
      choices: here >= 0,
      buttons:
        here >= 0
          ? [
              { label: L('Vis meg rundt herfra', 'Show me around from here'), kind: 'next', onClick: startHere },
              { label: L('Takk, Sir!', 'Thanks, Sir!'), kind: 'skip', onClick: close },
            ]
          : [{ label: L('Skjønner!', 'Got it!'), kind: 'next', onClick: close }],
    }
  } else if (g.open && g.mode === 'self') {
    const target = demo.phase === 'done' ? "[data-guide='more']" : "[data-guide='start']"
    view = {
      key: `self-${demo.phase}`,
      place: 'bar',
      at: target,
      aim: [target],
      mood: 'wink',
      move: 'tip',
      text:
        demo.phase === 'pre'
          ? L('Som du vil! Den mørke linjen nederst styrer demoen – start vakten der. Trenger du meg, trykk på meg nederst.', 'As you wish! The dark bar at the bottom runs the demo – start the shift there. Need me? Tap me down there.')
          : demo.phase === 'live'
            ? L('Som du vil! Den mørke linjen nederst styrer demoen – der avslutter du vakten når du vil. Trenger du meg, trykk på meg nederst.', 'As you wish! The dark bar at the bottom runs the demo – end the shift there whenever you like. Need me? Tap me down there.')
            : L('Som du vil! Den mørke linjen nederst styrer demoen – under ⋯ kan du starte på nytt. Trenger du meg, trykk på meg nederst.', 'As you wish! The dark bar at the bottom runs the demo – under ⋯ you can start over. Need me? Tap me down there.'),
      buttons: [{ label: L('Skjønner!', 'Got it!'), kind: 'next', onClick: close }],
    }
  } else if (ts && !ts.story) {
    const inCh = steps.filter((x) => x.ch === ts.ch)
    const more = ts.more
    const ex = more && g.extra !== undefined ? Math.min(g.extra, more.steps.length - 1) : -1
    const back = () => setGuide({ open: true, step: g.step, mode: 'tour' })
    view = away
      ? {
          key: `away-${path}`,
          place: 'corner',
          mood: 'wave',
          move: 'look',
          eyebrow: L('Her er du', 'You are here'),
          text: helpText(path, demo.phase),
          choices: true,
          buttons: [
            ...(hereOwn ? [{ label: L('Fortsett omvisningen herfra', 'Continue the tour from here'), kind: 'next' as const, onClick: () => go(here) }] : []),
            { label: L('Tilbake dit vi var', 'Back to where we were'), kind: hereOwn ? 'alt' : 'next', onClick: () => navigate(ts.route) },
            { label: L('Avslutt omvisning', 'End tour'), kind: 'skip', onClick: endTour },
          ],
        }
      : more && ex >= 0
        ? {
            // Ekstra forklaring: «Neste» gjennom boblene, så tilbake til omvisningen.
            // Trykker du videre i appen (f.eks. Personalmenyen), går omvisningen videre som vanlig.
            key: `tour-${g.step}-mer-${ex}`,
            place: 'stack',
            at: more.steps[ex].at,
            aim: more.steps[ex].aim,
            tap: ts.tap,
            ring: [],
            mood: more.steps[ex].mood,
            move: more.steps[ex].move,
            eyebrow: L('{t} · {n} av {m}', '{t} · {n} of {m}', { t: more.title(), n: ex + 1, m: more.steps.length }),
            text: more.steps[ex].text(),
            buttons: [
              { label: L('Tilbake til omvisningen', 'Back to the tour'), kind: 'skip', onClick: back },
              ex + 1 < more.steps.length
                ? { label: L('Neste', 'Next'), kind: 'next', onClick: () => setGuide({ ...state, extra: ex + 1 }) }
                : { label: L('Skjønner!', 'Got it!'), kind: 'next', onClick: back },
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
          scroll: ts.scroll,
          mood: ts.mood,
          move: ts.move,
          eyebrow: L('{ch} · {n} av {t}', '{ch} · {n} of {t}', { ch: chapters()[ts.ch], n: inCh.indexOf(ts) + 1, t: inCh.length }),
          text: ts.text(),
          // «Prøv selv»: ingen «Neste» – omvisningen går videre når du trykker på riktig sted
          buttons: ts.last
            ? [{ label: L('Takk, Sir!', 'Thanks, Sir!'), kind: 'next', onClick: next }]
            : [
                { label: L('Avslutt omvisning', 'End tour'), kind: 'skip', onClick: endTour },
                // For de nysgjerrige: en grundigere forklaring
                ...(more ? [{ label: more.label(), kind: 'alt' as const, onClick: () => setGuide({ open: true, step: g.step, mode: 'tour', extra: 0 }) }] : []),
                ...(ts.tap && !tapGone ? [] : [{ label: L('Neste', 'Next'), kind: 'next' as const, onClick: next }]),
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
    const ring = view?.ring ?? view?.tap
    if (!ring?.length && !view?.tap?.length) return
    const sel = ring?.join(',')
    let marked: Element[] = []
    const mark = () => {
      marked.forEach((e) => e.classList.remove('kg-ring'))
      marked = sel ? [...document.querySelectorAll(sel)] : []
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
      window.setTimeout(() => state.open && state.mode === 'tour' && state.step === step && go(step + 1), ts?.tapDelay ?? 0)
    }
    document.addEventListener('click', onClick, true)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('click', onClick, true)
      marked.forEach((e) => e.classList.remove('kg-ring'))
    }
  }, [vkey, path]) // eslint-disable-line react-hooks/exhaustive-deps

  // «Her!»: venter du lenge, eller trykker et annet sted på siden, minner han deg på hvor du skal trykke – han spretter og peker dit
  const [remind, setRemind] = useState({ n: 0, at: [] as Aim[] })
  const remindedAt = useRef(0)
  const remindNow = useRef(() => {})
  remindNow.current = () => {
    const bar = ref.current?.parentElement
    if (!view?.tap?.length || !bar || !pos || Date.now() - remindedAt.current < 3000) return
    const B = bar.getBoundingClientRect()
    const at = [...document.querySelectorAll(view.tap.join(','))]
      .map((t) => t.getBoundingClientRect())
      .filter((r) => r.width > 0)
      .slice(0, 3)
      .map((r) => ({ x: (r.left + r.width / 2 - (B.left + pos.cx)) / pos.scale, y: (r.top + r.height / 2 - (B.top + pos.cy)) / pos.scale }))
    if (!at.length) return
    remindedAt.current = Date.now()
    setRemind((r) => ({ n: r.n + 1, at }))
  }
  const nudgeable = !!view?.tap?.length && vkey.startsWith('tour-') && !vkey.includes('-mer-')
  useEffect(() => {
    if (!nudgeable) return
    const step = g.step
    const hash = window.location.hash
    const still = () => state.open && state.mode === 'tour' && state.step === step && window.location.hash === hash
    // Venter du: første gang etter 10 s, så hvert 12. sekund (høyst tre ganger)
    let n = 0
    let idle = 0
    const wait = (ms: number) => {
      idle = window.setTimeout(() => {
        if (!still()) return
        remindNow.current()
        if (++n < 3) wait(12000)
      }, ms)
    }
    wait(10000)
    // Trykker du et annet sted på siden (ikke i boblen, i demolinjen eller på ham – da fniser han)
    const sel = view?.tap?.join(',') ?? ''
    let soon = 0
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element | null
      if (!t?.closest || t.closest(sel) || t.closest('.kg-say, .demo-bar')) return
      const me = ref.current?.querySelector('.k3d')?.getBoundingClientRect()
      if (me && me.width && onBody(((e.clientX - me.left) * D3D_SIZE) / me.width - D3D_SIZE / 2, ((e.clientY - me.top) * D3D_SIZE) / me.width - D3D_SIZE / 2)) return
      window.clearTimeout(soon)
      soon = window.setTimeout(() => still() && remindNow.current(), 350)
    }
    document.addEventListener('click', onClick, true)
    return () => {
      window.clearTimeout(idle)
      window.clearTimeout(soon)
      document.removeEventListener('click', onClick, true)
    }
  }, [vkey, path, nudgeable]) // eslint-disable-line react-hooks/exhaustive-deps

  // Esc lukker hjelpen og beskjedene hans (omvisningen avsluttes med knappen i boblen)
  useEffect(() => {
    if (!g.open || !['help', 'self', 'kari', 'done'].includes(g.mode)) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      closeRef.current()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [g.open, g.mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Husk hvor han står (til språkbyttet), og glem det når han er borte
  useEffect(() => {
    if (pos && !pos.back) lastSpot = { cx: pos.cx, cy: pos.cy, scale: pos.scale }
  }, [pos])
  // Forsvinner han uten avskjed (f.eks. når månedshistorien lukkes), starter han hjemme neste gang
  useEffect(() => {
    if (vkey) return
    lastSpot = null
    setPos(null)
  }, [vkey])

  // Han står hjemme i demolinjen ett bilde, så flyr han ut
  useEffect(() => {
    if (!pos?.from) return
    let r2 = 0
    const r1 = requestAnimationFrame(() => (r2 = requestAnimationFrame(() => setPos((p) => p && { ...p, from: undefined }))))
    return () => {
      cancelAnimationFrame(r1)
      cancelAnimationFrame(r2)
    }
  }, [pos?.from])

  // Programlederens boble blekner når han har snakket ferdig, så siden synes
  useEffect(() => {
    setFaded(false)
    if (!view?.host || view.buttons.length || view.ring) return
    const t = window.setTimeout(() => setFaded(true), readFor(view) + 1700)
    return () => window.clearTimeout(t)
  }, [vkey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Plasser ham og boblen. Boblen står over ham (eller under, når han står under det han forklarer), innenfor appen.
  useLayoutEffect(() => {
    if (!view) return
    const v = view
    let tries = 0
    let dead = false
    const timers: number[] = []
    const later = (ms: number) => timers.push(window.setTimeout(place, ms))
    let scrolled = false
    function place() {
      if (dead) return
      const bar = ref.current?.parentElement
      const app = document.querySelector<HTMLElement>('.app')
      const say = sayRef.current
      if (!bar || !app || !say) return
      const el = v.at ? document.querySelector<HTMLElement>(v.at) : null
      // Siden er ikke tegnet ennå (rett etter et sidebytte): prøv igjen straks. Kommer den aldri, står han midt på.
      if (v.at && !el && tries++ < 12) return void later(120)
      setTapGone(!!v.tap?.length && !document.querySelector(v.tap.join(',')))
      const B = bar.getBoundingClientRect()
      const A = app.getBoundingClientRect()
      // Detaljsider: rull så det han forklarer ligger øverst, så boblen får plass under det.
      // Siden er kanskje ikke tegnet ennå rett etter sidebyttet – da prøver vi igjen straks.
      if (v.scroll && !scrolled) {
        const t = document.querySelector<HTMLElement>(v.scroll)
        if (!t) {
          if (tries++ < 12) later(120)
          return
        }
        scrolled = true
        let box = t.parentElement
        while (box && box !== document.body && !(box.scrollHeight > box.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(box).overflowY))) box = box.parentElement
        const d = t.getBoundingClientRect().top - A.top - 6
        if (box && box !== document.body && Math.abs(d) > 4) {
          box.scrollBy({ top: d, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
          // Mål på nytt når rullingen har landet
          later(420)
        }
      }
      const tabs = document.querySelector('.tabbar')?.getBoundingClientRect()
      const floor = tabs && tabs.height ? tabs.top : A.bottom
      const kind = v.place
      const scale = { big: 1.3, center: 1.05, bar: 0.9, stack: 0.85, corner: 0.72, story: 0.62, report: 1.05 }[kind]
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
        // Nede til høyre, med boblen over seg – i månedsoppsummeringen litt over bildeteksten.
        // Er det for trangt under det han forklarer (små skjermer), står han på fanelinjen i stedet.
        const below = Math.max(A.top, ...(v.aim ?? []).map((sel) => document.querySelector(sel)?.getBoundingClientRect().bottom ?? A.top))
        const ground = kind === 'corner' && floor - below < bh + 22 + head + feet + 12 ? A.bottom - 2 : floor - 8
        // Står det han ber deg trykke på nede til høyre (f.eks. Meg-fanen), stiller han seg til venstre
        const target = v.tap?.length ? document.querySelector(v.tap.join(','))?.getBoundingClientRect() : undefined
        right = !target || target.left + target.width / 2 < A.left + A.width / 2
        cx = right ? A.right - B.left - half - 10 : A.left - B.left + half + 10
        cy = (kind === 'story' ? A.bottom - 58 : ground) - B.top - feet
      }
      cx = clamp(cx, A.left - B.left + half + 4, A.right - B.left - half - 4)
      const bx = kind === 'corner' || kind === 'story' ? (right ? A.right - B.left - 12 - bw : A.left - B.left + 12) : clamp(cx - bw / 2, A.left - B.left + 12, A.right - B.left - 12 - bw)
      const by = clamp(up ? cy + feet + 20 : cy - head - 22 - bh, A.top - B.top + 12, A.bottom - B.top - 8 - bh)
      // Det han peker på: midten av elementet, målt fra midten av lerretet hans (før skalering)
      const aims = (v.aim ?? []).flatMap((sel) => {
        const t = document.querySelector<HTMLElement>(sel)
        if (!t) return []
        const r = t.getBoundingClientRect()
        return [{ x: (r.left + r.width / 2 - (B.left + cx)) / scale, y: (r.top + r.height / 2 - (B.top + cy)) / scale }]
      })
      const next = { cx, cy, scale, bx, by, bw, tail: clamp(cx - bx, 30, bw - 30), up, aims }
      // Første gang: han starter hjemme i demolinjen og flyr ut dit han skal
      setPos((p) => {
        if (p) return { ...next, home: p.home, back: p.back }
        const from = lastSpot ?? homeSpot()
        return { ...next, from, home: !!from }
      })
    }
    place()
    // Sidene glir inn – mål en gang til når de har landet
    later(450)
    later(900)
    window.addEventListener('resize', place)
    return () => {
      dead = true
      timers.forEach((t) => window.clearTimeout(t))
      window.removeEventListener('resize', place)
    }
  }, [vkey, path, settings.lang, demo.phase]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!view) return null
  const talk = talkFor(view)
  // Hvor han er akkurat nå: hjemme (rett før han flyr ut), på vei hjem, eller der han forklarer noe
  const f = pos && (pos.back ?? pos.from ?? pos)
  const key = hash(vkey)
  const cls = ['kg-say', pos?.up ? 'up' : '', view.host ? 'host' : '', view.host && !view.buttons.length ? 'quiet' : '', faded ? 'faded' : ''].filter(Boolean).join(' ')
  return (
    <div className={`kg-layer ${leaving ? `leaving ${leaving}` : ''} ${pos ? 'placed' : ''} ${pos?.home ? 'from-home' : ''}`} ref={ref} role="dialog" aria-label={L('Sir Domeos guide til prototypen', 'Sir Domeo’s guide to the prototype')}>
      <div
        className="kg-float"
        style={f ? { left: f.cx - SIZE / 2, top: f.cy - SIZE / 2, transform: `scale(${f.scale})`, transition: pos.from ? 'none' : undefined } : undefined}
      >
        <div className="kg-bob">
          <Domeo3D
            mood={leaving === 'home' ? 'point' : leaving && view.buttons.some((b) => b.kind === 'next') && g.mode !== 'kari' ? 'cheer' : view.mood}
            move={leaving === 'home' ? 'chatter' : leaving ? 'tip' : view.move}
            actionKey={key + (leaving ? 1000 : 0)}
            say={leaving ? '' : [view.title, view.text].filter(Boolean).join(' ')}
            talk={leaving ? 0 : talk}
            aims={leaving ? undefined : pos?.aims}
            hand={view.hand}
            remind={remind}
            leaving={leaving}
            entrance={pos?.home ? 'fly' : 'pop'}
            fallback={<Domeo mood={view.mood} talkKey={key} size={100} />}
          />
        </div>
      </div>
      <div className={cls} ref={sayRef} aria-live="polite" style={pos ? { left: pos.bx, top: pos.by, width: pos.bw, ['--tail' as string]: `${pos.tail}px` } : undefined}>
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

/** Hvor lenge han høyst snakker: korte replikker sier han helt, de lange bare begynnelsen av (så leser du resten selv). */
function talkFor(v: View) {
  return Math.min(3600, 600 + ((v.title ?? '') + v.text).length * 60)
}
/** Omtrent så lenge det tar å lese boblen. */
function readFor(v: View) {
  return Math.min(3600, 600 + ((v.title ?? '') + v.text).length * 22)
}
