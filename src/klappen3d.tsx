// Klappen i 3D: en myk, pastell filmklapper som svever, spinner, klapper og vinker.
// Three.js lastes først når guiden åpnes (egen bit av bygget), så resten av appen er like rask.
// Går det ikke (ingen WebGL), vises den flate Klappen i stedet.

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { reduced } from './lib/motion.ts'

export type Mood = 'wave' | 'point' | 'wink' | 'clap'

/** Størrelsen på lerretet (CSS-piksler). Figuren fyller omtrent 70 % av det. */
export const K3D_SIZE = 150

type Live = { mood: Mood; spinAt: number; leaving: boolean }

export function Klappen3D({ mood, spinKey, leaving, fallback }: { mood: Mood; spinKey: number; leaving: boolean; fallback: ReactNode }) {
  const host = useRef<HTMLDivElement>(null)
  const live = useRef<Live>({ mood, spinAt: performance.now(), leaving })
  const [flat, setFlat] = useState(false)
  live.current.mood = mood
  live.current.leaving = leaving

  // Hvert nytt stopp: en runde rundt seg selv og et klapp
  useEffect(() => {
    live.current.spinAt = performance.now()
  }, [spinKey])

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

        const root = new THREE.Group()
        scene.add(root)

        // Kroppen: avrundet boks i fersken, med stripebåndet øverst
        const body = new THREE.Mesh(new RoundedBoxGeometry(1.42, 1.08, 0.62, 6, 0.2), soft('#FFD2C6', 0.6))
        root.add(body)
        const bandMat = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.5 })
        const band = new THREE.Mesh(new RoundedBoxGeometry(1.46, 0.24, 0.66, 4, 0.08), bandMat)
        band.position.y = 0.42
        root.add(band)

        // Klapperstangen: hengslet til venstre, åpen – klapper igjen ved hvert stopp
        const hinge = new THREE.Group()
        hinge.position.set(-0.66, 0.6, 0)
        root.add(hinge)
        const stick = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.2, 0.5, 4, 0.07), bandMat)
        stick.position.x = 0.74
        hinge.add(stick)
        const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.56, 16), ink)
        pin.rotation.x = Math.PI / 2
        hinge.add(pin)

        // Ansiktet på forsiden
        const front = 0.31
        const eyes: InstanceType<typeof THREE.Group>[] = []
        for (const x of [-0.3, 0.3]) {
          const eye = new THREE.Group()
          eye.position.set(x, -0.04, front)
          const ball = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16), white)
          ball.scale.set(1, 1.12, 0.45)
          const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), ink)
          pupil.scale.set(1, 1.05, 0.5)
          pupil.position.set(0.02, -0.01, 0.05)
          const shine = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 8), white)
          shine.position.set(0.05, 0.04, 0.1)
          eye.add(ball, pupil, shine)
          root.add(eye)
          eyes.push(eye)
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
        root.add(smile, open)

        // Armer og bein
        const limb = (len: number) => new THREE.Mesh(new THREE.CapsuleGeometry(0.085, len, 6, 12), pinkLimb)
        const armL = new THREE.Group()
        armL.position.set(-0.72, -0.08, 0)
        const al = limb(0.3)
        al.position.y = -0.2
        armL.add(al)
        armL.rotation.z = -0.5
        const armR = new THREE.Group()
        armR.position.set(0.72, -0.08, 0)
        const ar = limb(0.3)
        ar.position.y = -0.2
        armR.add(ar)
        root.add(armL, armR)
        for (const x of [-0.28, 0.28]) {
          const leg = limb(0.16)
          leg.position.set(x, -0.7, 0)
          root.add(leg)
        }

        const still = reduced()
        const t0 = performance.now()
        let raf = 0
        const ease = (x: number) => 1 - Math.pow(1 - x, 3)
        const frame = (now: number) => {
          raf = requestAnimationFrame(frame)
          const t = (now - t0) / 1000
          const L = live.current
          const since = (now - L.spinAt) / 1000
          // Spinn: én runde på 0,8 s ved hvert stopp (eller trykk)
          const spin = !still && since < 0.8 ? ease(since / 0.8) * Math.PI * 2 : 0
          const sway = still ? 0 : Math.sin(t * 1.3) * 0.28
          root.rotation.y = sway + spin
          root.rotation.z = still ? 0 : Math.sin(t * 1.7) * 0.05
          root.position.y = still ? 0 : Math.sin(t * 2.2) * 0.07
          // Inn: spretter opp fra ingenting. Ut: krymper og spinner bort.
          const pop = still ? 1 : Math.min(1, (now - t0) / 500)
          const s = L.leaving ? 0.85 : 0.2 + 0.8 * (1 - Math.pow(1 - pop, 3) * Math.cos(pop * 6))
          root.scale.setScalar(Math.max(0.05, s))
          // Klapperstangen: åpen, klapper igjen like etter hvert spinn
          const clap = since > 0.55 && since < 0.95 ? Math.sin(((since - 0.55) / 0.4) * Math.PI) : 0
          hinge.rotation.z = 0.32 - clap * 0.32 + (L.mood === 'clap' ? Math.abs(Math.sin(t * 9)) * 0.25 : 0)
          // Armene: vinke, peke ned mot knappen, eller hvile
          if (L.mood === 'wave') armR.rotation.z = 2.5 + Math.sin(t * 7) * 0.35
          else if (L.mood === 'point') armR.rotation.z = 0.95 + Math.sin(t * 3) * 0.08
          else armR.rotation.z = 0.5 + Math.sin(t * 2) * 0.05
          armL.rotation.z = -0.5 - Math.sin(t * 2) * 0.05
          // Øynene blunker; ved «wink» er det venstre øyet lukket
          const blink = !still && t % 4.2 > 4.05 ? 0.12 : 1
          eyes[0].scale.y = L.mood === 'wink' ? 0.12 : blink
          eyes[1].scale.y = blink
          smile.visible = L.mood === 'point' || L.mood === 'wink'
          open.visible = !smile.visible
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
