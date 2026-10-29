// Sir Domeo i 3D: en blank serveringsklokke i rosegull med søtt ansikt, bart, monokkel, sløyfe og hvite hansker.
// Lokket er munnen – det går opp og ned når han snakker (barten hopper med), og løftes helt når han presenterer noe («Voilà!»).
// Three.js lastes først når guiden åpnes (egen bit av bygget), så resten av appen er like rask.
// Går det ikke (ingen WebGL), vises den flate Sir Domeo i stedet.

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { reduced } from './lib/motion.ts'

export type Mood = 'wave' | 'point' | 'wink' | 'cheer'
/** Det han gjør når han kommer til et nytt stopp. */
export type Move = 'tip' | 'hop' | 'flip' | 'twirl' | 'look' | 'dance' | 'shrug' | 'present'

/** Størrelsen på lerretet (CSS-piksler). */
export const D3D_SIZE = 170

// Hvor lenge hver bevegelse varer (sekunder). De tre siste gjør han av seg selv mens han venter.
const DURATION: Record<Move | 'peek' | 'tilt' | 'chatter', number> = {
  tip: 1.5,
  hop: 1.2,
  flip: 1,
  twirl: 1,
  look: 1.6,
  dance: 1.8,
  shrug: 1.2,
  present: 2.2,
  peek: 1.4,
  tilt: 1.2,
  chatter: 0.8,
}
type Action = keyof typeof DURATION

type Live = { mood: Mood; leaving: boolean; action: Action; actionAt: number; dir: number; nextIdle: number; talkFrom: number; talkTo: number }

// Formen på klokka: radius, og litt lavere og grunnere enn en halvkule. PY er toppen av fatet.
const R = 0.74
const RY = 0.9
const RZ = 0.94
const PY = -0.18

