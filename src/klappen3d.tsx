// Klappen i 3D: en myk, pastell filmklapper som svever, hopper, slår salto, danser og klapper.
// Three.js lastes først når guiden åpnes (egen bit av bygget), så resten av appen er like rask.
// Går det ikke (ingen WebGL), vises den flate Klappen i stedet.

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { reduced } from './lib/motion.ts'

export type Mood = 'wave' | 'point' | 'wink' | 'clap'
/** Det han gjør når han kommer til et nytt stopp. */
export type Move = 'hop' | 'flip' | 'twirl' | 'look' | 'dance' | 'shrug'

/** Størrelsen på lerretet (CSS-piksler). */
export const K3D_SIZE = 150

// Hvor lenge hver bevegelse varer (sekunder)
const DURATION: Record<Move | 'peek' | 'tilt' | 'wiggle', number> = { hop: 1.2, flip: 1, twirl: 1, look: 1.6, dance: 1.8, shrug: 1.1, peek: 1.4, tilt: 1.2, wiggle: 0.7 }
type Action = keyof typeof DURATION

type Live = { mood: Mood; leaving: boolean; action: Action; actionAt: number; dir: number; nextIdle: number }

export function Klappen3D({ mood, move, actionKey, dir = 0, leaving, fallback }: { mood: Mood; move: Move; actionKey: number; dir?: number; leaving: boolean; fallback: ReactNode }) {
  const host = useRef<HTMLDivElement>(null)
  const live = useRef<Live>({ mood, leaving, action: move, actionAt: performance.now(), dir, nextIdle: performance.now() + 4000 })
  const [flat, setFlat] = useState(false)
  live.current.mood = mood
  live.current.leaving = leaving

  // Nytt stopp: en ny bevegelse, og han lener seg i retningen han flyr
  useEffect(() => {
    const L = live.current
    L.action = move
    L.actionAt = performance.now()
    L.dir = dir
    L.nextIdle = L.actionAt + DURATION[move] * 1000 + 2500
  }, [actionKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let stop = false
    let cleanup = () => {}
    ;(async () => {
      try {
        const THREE = await import('three')
        const { RoundedBoxGeometry } = await import('three/addons/geometries/RoundedBoxGeometry.js')
        if (stop || !host.current) return
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
        renderer.setPixelRatio(dpr)
        renderer.setSize(K3D_SIZE, K3D_SIZE)
        renderer.outputColorSpace = THREE.SRGBColorSpace
        host.current.appendChild(renderer.domElement)

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50)
        camera.position.set(0, 0.2, 4.9)
        camera.lookAt(0, 0.05, 0)
        scene.add(new THREE.HemisphereLight(0xfff8f0, 0xf6bfd2, 1.9))
        const sun = new THREE.DirectionalLight(0xffffff, 1.5)
        sun.position.set(-2.5, 3, 4)
        scene.add(sun)

        // Striper på klapperen (plomme og krem, på skrå)
        const stripes = (() => {
          const c = document.createElement('canvas')
          c.width = 256
          c.height = 64
          const g = c.getContext('2d')!
          g.fillStyle = '#FFF4EA'
          g.fillRect(0, 0, 256, 64)
          g.fillStyle = '#6E2A3C'
          for (let x = -64; x < 300; x += 48) {
            g.beginPath()
            g.moveTo(x, 64)
            g.lineTo(x + 24, 64)
            g.lineTo(x + 52, 0)
            g.lineTo(x + 28, 0)
            g.closePath()
            g.fill()
          }
          const t = new THREE.CanvasTexture(c)
          t.colorSpace = THREE.SRGBColorSpace
          t.anisotropy = 4
          return t
        })()

        const soft = (color: string, rough = 0.55) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 })
        const pinkLimb = soft('#F29BBD', 0.5)
        const ink = soft('#4A1B2A', 0.35)
        const white = soft('#FFFFFF', 0.25)

        // rig: posisjon og spinn · root: klem/strekk rundt føttene
        const rig = new THREE.Group()
        scene.add(rig)
        const root = new THREE.Group()
        rig.add(root)

        // Kroppen: avrundet boks i fersken, med stripebåndet øverst
        root.add(new THREE.Mesh(new RoundedBoxGeometry(1.42, 1.08, 0.62, 6, 0.2), soft('#FFD2C6', 0.6)))
        const bandMat = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.5 })
        const band = new THREE.Mesh(new RoundedBoxGeometry(1.46, 0.24, 0.66, 4, 0.08), bandMat)
        band.position.y = 0.42
        root.add(band)

        // Klapperstangen: hengslet til venstre
        const hinge = new THREE.Group()
        hinge.position.set(-0.66, 0.6, 0)
        root.add(hinge)
        const stick = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.2, 0.5, 4, 0.07), bandMat)
        stick.position.x = 0.74
        hinge.add(stick)
        const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.56, 16), ink)
        pin.rotation.x = Math.PI / 2
        hinge.add(pin)

        // Ansiktet på forsiden – pupillene kan se til siden
        const front = 0.31
        const eyes: InstanceType<typeof THREE.Group>[] = []
        const pupils: InstanceType<typeof THREE.Group>[] = []
        for (const x of [-0.3, 0.3]) {
          const eye = new THREE.Group()
          eye.position.set(x, -0.04, front)
          const ball = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16), white)
          ball.scale.set(1, 1.12, 0.45)
          const look = new THREE.Group()
          const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), ink)
          pupil.scale.set(1, 1.05, 0.5)
          pupil.position.set(0.02, -0.01, 0.05)
          const shine = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 8), white)
          shine.position.set(0.05, 0.04, 0.1)
          look.add(pupil, shine)
          eye.add(ball, look)
          root.add(eye)
          eyes.push(eye)
          pupils.push(look)
        }
        const cheekMat = new THREE.MeshBasicMaterial({ color: '#F07FA6', transparent: true, opacity: 0.5 })
        for (const x of [-0.5, 0.5]) {
          const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), cheekMat)
          cheek.scale.set(1.4, 0.8, 1)
          cheek.position.set(x, -0.27, front + 0.005)
          root.add(cheek)
        }
        const smile = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.024, 10, 24, Math.PI), ink)
        smile.rotation.z = Math.PI
        smile.position.set(0, -0.22, front + 0.01)
        const open = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24, Math.PI, Math.PI), ink)
        open.position.set(0, -0.2, front + 0.01)
        const oh = new THREE.Mesh(new THREE.CircleGeometry(0.065, 20), ink)
        oh.scale.set(0.85, 1.1, 1)
        oh.position.set(0, -0.23, front + 0.01)
        root.add(smile, open, oh)

        // Armer og bein
        const limb = (len: number) => new THREE.Mesh(new THREE.CapsuleGeometry(0.085, len, 6, 12), pinkLimb)
        const arm = (x: number) => {
          const g = new THREE.Group()
          g.position.set(x, -0.08, 0)
          const m = limb(0.3)
          m.position.y = -0.2
          g.add(m)
          root.add(g)
          return g
        }
        const armL = arm(-0.72)
        const armR = arm(0.72)
        const legs = [-0.28, 0.28].map((x) => {
          const leg = limb(0.16)
          leg.position.set(x, -0.7, 0)
          root.add(leg)
          return leg
        })

        const still = reduced()
        const t0 = performance.now()
        let raf = 0
        const ease = (x: number) => 1 - Math.pow(1 - x, 3)
        const bell = (x: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, x)))
        const idleMoves: Action[] = ['peek', 'tilt', 'wiggle', 'hop']

        const frame = (now: number) => {
          raf = requestAnimationFrame(frame)
          const t = (now - t0) / 1000
          const L = live.current
          // Små tilfeldige ting når han står stille: titter, vipper hodet, vrikker på stangen, hopper
          if (!still && now > L.nextIdle && !L.leaving) {
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
          let clapAmt = 0
          let armRz = L.mood === 'wave' ? 2.5 + Math.sin(t * 7) * 0.35 : L.mood === 'point' ? 0.95 + Math.sin(t * 3) * 0.08 : 0.5 + Math.sin(t * 2) * 0.05
          let armLz = -0.5 - Math.sin(t * 2) * 0.05
          let lookX = 0
          let mouth: 'smile' | 'open' | 'oh' = L.mood === 'point' || L.mood === 'wink' ? 'smile' : 'open'
          let legKick = 0

          if (acting) {
            switch (L.action) {
              case 'hop': {
                // To hopp med klem før og etter
                const q = (p * 2) % 1
                const air = q > 0.2 && q < 0.85 ? bell((q - 0.2) / 0.65) : 0
                y += air * 0.55
                squashY = q < 0.2 ? 1 - bell(q / 0.2) * 0.18 : q > 0.85 ? 1 - bell((q - 0.85) / 0.15) * 0.15 : 1 + air * 0.08
                armLz = -0.5 - air * 1.6
                armRz = Math.max(armRz, 0.5 + air * 1.6)
                legKick = air
                mouth = 'open'
                break
              }
              case 'flip': {
                // Salto bakover med sats og landing
                const air = p > 0.15 && p < 0.85 ? (p - 0.15) / 0.7 : p >= 0.85 ? 1 : 0
                y += bell(air) * 0.75
                pitch = -ease(air) * Math.PI * 2
                squashY = p < 0.15 ? 1 - bell(p / 0.15) * 0.2 : p > 0.85 ? 1 - bell((p - 0.85) / 0.15) * 0.18 : 1
                armLz = -0.5 - bell(air) * 2
                armRz = 0.5 + bell(air) * 2
                legKick = bell(air)
                mouth = 'oh'
                break
              }
              case 'twirl': {
                // Piruett med armene ut og et lite hopp
                yaw += ease(p) * Math.PI * 2
                y += bell(p) * 0.25
                armLz = -0.5 - bell(p) * 1.1
                armRz = 0.5 + bell(p) * 1.1
                clapAmt = bell((p - 0.6) / 0.4)
                break
              }
              case 'look': {
                // Ser til venstre, så til høyre – øynene følger med
                const k = Math.sin(p * Math.PI * 2) * bell(p)
                yaw += k * 0.65
                lookX = k * 0.06
                roll += k * 0.08
                break
              }
              case 'dance': {
                // Fra side til side, klapper i takt
                const beat = Math.sin(p * Math.PI * 6)
                x = beat * 0.22 * bell(p)
                roll = -beat * 0.22 * bell(p)
                y += Math.abs(beat) * 0.12
                clapAmt = Math.abs(Math.sin(p * Math.PI * 6))
                armLz = -0.5 - Math.max(0, beat) * 1.4
                armRz = 0.5 + Math.max(0, -beat) * 1.4
                legKick = Math.abs(beat) * 0.6
                mouth = 'open'
                break
              }
              case 'shrug': {
                // «Hmm, ikke ferdig ennå» – skuldrene opp og hodet på skakke
                const k = bell(p)
                armLz = -0.5 - k * 1.9
                armRz = 0.5 + k * 1.9
                squashY = 1 - k * 0.08
                roll = k * 0.18
                lookX = -k * 0.05
                mouth = 'oh'
                break
              }
              case 'peek': {
                const k = Math.sin(p * Math.PI * 2) * bell(p)
                lookX = k * 0.06
                yaw += k * 0.35
                break
              }
              case 'tilt': {
                roll += bell(p) * 0.22
                lookX = bell(p) * 0.04
                break
              }
              case 'wiggle': {
                clapAmt = Math.abs(Math.sin(p * Math.PI * 4))
                break
              }
            }
            // Han lener seg i retningen han flyr (bare i starten av et nytt stopp)
            roll += -L.dir * 0.4 * Math.max(0, 1 - p * 2.5)
          }
          if (L.mood === 'clap') clapAmt = Math.max(clapAmt, Math.abs(Math.sin(t * 9)))

          // Inn: spretter opp fra ingenting. Ut: krymper.
          const pop = still ? 1 : Math.min(1, (now - t0) / 500)
          const s = L.leaving ? 0.85 : 0.2 + 0.8 * (1 - Math.pow(1 - pop, 3) * Math.cos(pop * 6))

          rig.position.set(x, y, 0)
          rig.rotation.set(pitch, yaw, roll)
          rig.scale.setScalar(Math.max(0.05, s))
          root.scale.set(1 + (1 - squashY) * 0.6, squashY, 1 + (1 - squashY) * 0.6)
          hinge.rotation.z = 0.32 - clapAmt * 0.32
          armR.rotation.z = armRz
          armL.rotation.z = armLz
          legs[0].rotation.x = legKick * 0.5
          legs[1].rotation.x = -legKick * 0.5
          for (const pl of pupils) pl.position.x = lookX
          // Øynene blunker; ved «wink» er venstre øye lukket
          const blink = !still && t % 4.2 > 4.05 ? 0.12 : 1
          eyes[0].scale.y = L.mood === 'wink' && !acting ? 0.12 : blink
          eyes[1].scale.y = blink
          smile.visible = mouth === 'smile'
          open.visible = mouth === 'open'
          oh.visible = mouth === 'oh'
          renderer.render(scene, camera)
        }
        raf = requestAnimationFrame(frame)

        cleanup = () => {
          cancelAnimationFrame(raf)
          renderer.dispose()
          stripes.dispose()
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
