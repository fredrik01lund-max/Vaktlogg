// Sir Domeo i 3D: en blank sølvklokke med ekte øyne (øyelokk i sølv), skulpturert bart, monokkel og vinrød sløyfe,
// frakkeermer med hvite hansker, og bukser med gamasjer og lakksko.
// Lokket er munnen – det åpner seg på stavelsene i det han sier, og løftes som en hatt når han presenterer noe («Voilà!»).
// Når han forklarer en knapp, står han ved siden av og peker på den (armene styres med enkel to-ledds IK).
// Han lener seg inn i farten når han flyr, ser dit du trykker, og fniser hvis du trykker på ham.
// Hjemme i demolinjen røyker han en cubansk sigar hvert halve minutt: tar den ut av lokket, lukter, klipper tuppen med lokket,
// tenner den med fyrstikk, røyker (røyken siger ut over vakt-knappen) og legger den tilbake i lokket.
// Three.js lastes når appen åpnes (egen bit av bygget), og scenen bygges én gang. Uten WebGL vises den flate Sir Domeo.

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type * as T from 'three'
import { reduced } from './lib/motion.ts'

export type Mood = 'wave' | 'point' | 'wink' | 'cheer'
/** Det han gjør når han kommer til et nytt stopp. */
export type Move = 'tip' | 'hop' | 'flip' | 'twirl' | 'look' | 'dance' | 'shrug' | 'present' | 'watch' | 'pick' | 'nudge'
/** Peker med pekefingeren, eller viser frem med flat hånd. */
export type Hand = 'point' | 'palm'
/** Noe han skal peke på: piksler fra midten av lerretet, før lerretet skaleres. */
export type Aim = { x: number; y: number }

/** Størrelsen på lerretet (CSS-piksler). */
export const D3D_SIZE = 200
/** Piksler per enhet i 3D-scenen ved skala 1 – guiden bruker det til å plassere ham og sikte. */
export const D3D_PX = 58
/** Fra midten av lerretet: ned til skosålene, opp til håndtaket, og halve bredden (enheter). */
export const D3D_BODY = { feet: 0.6, head: 0.68, half: 0.9 }
/** Treffer et trykk ham selv (klokka og brettet)? x og y i piksler fra midten av lerretet, før skalering. */
export const onBody = (x: number, y: number) => Math.abs(x) < 0.78 * D3D_PX && y > -0.62 * D3D_PX && y < 0.2 * D3D_PX

// Små vaner han har når han venter (og fnisingen når du trykker på ham, og landingen når han kommer hjem til demolinjen)
type Habit = 'peek' | 'tilt' | 'chatter' | 'stache' | 'monocle' | 'polish' | 'giggle' | 'land'
/** En bevegelse eller en av vanene hans – alle kan brukes når han kommer til et nytt stopp. */
export type Action = Move | Habit
// Hvor lenge hver bevegelse varer (sekunder)
const DURATION: Record<Action, number> = {
  tip: 1.6,
  hop: 1.2,
  flip: 1,
  twirl: 1,
  look: 1.6,
  dance: 1.8,
  shrug: 1.3,
  present: 2.2,
  watch: 3.6,
  pick: 3.4,
  nudge: 0.6,
  peek: 1.4,
  tilt: 1.2,
  chatter: 0.8,
  stache: 2.2,
  monocle: 1.8,
  polish: 2.4,
  giggle: 0.9,
  land: 0.5,
}
// Når armen begynner å peke (sekunder etter at han kom frem) – noen bevegelser skal bli ferdige først
const POINT_AT: Partial<Record<Action, number>> = { hop: 0.95, dance: 1.45, present: 1.45, flip: 0.9, nudge: 0.2 }

/** En stavelse: når den begynner og hvor lenge den varer (sekunder), og hvor mye lokket åpner seg. */
type Syl = { at: number; d: number; a: number }
/** Avskjeden: hjem til demolinjen (flyr dit), eller bort (krymper og blekner) der demolinjen ikke syns. */
export type Leaving = false | 'home' | 'away'
type Live = {
  mood: Mood
  leaving: Leaving
  /** Når han begynte å gå (avskjeden). */
  leaveAt: number
  /** Spretter frem fra ingenting, eller kommer flygende (fra demolinjen) og trenger ikke sprette. */
  entrance: 'pop' | 'fly'
  action: Action
  actionAt: number
  /** Når han kom til stoppet, og bevegelsen han kom med – humøret (vinking, jubel, blunk) varer en stund etter det. */
  arriveAt: number
  arriveMove: Action
  nextIdle: number
  talkFrom: number
  talkTo: number
  /** Stavelsene i det han sier. */
  speech: Syl[]
  aims: Aim[]
  /** Når han minner deg på hvor du skal trykke, peker han dit i stedet for på det han forklarer. */
  remind: Aim[] | null
  hand: Hand
  pointFrom: number
  /** Han kaster et blikk dit du trykket (piksler fra midten av lerretet). */
  glance: { x: number; y: number; until: number }
  blinkNow: boolean
}
const newLive = (mood: Mood, move: Action, aims: Aim[] = [], hand: Hand = 'point'): Live => {
  const now = performance.now()
  return {
    mood,
    leaving: false,
    leaveAt: 0,
    entrance: 'pop',
    action: move,
    actionAt: now,
    arriveAt: now,
    arriveMove: move,
    nextIdle: now + 4000,
    talkFrom: 0,
    talkTo: 0,
    speech: [],
    aims,
    remind: null,
    hand,
    pointFrom: now,
    glance: { x: 0, y: 0, until: 0 },
    blinkNow: false,
  }
}

/** Stavelsene i en replikk: lokket åpner seg på vokalene, lukker seg mellom ordene, og han tar pauser ved komma og punktum. */
function syllables(text: string, maxMs: number): Syl[] {
  const out: Syl[] = []
  const max = maxMs / 1000
  let t = 0
  let i = 0
  if (max <= 0) return out
  for (const m of text.matchAll(/(\p{L}+|\d+)|([.!?…]+)|([,;:–—])/gu)) {
    if (m[1]) {
      const n = /\d/.test(m[1]) ? Math.min(3, m[1].length) : Math.max(1, (m[1].match(/[aeiouyæøåéèàáäöü]+/giu) ?? []).length)
      for (let j = 0; j < n; j++, i++) {
        const d = 0.12 + (i % 3) * 0.02
        // Første stavelse i ordet er trykksterk
        out.push({ at: t, d, a: (j === 0 ? 0.9 : 0.62) + ((i * 7) % 5) * 0.03 })
        t += d + 0.03
      }
      t += 0.06
    } else t += m[2] ? 0.38 : 0.18
    // Han stopper etter et ord – ved et punktum når det meste er sagt
    if (t >= max || (m[2] && t > max * 0.6)) break
  }
  return out
}

// Formen på klokka: radius, og litt lavere og grunnere enn en halvkule. PY er toppen av fatet.
const R = 0.76
const RY = 0.9
const RZ = 0.94
const PY = -0.18
// Armene: overarm og underarm (albue → midt i hånden)
const ARM_A = 0.28
const ARM_B = 0.29

/** Hånd: krumming per finger (pekefinger, langfinger, ringfinger, tommel), vridning og spredning. */
type Grip = { curl: [number, number, number, number]; twist: number; spread: number }
const RELAX: Grip = { curl: [0.4, 0.5, 0.6, 0.35], twist: 0, spread: 0 }
const POINT: Grip = { curl: [0, 1.75, 1.85, 1.1], twist: 0, spread: 0 }
const PALM: Grip = { curl: [0.05, 0.06, 0.1, -0.15], twist: Math.PI, spread: 0.14 }
const GRIP: Grip = { curl: [1.25, 1.35, 1.45, 0.9], twist: 0.4, spread: 0 }

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** Fjær med litt overskudd – gir etterslep i barten, kjedet og sløyfa, og et lite «sprett» når armen peker. */
class Spring {
  x = 0
  v = 0
  k: number
  c: number
  constructor(k: number, c: number) {
    this.k = k
    this.c = c
  }
  step(target: number, dt: number) {
    this.v += (this.k * (target - this.x) - this.c * this.v) * dt
    this.x += this.v * dt
    return this.x
  }
}

/** Lerretet: størrelse (CSS-piksler), piksler per enhet og hvilken høyde i scenen som er midt i bildet. */
type View = { w: number; h: number; px: number; y: number; home?: boolean }
const GUIDE: View = { w: D3D_SIZE, h: D3D_SIZE, px: D3D_PX, y: 0.02 }
/** Piksler per enhet hjemme i demolinjen – guiden bruker det når han flyr ut og hjem igjen. */
export const HOME_PX = 32
// Hjemme er han liten og rolig: ingen hopp, og tegnes 30 ganger i sekundet
const HOME: View = { w: 66, h: 48, px: HOME_PX, y: 0.04, home: true }

// ── Scenen bygges én gang og gjenbrukes hver gang han dukker opp: ingen ny WebGL-kontekst og ingen ny shader-kompilering ──
type Stage = { run: (L: Live, host: HTMLElement, view: View, smoke?: HTMLCanvasElement | null) => () => void }
let stage: Promise<Stage> | null = null
let stopActive = () => {}
// Han bor i demolinjen (DomeoHome) når han ikke er ute og viser deg rundt (Domeo3D). Det finnes bare ett lerret.
let home: { L: Live; host: HTMLElement; here: (on: boolean) => void; smoke: HTMLCanvasElement | null } | null = null
let guiding = 0
// Har han vært hjemme før? Da spretter han ikke frem igjen når demolinjen tegnes på nytt (språkbytte)
let homeSeen = false
/** Hjem til demolinjen – med en liten landing når han kommer flygende fra guiden. */
const backHome = (land: boolean) =>
  preloadDomeo()
    .then((st) => {
      if (!home || guiding) return
      const L = home.L
      L.entrance = land || homeSeen ? 'fly' : 'pop'
      homeSeen = true
      if (land) {
        L.action = 'land'
        L.actionAt = performance.now()
      }
      st.run(L, home.host, HOME, home.smoke)
      home.here(true)
    })
    .catch(() => {})
/** Begynn å bygge Sir Domeo i forkant (når appen åpnes), så han er klar når han skal frem. */
export function preloadDomeo() {
  if (!stage) {
    stage = build()
    stage.catch(() => {})
  }
  return stage
}