/** `talk`: hvor lenge han snakker (ms) når han kommer til et nytt stopp – lokket går opp og ned i takt. */
export function Domeo3D({ mood, move, actionKey, dir = 0, talk = 0, leaving, fallback }: { mood: Mood; move: Move; actionKey: number; dir?: number; talk?: number; leaving: boolean; fallback: ReactNode }) {
  const host = useRef<HTMLDivElement>(null)
  const live = useRef<Live>({ mood, leaving, action: move, actionAt: performance.now(), dir, nextIdle: performance.now() + 4000, talkFrom: 0, talkTo: 0 })
  const [flat, setFlat] = useState(false)
  live.current.mood = mood
  live.current.leaving = leaving

  // Nytt stopp: en ny bevegelse, han lener seg i retningen han flyr, og begynner å snakke når boblen kommer
  useEffect(() => {
    const L = live.current
    const now = performance.now()
    L.action = move
    L.actionAt = now
    L.dir = dir
    L.talkFrom = now + 350
    L.talkTo = L.talkFrom + talk
    L.nextIdle = Math.max(now + DURATION[move] * 1000, L.talkTo) + 2500
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
        // Myk studiolys som speiler seg i rosegullet og gullet
        const pmrem = new THREE.PMREMGenerator(renderer)
        const room = new RoomEnvironment()
        const env = pmrem.fromScene(room, 0.04).texture
        room.dispose()
        pmrem.dispose()
        scene.environment = env
        scene.environmentIntensity = 0.85
        const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50)
        camera.position.set(0, 0.9, 5.45)
        camera.lookAt(0, 0.02, 0)
        scene.add(new THREE.HemisphereLight(0xfff8f0, 0xf6bfd2, 0.9))
        const sun = new THREE.DirectionalLight(0xffffff, 1.4)
        sun.position.set(-2.5, 3, 4)
        scene.add(sun)

        const shiny = (color: string, metalness: number, roughness: number) => new THREE.MeshPhysicalMaterial({ color, metalness, roughness, clearcoat: 1, clearcoatRoughness: 0.1 })
        const soft = (color: string, roughness = 0.5) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 })
        // Klokka tones fra fersken øverst til rosa nederst (fargene ligger i formen)
        const roseGold = shiny('#FFFFFF', 0.22, 0.28)
        roseGold.vertexColors = true
        const silver = shiny('#FFF4F0', 0.12, 0.3)
        const pink = shiny('#F8A6C2', 0, 0.35)
        const ink = shiny('#33212A', 0, 0.18)
        const cocoa = shiny('#7A4E3C', 0, 0.45)
        const gold = shiny('#F3C77A', 0.7, 0.25)
        const limbMat = shiny('#F3AE9E', 0.1, 0.35)
        const glove = soft('#FFFFFF', 0.4)
        const shine = new THREE.MeshBasicMaterial({ color: '#FFFFFF' })
        const mouthMat = soft('#C9677F', 0.85)
        mouthMat.side = THREE.BackSide

        // Myke rosa kinn (rund toning, ingen harde kanter)
        const blush = (() => {
          const c = document.createElement('canvas')
          c.width = c.height = 64
          const g = c.getContext('2d')!
          const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
          gr.addColorStop(0, 'rgba(255,135,165,0.9)')
          gr.addColorStop(0.55, 'rgba(255,150,178,0.45)')
          gr.addColorStop(1, 'rgba(255,160,185,0)')
          g.fillStyle = gr
          g.fillRect(0, 0, 64, 64)
          const t = new THREE.CanvasTexture(c)
          t.colorSpace = THREE.SRGBColorSpace
          return t
        })()

        // rig: posisjon og spinn · root: klem/strekk
        const rig = new THREE.Group()
        scene.add(rig)
        const root = new THREE.Group()
        rig.add(root)

        // Fatet er underkjeven: mørk munn og en liten tunge innenfor lokket
        const plate = new THREE.Group()
        plate.position.y = PY
        root.add(plate)
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.83, 0.74, 0.1, 64), silver)
        disc.position.y = -0.05
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.81, 0.04, 16, 72), silver)
        rim.rotation.x = Math.PI / 2
        rim.position.y = -0.02
        const floor = new THREE.Mesh(new THREE.CircleGeometry(R * 0.97, 48), soft('#B5566E', 0.9))
        floor.rotation.x = -Math.PI / 2
        floor.scale.set(1, RZ, 1)
        floor.position.y = 0.003
        const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), soft('#FF9DB5', 0.45))
        tongue.scale.set(1.1, 0.3, 0.9)
        tongue.position.set(0, 0.02, 0.3)
        plate.add(disc, rim, floor, tongue)

        // Sløyfe foran på fatet
        const bow = new THREE.Group()
        bow.position.set(0, -0.06, 0.86)
        plate.add(bow)
        for (const s of [-1, 1]) {
          const wing = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.15, 20), pink)
          wing.rotation.z = (s * Math.PI) / 2
          wing.position.x = s * 0.075
          wing.scale.z = 0.55
          bow.add(wing)
        }
        bow.add(new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 12), shiny('#EE86A8', 0, 0.35)))

        // Lokket: hengslet bak, så det åpner seg som en munn
        const hinge = new THREE.Group()
        hinge.position.set(0, PY, -R * RZ)
        root.add(hinge)
        const lid = new THREE.Group()
        lid.position.z = R * RZ
        hinge.add(lid)
        const domeGeo = new THREE.SphereGeometry(R, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2)
        {
          const top = new THREE.Color('#FFE2CF')
          const bottom = new THREE.Color('#FFBDB6')
          const pos = domeGeo.attributes.position
          const col = new Float32Array(pos.count * 3)
          const c = new THREE.Color()
          for (let i = 0; i < pos.count; i++) {
            c.copy(bottom).lerp(top, Math.pow(pos.getY(i) / R, 0.8))
            col.set([c.r, c.g, c.b], i * 3)
          }
          domeGeo.setAttribute('color', new THREE.BufferAttribute(col, 3))
        }
        const dome = new THREE.Mesh(domeGeo, roseGold)
        dome.scale.set(1, RY, RZ)
        const inside = new THREE.Mesh(domeGeo, mouthMat)
        inside.scale.set(0.98, RY * 0.98, RZ * 0.98)
        const lip = new THREE.Mesh(new THREE.TorusGeometry(R, 0.03, 12, 72), silver)
        lip.rotation.x = Math.PI / 2
        lip.scale.set(1, RZ, 1)
        lip.position.y = 0.012
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, 0.07, 20), silver)
        stem.position.y = R * RY + 0.025
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.085, 24, 16), silver)
        knob.position.y = R * RY + 0.1
        lid.add(dome, inside, lip, stem, knob)

        // Et punkt på klokka, vendt rett ut fra overflaten (til øyne, bryn, bart og kinn)
        const onDome = (el: number, az: number, lift = 0.004) => {
          const p = new THREE.Vector3(R * Math.cos(el) * Math.sin(az), R * RY * Math.sin(el), R * RZ * Math.cos(el) * Math.cos(az))
          const n = new THREE.Vector3(p.x / (R * R), p.y / (R * RY * R * RY), p.z / (R * RZ * R * RZ)).normalize()
          const g = new THREE.Group()
          g.position.copy(p).addScaledVector(n, lift)
          g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n)
          lid.add(g)
          return g
        }

        // Store, blanke øyne (det gjør ham søt), små bryn over. Glade øyne er to små buer.
        const eyes = [-1, 1].map((s) => {
          const g = onDome(0.44, s * 0.31)
          const look = new THREE.Group()
          const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 28, 20), ink)
          ball.scale.set(0.9, 1.2, 0.42)
          const big = new THREE.Mesh(new THREE.CircleGeometry(0.032, 16), shine)
          big.position.set(0.033, 0.055, 0.048)
          const small = new THREE.Mesh(new THREE.CircleGeometry(0.016, 12), shine)
          small.position.set(-0.033, -0.05, 0.046)
          look.add(ball, big, small)
          const happy = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 8, 24, Math.PI), ink)
          happy.position.y = -0.02
          g.add(look, happy)
          const b = onDome(0.73, s * 0.31, 0.006)
          const tilt = new THREE.Group()
          const bm = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.017, 8, 18, 1.4), cocoa)
          bm.rotation.z = Math.PI / 2 - 0.7
          bm.position.y = -0.06
          tilt.add(bm)
          b.add(tilt)
          return { s, g, look, happy, brow: b, browBase: b.position.clone(), browDir: new THREE.Vector3(0, 1, 0).applyQuaternion(b.quaternion), tilt }
        })
        for (const s of [-1, 1]) {
          const cheek = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.14), new THREE.MeshBasicMaterial({ map: blush, transparent: true, depthWrite: false }))
          onDome(0.24, s * 0.62, 0.012).add(cheek)
        }

        // Monokkel i gull på det høyre øyet, med en liten kjede ned til kanten av lokket
        {
          const eye = eyes[1].g
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.016, 10, 48), gold)
          ring.position.z = 0.035
          const glass = new THREE.Mesh(new THREE.CircleGeometry(0.14, 32), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.16, depthWrite: false }))
          glass.position.z = 0.05
          const glint = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.008, 6, 20, 0.9), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.8 }))
          glint.rotation.z = 1.9
          glint.position.z = 0.052
          eye.add(ring, glass, glint)
          const a = -0.9
          const start = new THREE.Vector3(Math.cos(a) * 0.145, Math.sin(a) * 0.145, 0.035).applyQuaternion(eye.quaternion).add(eye.position)
          const end = onDome(0.05, 0.66, 0.012).position
          const mid = start.clone().lerp(end, 0.5).add(new THREE.Vector3(0.05, -0.05, 0.06))
          const chain = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([start, mid, end]), 24, 0.008, 6), gold)
          lid.add(chain)
        }

        // Bart med krøllete tupper, rett over munnen – den hopper med lokket når han snakker
        {
          const stache = onDome(0.17, 0, 0.012)
          const lobeGeo = new THREE.SphereGeometry(0.07, 24, 16)
          for (const s of [-1, 1]) {
            const lobe = new THREE.Mesh(lobeGeo, cocoa)
            lobe.scale.set(1.45, 0.6, 0.55)
            lobe.position.set(s * 0.085, -0.006, -0.006)
            lobe.rotation.z = -s * 0.14
            const curl = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.017, 8, 20, Math.PI * 1.25), cocoa)
            curl.position.set(s * 0.19, 0.012, -0.022)
            curl.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI * 0.25
            stache.add(lobe, curl)
          }
          const knot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), cocoa)
          knot.scale.set(1.2, 1, 0.8)
          stache.add(knot)
        }

        // Armer og bein, med hvite servitørhansker og rosa sko
        const arm = (s: number) => {
          const g = new THREE.Group()
          g.position.set(s * 0.8, PY - 0.05, 0)
          const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.14, 6, 12), limbMat)
          a.position.y = -0.11
          const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.028, 8, 20), glove)
          cuff.rotation.x = Math.PI / 2
          cuff.position.y = -0.2
          const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), glove)
          hand.scale.set(1, 0.92, 0.85)
          hand.position.y = -0.28
          g.add(a, cuff, hand)
          root.add(g)
          return g
        }
        const armL = arm(-1)
        const armR = arm(1)
        const legs = [-1, 1].map((s) => {
          const g = new THREE.Group()
          g.position.set(s * 0.28, PY - 0.09, 0.05)
          const l = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.2, 6, 12), limbMat)
          l.position.y = -0.15
          const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16), pink)
          shoe.scale.set(0.95, 0.62, 1.3)
          shoe.position.set(0, -0.31, 0.04)
          g.add(l, shoe)
          root.add(g)
          return g
        })

        // Gnister som spruter ut av munnen når han presenterer
        const sparkColors = ['#FFD66B', '#FF9EBB', '#9FE3C6', '#FFC59E', '#A9D8FF']
        const sparks = Array.from({ length: 10 }, (_, i) => {
          const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.055), new THREE.MeshBasicMaterial({ color: sparkColors[i % sparkColors.length] }))
          m.visible = false
          root.add(m)
          const a = -1.1 + (i / 9) * 2.2
          return { m, vx: Math.sin(a) * 1.1, vy: 1.55 + (i % 3) * 0.28, vz: 0.35, delay: (i % 4) * 0.05 }
        })

        const still = reduced()
        const t0 = performance.now()
        let raf = 0
        const ease = (x: number) => 1 - Math.pow(1 - x, 3)
        const easeBack = (x: number) => 1 + 2.4 * Math.pow(x - 1, 3) + 1.4 * Math.pow(x - 1, 2)
        const bell = (x: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, x)))
        const mix = (a: number, b: number, k: number) => a + (b - a) * k
        const idleMoves: Action[] = ['peek', 'tilt', 'chatter', 'hop', 'tip']

        const frame = (now: number) => {
          raf = requestAnimationFrame(frame)
          const t = (now - t0) / 1000
          const L = live.current
          const talking = !still && !L.leaving && now >= L.talkFrom && now < L.talkTo
          // Små ting når han venter: titter, vipper, klaprer med lokket, hopper, letter på «hatten»
          if (!still && now > L.nextIdle && !L.leaving && !talking) {
            L.action = idleMoves[Math.floor(Math.random() * idleMoves.length)]
            L.actionAt = now
            L.dir = 0
            L.nextIdle = now + DURATION[L.action] * 1000 + 3000 + Math.random() * 2500
          }
          const p = still ? 1 : Math.min(1, (now - L.actionAt) / 1000 / DURATION[L.action])
          const acting = p < 1

          // Grunnstilling: svev, vugg og pust
          let x = 0
          let y = still ? 0 : Math.sin(t * 2.2) * 0.06
          let yaw = still ? 0 : Math.sin(t * 1.3) * 0.25
          let pitch = 0
          let roll = still ? 0 : Math.sin(t * 1.7) * 0.04
          let squashY = 1 + (still ? 0 : Math.sin(t * 2.2 + 1) * 0.015)
          let armRz = L.mood === 'wave' ? 2.5 + Math.sin(t * 7) * 0.35 : L.mood === 'point' ? 1.05 + Math.sin(t * 3) * 0.08 : L.mood === 'cheer' ? 2.3 + Math.sin(t * 9) * 0.3 : 0.45 + Math.sin(t * 2) * 0.05
          let armLz = L.mood === 'cheer' ? -2.3 - Math.sin(t * 9 + 1) * 0.3 : -0.45 - Math.sin(t * 2) * 0.05
          let lookX = 0
          let legKick = 0
          let happy = L.mood === 'cheer'
          let wink = L.mood === 'wink'
          // Øyenbrynene: løft, og «bekymret» (indre ende opp)
          let browUp = 0
          let browWorry = 0
          // Lokket: vinkel (åpner seg som en munn) og løft rett opp
          let open = 0
          let lift = 0

          if (talking) {
            // Stavelser: lokket klaffer opp og ned i ujevn takt, som ekte prat – brynene følger litt med
            const k = (now - L.talkFrom) / 1000
            const syl = Math.max(0, Math.sin(k * 16)) * (0.55 + 0.45 * Math.sin(k * 5.3 + 1))
            open = 0.04 + syl * 0.3
            lift = syl * 0.02
            browUp = syl * 0.012
          } else if (L.mood === 'cheer' && !still) {
            open = Math.abs(Math.sin(t * 9)) * 0.22
          }

          if (acting) {
            switch (L.action) {
              case 'tip': {
                // Letter på lokket som en gentleman letter på hatten – og blunker
                const k = bell(p)
                armRz = mix(armRz, 2.7, k)
                lift = Math.max(lift, k * 0.16)
                open = Math.max(open, k * 0.3)
                pitch = k * 0.12
                wink = wink || k > 0.4
                browUp = Math.max(browUp, k * 0.02)
                break
              }
              case 'hop': {
                // To hopp med klem før og etter
                const q = (p * 2) % 1
                const air = q > 0.2 && q < 0.85 ? bell((q - 0.2) / 0.65) : 0
                y += air * 0.5
                squashY = q < 0.2 ? 1 - bell(q / 0.2) * 0.18 : q > 0.85 ? 1 - bell((q - 0.85) / 0.15) * 0.15 : 1 + air * 0.08
                armLz = -0.45 - air * 1.6
                armRz = Math.max(armRz, 0.45 + air * 1.6)
                legKick = air
                open = Math.max(open, air * 0.25)
                browUp = Math.max(browUp, air * 0.025)
                break
              }
              case 'flip': {
                // Salto bakover med sats og landing
                const air = p > 0.15 && p < 0.85 ? (p - 0.15) / 0.7 : p >= 0.85 ? 1 : 0
                y += bell(air) * 0.5
                pitch = -ease(air) * Math.PI * 2
                squashY = p < 0.15 ? 1 - bell(p / 0.15) * 0.2 : p > 0.85 ? 1 - bell((p - 0.85) / 0.15) * 0.18 : 1
                armLz = -0.45 - bell(air) * 2
                armRz = 0.45 + bell(air) * 2
                legKick = bell(air)
                open = Math.max(open, bell(air) * 0.35)
                browUp = Math.max(browUp, bell(air) * 0.03)
                break
              }
              case 'twirl': {
                // Piruett med armene ut og et lite hopp
                yaw += ease(p) * Math.PI * 2
                y += bell(p) * 0.25
                armLz = -0.45 - bell(p) * 1.1
                armRz = 0.45 + bell(p) * 1.1
                happy = happy || bell(p) > 0.3
                break
              }
              case 'look': {
                // Ser til venstre, så til høyre – øynene følger med, brynene løftes
                const k = Math.sin(p * Math.PI * 2) * bell(p)
                yaw += k * 0.65
                lookX = k * 0.035
                roll += k * 0.08
                browUp = Math.max(browUp, Math.abs(k) * 0.02)
                break
              }
              case 'dance': {
                // Fra side til side, lokket klaprer i takt
                const beat = Math.sin(p * Math.PI * 6)
                x = beat * 0.22 * bell(p)
                roll = -beat * 0.22 * bell(p)
                y += Math.abs(beat) * 0.12
                armLz = -0.45 - Math.max(0, beat) * 1.4
                armRz = 0.45 + Math.max(0, -beat) * 1.4
                legKick = Math.abs(beat) * 0.6
                open = Math.max(open, Math.abs(beat) * 0.22)
                happy = true
                break
              }
              case 'shrug': {
                // «Hmm, ikke ferdig ennå» – skuldrene opp, bekymrede bryn og hodet på skakke
                const k = bell(p)
                armLz = -0.45 - k * 1.9
                armRz = 0.45 + k * 1.9
                squashY = 1 - k * 0.08
                roll = k * 0.18
                lookX = -k * 0.03
                open = Math.max(open, k * 0.16)
                browWorry = k
                break
              }
              case 'present': {
                // Bukker, spretter opp og løfter lokket: «Voilà!» – gnister spruter ut. Så lukker han og peker.
                const crouch = p < 0.2 ? bell(p / 0.2) : 0
                const up = p < 0.2 ? 0 : p < 0.4 ? easeBack((p - 0.2) / 0.2) : p < 0.78 ? 1 : 1 - ease((p - 0.78) / 0.22)
                squashY = 1 - crouch * 0.15 + (p > 0.2 && p < 0.45 ? bell((p - 0.2) / 0.25) * 0.08 : 0)
                pitch = crouch * 0.18
                y += up * 0.12 + (p > 0.4 && p < 0.78 ? Math.sin(((p - 0.4) / 0.38) * Math.PI * 3) * 0.02 : 0)
                lift = Math.max(lift, up * 0.3)
                open = Math.max(open, up * 0.75)
                armRz = mix(armRz, 2.3, up)
                armLz = mix(armLz, -2.3, up)
                happy = happy || up > 0.3
                browUp = Math.max(browUp, up * 0.03)
                break
              }
              case 'peek': {
                const k = Math.sin(p * Math.PI * 2) * bell(p)
                lookX = k * 0.035
                yaw += k * 0.35
                break
              }
              case 'tilt': {
                roll += bell(p) * 0.22
                lookX = bell(p) * 0.025
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
          if (happy) browUp = Math.max(browUp, 0.02)

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

          // Inn: spretter opp fra ingenting. Ut: krymper.
          const pop = still ? 1 : Math.min(1, (now - t0) / 500)
          const s = L.leaving ? 0.85 : 0.2 + 0.8 * (1 - Math.pow(1 - pop, 3) * Math.cos(pop * 6))

          rig.position.set(x, y, 0)
          rig.rotation.set(pitch, yaw, roll)
          rig.scale.setScalar(Math.max(0.05, s))
          root.scale.set(1 + (1 - squashY) * 0.6, squashY, 1 + (1 - squashY) * 0.6)
          hinge.rotation.x = -open
          hinge.position.y = PY + lift
          armR.rotation.z = armRz
          armL.rotation.z = armLz
          legs[0].rotation.x = legKick * 0.5
          legs[1].rotation.x = -legKick * 0.5
          // Øynene blunker; glade øyne er buer, og ved «wink» er venstre øye en bue.
          // Brynet over monokkelen sitter litt høyere – han er tross alt en Sir.
          const blink = !still && t % 4.2 > 4.05 ? 0.12 : 1
          eyes.forEach((e, i) => {
            const arc = happy || (wink && i === 0)
            e.happy.visible = arc
            e.look.visible = !arc
            e.look.position.x = lookX
            e.look.scale.y = blink
            e.brow.position.copy(e.browBase).addScaledVector(e.browDir, browUp + (i === 1 ? 0.014 : 0) - (wink && i === 0 ? 0.012 : 0))
            e.tilt.rotation.z = e.s * browWorry * 0.3
          })
          renderer.render(scene, camera)
        }
        raf = requestAnimationFrame(frame)

        cleanup = () => {
          cancelAnimationFrame(raf)
          renderer.dispose()
          env.dispose()
          blush.dispose()
          scene.traverse((o) => {
            const m = o as InstanceType<typeof THREE.Mesh>
            if (m.geometry) m.geometry.dispose()
          })
          renderer.domElement.remove()
        }
      } catch {
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
