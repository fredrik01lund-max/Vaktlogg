// Sir Domeo i 3D: en blank sølvklokke med ekte øyne (øyelokk i sølv), skulpturert bart, monokkel og vinrød sløyfe,
// frakkeermer med hvite hansker, og bukser med gamasjer og lakksko.
// Lokket er munnen – det går opp og ned når han snakker, og løftes helt når han presenterer noe («Voilà!»).
// Når han forklarer en knapp, står han ved siden av og peker på den (armene styres med enkel to-ledds IK).
// Three.js lastes først når guiden åpnes (egen bit av bygget). Uten WebGL vises den flate Sir Domeo.

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type * as T from 'three'
import { reduced } from './lib/motion.ts'

export type Mood = 'wave' | 'point' | 'wink' | 'cheer'
/** Det han gjør når han kommer til et nytt stopp. */
export type Move = 'tip' | 'hop' | 'flip' | 'twirl' | 'look' | 'dance' | 'shrug' | 'present' | 'watch' | 'pick'
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

// Små vaner han har når han venter
type Habit = 'peek' | 'tilt' | 'chatter' | 'stache' | 'monocle' | 'polish'
type Action = Move | Habit
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
  peek: 1.4,
  tilt: 1.2,
  chatter: 0.8,
  stache: 2.2,
  monocle: 1.8,
  polish: 2.4,
}
// Når armen begynner å peke (sekunder etter at han kom frem) – noen bevegelser skal bli ferdige først
const POINT_AT: Partial<Record<Move, number>> = { hop: 0.95, dance: 1.45, present: 1.45, flip: 0.9 }