async function build(): Promise<Stage> {
  const THREE = await import('three')
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js')
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  renderer.setPixelRatio(dpr)
  renderer.setSize(D3D_SIZE, D3D_SIZE)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NeutralToneMapping

  const scene = new THREE.Scene()
  // Studiolys som speiler seg i sølvet
  const pmrem = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const env = pmrem.fromScene(room, 0.04).texture
  room.dispose()
  pmrem.dispose()
  scene.environment = env
  scene.environmentIntensity = 0.95
  // Kameraavstanden gir nøyaktig D3D_PX piksler per enhet i midten av scenen
  const dist = D3D_SIZE / D3D_PX / 2 / Math.tan((15 * Math.PI) / 180)
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50)
  camera.position.set(0, dist * Math.sin(0.14), dist * Math.cos(0.14))
  scene.add(new THREE.HemisphereLight(0xffffff, 0xf0d9de, 0.8))
  const sun = new THREE.DirectionalLight(0xffffff, 1.5)
  sun.position.set(-2.5, 3, 4)
  scene.add(sun)

  // ── Teksturer laget i koden ──
  const paint = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    draw(c.getContext('2d')!)
    const t = new THREE.CanvasTexture(c)
    if (srgb) t.colorSpace = THREE.SRGBColorSpace
    return t
  }
  // Iris: lys rundt pupillen, mørk mot kanten, med fine striper (toppen av bildet = midten av øyet)
  const irisTex = paint(128, 64, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 64)
    gr.addColorStop(0, '#C9904F')
    gr.addColorStop(0.45, '#8C5430')
    gr.addColorStop(0.85, '#5A321C')
    gr.addColorStop(1, '#26150C')
    g.fillStyle = gr
    g.fillRect(0, 0, 128, 64)
    for (let i = 0; i < 110; i++) {
      g.strokeStyle = Math.random() < 0.5 ? `rgba(255,214,160,${0.1 + Math.random() * 0.2})` : `rgba(40,20,10,${0.1 + Math.random() * 0.2})`
      const x = Math.random() * 128
      g.beginPath()
      g.moveTo(x, 6)
      g.lineTo(x + (Math.random() - 0.5) * 4, 60)
      g.stroke()
    }
  })
  // Hårstriper på barten og brynene (bare høyde – gir riller i lyset)
  const hairTex = paint(
    64,
    128,
    (g) => {
      g.fillStyle = '#808080'
      g.fillRect(0, 0, 64, 128)
      for (let y = 0; y < 128; y += 2) {
        const v = Math.round(80 + Math.random() * 130)
        g.fillStyle = `rgb(${v},${v},${v})`
        g.fillRect(0, y, 64, 1 + Math.round(Math.random()))
      }
    },
    false,
  )
  const radial = (stops: [number, string][]) =>
    paint(64, 64, (g) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
      for (const [o, c] of stops) gr.addColorStop(o, c)
      g.fillStyle = gr
      g.fillRect(0, 0, 64, 64)
    })
  const blushTex = radial([
    [0, 'rgba(255,128,160,0.85)'],
    [0.55, 'rgba(255,145,175,0.4)'],
    [1, 'rgba(255,160,185,0)'],
  ])
  // Myk skygge rundt øyet, så det ser ut som det sitter i klokka
  const socketTex = radial([
    [0, 'rgba(25,26,34,0)'],
    [0.56, 'rgba(25,26,34,0)'],
    [0.66, 'rgba(25,26,34,0.42)'],
    [1, 'rgba(25,26,34,0)'],
  ])

  // ── Materialer ──
  const phys = (o: T.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(o)
  const domeMat = phys({ color: '#FFFFFF', vertexColors: true, metalness: 0.85, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.08 })
  const silver = phys({ color: '#E9EBEF', metalness: 0.85, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.1 })
  const lidMat = phys({ color: '#E2E5EA', metalness: 0.85, roughness: 0.17, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide })
  const gold = phys({ color: '#F0C674', metalness: 0.9, roughness: 0.22, clearcoat: 0.6 })
  const fabric = phys({ color: '#302E33', roughness: 0.82, sheen: 0.7, sheenColor: new THREE.Color('#7A7882'), sheenRoughness: 0.6 })
  const satin = phys({ color: '#94284C', roughness: 0.42, sheen: 1, sheenColor: new THREE.Color('#E0668C'), sheenRoughness: 0.35, clearcoat: 0.25 })
  const patent = phys({ color: '#1B1A1E', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04 })
  const soleMat = phys({ color: '#0F0E11', roughness: 0.6 })
  const glove = phys({ color: '#FFFFFF', roughness: 0.5, sheen: 0.5, sheenColor: new THREE.Color('#FFFFFF') })
  const spatMat = phys({ color: '#F3F1EC', roughness: 0.75, sheen: 0.5, sheenColor: new THREE.Color('#FFFFFF') })
  const stitch = phys({ color: '#C9CAD2', roughness: 0.6 })
  const eyeWhite = phys({ color: '#FBFAF7', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03 })
  const irisMat = phys({ map: irisTex, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.03 })
  const pupilMat = phys({ color: '#120B08', roughness: 0.2, clearcoat: 1 })
  const hair = phys({ color: '#4A2A1C', roughness: 0.55, sheen: 0.8, sheenColor: new THREE.Color('#A0705A'), sheenRoughness: 0.45, bumpMap: hairTex, bumpScale: 1.2 })
  const shine = new THREE.MeshBasicMaterial({ color: '#FFFFFF' })
  const lash = phys({ color: '#2A2226', roughness: 0.4, clearcoat: 0.6 })
  const mouthMat = new THREE.MeshStandardMaterial({ color: '#8A2C3C', roughness: 0.85, side: THREE.BackSide })
  const decal = (map: T.Texture) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false })

  /** Et rør som følger en kurve, med tykkelse som varierer langs den, flatet litt ut mot overflaten (bart og bryn). */
  const sweep = (pts: T.Vector3[], radius: (t: number) => number, flat = 0.7, along = 56, around = 14) => {
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal')
    const pos: number[] = []
    const nor: number[] = []
    const uv: number[] = []
    const idx: number[] = []
    const P = new THREE.Vector3()
    const Tg = new THREE.Vector3()
    const B = new THREE.Vector3()
    const N = new THREE.Vector3()
    const out = new THREE.Vector3(0, 0, 1)
    for (let i = 0; i <= along; i++) {
      const t = i / along
      curve.getPointAt(t, P)
      curve.getTangentAt(t, Tg)
      B.crossVectors(Tg, out)
      if (B.lengthSq() < 1e-8) B.set(1, 0, 0)
      B.normalize()
      N.crossVectors(B, Tg).normalize()
      const r = radius(t)
      for (let k = 0; k <= around; k++) {
        const a = (k / around) * Math.PI * 2
        const c = Math.cos(a)
        const s = Math.sin(a)
        pos.push(P.x + B.x * c * r + N.x * s * r * flat, P.y + B.y * c * r + N.y * s * r * flat, P.z + B.z * c * r + N.z * s * r * flat)
        const nx = B.x * c * flat + N.x * s
        const ny = B.y * c * flat + N.y * s
        const nz = B.z * c * flat + N.z * s
        const l = Math.hypot(nx, ny, nz) || 1
        nor.push(nx / l, ny / l, nz / l)
        uv.push(t, k / around)
      }
    }
    for (let i = 0; i < along; i++)
      for (let k = 0; k < around; k++) {
        const a = i * (around + 1) + k
        const b = a + around + 1
        idx.push(a, b, a + 1, b, b + 1, a + 1)
      }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.setIndex(idx)
    return g
  }
  /** Et punkt i ansiktet (x til høyre, y opp) lagt på den buede klokka, litt løftet. */
  const onFace = (x: number, y: number, lift: number) => new THREE.Vector3(x, y, -(x * x) / (2 * R) - (y * y) / (2 * R * RY) + lift)

  // rig: posisjon og spinn · root: klem/strekk
  const rig = new THREE.Group()
  scene.add(rig)
  const root = new THREE.Group()
  rig.add(root)

  // ── Fatet: bredt brett med oppbrettet kant – underkjeven, med mørk munn og en liten tunge ──
  const plate = new THREE.Group()
  plate.position.y = PY
  root.add(plate)
  const profile = [
    [0, 0],
    [0.74, 0],
    [0.79, 0.015],
    [0.84, 0.05],
    [0.865, 0.05],
    [0.875, 0.032],
    [0.85, -0.008],
    [0.76, -0.04],
    [0.52, -0.07],
    [0, -0.07],
  ].map(([x, y]) => new THREE.Vector2(x, y))
  const tray = new THREE.Mesh(new THREE.LatheGeometry(profile, 80), silver)
  tray.scale.z = RZ
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R * 0.86, 48), new THREE.MeshStandardMaterial({ color: '#6E2230', roughness: 0.9 }))
  floor.rotation.x = -Math.PI / 2
  floor.scale.set(1, RZ, 1)
  floor.position.y = 0.003
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.19, 24, 16), new THREE.MeshStandardMaterial({ color: '#EE8592', roughness: 0.45 }))
  tongue.scale.set(1.1, 0.3, 0.9)
  tongue.position.set(0, 0.02, 0.26)
  plate.add(tray, floor, tongue)

  // Vinrød sløyfe foran på brettet: vingene er klemt inn mot knuten
  const bow = new THREE.Group()
  bow.position.set(0, -0.045, 0.835)
  plate.add(bow)
  const wingGeo = new THREE.SphereGeometry(0.075, 28, 18)
  {
    const p = wingGeo.attributes.position
    for (let i = 0; i < p.count; i++) {
      const k = 0.32 + 0.68 * Math.sin(((p.getX(i) + 0.075) / 0.15) * (Math.PI / 2))
      p.setY(i, p.getY(i) * k)
      p.setZ(i, p.getZ(i) * k * 0.5)
    }
    wingGeo.computeVertexNormals()
  }
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(wingGeo, satin)
    wing.position.x = s * 0.07
    if (s < 0) wing.rotation.y = Math.PI
    bow.add(wing)
  }
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.033, 16, 12), satin)
  knot.scale.set(1, 1.15, 0.8)
  bow.add(knot)

  // ── Lokket: hengslet bak, så det åpner seg som en munn. Tykt skall, så ingenting stikker inn i munnen. ──
  const hinge = new THREE.Group()
  hinge.position.set(0, PY, -R * RZ)
  root.add(hinge)
  const lid = new THREE.Group()
  lid.position.z = R * RZ
  hinge.add(lid)
  const domeGeo = new THREE.SphereGeometry(R, 80, 40, 0, Math.PI * 2, 0, Math.PI / 2)
  {
    const top = new THREE.Color('#FBFBFC')
    const bottom = new THREE.Color('#C2C6CE')
    const pos = domeGeo.attributes.position
    const col = new Float32Array(pos.count * 3)
    const c = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      c.copy(bottom).lerp(top, Math.pow(Math.max(0, pos.getY(i)) / R, 0.75))
      col.set([c.r, c.g, c.b], i * 3)
    }
    domeGeo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  }
  const dome = new THREE.Mesh(domeGeo, domeMat)
  dome.scale.set(1, RY, RZ)
  const inside = new THREE.Mesh(domeGeo, mouthMat)
  inside.scale.set(0.86, RY * 0.86, RZ * 0.86)
  const edge = new THREE.Mesh(new THREE.RingGeometry(R * 0.86, R, 80), silver)
  edge.rotation.x = Math.PI / 2
  edge.scale.set(1, RZ, 1)
  edge.position.y = 0.001
  const lip = new THREE.Mesh(new THREE.TorusGeometry(R, 0.03, 12, 90), silver)
  lip.rotation.x = Math.PI / 2
  lip.scale.set(1, RZ, 1)
  lip.position.y = 0.012
  lid.add(dome, inside, edge, lip)
  // Håndtaket: krage, hals og kule
  const top = R * RY
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.016, 10, 32), silver)
  collar.rotation.x = Math.PI / 2
  collar.position.y = top
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.05, 0.07, 20), silver)
  neck.position.y = top + 0.035
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.075, 28, 18), silver)
  ball.position.y = top + 0.11
  lid.add(collar, neck, ball)

  // Et punkt på klokka, vendt rett ut fra overflaten
  const onDome = (el: number, az: number, lift = 0) => {
    const p = new THREE.Vector3(R * Math.cos(el) * Math.sin(az), R * RY * Math.sin(el), R * RZ * Math.cos(el) * Math.cos(az))
    const n = new THREE.Vector3(p.x / (R * R), p.y / (R * RY * R * RY), p.z / (R * RZ * R * RZ)).normalize()
    const g = new THREE.Group()
    g.position.copy(p).addScaledVector(n, lift)
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n)
    lid.add(g)
    return g
  }

  // ── Øynene: senket inn i klokka, med øyelokk i sølv og myk skygge rundt ──
  const EYE = 0.135
  const eyes = [-1, 1].map((s) => {
    const anchor = onDome(0.53, s * 0.3)
    const socket = new THREE.Mesh(new THREE.PlaneGeometry(0.43, 0.45), decal(socketTex))
    socket.position.z = 0.004
    anchor.add(socket)
    const eye = new THREE.Group()
    eye.position.z = -0.055
    eye.scale.set(0.95, 1.06, 1)
    anchor.add(eye)
    // Øyeeplet (bare forsiden – baksiden ville stukket inn i munnen) med iris og pupill
    const look = new THREE.Group()
    eye.add(look)
    const cap = (r: number, angle: number, mat: T.Material) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 18, 0, Math.PI * 2, 0, angle), mat)
      m.rotation.x = Math.PI / 2
      look.add(m)
      return m
    }
    cap(EYE, 1.75, eyeWhite)
    cap(EYE * 1.004, 0.6, irisMat)
    cap(EYE * 1.008, 0.3, pupilMat)
    // Lysglimtet sitter fast mot lyset (oppe til venstre), uansett hvor han ser
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.017, 12, 8), shine)
    glint.position.set(-0.28, 0.4, 0.87).normalize().multiplyScalar(EYE * 1.02)
    glint.scale.z = 0.4
    eye.add(glint)
    // Øyelokkene: sølvskall foran på øyet med avrundet kant
    // Øvre lokk har en mørk vippekant, så blunk og «wink» syns tydelig
    const lidPart = (thetaStart: number, rimMat: T.Material, rimR: number) => {
      const g = new THREE.Group()
      g.add(new THREE.Mesh(new THREE.SphereGeometry(EYE * 1.07, 48, 16, 0, Math.PI, thetaStart, Math.PI / 2), lidMat))
      const rim = new THREE.Mesh(new THREE.TorusGeometry(EYE * 1.07, rimR, 8, 40, Math.PI), rimMat)
      rim.rotation.x = Math.PI / 2
      g.add(rim)
      eye.add(g)
      return g
    }
    const upper = lidPart(0, lash, 0.014)
    const lower = lidPart(Math.PI / 2, lidMat, 0.011)
    return { s, anchor, look, glint, upper, lower }
  })
  for (const s of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.16), decal(blushTex))
    onDome(0.3, s * 0.57, 0.012).add(cheek)
  }

  // Kraftige, buede bryn med hårstriper – tykkest innerst
  const brows = eyes.map(({ s }) => {
    const anchor = onDome(0.92, s * 0.27)
    const pivot = new THREE.Group()
    anchor.add(pivot)
    const xs = [-0.08, -0.04, 0.0, 0.045, 0.085]
    const ys = [-0.012, 0.009, 0.018, 0.01, -0.014]
    const r = (t: number) => 0.006 + 0.019 * (1 - 0.55 * t) * Math.sqrt(Math.sin(Math.PI * (0.05 + 0.9 * t)))
    const pts = xs.map((x, i) => onFace(s * x, ys[i], 0.012))
    pivot.add(new THREE.Mesh(sweep(pts, r, 0.6, 40, 12), hair))
    return { s, pivot }
  })

  // ── Barten: én skulpturert handlebar som smalner mot krøllede tupper. Hver halvdel fjærer for seg. ──
  const stache = onDome(0.13, 0)
  const halfPath: [number, number][] = [
    [0, 0],
    [0.05, -0.01],
    [0.1, -0.018],
    [0.145, -0.018],
    [0.185, -0.008],
    [0.215, 0.012],
    [0.232, 0.04],
    [0.228, 0.066],
    [0.21, 0.08],
    [0.19, 0.076],
    [0.18, 0.06],
    [0.188, 0.046],
    [0.202, 0.045],
  ]
  const stacheR = (t: number) => 0.006 + 0.04 * Math.pow(1 - t, 1.35) * (0.85 + 0.3 * Math.exp(-(((t - 0.15) / 0.12) ** 2)))
  const stacheHalves = [-1, 1].map((s) => {
    const pivot = new THREE.Group()
    stache.add(pivot)
    const pts = halfPath.map(([x, y], i) => onFace(s * x, y, stacheR(i / (halfPath.length - 1)) * 0.45))
    pivot.add(new THREE.Mesh(sweep(pts, stacheR, 0.7, 72, 16), hair))
    return { s, pivot }
  })
  const stacheKnot = new THREE.Mesh(new THREE.SphereGeometry(0.044, 20, 14), hair)
  stacheKnot.scale.set(1.15, 0.92, 0.62)
  stacheKnot.position.z = 0.012
  stache.add(stacheKnot)

  // ── Monokkel i gull på høyre øye, med en kjede som dingler fritt ──
  const mono = eyes[1].anchor
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.138, 0.014, 12, 56), gold)
  ring.position.z = 0.03
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.134, 40), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.13, depthWrite: false }))
  glass.position.z = 0.078
  const glassGlint = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.007, 6, 20, 0.9), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.75 }))
  glassGlint.rotation.z = 1.9
  glassGlint.position.z = 0.08
  mono.add(ring, glass, glassGlint)
  const chain = new THREE.Group()
  chain.position.set(Math.cos(-0.55) * 0.138, Math.sin(-0.55) * 0.138, 0.03)
  mono.add(chain)
  const chainPts = [
    [0, 0, 0],
    [0.02, -0.05, 0.012],
    [0.026, -0.11, 0.02],
    [0.014, -0.17, 0.022],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z))
  chain.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(chainPts), 24, 0.006, 6), gold))
  const fob = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 8), gold)
  fob.position.copy(chainPts[3])
  chain.add(fob)

  // ── Armene: frakkeermer, hvit skjortemansjett med mansjettknapp i gull, og hvite hansker med søm ──
  const arms = [-1, 1].map((s) => {
    const S = new THREE.Vector3(s * 0.66, PY + 0.02, 0.36)
    const joint = new THREE.Mesh(new THREE.SphereGeometry(0.052, 18, 12), silver)
    joint.position.copy(S)
    root.add(joint)
    const shoulder = new THREE.Group()
    shoulder.position.copy(S)
    root.add(shoulder)
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, ARM_A, 16), fabric)
    upper.position.y = -ARM_A / 2
    const elbow = new THREE.Group()
    elbow.position.y = -ARM_A
    shoulder.add(upper, elbow)
    elbow.add(new THREE.Mesh(new THREE.SphereGeometry(0.056, 16, 12), fabric))
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.2, 16), fabric)
    fore.position.y = -0.1
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 18), glove)
    cuff.position.y = -0.2
    const link = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), gold)
    link.position.set(s * 0.061, -0.2, 0)
    elbow.add(fore, cuff, link)
    // Hansken
    const hand = new THREE.Group()
    hand.position.y = -0.22
    elbow.add(hand)
    const flare = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.068, 0.04, 18), glove)
    flare.position.y = -0.016
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.08, 22, 16), glove)
    palm.scale.set(1, 1.05, 0.62)
    palm.position.y = -0.08
    hand.add(flare, palm)
    for (const x of [-0.02, 0, 0.02]) {
      const line = new THREE.Mesh(new THREE.CapsuleGeometry(0.0035, 0.045, 3, 6), stitch)
      line.position.set(x * 1.15, -0.08, 0.05)
      hand.add(line)
    }
    // Fingrene: pekefinger nærmest tommelen. Hver finger krummer seg om knoken.
    const fingers = [-s * 0.037, 0, s * 0.037].map((x) => {
      const knuckle = new THREE.Group()
      knuckle.position.set(x, -0.135, 0)
      const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.055, 4, 10), glove)
      f.position.y = -0.038
      knuckle.add(f)
      hand.add(knuckle)
      return knuckle
    })
    const thumb = new THREE.Group()
    thumb.position.set(-s * 0.066, -0.065, 0.005)
    const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.045, 4, 10), glove)
    th.position.y = -0.032
    thumb.add(th)
    hand.add(thumb)
    // Fjærene som gjør at hånden «spretter» frem når han peker
    const springs = [new Spring(160, 17), new Spring(160, 17), new Spring(160, 17)]
    return { s, S, shoulder, elbow, hand, fingers, thumb, springs, grip: { ...RELAX, curl: [...RELAX.curl] as Grip['curl'] }, ready: false }
  })

  // ── Beina: bukser med pressfold og knær, hvite gamasjer med knapper, og blankpussede lakksko ──
  const legs = [-1, 1].map((s) => {
    const hip = new THREE.Group()
    hip.position.set(s * 0.25, PY - 0.075, 0.03)
    root.add(hip)
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.13, 16), fabric)
    thigh.position.y = -0.065
    const knee = new THREE.Group()
    knee.position.y = -0.13
    hip.add(thigh, knee)
    knee.add(new THREE.Mesh(new THREE.SphereGeometry(0.058, 14, 10), fabric))
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.067, 0.12, 16), fabric)
    shin.position.y = -0.06
    const crease = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.12, 0.006), phys({ color: '#46444B', roughness: 0.7 }))
    crease.position.set(0, -0.06, 0.062)
    const spat = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.072, 0.05, 18), spatMat)
    spat.position.y = -0.135
    knee.add(shin, crease, spat)
    for (const y of [-0.124, -0.146]) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), stitch)
      b.position.set(s * 0.068, y, 0.012)
      knee.add(b)
    }
    const foot = new THREE.Group()
    foot.position.y = -0.165
    knee.add(foot)
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.095, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), patent)
    shoe.scale.set(1, 0.78, 1.6)
    shoe.position.z = 0.05
    const sole = new THREE.Mesh(new THREE.CylinderGeometry(0.097, 0.097, 0.022, 28), soleMat)
    sole.scale.z = 1.6
    sole.position.set(0, -0.008, 0.05)
    foot.add(shoe, sole)
    return { s, hip, knee, foot }
  })

  // ── Lommeuret: dukker opp i venstre hånd når han sjekker tiden ──
  const watch = new THREE.Group()
  watch.scale.setScalar(0.001)
  root.add(watch)
  const face = new THREE.Group()
  face.rotation.x = -0.35
  watch.add(face)
  const caseM = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.018, 32), gold)
  caseM.rotation.x = Math.PI / 2
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.05, 32), new THREE.MeshStandardMaterial({ color: '#FFFDF7', roughness: 0.4 }))
  dial.position.z = 0.0095
  const handMat = new THREE.MeshBasicMaterial({ color: '#2A1E1A' })
  const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.028, 0.002), handMat)
  hourHand.position.set(0.008, 0.01, 0.011)
  hourHand.rotation.z = -0.7
  const minHand = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.04, 0.002), handMat)
  minHand.position.set(-0.008, 0.016, 0.011)
  minHand.rotation.z = 0.5
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.016, 12), gold)
  crown.position.y = 0.07
  const bail = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.004, 6, 16), gold)
  bail.position.y = 0.087
  face.add(caseM, dial, hourHand, minHand, crown, bail)

  // Gnister som spruter ut av munnen når han presenterer
  const sparkColors = ['#FFD66B', '#FF9EBB', '#9FE3C6', '#FFC59E', '#A9D8FF']
  const sparks = Array.from({ length: 10 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.055), new THREE.MeshBasicMaterial({ color: sparkColors[i % sparkColors.length] }))
    m.visible = false
    root.add(m)
    const a = -1.1 + (i / 9) * 2.2
    return { m, vx: Math.sin(a) * 1.1, vy: 1.55 + (i % 3) * 0.28, vz: 0.35, delay: (i % 4) * 0.05 }
  })

  // ── Sigarstunden (hjemme i demolinjen): han tar en cubansk sigar ut av lokket, lukter på den, klipper tuppen
  //    med lokket (giljotinen hans), tenner den med fyrstikk, røyker – og legger den tilbake i lokket ──
  const glowTex = radial([
    [0, 'rgba(255,220,150,1)'],
    [0.3, 'rgba(255,150,60,0.55)'],
    [1, 'rgba(255,120,40,0)'],
  ])
  const glowSprite = (size: number) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, toneMapped: false }))
    sp.scale.setScalar(size)
    return sp
  }
  const CIG = 0.4
  const CIG_R = 0.042
  const leaf = phys({ color: '#6E4024', roughness: 0.72, sheen: 0.5, sheenColor: new THREE.Color('#B07A45'), bumpMap: hairTex, bumpScale: 0.5 })
  const cigar = new THREE.Group()
  root.add(cigar)
  /** En sylinder langs sigaren (fra hodet i x = 0 mot gloen). */
  const along = (m: T.Mesh, x: number) => {
    m.rotation.z = -Math.PI / 2
    m.position.x = x
    cigar.add(m)
    return m
  }
  along(new THREE.Mesh(new THREE.CylinderGeometry(CIG_R * 0.94, CIG_R, CIG, 20), leaf), CIG / 2)
  // Hodet – tuppen som klippes av – er rundt
  const cigCap = new THREE.Mesh(new THREE.SphereGeometry(CIG_R, 16, 10), leaf)
  cigCap.scale.x = 0.7
  cigar.add(cigCap)
  // Bandet: rødt med gullkanter, nær hodet
  along(new THREE.Mesh(new THREE.CylinderGeometry(CIG_R * 1.06, CIG_R * 1.06, 0.075, 20), gold), 0.1)
  along(new THREE.Mesh(new THREE.CylinderGeometry(CIG_R * 1.09, CIG_R * 1.09, 0.045, 20), phys({ color: '#B3122E', roughness: 0.35, clearcoat: 0.6 })), 0.1)
  // Asken og gloen i enden
  const ash = along(new THREE.Mesh(new THREE.CylinderGeometry(CIG_R * 0.9, CIG_R * 0.95, 1, 16), phys({ color: '#A8A39C', roughness: 0.95 })), CIG)
  const emberMat = new THREE.MeshBasicMaterial({ color: '#3A2214', toneMapped: false })
  const ember = new THREE.Mesh(new THREE.CircleGeometry(CIG_R * 0.92, 18), emberMat)
  ember.rotation.y = Math.PI / 2
  const emberGlow = glowSprite(0.22)
  cigar.add(ember, emberGlow)
  // Tuppen som faller ut av munnen når han klipper
  const capBit = new THREE.Mesh(new THREE.CylinderGeometry(CIG_R, CIG_R, 0.035, 14), leaf)
  root.add(capBit)
  // Fyrstikken: lys pinne, rødt hode, og en flamme som alltid står rett opp
  const match = new THREE.Group()
  root.add(match)
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.19, 8), phys({ color: '#E8D2A8', roughness: 0.8 }))
  stick.position.y = 0.095
  const headMat = phys({ color: '#B3261E', roughness: 0.6 })
  const matchHead = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 8), headMat)
  matchHead.scale.y = 1.3
  matchHead.position.y = 0.19
  const flame = new THREE.Group()
  flame.position.y = 0.2
  const flameOuter = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.11, 12), new THREE.MeshBasicMaterial({ color: '#FFB238', toneMapped: false }))
  flameOuter.position.y = 0.055
  const flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.06, 10), new THREE.MeshBasicMaterial({ color: '#FFF6C8', toneMapped: false }))
  flameCore.position.y = 0.035
  const flameGlow = glowSprite(0.34)
  flameGlow.position.y = 0.05
  flame.add(flameOuter, flameCore, flameGlow)
  match.add(stick, matchHead, flame)
  const hideProps = () => {
    cigar.visible = capBit.visible = match.visible = false
  }
  hideProps()
  const RED_HEAD = new THREE.Color('#B3261E')
  const BURNT = new THREE.Color('#2B1A14')
  const COLD = new THREE.Color('#3A2214')
  const HOT = new THREE.Color('#FF7A26')

  // Tidslinjen (sekunder). Armene når ikke hverandre, så høyre hånd gjør alt – og lokket er giljotinen.
  const RIT = 15
  const P = (x: number, y: number, z: number) => new THREE.Vector3(x, PY + y, z)
  const D = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).normalize()
  type Key = [number, T.Vector3]
  /** Myk bevegelse gjennom nøkkelpunkter. */
  const keyed = (keys: Key[], r: number, out: T.Vector3) => {
    if (r <= keys[0][0]) return out.copy(keys[0][1])
    for (let i = 1; i < keys.length; i++) {
      if (r > keys[i][0]) continue
      const [ta, a] = keys[i - 1]
      const [tb, b] = keys[i]
      const k = (r - ta) / (tb - ta || 1)
      return out.lerpVectors(a, b, k * k * (3 - 2 * k))
    }
    return out.copy(keys[keys.length - 1][1])
  }
  /** Mykt vindu: 1 mellom a og b, med glidende kanter. */
  const win = (r: number, a: number, b: number, f = 0.15) => clamp((r - a + f) / f, 0, 1) * clamp((b + f - r) / f, 0, 1)
  const MOUTH = P(0.22, 0.03, 0.66) // munnviken til høyre, der sigaren sitter
  const DIR_M = D(0.82, 0.12, 0.56)
  const HOLD_AT = 0.26 // hvor langt fra hodet han holder den
  const MG = MOUTH.clone().addScaledVector(DIR_M, HOLD_AT)
  const FOOT_M = MOUTH.clone().addScaledVector(DIR_M, CIG)
  const HAND_OFF = new THREE.Vector3(0, 0.035, 0.012) // hånden ligger litt over sigaren
  const MGH = MG.clone().add(HAND_OFF)
  const REST_R = P(0.84, -0.24, 0.52)
  const LIGHT_DIR = D(-0.4, 0.85, -0.15)
  const LIGHT_HAND = FOOT_M.clone().addScaledVector(DIR_M, 0.035).addScaledVector(LIGHT_DIR, -0.21)
  // Sigaren i hånden: hvor han holder den, og hvilken vei den peker (fra hodet mot gloen)
  const cigGrip: Key[] = [
    [0.55, P(0.4, 0.07, 0.66)],
    [0.95, P(0.5, 0.1, 0.8)],
    [1.3, P(0.5, 0.16, 0.82)],
    [1.6, P(0.4, 0.07, 0.84)],
    [2.0, P(0.3, 0.07, 0.84)],
    [2.35, P(0.4, 0.07, 0.84)],
    [2.75, MG],
    [3.15, MG],
    [3.45, MG.clone().add(new THREE.Vector3(0.05, 0, 0.07))],
    [3.75, MG],
    [9.2, MG],
    [9.6, P(0.66, 0, 0.7)],
    [10.0, P(0.66, 0.02, 0.7)],
    [10.4, MG],
    [12.5, MG],
    [12.9, P(0.5, 0.2, 0.8)],
    [13.3, P(0.4, 0.12, 0.7)],
    [13.55, P(0.34, 0.1, 0.6)],
  ]
  const cigDir: Key[] = [
    [0.55, D(0.55, 0, 0.83)],
    [0.95, D(0.7, 0.1, 0.7)],
    [1.3, D(1, 0.12, 0.08)],
    [1.6, D(1, 0, -0.05)],
    [2.35, D(1, 0, -0.05)],
    [2.75, DIR_M],
    [9.2, DIR_M],
    [9.6, D(0.85, 0.45, 0.25)],
    [10.0, D(0.85, 0.45, 0.25)],
    [10.4, DIR_M],
    [12.5, DIR_M],
    [12.9, D(0.6, 0.2, 0.75)],
    [13.3, D(0.55, 0.1, 0.83)],
  ]
  // Høyre hånd når den ikke holder sigaren: inn i lokket, stryker fyrstikken mot fatkanten, tenner, rister den ut og kaster den
  const handKeys: Key[] = [
    [0, REST_R],
    [0.5, P(0.42, 0.11, 0.68)],
    [0.55, P(0.4, 0.105, 0.672)],
    [4.0, MGH],
    [4.35, P(0.92, 0.04, 0.2)],
    [4.45, P(0.92, 0.04, 0.2)],
    [4.62, P(0.92, 0.04, 0.52)],
    [5.0, LIGHT_HAND],
    [6.45, LIGHT_HAND],
    [6.55, P(0.8, -0.04, 0.74)],
    [6.95, P(0.8, -0.04, 0.74)],
    [7.05, P(0.97, 0.1, 0.5)],
    [7.6, REST_R],
    [9.0, REST_R],
    [9.2, MGH],
    [10.4, MGH],
    [10.8, REST_R],
    [12.25, REST_R],
    [12.5, MGH],
    [13.55, P(0.36, 0.13, 0.62)],
    [14.3, REST_R],
  ]
  const matchDir: Key[] = [
    [4.1, D(-0.3, -0.8, 0.2)],
    [4.35, D(-0.55, -0.45, 0.25)],
    [4.62, D(-0.55, -0.45, 0.25)],
    [5.0, LIGHT_DIR],
    [6.45, LIGHT_DIR],
    [6.55, D(-0.1, 1, 0)],
    [7.05, D(0.3, 0.9, 0.2)],
  ]
  /** Hvor sigaren er: 0 borte (i lokket), 1 i hånden, 2 i munnviken. */
  const cigState = (r: number) => (r < 0.55 || r >= 13.55 ? 0 : r < 4 || (r >= 9.2 && r < 10.4) || r >= 12.5 ? 1 : 2)
  /** Gloen: tennes, og blir sterkere når han drar inn. */
  const heatAt = (r: number) =>
    r < 5.4 || r >= 13.55 ? 0 : clamp((r - 5.4) / 0.9, 0, 1) * (0.5 + 0.5 * Math.min(1, win(r, 7.8, 8.3, 0.2) + win(r, 11, 11.5, 0.2) + 0.6 * win(r, 5.6, 6.4, 0.2)))
  const ashAt = (r: number) => (r < 6.5 ? 0 : 0.075 * clamp((r - 6.5) / 6, 0, 1))
  /** Han puster ut: én gang med sigaren i munnen, én med den i hånden, og én til. */
  const exhaleAt = (r: number) => win(r, 8.35, 8.85, 0.12) + win(r, 9.75, 10.15, 0.12) + win(r, 11.55, 12.05, 0.12)
  const UP = new THREE.Vector3(0, 1, 0)
  const XAX = new THREE.Vector3(1, 0, 0)
  const tmpA = new THREE.Vector3()
  const tmpB = new THREE.Vector3()
  const handPos = new THREE.Vector3()
  const EXHALE_AT = P(0.06, 0.04, 0.72)
  const LID_AT = P(0, 0.05, 0.74)
  // Røyken tegnes på et eget lerret i demolinjen (2D): myke dotter som siger ut over vakt-knappen
  const puffImg = document.createElement('canvas')
  puffImg.width = puffImg.height = 64
  {
    const g = puffImg.getContext('2d')!
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    gr.addColorStop(0, 'rgba(240,234,228,1)')
    gr.addColorStop(0.5, 'rgba(232,226,220,0.45)')
    gr.addColorStop(1, 'rgba(230,224,218,0)')
    g.fillStyle = gr
    g.fillRect(0, 0, 64, 64)
  }

  // ── Løsning for armene: skulder og albue som når frem til et punkt, med albuen mot en «stang» ──
  const DOWN = new THREE.Vector3(0, -1, 0)
  const v1 = new THREE.Vector3()
  const v2 = new THREE.Vector3()
  const v3 = new THREE.Vector3()
  const axis = new THREE.Vector3()
  const qInv = new THREE.Quaternion()
  const reach = (arm: (typeof arms)[number], target: T.Vector3, pole: T.Vector3) => {
    const d = v1.subVectors(target, arm.S)
    const len = d.length() || 1
    const u = d.divideScalar(len)
    const dist = clamp(len, 0.05, ARM_A + ARM_B - 0.002)
    const g = Math.acos(clamp((ARM_A * ARM_A + dist * dist - ARM_B * ARM_B) / (2 * ARM_A * dist), -1, 1))
    axis.crossVectors(u, pole)
    if (axis.lengthSq() < 1e-8) axis.set(0, 0, 1)
    axis.normalize()
    const upperDir = v2.copy(u).applyAxisAngle(axis, g)
    arm.shoulder.quaternion.setFromUnitVectors(DOWN, upperDir)
    // Fra albuen mot målet, uttrykt i skulderens retning
    const elbowAt = v3.copy(arm.S).addScaledVector(upperDir, ARM_A)
    const foreDir = elbowAt.negate().add(arm.S).addScaledVector(u, dist).normalize()
    qInv.copy(arm.shoulder.quaternion).invert()
    arm.elbow.quaternion.setFromUnitVectors(DOWN, foreDir.applyQuaternion(qInv))
  }

  const ease = (x: number) => 1 - Math.pow(1 - x, 3)
  const easeBack = (x: number) => 1 + 2.4 * Math.pow(x - 1, 3) + 1.4 * Math.pow(x - 1, 2)
  const bell = (x: number) => Math.sin(Math.PI * clamp(x, 0, 1))
  const mix = (a: number, b: number, k: number) => a + (b - a) * k
  const habits: Habit[] = ['stache', 'monocle', 'polish', 'peek', 'tilt', 'chatter']
  // Hjemme i demolinjen: de rolige vanene (ingen prat)
  const homeHabits: Habit[] = ['stache', 'monocle', 'polish', 'peek', 'tilt']
  // Ønsket mål for hendene denne rammen (i root-rommet)
  const want = arms.map(() => ({ target: new THREE.Vector3(), pole: new THREE.Vector3(), grip: RELAX, wrist: 0 }))
  const aimPoint = new THREE.Vector3()
  const pose = (i: number, x: number, y: number, z: number, grip: Grip, wrist = 0, pole: [number, number, number] = [1, -0.4, -0.6]) => {
    const s = arms[i].s
    want[i].target.set(s * x, PY + y, z)
    want[i].pole.set(s * pole[0], pole[1], pole[2])
    want[i].grip = grip
    want[i].wrist = wrist
  }
  /** Overflaten av klokka foran (z) i en gitt høyde og bredde – til å pusse den. */
  const domeZ = (x: number, y: number) => RZ * R * Math.sqrt(Math.max(0, 1 - (x / R) ** 2 - (y / (R * RY)) ** 2))

  // Shaderne kompileres uten å låse siden (der nettleseren kan), så han ikke hakker når han dukker opp
  try {
    await renderer.compileAsync(scene, camera)
  } catch {
    // Da kompileres de ved første bilde
  }
  // Mister nettleseren WebGL-konteksten (f.eks. i bakgrunnen på iOS), bygges han på nytt neste gang
  renderer.domElement.addEventListener('webglcontextlost', () => {
    stage = null
  })

  const run = (L: Live, host: HTMLElement, view: View, smoke: HTMLCanvasElement | null = null) => {
    stopActive()
    // Lerretet tilpasses: samme kameraavstand, så han ser lik ut hjemme og ute – bare mindre
    renderer.setSize(view.w, view.h)
    camera.fov = (2 * Math.atan(view.h / view.px / 2 / dist) * 180) / Math.PI
    camera.aspect = view.w / view.h
    camera.lookAt(0, view.y, 0)
    camera.updateProjectionMatrix()
    host.appendChild(renderer.domElement)
    let drawn = false
    hideProps()
    // Sigarstunden: 5 s etter at han kom hjem, og så hvert 30. sekund (15 s med sigar, 15 s pause)
    const ritFrom = performance.now() + 5000
    let propsOn = false
    // Røyken: myke dotter på et 2D-lerret som dekker demolinjen fra ham og ut til vakt-knappen
    type Puff = { x: number; y: number; vx: number; vmin: number; vy: number; r: number; grow: number; age: number; life: number; a: number; seed: number }
    const sctx = view.home ? (smoke?.getContext('2d') ?? null) : null
    const puffs: Puff[] = []
    const acc: Record<string, number> = {}
    const sdpr = Math.min(window.devicePixelRatio || 1, 2)
    let sw = 0
    let sh = 0
    let sTop = 0
    let fitAt = 0
    let smokeDirty = false
    const fitSmoke = () => {
      const ctl = host.closest('.demo-ctl')
      if (!smoke || !ctl) return
      const H = host.getBoundingClientRect()
      const C = ctl.getBoundingClientRect()
      // Røyken går ut over vakt-knappen, og ikke lenger (etter vakten: ut over Emma og Kari)
      const end = (ctl.querySelector("[data-guide='start']") ?? ctl.querySelector('.role-switch'))?.getBoundingClientRect()
      const w = Math.max(view.w, Math.round((end ? end.right : H.right) - H.left))
      const h = Math.max(view.h, Math.round(C.height))
      sTop = Math.round(C.top - H.top)
      if (w !== sw || h !== sh) {
        sw = w
        sh = h
        smoke.width = w * sdpr
        smoke.height = h * sdpr
        smoke.style.width = `${w}px`
        smoke.style.height = `${h}px`
      }
      smoke.style.top = `${sTop}px`
    }
    type PuffKind = { r: number; grow: number; vx: number; vmin: number; vy: number; life: number; a: number; spread?: number }
    /** Ny røykdott fra et punkt i scenen (verdenskoordinater). */
    const emit = (world: T.Vector3, o: PuffKind) => {
      if (!sctx || puffs.length > 90) return
      world.project(camera)
      const j = o.spread ?? 0.3
      puffs.push({
        x: ((world.x + 1) / 2) * view.w,
        y: ((1 - world.y) / 2) * view.h - sTop,
        vx: o.vx * (1 + (Math.random() - 0.5) * j),
        vmin: o.vmin,
        vy: o.vy + (Math.random() - 0.5) * 6 * j,
        r: o.r,
        grow: o.grow * (1 + (Math.random() - 0.5) * j),
        age: 0,
        life: o.life,
        a: o.a,
        seed: Math.random() * 6,
      })
      smokeDirty = true
    }
    const every = (key: string, sec: number, dt: number) => {
      acc[key] = (acc[key] ?? 0) + dt
      if (acc[key] < sec) return false
      acc[key] -= sec
      return true
    }
    const still = reduced()
    const t0 = performance.now()
    let last = t0
    let raf = 0
    let nextBlink = t0 + 2500
    let blinkAt = -1
    let saccadeAt = t0
    const saccade = { x: 0, y: 0 }
    let prevY = 0
    let prevX = 0
    // Hvor han er på skjermen, og hvor fort han flyr (piksler per sekund)
    let sx: number | null = null
    let sy = 0
    let svx = 0
    let svy = 0
    const springs = {
      gazeX: new Spring(220, 26),
      gazeY: new Spring(220, 26),
      stacheL: new Spring(90, 7),
      stacheR: new Spring(90, 7),
      chain: new Spring(40, 3.5),
      bow: new Spring(70, 6),
    }
    // Armene og hendene starter fra hvilestilling hver gang
    arms.forEach((arm) => {
      arm.ready = false
      arm.grip = { ...RELAX, curl: [...RELAX.curl] as Grip['curl'] }
    })

    // Han kaster et blikk dit du trykker – og fniser hvis du trykker på ham.
    // Trykket går videre til det som ligger under ham, så appens knapper alltid virker.
    let pokedAt = 0
    const onDown = (e: PointerEvent) => {
      if (still || L.leaving) return
      const r = host.getBoundingClientRect()
      const s = (r.width / view.w) * (view.px / D3D_PX) || 1
      const x = (e.clientX - (r.left + r.width / 2)) / s
      const y = (e.clientY - (r.top + r.height / 2)) / s
      const now = performance.now()
      if (!onBody(x, y)) {
        L.glance = { x, y, until: now + 1200 }
        return
      }
      if (view.home || now - pokedAt < 1000) return
      pokedAt = now
      L.action = 'giggle'
      L.actionAt = now
      L.nextIdle = Math.max(L.nextIdle, now + 4000)
    }
    window.addEventListener('pointerdown', onDown, true)

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      // Hjemme holder 30 bilder i sekundet, og står han stille (redusert bevegelse), holder ett
      if (view.home && (now - last < 30 || (still && drawn))) return
      const dt = Math.min(0.05, (now - last) / 1000) || 0.016
      last = now
      const t = (now - t0) / 1000
      const talking = !still && !L.leaving && now >= L.talkFrom && now < L.talkTo
      // Sigarstunden (bare hjemme i demolinjen) – vanene venter så lenge
      const rc = now - ritFrom
      const rit = view.home && !still && !L.leaving && rc >= 0 && rc % 30000 < RIT * 1000 ? (rc % 30000) / 1000 : -1
      if (rit >= 0) L.nextIdle = Math.max(L.nextIdle, now + 2500)
      // Små vaner når han venter: snurrer barten, retter på monokkelen, pusser klokka, titter, vipper, klaprer
      if (!still && now > L.nextIdle && !L.leaving && !talking && rit < 0) {
        const list = view.home ? homeHabits : habits
        L.action = list[Math.floor(Math.random() * list.length)]
        L.actionAt = now
        L.nextIdle = now + DURATION[L.action] * 1000 + (view.home ? 6000 + Math.random() * 6000 : 4500 + Math.random() * 4000)
      }
      const p = still ? 1 : Math.min(1, (now - L.actionAt) / 1000 / DURATION[L.action])
      const acting = p < 1 && rit < 0
      const tp = (now - L.pointFrom) / 1000
      // Peking: først pekefinger (med to små prikk), så en rolig flat hånd mot knappen, så hvile.
      // Minner han deg på hvor du skal trykke, peker han dit – alltid med pekefingeren.
      const aims = L.remind ?? L.aims
      const pointing = aims.length > 0 && !L.leaving && tp >= 0 && tp < 4.6
      const phaseA = pointing && tp < 2.4 && (L.hand === 'point' || !!L.remind)
      // «pick» peker på hvert mål etter tur
      const per = Math.min(1.1, 3.3 / Math.max(1, aims.length))
      const ai = (L.action === 'pick' || L.remind) && tp < 3.3 ? Math.floor(Math.max(0, tp) / per) % aims.length : 0

      // Humøret varer en stund etter at han kom til stoppet: han vinker, jubler eller blunker – så roer han seg
      const since = (now - L.arriveAt) / 1000
      const after = DURATION[L.arriveMove]
      const lasting = (len: number) => (still ? 0 : clamp(since / 0.3, 0, 1) * clamp((after + len - since) / 0.4, 0, 1))
      const waveK = L.mood === 'wave' ? lasting(2) : 0
      const cheerK = L.mood === 'cheer' ? lasting(1.6) : 0

      // Flyturen mellom stoppene: farten måles på skjermen, så han følger guidens egen bevegelse (også overskuddet når han lander)
      const box = host.getBoundingClientRect()
      const bx = box.left + box.width / 2
      const by = box.top + box.height / 2
      if (sx !== null) {
        // Store hopp (siden byttet, eller han ble plassert) er ikke fart
        const ok = Math.abs(bx - sx) < 120 && Math.abs(by - sy) < 120
        const k = 1 - Math.exp(-dt * 14)
        svx = mix(svx, ok ? (bx - sx) / dt : 0, k)
        svy = mix(svy, ok ? (by - sy) / dt : 0, k)
      }
      sx = bx
      sy = by
      const fx = still ? 0 : clamp(svx / 900, -1, 1)
      const fy = still ? 0 : clamp(svy / 900, -1, 1)

      // Grunnstilling: svev, vugg og pust
      let x = 0
      let y = still ? 0 : Math.sin(t * 2.2) * 0.06
      let yaw = still ? 0 : Math.sin(t * 1.3) * (pointing ? 0.08 : 0.22)
      let pitch = 0
      let roll = still ? 0 : Math.sin(t * 1.7) * 0.04
      let squashY = 1 + (still ? 0 : Math.sin(t * 2.2 + 1) * 0.015)
      let legKick = 0
      // Ansiktet: øyelokk (1 = helt åpent, -1 = lukket), bryn og blikk
      const up = [0.64, 0.64]
      const lo = [-0.92, -0.92]
      let browUp = 0
      let browWorry = 0
      let browRight = 0
      let gx = saccade.x
      let gy = saccade.y
      let smile = 0
      // Ett blunk etter at han har gjort entréen sin
      let wink = L.mood === 'wink' && !acting && since > after && since < after + 1.4
      let happy = L.mood === 'cheer'
      // Lokket: vinkel (åpner seg som en munn) og løft rett opp
      let open = 0
      let lift = 0
      let watchShow = 0

      // Armene: hvile med hendene litt ut og frem – vinker eller jubler en stund når han kommer
      pose(0, 0.84, -0.24, 0.52, RELAX)
      pose(1, 0.84, -0.24, 0.52, RELAX)
      const raised = (k: number): [number, number, number] => [1, mix(-0.4, -1, k), mix(-0.6, -0.2, k)]
      if (waveK > 0) {
        const w = Math.sin(t * 8)
        pose(1, mix(0.84, 1.08 + w * 0.05, waveK), mix(-0.24, 0.62, waveK), mix(0.52, 0.38, waveK), waveK > 0.4 ? PALM : RELAX, w * 0.35 * waveK, raised(waveK))
      }
      if (cheerK > 0) {
        pose(0, mix(0.84, 1.02, cheerK), mix(-0.24, 0.66, cheerK), mix(0.52, 0.34, cheerK), cheerK > 0.4 ? PALM : RELAX, Math.sin(t * 9 + 1.5) * 0.3 * cheerK, raised(cheerK))
        pose(1, mix(0.84, 1.02, cheerK), mix(-0.24, 0.66, cheerK), mix(0.52, 0.34, cheerK), cheerK > 0.4 ? PALM : RELAX, Math.sin(t * 9) * 0.3 * cheerK, raised(cheerK))
      }

      if (talking) {
        // Stavelser: lokket åpner seg på vokalene i det han sier og lukker seg mellom ordene – brynene, barten og et lite nikk følger med
        const k = (now - L.talkFrom) / 1000
        let syl: number
        if (L.speech.length) {
          const s = L.speech.find((s) => k >= s.at && k < s.at + s.d)
          syl = s ? Math.sin((Math.PI * (k - s.at)) / s.d) * s.a : 0
        } else syl = Math.max(0, Math.sin(k * 16)) * (0.55 + 0.45 * Math.sin(k * 5.3 + 1))
        open = 0.03 + syl * 0.3
        lift = syl * 0.02
        browUp = syl * 0.012
        pitch += syl * 0.035
      } else if (cheerK > 0) {
        open = Math.abs(Math.sin(t * 9)) * 0.2 * cheerK
      }
      // Små blikkhopp når han ikke ser på noe bestemt
      if (!still && now > saccadeAt) {
        saccade.x = (Math.random() - 0.5) * 0.24
        saccade.y = (Math.random() - 0.5) * 0.14
        saccadeAt = now + 900 + Math.random() * 1700
      }

      if (acting) {
        switch (L.action) {
          case 'tip': {
            // Letter på lokket som en gentleman letter på hatten, hilser og blunker
            const k = bell(p)
            pose(1, mix(0.84, 0.72, k), mix(-0.24, 0.6, k), mix(0.52, 0.42, k), PALM, 0, [1, -1, -0.3])
            lift = Math.max(lift, k * 0.16)
            open = Math.max(open, k * 0.3)
            pitch = k * 0.12
            wink = wink || k > 0.35
            browRight = k * 0.025
            up[1] = mix(0.5, 0.2, k)
            break
          }
          case 'hop': {
            // To hopp med klem og bøyde knær før og etter, armene opp i luften
            const q = (p * 2) % 1
            const air = q > 0.2 && q < 0.85 ? bell((q - 0.2) / 0.65) : 0
            y += air * 0.5
            squashY = q < 0.2 ? 1 - bell(q / 0.2) * 0.18 : q > 0.85 ? 1 - bell((q - 0.85) / 0.15) * 0.15 : 1 + air * 0.08
            if (air > 0) {
              pose(0, mix(0.84, 1.12, air), mix(-0.24, 0.32, air), 0.3, RELAX)
              pose(1, mix(0.84, 1.12, air), mix(-0.24, 0.32, air), 0.3, RELAX)
            }
            legKick = air
            open = Math.max(open, air * 0.25)
            browUp = Math.max(browUp, air * 0.025)
            up[0] = up[1] = mix(0.5, 0.95, air)
            break
          }
          case 'flip': {
            // Salto bakover med sats og landing
            const air = p > 0.15 && p < 0.85 ? (p - 0.15) / 0.7 : p >= 0.85 ? 1 : 0
            y += bell(air) * 0.5
            pitch = -ease(air) * Math.PI * 2
            squashY = p < 0.15 ? 1 - bell(p / 0.15) * 0.2 : p > 0.85 ? 1 - bell((p - 0.85) / 0.15) * 0.18 : 1
            pose(0, 1.05, mix(-0.24, 0.55, bell(air)), 0.3, RELAX)
            pose(1, 1.05, mix(-0.24, 0.55, bell(air)), 0.3, RELAX)
            legKick = bell(air)
            open = Math.max(open, bell(air) * 0.35)
            up[0] = up[1] = mix(0.5, 0.95, bell(air))
            break
          }
          case 'twirl': {
            // Piruett med armene ut og et lite hopp
            yaw += ease(p) * Math.PI * 2
            y += bell(p) * 0.25
            pose(0, mix(0.84, 1.25, bell(p)), mix(-0.24, 0.08, bell(p)), 0.3, PALM)
            pose(1, mix(0.84, 1.25, bell(p)), mix(-0.24, 0.08, bell(p)), 0.3, PALM)
            happy = happy || bell(p) > 0.3
            break
          }
          case 'look':
          case 'peek': {
            // Ser til siden og tilbake – øynene først, så hodet
            const k = Math.sin(p * Math.PI * 2) * bell(p)
            yaw += k * (L.action === 'look' ? 0.6 : 0.35)
            gx = k * 0.45
            roll += k * 0.06
            browUp = Math.max(browUp, Math.abs(k) * 0.015)
            break
          }
          case 'dance': {
            // Fra side til side med armene i takt, lokket klaprer
            const beat = Math.sin(p * Math.PI * 6)
            x = beat * 0.22 * bell(p)
            roll = -beat * 0.22 * bell(p)
            y += Math.abs(beat) * 0.12
            pose(0, 1.02, mix(-0.24, 0.62, Math.max(0, beat)), 0.36, PALM)
            pose(1, 1.02, mix(-0.24, 0.62, Math.max(0, -beat)), 0.36, PALM)
            legKick = Math.abs(beat) * 0.6
            open = Math.max(open, Math.abs(beat) * 0.22)
            happy = true
            break
          }
          case 'shrug': {
            // «Hmm, ikke ferdig ennå» – håndflatene opp, bekymrede bryn og hodet på skakke
            const k = bell(p)
            pose(0, mix(0.84, 1.06, k), mix(-0.24, 0.06, k), mix(0.52, 0.55, k), k > 0.2 ? PALM : RELAX, 0, [1, -0.8, -0.2])
            pose(1, mix(0.84, 1.06, k), mix(-0.24, 0.06, k), mix(0.52, 0.55, k), k > 0.2 ? PALM : RELAX, 0, [1, -0.8, -0.2])
            squashY = 1 - k * 0.08
            roll = k * 0.16
            open = Math.max(open, k * 0.14)
            browWorry = k
            up[0] = up[1] = mix(0.5, 0.65, k)
            break
          }
          case 'present': {
            // Bukker, spretter opp og løfter lokket som en hatt: «Voilà!» – gnister spruter ut av fatet. Så viser han frem med hendene.
            // Lokket vippes bare litt bakover, så ansiktet hans syns hele tiden.
            const crouch = p < 0.2 ? bell(p / 0.2) : 0
            const lifted = p < 0.2 ? 0 : p < 0.4 ? easeBack((p - 0.2) / 0.2) : p < 0.78 ? 1 : 1 - ease((p - 0.78) / 0.22)
            squashY = 1 - crouch * 0.15 + (p > 0.2 && p < 0.45 ? bell((p - 0.2) / 0.25) * 0.08 : 0)
            pitch = crouch * 0.18
            y += lifted * 0.12 + (p > 0.4 && p < 0.78 ? Math.sin(((p - 0.4) / 0.38) * Math.PI * 3) * 0.02 : 0)
            lift = Math.max(lift, lifted * 0.36)
            open = Math.max(open, lifted * 0.3)
            if (lifted > 0.05) {
              pose(0, mix(0.84, 1.1, lifted), mix(-0.24, 0.5, lifted), 0.45, PALM, 0, [1, -1, -0.2])
              pose(1, mix(0.84, 1.1, lifted), mix(-0.24, 0.5, lifted), 0.45, PALM, 0, [1, -1, -0.2])
            }
            happy = happy || lifted > 0.3
            browUp = Math.max(browUp, lifted * 0.03)
            break
          }
          case 'watch': {
            // Sjekker lommeuret med venstre hånd mens høyre peker
            const k = clamp((tp - 0.8) / 0.4, 0, 1) * clamp((3.4 - tp) / 0.4, 0, 1)
            watchShow = k
            if (k > 0) pose(0, 0.62, 0.2, 0.7, GRIP, 0, [1, -0.6, -0.4])
            if (tp > 1.25 && tp < 2.6) {
              gx = -0.32
              gy = 0.3
              up[0] = up[1] = 0.32
              browUp = Math.max(browUp, 0.012)
            }
            break
          }
          case 'stache': {
            // Snurrer barten mellom fingrene – fornøyd, med halvt lukkede øyne
            const k = bell(p)
            const a = t * 9
            pose(1, mix(0.84, 0.33 + Math.cos(a) * 0.018, k), mix(-0.24, 0.09 + Math.sin(a) * 0.018, k), mix(0.52, 0.74, k), GRIP, 0, [1, -0.6, -0.2])
            up[0] = up[1] = mix(0.5, 0.18, k)
            browRight = k * 0.02
            smile = k
            break
          }
          case 'monocle': {
            // Retter på monokkelen: myser med det andre øyet
            const k = bell(p)
            pose(1, mix(0.84, 0.36, k), mix(-0.24, 0.36, k), mix(0.52, 0.68, k), GRIP, 0, [1, -0.6, -0.2])
            up[1] = mix(0.5, 0.9, k)
            up[0] = mix(0.5, 0.15, k)
            browRight = k * 0.03
            break
          }
          case 'polish': {
            // Pusser klokka med hansken i små sirkler
            const k = bell(p)
            const a = t * 10
            const px = 0.53 + Math.cos(a) * 0.045 * k
            const py = 0.17 + Math.sin(a) * 0.035 * k
            pose(0, mix(0.84, px, k), mix(-0.24, py, k), mix(0.52, domeZ(px, py) + 0.07, k), PALM, 0, [1, -0.8, -0.2])
            happy = happy || k > 0.4
            break
          }
          case 'tilt': {
            roll += bell(p) * 0.2
            gx = bell(p) * 0.15
            browWorry = bell(p) * 0.5
            break
          }
          case 'chatter': {
            open = Math.max(open, Math.abs(Math.sin(p * Math.PI * 10)) * 0.14 * bell(p))
            break
          }
          case 'nudge': {
            // «Her!» – et lite sprett med løftede bryn, så peker han igjen
            const k = bell(p)
            y += k * 0.12
            squashY = 1 + k * 0.05
            browUp = Math.max(browUp, k * 0.03)
            up[0] = up[1] = mix(0.64, 0.95, k)
            open = Math.max(open, k * 0.12)
            break
          }
          case 'land': {
            // Hjemme igjen: lander med et lite dump i knærne
            const k = bell(p)
            squashY = 1 - k * 0.14
            y -= k * 0.03
            break
          }
          case 'giggle': {
            // Kilt! Han fniser: rister litt, myser fornøyd, lokket klaprer og hendene går mot magen
            const k = bell(p)
            roll += Math.sin(p * Math.PI * 8) * 0.09 * k
            squashY = 1 - k * 0.07
            y += k * 0.04
            happy = true
            open = Math.max(open, Math.abs(Math.sin(p * Math.PI * 7)) * 0.18 * k)
            browUp = Math.max(browUp, k * 0.02)
            pose(0, mix(0.84, 0.62, k), mix(-0.24, -0.12, k), mix(0.52, 0.66, k), GRIP)
            pose(1, mix(0.84, 0.62, k), mix(-0.24, -0.12, k), mix(0.52, 0.66, k), GRIP)
            break
          }
        }
      }

      // Sigarstunden: lokket, ansiktet og hendene følger tidslinjen
      if (rit >= 0) {
        const r = rit
        const st = cigState(r)
        // Lokket: titter i lokket, klipper (vidt opp og smekk igjen), holder sigaren, puster ut, og legger den tilbake
        let ro = 0.2 * win(r, 0.35, 0.85, 0.3)
        let rl = 0.14 * win(r, 0.35, 0.85, 0.3)
        if (r > 2.55 && r < 3.6) ro = r < 3.05 ? 0.42 * ease((r - 2.55) / 0.5) : r < 3.13 ? 0.42 * (1 - (r - 3.05) / 0.08) : 0.03
        else if (r >= 3.6 && r < 4) ro = 0.09
        if (st === 2) ro = 0.05
        if (r > 5.3 && r < 6.4) ro += 0.03 * Math.abs(Math.sin(r * 14))
        const ex = exhaleAt(r)
        open = Math.max(ro, 0.11 * ex, 0.26 * win(r, 12.95, 13.6, 0.3))
        lift = Math.max(rl, 0.02 * ex, 0.2 * win(r, 12.95, 13.6, 0.3), 0.035 * win(r, 14.2, 14.35, 0.1))
        // Blikket: på lokket, sigaren, munnviken, fyrstikken og gloen
        if (r < 0.9) {
          gx = 0.3
          gy = 0.3
        } else if (r < 1.55) {
          gx = 0.25
          gy = 0.38
        } else if (r >= 2.5 && r < 3.6) {
          gx = 0.2
          gy = 0.5
        } else if (r >= 3.6 && r < 4.7) {
          gx = 0.45
          gy = 0.45
        } else if (r >= 4.7 && r < 6.5) {
          gx = 0.35
          gy = 0.28
        } else if (r >= 9.4 && r < 10.2) {
          gx = 0.45
          gy = 0.05
        } else if (r >= 12.8 && r < 13.6) {
          gx = 0.25
          gy = -0.25
        }
        // Øynene: lukket når han lukter, store når lokket smeller, halvlukket og fornøyd når han røyker
        const sniff = win(r, 1.65, 2.45)
        const content = Math.min(1, win(r, 7.2, 9.1, 0.3) + win(r, 10.5, 12.4, 0.3))
        const drag = Math.min(1, win(r, 7.8, 8.3) + win(r, 11, 11.5))
        const wide = win(r, 3.13, 3.5, 0.05)
        up[0] = up[1] = mix(mix(mix(0.64, 0.25, content), -0.55, Math.max(sniff, drag * 0.7)), 0.95, wide)
        smile = Math.max(sniff, content * 0.6, win(r, 14.1, 15, 0.2))
        happy = happy || ex > 0.5 || win(r, 14.1, 15, 0.2) > 0.5
        browUp = Math.max(browUp, 0.02 * win(r, 0.3, 1.5, 0.2), 0.03 * wide, 0.015 * sniff)
        pitch -= 0.05 * content
        squashY -= 0.05 * bell((r - 3.13) / 0.22)
        // Venstre hånd: «Ahh» med flat hånd når han puster ut første gang
        const fl = win(r, 8.3, 9, 0.25)
        if (fl > 0) pose(0, mix(0.84, 1.02, fl), mix(-0.24, 0.05, fl), mix(0.52, 0.5, fl), fl > 0.4 ? PALM : RELAX, 0, [1, -0.8, -0.3])
        // Høyre hånd: tar, holder, klipper, tenner og legger tilbake
        const w = want[1]
        if (st === 1) keyed(cigGrip, r, w.target).add(HAND_OFF)
        else {
          keyed(handKeys, r, w.target)
          if (r > 6.55 && r < 6.95) w.target.x += Math.sin((r - 6.55) * 70) * 0.05
          if (r > 5.2 && r < 6.45) w.target.y += Math.sin(r * 9) * 0.006
        }
        w.pole.set(1, -0.6, -0.45)
        w.grip = st === 1 || (r >= 4.1 && r < 7.05) ? GRIP : RELAX
        w.wrist = 0
      }

      // I farten: han lener seg inn i svingen og ser dit han skal, strekker seg litt, og armene henger etter
      roll += -fx * 0.38
      pitch += fy * 0.14
      yaw += fx * 0.25
      squashY *= 1 + Math.abs(fy) * 0.06
      for (const w of want) {
        w.target.x -= fx * 0.14
        w.target.y += fy * 0.14
      }

      // Inn: spretter opp fra ingenting (eller kommer flygende). Ut: flyr hjem (guiden flytter ham),
      // eller letter på lokket, spretter opp og krymper bort.
      const pop = still || L.entrance === 'fly' ? 1 : Math.min(1, (now - t0) / 500)
      const lp = L.leaving === 'away' ? clamp((now - L.leaveAt) / 400, 0, 1) : 0
      const sc = L.leaving === 'away' ? 1 + 0.08 * bell(lp * 2) - 0.5 * ease(lp) : 0.2 + 0.8 * (1 - Math.pow(1 - pop, 3) * Math.cos(pop * 6))
      if (L.leaving === 'away' && !still) {
        y += ease(lp) * 0.3
        lift = Math.max(lift, bell(lp) * 0.12)
      }

      // Peker mot knappen: snur seg litt mot den og ser på den først
      let pointArm = -1
      if (pointing) {
        const a = aims[Math.min(ai, aims.length - 1)]
        pointArm = a.x < 0 ? 0 : 1
        yaw += (pointArm ? 1 : -1) * 0.22 * clamp(tp / 0.4, 0, 1)
        roll += (pointArm ? -1 : 1) * 0.05 * clamp(tp / 0.4, 0, 1)
        if (tp < 1.1 || ((L.action === 'pick' || L.remind) && tp < 3.3)) {
          gx = clamp(a.x / D3D_PX / 1.6, -0.5, 0.5)
          gy = clamp(a.y / D3D_PX / 2, -0.35, 0.45)
        }
      }
      // Et raskt blikk dit du trykket (med mindre han akkurat ser på det han peker på)
      if (now < L.glance.until && !(pointing && tp < 1.1)) {
        gx = clamp(L.glance.x / D3D_PX / 1.6, -0.5, 0.5)
        gy = clamp(L.glance.y / D3D_PX / 2, -0.35, 0.45)
        yaw += clamp(L.glance.x / 500, -0.12, 0.12)
      }

      rig.position.set(x, y, 0)
      rig.rotation.set(pitch, yaw, roll)
      rig.scale.setScalar(Math.max(0.05, sc))
      root.scale.set(1 + (1 - squashY) * 0.6, squashY, 1 + (1 - squashY) * 0.6)
      rig.updateMatrixWorld(true)

      if (pointArm >= 0) {
        const a = aims[Math.min(ai, aims.length - 1)]
        // Fra skjermpiksler til et punkt i scenen, så inn i kroppens eget rom
        aimPoint.set(a.x / D3D_PX, 0.02 - a.y / D3D_PX, 0.3)
        root.worldToLocal(aimPoint)
        const arm = arms[pointArm]
        const d = aimPoint.sub(arm.S).normalize()
        const tap = phaseA && tp > 0.35 && tp < 0.95 ? 0.5 * (1 - Math.cos(((tp - 0.35) / 0.6) * Math.PI * 4)) : 0
        const ext = phaseA ? 1 - 0.13 * tap : 0.8
        const w = want[pointArm]
        w.target.copy(arm.S).addScaledVector(d, (ARM_A + ARM_B) * ext)
        if (!phaseA) w.target.y -= 0.06
        w.pole.set(arm.s, -0.6, -0.5)
        w.grip = phaseA ? POINT : PALM
        w.wrist = 0
      }

      // Hendene glir mot målet med en fjær (lite sprett), så løses armene
      for (let i = 0; i < 2; i++) {
        const arm = arms[i]
        const w = want[i]
        if (!arm.ready || still) {
          arm.springs[0].x = w.target.x
          arm.springs[1].x = w.target.y
          arm.springs[2].x = w.target.z
          arm.ready = true
        }
        v1.set(arm.springs[0].step(w.target.x, dt), arm.springs[1].step(w.target.y, dt), arm.springs[2].step(w.target.z, dt))
        aimPoint.copy(v1)
        reach(arm, aimPoint, w.pole)
        // Fingrene krummer seg mykt mot den nye håndstillingen
        const k = still ? 1 : 1 - Math.exp(-dt * 14)
        for (let f = 0; f < 4; f++) arm.grip.curl[f] = mix(arm.grip.curl[f], w.grip.curl[f], k)
        arm.grip.twist = mix(arm.grip.twist, w.grip.twist, k)
        arm.grip.spread = mix(arm.grip.spread, w.grip.spread, k)
        arm.fingers.forEach((f, j) => {
          f.rotation.x = arm.grip.curl[j]
          f.rotation.z = (j - 1) * arm.grip.spread * arm.s
        })
        arm.thumb.rotation.set(arm.grip.curl[3] * 0.8, 0, -arm.s * 0.7)
        arm.hand.rotation.set(0, arm.grip.twist * arm.s, w.wrist)
      }

      // Sigaren og fyrstikken følger hånden – eller sigaren sitter i munnviken
      if (rit >= 0) {
        const r = rit
        propsOn = true
        const st = cigState(r)
        arms[1].hand.updateWorldMatrix(true, false)
        root.worldToLocal(arms[1].hand.localToWorld(handPos.set(0, -0.07, 0)))
        cigar.visible = st > 0
        if (st > 0) {
          if (st === 1) {
            keyed(cigDir, r, tmpA).normalize()
            tmpB.copy(handPos).sub(HAND_OFF).addScaledVector(tmpA, -HOLD_AT)
          } else {
            tmpA.copy(DIR_M)
            tmpB.copy(MOUTH)
          }
          cigar.position.copy(tmpB)
          cigar.quaternion.setFromUnitVectors(XAX, tmpA)
          cigCap.visible = r < 3.15
          const heat = heatAt(r)
          const ashLen = ashAt(r)
          ash.visible = ashLen > 0.004
          ash.scale.y = Math.max(0.001, ashLen)
          ash.position.x = CIG + ashLen / 2
          ember.position.x = emberGlow.position.x = CIG + ashLen + 0.003
          emberMat.color.copy(COLD).lerp(HOT, heat)
          emberGlow.visible = heat > 0.02
          emberGlow.scale.setScalar(0.1 + 0.2 * heat * (1 + 0.08 * Math.sin(now * 0.02)))
        }
        // Tuppen faller ut av munnen
        capBit.visible = r >= 3.15 && r < 3.8
        if (capBit.visible) {
          const k = r - 3.15
          capBit.position.set(MOUTH.x + 0.06 * k, MOUTH.y - 2.2 * k * k, MOUTH.z + 0.1 * k)
          capBit.rotation.set(k * 9, 0, Math.PI / 2 + k * 6)
        }
        match.visible = r >= 4.1 && r < 7.7
        if (match.visible) {
          keyed(matchDir, Math.min(r, 7.05), tmpA).normalize()
          if (r < 7.05) match.position.copy(handPos).add(tmpB.set(0, -0.01, 0.025))
          else {
            // Kastet: den faller og snurrer
            const k = r - 7.05
            keyed(handKeys, 7.05, match.position).add(tmpB.set(0.25 * k, 0.35 * k - 2.6 * k * k, 0))
            tmpA.applyAxisAngle(XAX, k * 10).normalize()
          }
          match.quaternion.setFromUnitVectors(UP, tmpA)
          const burning = r >= 4.62 && r < 6.75
          flame.visible = burning
          headMat.color.copy(r >= 4.62 ? BURNT : RED_HEAD)
          if (burning) {
            const flare = r < 4.87 ? 1 + 0.8 * (1 - (r - 4.62) / 0.25) : 1
            flame.scale.setScalar(flare * (1 + 0.12 * Math.sin(now * 0.031) + 0.08 * Math.sin(now * 0.017)))
            // Flammen står rett opp, uansett hvordan fyrstikken holdes
            flame.quaternion.copy(match.quaternion).invert()
          }
        }
      } else if (propsOn) {
        propsOn = false
        hideProps()
      }

      // Beina: knærne bøyer seg når han klemmes sammen, og sparker litt når han hopper.
      // I farten henger de etter, og på vei ned trekker han dem opp.
      const crouch = clamp((1 - squashY) * 4, 0, 1)
      const tuck = Math.max(0, fy)
      legs.forEach((g, i) => {
        g.hip.rotation.x = -crouch * 0.7 + (i ? -1 : 1) * legKick * 0.4 + tuck * 0.45
        g.hip.rotation.z = -fx * 0.4
        g.knee.rotation.x = crouch * 1.3 + legKick * 0.3 + tuck * 0.5
        g.foot.rotation.x = -crouch * 0.6
      })

      // Lokket og munnen
      hinge.rotation.x = -open
      hinge.position.y = PY + lift

      // Lommeuret i venstre hånd
      watch.scale.setScalar(Math.max(0.001, watchShow * 1.5))
      watch.position.set(-0.6, PY + 0.32, 0.76)

      // Øynene: blunk av og til (noen ganger to på rad, og alltid når han kommer til et nytt stopp),
      // glade øyne smiler med nedre lokk, «wink» lukker venstre
      if (!still && (now > nextBlink || L.blinkNow)) {
        blinkAt = now
        nextBlink = now + (Math.random() < 0.18 && !L.blinkNow ? 260 : 2200 + Math.random() * 2800)
        L.blinkNow = false
      }
      const blink = blinkAt > 0 ? bell((now - blinkAt) / 150) : 0
      if (happy) {
        up[0] = up[1] = Math.min(up[0], 0.5)
        lo[0] = lo[1] = -0.28
        browUp = Math.max(browUp, 0.015)
      }
      if (wink) {
        up[0] = -0.3
        lo[0] = -0.32
      }
      const yaw0 = springs.gazeX.step(gx, dt)
      const pitch0 = springs.gazeY.step(gy, dt)
      eyes.forEach((e, i) => {
        const u = Math.max(mix(up[i], lo[i] + 0.02, blink), lo[i] + 0.02)
        e.upper.rotation.x = -Math.asin(clamp(u, -0.99, 0.99))
        e.lower.rotation.x = -Math.asin(clamp(lo[i], -0.99, 0.99))
        e.look.rotation.set(pitch0, yaw0, 0)
      })
      brows.forEach((b) => {
        b.pivot.position.y = browUp + (b.s > 0 ? browRight : 0) - (wink && b.s < 0 ? 0.01 : 0)
        b.pivot.rotation.z = b.s * browWorry * 0.32
      })

      // Etterslep: barten fjærer, kjedet svinger, sløyfa vipper – også når han flyr
      const vy = (y - prevY) / dt
      const vx = (x - prevX) / dt
      prevY = y
      prevX = x
      const tipUp = smile * 0.1 + (happy ? 0.08 : 0) - vy * 0.05 + open * 0.15 + fy * 0.15
      const twirl = L.action === 'stache' && acting ? Math.sin(t * 9) * 0.1 * bell(p) : 0
      stacheHalves[0].pivot.rotation.z = -springs.stacheL.step(tipUp, dt)
      stacheHalves[1].pivot.rotation.z = springs.stacheR.step(tipUp + twirl, dt)
      chain.rotation.z = springs.chain.step(-roll * 1.4 - vx * 0.25 - fx * 0.5 + (still ? 0 : Math.sin(t * 1.6) * 0.04), dt)
      bow.rotation.z = springs.bow.step(roll * 0.7 + vx * 0.15 + fx * 0.3, dt)

      // Gnistene: ut av munnen, opp og ut, faller og krymper
      const sparkAt = L.action === 'present' ? L.actionAt + DURATION.present * 1000 * 0.24 : -1
      for (const sp of sparks) {
        const k = sparkAt < 0 || still ? -1 : (now - sparkAt) / 1000 - sp.delay
        sp.m.visible = k > 0 && k < 1
        if (!sp.m.visible) continue
        sp.m.position.set(sp.vx * k, PY + 0.12 + sp.vy * k - 1.4 * k * k, 0.35 + sp.vz * k)
        sp.m.scale.setScalar(Math.max(0.01, 1.3 * (1 - k)))
        sp.m.rotation.set(k * 6, k * 4, 0)
      }
      // Røyken: fra gloen, fra munnen når han puster ut, fra fyrstikken og under lokket – siger ut over vakt-knappen og blekner der
      if (sctx) {
        if (now > fitAt) {
          fitSmoke()
          fitAt = now + 1000
        }
        if (rit >= 0) {
          const r = rit
          cigar.updateMatrixWorld(true)
          match.updateMatrixWorld(true)
          if (cigar.visible && heatAt(r) > 0.05) {
            const lighting = r < 6.4
            if (every(lighting ? 'tenn' : 'glo', lighting ? 0.2 : 0.16, dt))
              emit(cigar.localToWorld(tmpB.set(CIG + ashAt(r) + 0.01, 0, 0)), lighting ? { r: 1.6, grow: 4.5, vx: 22, vmin: 16, vy: -6, life: 4, a: 0.22 } : { r: 1.2, grow: 3.2, vx: 20, vmin: 18, vy: -4, life: 7, a: 0.11 })
          }
          if (exhaleAt(r) > 0.5 && every('pust', 0.07, dt)) emit(root.localToWorld(tmpB.copy(EXHALE_AT)), { r: 2.2, grow: 5, vx: 80, vmin: 28, vy: -3, life: 7, a: 0.17, spread: 0.6 })
          if (r > 6.75 && r < 7 && every('fyrstikk', 0.08, dt)) emit(match.localToWorld(tmpB.set(0, 0.22, 0)), { r: 1, grow: 3, vx: 12, vmin: 10, vy: -8, life: 3, a: 0.25 })
          if (r > 14.22 && r < 14.45 && every('lokk', 0.06, dt)) emit(root.localToWorld(tmpB.copy(LID_AT)), { r: 2, grow: 5, vx: 34, vmin: 22, vy: -3, life: 5, a: 0.16 })
        }
        if (puffs.length || smokeDirty) {
          sctx.setTransform(sdpr, 0, 0, sdpr, 0, 0)
          sctx.clearRect(0, 0, sw, sh)
          for (let i = puffs.length - 1; i >= 0; i--) {
            const q = puffs[i]
            q.age += dt
            if (q.age >= q.life) {
              puffs.splice(i, 1)
              continue
            }
            q.vx = q.vmin + (q.vx - q.vmin) * Math.exp(-1.4 * dt)
            q.x += (q.vx + Math.sin(q.age * 1.7 + q.seed) * 5) * dt
            q.y += (q.vy + Math.cos(q.age * 1.3 + q.seed) * 3) * dt
            q.vy *= Math.exp(-0.5 * dt)
            q.r += q.grow * dt
            // Blekner med alderen, og helt ut før høyre kant av vakt-knappen (og øverst i linjen)
            const a = q.a * Math.min(1, q.age / 0.35) * (1 - q.age / q.life) ** 1.3 * clamp((sw - q.x - q.r * 0.3) / 36, 0, 1) * clamp((q.y + q.r * 0.5) / 12, 0, 1)
            if (a <= 0.003) continue
            sctx.globalAlpha = a
            sctx.drawImage(puffImg, q.x - q.r, q.y - q.r, q.r * 2, q.r * 2)
          }
          sctx.globalAlpha = 1
          smokeDirty = puffs.length > 0
        }
      }
      renderer.render(scene, camera)
      drawn = true
    }
    raf = requestAnimationFrame(frame)
    const stop = () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointerdown', onDown, true)
      renderer.domElement.remove()
      if (sctx && smoke) {
        sctx.setTransform(1, 0, 0, 1, 0, 0)
        sctx.clearRect(0, 0, smoke.width, smoke.height)
      }
      if (stopActive === stop) stopActive = () => {}
    }
    stopActive = stop
    return stop
  }
  return { run }
}

