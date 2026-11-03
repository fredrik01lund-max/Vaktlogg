// Speiling til storskjermen (eksamen): sensor trykker på en ekte mobil, og det samme vises i prototypen på
// storskjermen. Mobilen åpnes med ?speil=send, storskjermen med ?speil=vis. Begge kobler seg til en liten
// WebSocket-tjener på presentasjons-PC-en (Vaktlogg Experience: npm run eksamen) over det lokale nettet –
// ingen internett. Uten tjener (f.eks. på GitHub Pages) virker appen som vanlig.
//
// ?sensor: Sir Domeos egen omvisning for sensor (fem stopp, med stemme).

type Melding = { type: string; [k: string]: unknown }
type Lytter = (m: Melding) => void

const p = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
export const SPEIL = (p.get('speil') as 'send' | 'vis' | null) ?? null
export const SENSOR = p.has('sensor')

let ws: WebSocket | null = null
const lyttere = new Set<Lytter>()
let ko: Melding[] = []

function koble() {
  if (!SPEIL || !window.location.protocol.startsWith('http')) return
  try {
    ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/speil`)
  } catch {
    return
  }
  ws.onopen = () => {
    const venter = ko
    ko = []
    venter.forEach(sendSpeil)
    if (SPEIL === 'vis') {
      // Presentasjonen ber om ny demo (?nullstill=n): mobilen starter omvisningen på nytt – én gang per n
      const n = p.get('nullstill')
      if (n && sessionStorage.getItem('speil-nullstilt') !== n) {
        sessionStorage.setItem('speil-nullstilt', n)
        sendSpeil({ type: 'nullstill' })
      }
      sendSpeil({ type: 'hei' })
    }
  }
  ws.onmessage = (e) => {
    try {
      const m = JSON.parse(String(e.data)) as Melding
      lyttere.forEach((f) => f(m))
    } catch {
      /* ikke vår melding */
    }
  }
  // Mister vi forbindelsen (f.eks. mobilen låser seg), prøver vi igjen
  ws.onclose = () => {
    ws = null
    window.setTimeout(koble, 1500)
  }
}
if (SPEIL) koble()

/** Send til de andre (avsenderen sender tilstand, storskjermen sender bare «hei» og «nullstill»). */
export function sendSpeil(m: Melding) {
  if (!SPEIL) return
  if (ws?.readyState === 1) ws.send(JSON.stringify(m))
  else if (m.type !== 'klokke') ko = [...ko.filter((x) => x.type !== m.type), m]
}

export function paSpeil(f: Lytter) {
  lyttere.add(f)
  return () => {
    lyttere.delete(f)
  }
}

/** Storskjermen har fått tilstand fra mobilen: den viser bare det som skjer der, uten egen avspilling. */
export let speilAktiv = false
export const settSpeilAktiv = () => {
  speilAktiv = true
}

/** Sir Domeo sier en replikk: i presentasjonen spilles stemmen av storskjermen (forelder-vinduet),
 *  ellers av appen selv – men aldri av mobilen sensor holder (den sender bare). */
let lyd: HTMLAudioElement | null = null
export function si(id: string | null) {
  if (SPEIL === 'send') return
  if (window.parent !== window) {
    window.parent.postMessage({ vaktloggDomeo: id }, '*')
    return
  }
  lyd?.pause()
  lyd = null
  if (!id) return
  lyd = new Audio(`domeo/${id}.mp3`)
  lyd.play().catch(() => {
    /* nettleseren krever et trykk først – teksten står i boblen */
  })
}