type Live = {
  mood: Mood
  leaving: boolean
  action: Action
  actionAt: number
  dir: number
  nextIdle: number
  talkFrom: number
  talkTo: number
  aims: Aim[]
  hand: Hand
  pointFrom: number
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

export function Domeo3D({
  mood,
  move,
  actionKey,
  dir = 0,
  talk = 0,
  aims = [],
  hand = 'point',
  leaving,
  fallback,
}: {
  mood: Mood
  move: Move
  actionKey: number
  dir?: number
  /** Hvor lenge han snakker (ms) – lokket går opp og ned i takt. */
  talk?: number
  aims?: Aim[]
  hand?: Hand
  leaving: boolean
  fallback: ReactNode
}) {
  const host = useRef<HTMLDivElement>(null)
  const now0 = performance.now()
  const live = useRef<Live>({ mood, leaving, action: move, actionAt: now0, dir, nextIdle: now0 + 4000, talkFrom: 0, talkTo: 0, aims, hand, pointFrom: now0 })
  const [flat, setFlat] = useState(false)
  live.current.mood = mood
  live.current.leaving = leaving
  live.current.aims = aims
  live.current.hand = hand

  // Nytt stopp: en ny bevegelse, han lener seg i retningen han flyr, peker, og begynner å snakke når boblen kommer
  useEffect(() => {
    const L = live.current
    const now = performance.now()
    L.action = move
    L.actionAt = now
    L.dir = dir
    L.talkFrom = now + 350
    L.talkTo = L.talkFrom + talk
    L.pointFrom = now + (POINT_AT[move] ?? 0.35) * 1000
    L.nextIdle = Math.max(now + DURATION[move] * 1000, L.talkTo, L.pointFrom + 4500) + 2500
  }, [actionKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let stop = false
    let cleanup = () => {}
    ;(async () => {
      try {
        const THREE = await import('three')
        const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js')
        if (stop || !host.current) return
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
        renderer.setPixelRatio(dpr)
        renderer.setSize(D3D_SIZE, D3D_SIZE)
        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.toneMapping = THREE.NeutralToneMapping
        host.current.appendChild(renderer.domElement)

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
        camera.lookAt(0, 0.02, 0)
        scene.add(new THREE.HemisphereLight(0xffffff, 0xf0d9de, 0.8))
        const sun = new THREE.DirectionalLight(0xffffff, 1.5)
        sun.position.set(-2.5, 3, 4)
        scene.add(sun)

        // ── Teksturer laget i koden ──
        const textures: T.Texture[] = []
        const paint = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) => {
          const c = document.createElement('canvas')
          c.width = w
          c.height = h
          draw(c.getContext('2d')!)
          const t = new THREE.CanvasTexture(c)
          if (srgb) t.colorSpace = THREE.SRGBColorSpace
          textures.push(t)
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
        const springs = {
          gazeX: new Spring(220, 26),
          gazeY: new Spring(220, 26),
          stacheL: new Spring(90, 7),
          stacheR: new Spring(90, 7),
          chain: new Spring(40, 3.5),
          bow: new Spring(70, 6),
        }
        const ease = (x: number) => 1 - Math.pow(1 - x, 3)
        const easeBack = (x: number) => 1 + 2.4 * Math.pow(x - 1, 3) + 1.4 * Math.pow(x - 1, 2)
        const bell = (x: number) => Math.sin(Math.PI * clamp(x, 0, 1))
        const mix = (a: number, b: number, k: number) => a + (b - a) * k
        const habits: Habit[] = ['stache', 'monocle', 'polish', 'peek', 'tilt', 'chatter']
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

        const frame = (now: number) => {
          raf = requestAnimationFrame(frame)
          const dt = Math.min(0.05, (now - last) / 1000) || 0.016
          last = now
          const t = (now - t0) / 1000
          const L = live.current
          const talking = !still && !L.leaving && now >= L.talkFrom && now < L.talkTo
          // Små vaner når han venter: snurrer barten, retter på monokkelen, pusser klokka, titter, vipper, klaprer
          if (!still && now > L.nextIdle && !L.leaving && !talking) {
            L.action = habits[Math.floor(Math.random() * habits.length)]
            L.actionAt = now
            L.dir = 0
            L.nextIdle = now + DURATION[L.action] * 1000 + 3000 + Math.random() * 2500
          }
          const p = still ? 1 : Math.min(1, (now - L.actionAt) / 1000 / DURATION[L.action])
          const acting = p < 1
          const tp = (now - L.pointFrom) / 1000
          // Peking: først pekefinger (med to små prikk), så en rolig flat hånd mot knappen, så hvile
          const aims = L.aims
          const pointing = aims.length > 0 && !L.leaving && tp >= 0 && tp < 4.6
          const phaseA = pointing && tp < 2.4 && L.hand === 'point'
          const ai = L.action === 'pick' && tp < 3.3 ? Math.floor(Math.max(0, tp) / 1.1) % aims.length : 0

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
          let wink = L.mood === 'wink' && !acting
          let happy = L.mood === 'cheer'
          // Lokket: vinkel (åpner seg som en munn) og løft rett opp
          let open = 0
          let lift = 0
          let watchShow = 0

          // Armene: hvile med hendene litt ut og frem
          pose(0, 0.84, -0.24, 0.52, RELAX)
          pose(1, 0.84, -0.24, 0.52, RELAX)
          if (L.mood === 'wave') pose(1, 1.08 + Math.sin(t * 8) * 0.05, 0.62, 0.38, PALM, Math.sin(t * 8) * 0.35, [1, -1, -0.2])
          if (L.mood === 'cheer') {
            pose(0, 1.02, 0.66, 0.34, PALM, Math.sin(t * 9 + 1.5) * 0.3, [1, -1, -0.2])
            pose(1, 1.02, 0.66, 0.34, PALM, Math.sin(t * 9) * 0.3, [1, -1, -0.2])
          }

          if (talking) {
            // Stavelser: lokket klaffer opp og ned i ujevn takt, som ekte prat – brynene og barten følger med
            const k = (now - L.talkFrom) / 1000
            const syl = Math.max(0, Math.sin(k * 16)) * (0.55 + 0.45 * Math.sin(k * 5.3 + 1))
            open = 0.04 + syl * 0.3
            lift = syl * 0.02
            browUp = syl * 0.012
          } else if (happy && !still) {
            open = Math.abs(Math.sin(t * 9)) * 0.2
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
                // Bukker, spretter opp og løfter lokket: «Voilà!» – gnister spruter ut. Så viser han frem med hånden.
                const crouch = p < 0.2 ? bell(p / 0.2) : 0
                const lifted = p < 0.2 ? 0 : p < 0.4 ? easeBack((p - 0.2) / 0.2) : p < 0.78 ? 1 : 1 - ease((p - 0.78) / 0.22)
                squashY = 1 - crouch * 0.15 + (p > 0.2 && p < 0.45 ? bell((p - 0.2) / 0.25) * 0.08 : 0)
                pitch = crouch * 0.18
                y += lifted * 0.12 + (p > 0.4 && p < 0.78 ? Math.sin(((p - 0.4) / 0.38) * Math.PI * 3) * 0.02 : 0)
                lift = Math.max(lift, lifted * 0.3)
                open = Math.max(open, lifted * 0.75)
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
            }
            // Han lener seg i retningen han flyr (bare i starten av et nytt stopp)
            roll += -L.dir * 0.4 * Math.max(0, 1 - p * 2.5)
          }

          // Inn: spretter opp fra ingenting. Ut: krymper.
          const pop = still ? 1 : Math.min(1, (now - t0) / 500)
          const sc = L.leaving ? 0.85 : 0.2 + 0.8 * (1 - Math.pow(1 - pop, 3) * Math.cos(pop * 6))

          // Peker mot knappen: snur seg litt mot den og ser på den først
          let pointArm = -1
          if (pointing) {
            const a = aims[Math.min(ai, aims.length - 1)]
            pointArm = a.x < 0 ? 0 : 1
            yaw += (pointArm ? 1 : -1) * 0.22 * clamp(tp / 0.4, 0, 1)
            roll += (pointArm ? -1 : 1) * 0.05 * clamp(tp / 0.4, 0, 1)
            if (tp < 1.1 || (L.action === 'pick' && tp < 3.3)) {
              gx = clamp(a.x / D3D_PX / 1.6, -0.5, 0.5)
              gy = clamp(a.y / D3D_PX / 2, -0.35, 0.45)
            }
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

          // Beina: knærne bøyer seg når han klemmes sammen, og sparker litt når han hopper
          const crouch = clamp((1 - squashY) * 4, 0, 1)
          legs.forEach((g, i) => {
            g.hip.rotation.x = -crouch * 0.7 + (i ? -1 : 1) * legKick * 0.4
            g.knee.rotation.x = crouch * 1.3 + legKick * 0.3
            g.foot.rotation.x = -crouch * 0.6
          })

          // Lokket og munnen
          hinge.rotation.x = -open
          hinge.position.y = PY + lift

          // Lommeuret i venstre hånd
          watch.scale.setScalar(Math.max(0.001, watchShow * 1.5))
          watch.position.set(-0.6, PY + 0.32, 0.76)

          // Øynene: blunk av og til, glade øyne smiler med nedre lokk, «wink» lukker venstre
          if (!still && now > nextBlink) {
            blinkAt = now
            nextBlink = now + 2200 + Math.random() * 2800
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

          // Etterslep: barten fjærer, kjedet svinger, sløyfa vipper
          const vy = (y - prevY) / dt
          const vx = (x - prevX) / dt
          prevY = y
          prevX = x
          const tipUp = smile * 0.1 + (happy ? 0.08 : 0) - vy * 0.05 + open * 0.15
          const twirl = L.action === 'stache' && acting ? Math.sin(t * 9) * 0.1 * bell(p) : 0
          stacheHalves[0].pivot.rotation.z = -springs.stacheL.step(tipUp, dt)
          stacheHalves[1].pivot.rotation.z = springs.stacheR.step(tipUp + twirl, dt)
          chain.rotation.z = springs.chain.step(-roll * 1.4 - vx * 0.25 + (still ? 0 : Math.sin(t * 1.6) * 0.04), dt)
          bow.rotation.z = springs.bow.step(roll * 0.7 + vx * 0.15, dt)

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
          renderer.render(scene, camera)
        }
        raf = requestAnimationFrame(frame)

        cleanup = () => {
          cancelAnimationFrame(raf)
          renderer.dispose()
          env.dispose()
          textures.forEach((t) => t.dispose())
          scene.traverse((o) => {
            const m = o as T.Mesh
            if (m.geometry) m.geometry.dispose()
          })
          renderer.domElement.remove()
        }
      } catch (err) {
        console.warn('Sir Domeo 3D:', err)
        if (!stop) setFlat(true)
      }
    })()
    return () => {
      stop = true
      cleanup()
    }
  }, [])

  return (
    <div className="k3d" ref={host}>
      {flat && fallback}
    </div>
  )
}