export function Domeo3D({
  mood,
  move,
  actionKey,
  say = '',
  talk = 0,
  aims = [],
  hand = 'point',
  remind,
  leaving,
  entrance = 'pop',
  fallback,
}: {
  mood: Mood
  move: Action
  actionKey: number
  /** Det han sier – lokket åpner og lukker seg i takt med stavelsene. */
  say?: string
  /** Hvor lenge han snakker høyst (ms). */
  talk?: number
  aims?: Aim[]
  hand?: Hand
  /** Påminnelse: `n` øker hver gang han skal minne deg på hvor du skal trykke, og han peker på `at`. */
  remind?: { n: number; at: Aim[] }
  leaving: Leaving
  /** «fly»: han kommer flygende fra demolinjen, så han spretter ikke frem. */
  entrance?: 'pop' | 'fly'
  fallback: ReactNode
}) {
  const host = useRef<HTMLDivElement>(null)
  const [live] = useState(() => ({ current: newLive(mood, move, aims, hand) }))
  const [flat, setFlat] = useState(false)
  if (leaving && !live.current.leaving) live.current.leaveAt = performance.now()
  live.current.mood = mood
  live.current.leaving = leaving
  live.current.entrance = entrance
  live.current.aims = aims
  live.current.hand = hand

  // Nytt stopp: en ny bevegelse, et blunk, han peker, og begynner å snakke når boblen kommer
  useEffect(() => {
    const L = live.current
    const now = performance.now()
    L.action = move
    L.actionAt = now
    L.arriveAt = now
    L.arriveMove = move
    L.remind = null
    L.blinkNow = true
    L.talkFrom = now + 350
    L.speech = say ? syllables(say, talk) : []
    const last = L.speech[L.speech.length - 1]
    L.talkTo = L.talkFrom + (say ? (last ? (last.at + last.d) * 1000 : 0) : talk)
    L.pointFrom = now + (POINT_AT[move] ?? 0.35) * 1000
    L.nextIdle = Math.max(now + DURATION[move] * 1000, L.talkTo, L.pointFrom + 4500) + 2500
  }, [actionKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // «Her!»: han minner deg på hvor du skal trykke – et lite sprett, og så peker han dit.
  // En påminnelse fra før han dukket opp denne gangen teller ikke.
  const remindSeen = useRef(remind?.n ?? 0)
  useEffect(() => {
    if (!remind?.n || remind.n === remindSeen.current || !remind.at.length) return
    remindSeen.current = remind.n
    const L = live.current
    const now = performance.now()
    L.action = 'nudge'
    L.actionAt = now
    L.remind = remind.at
    L.pointFrom = now + (POINT_AT.nudge ?? 0) * 1000
    L.nextIdle = Math.max(L.nextIdle, L.pointFrom + 4500 + 2500)
  }, [remind?.n]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scenen hentes (eller bygges) og kjøres så lenge han vises – han går ut av demolinjen, og hjem igjen etterpå.
  // Uten WebGL vises den flate Sir Domeo.
  useEffect(() => {
    let stop = false
    let end = () => {}
    guiding++
    if (home) {
      stopActive()
      home.here(false)
    }
    preloadDomeo()
      .then((s) => {
        if (!stop && host.current) end = s.run(live.current, host.current, GUIDE)
      })
      .catch((err) => {
        console.warn('Sir Domeo 3D:', err)
        if (!stop) setFlat(true)
      })
    return () => {
      stop = true
      end()
      guiding--
      backHome(true)
    }
  }, [])

  return (
    <div className="k3d" ref={host}>
      {flat && fallback}
    </div>
  )
}

/** Sir Domeo hjemme i demolinjen: liten, rolig og levende. Når han er ute og viser deg rundt, står plassen hans tom. */
export function DomeoHome({ fallback }: { fallback: ReactNode }) {
  const host = useRef<HTMLSpanElement>(null)
  const smoke = useRef<HTMLCanvasElement>(null)
  const [here, setHere] = useState(false)
  const [flat, setFlat] = useState(false)
  const [L] = useState(() => {
    const L = newLive('point', 'land')
    L.actionAt -= 10000
    return L
  })
  useEffect(() => {
    if (!host.current) return
    const me = { L, host: host.current, here: setHere, smoke: smoke.current }
    home = me
    preloadDomeo()
      .then(() => backHome(false))
      .catch(() => setFlat(true))
    return () => {
      if (home !== me) return
      home = null
      if (!guiding) stopActive()
    }
  }, [L])
  return (
    <span className={`kg-home ${here || flat ? '' : 'out'}`} ref={host} aria-hidden="true">
      {/* Sigarrøyken siger ut over vakt-knappen */}
      <canvas className="kg-smoke" ref={smoke} />
      {flat && fallback}
    </span>
  )
}
