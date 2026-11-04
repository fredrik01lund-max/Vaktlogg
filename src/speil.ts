// Speiling til storskjermen (eksamen): sensor trykker på en ekte mobil, og det samme vises i prototypen på
// storskjermen. Mobilen åpnes med ?speil=send, storskjermen med ?speil=vis. To måter å møtes på:
//
//  - Uten rom: begge kobler seg til en liten WebSocket-tjener på presentasjons-PC-en (Vaktlogg Experience:
//    npm run eksamen) over det lokale nettet – uten internett.
//  - Med ?rom=<kode>: begge møtes via reléet over internett (lib/rele.ts). Slik virker det fra GitHub Pages:
//    mobilen åpner presentasjonens /s/ og skriver inn koden fra presentatørvisningen.
//
// Uten speil virker appen som vanlig. ?sensor: Sir Domeos egen omvisning for sensor (fem stopp, med stemme).

import { kobleRele, vaskKode, type Rele } from './lib/rele.ts'

type Melding = { type: string; [k: string]: unknown }
type Lytter = (m: Melding) => void

const p = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
export const SPEIL = (p.get('speil') as 'send' | 'vis' | null) ?? null
export const SENSOR = p.has('sensor')
/** Romkoden når speilingen går via reléet over internett (ellers null: eksamenstjeneren). */
export const ROM = vaskKode(p.get('rom')) || null

let ws: WebSocket | null = null
let rele: Rele | null = null
const lyttere = new Set<Lytter>()
let ko: Melding[] = []

// Ny demo (?nullstill=n fra presentasjonen): mobilen starter omvisningen på nytt – én gang per n. Storskjermen
// sier det idet den kobler seg til, og gjentar det noen ganger de første sekundene, så det kommer frem selv om
// én melding går tapt. Mobilen husker hvilke n den har startet på nytt for, så gjentakelsene er ufarlige.
// Lastes storskjermen på nytt med samme n (F5 midt i demoen), sendes ingenting: sensors omvisning får gå videre.
const NULLSTILL = SPEIL === 'vis' ? p.get('nullstill') : null
let nullstillNa = false
try {
  nullstillNa = !!NULLSTILL && sessionStorage.getItem('speil-nullstilt') !== NULLSTILL
  if (nullstillNa) sessionStorage.setItem('speil-nullstilt', NULLSTILL!)
} catch {
  nullstillNa = !!NULLSTILL
}
const LASTET = Date.now()
const sendNullstill = () => {
  if (nullstillNa && Date.now() - LASTET < 15000) sendSpeil({ type: 'nullstill', n: NULLSTILL })
}

/** Storskjermen har nettopp koblet seg til: be mobilen om alt (og start omvisningen på nytt én gang per demo). */
let gjentar = false
function heiFraStorskjermen() {
  sendNullstill()
  if (nullstillNa && !gjentar) {
    gjentar = true
    window.setTimeout(sendNullstill, 2500)
    window.setTimeout(sendNullstill, 6000)
  }
  sendSpeil({ type: 'hei' })
}

/** Mobilen: skal denne nullstillingen gjøres? (Ikke hvis den allerede er gjort for samme n.) */
export function skalNullstilles(m: Melding) {
  const n = m.n == null ? null : String(m.n)
  if (n === null) return true
  try {
    if (sessionStorage.getItem('speil-nullstill-mottatt') === n) return false
    sessionStorage.setItem('speil-nullstill-mottatt', n)
  } catch {
    /* uten lagring: nullstill */
  }
  return true
}

function tilkoblet() {
  const venter = ko
  ko = []
  venter.forEach(sendSpeil)
  if (SPEIL === 'vis') heiFraStorskjermen()
}

function koble() {
  if (!SPEIL || !window.location.protocol.startsWith('http')) return
  try {
    ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/speil`)
  } catch {
    return
  }
  ws.onopen = tilkoblet
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

// ── Mobilen via reléet: finner den storskjermen? ──
// Presentasjonen sier «skjerm» hvert 3. sekund i rommet (og prototypen på storskjermen sier «hei»).
// Hører mobilen ingenting, er koden feil eller PC-en uten nett – det vises øverst på mobilen (SpeilMerke).
export type SpeilStatus = { rele: boolean; skjerm: boolean; startet: number }
let speilStatus: SpeilStatus = { rele: false, skjerm: false, startet: Date.now() }
let sistSkjerm = 0
const statusLyttere = new Set<() => void>()
function oppdaterStatus() {
  const ny = { ...speilStatus, rele: (rele?.apne() ?? 0) > 0, skjerm: Date.now() - sistSkjerm < 7000 }
  if (ny.rele === speilStatus.rele && ny.skjerm === speilStatus.skjerm) return
  speilStatus = ny
  statusLyttere.forEach((f) => f())
}
export function paSpeilStatus(f: () => void) {
  statusLyttere.add(f)
  return () => {
    statusLyttere.delete(f)
  }
}
export const hentSpeilStatus = () => speilStatus

function kobleViaRele(kode: string) {
  rele = kobleRele(kode, {
    paMelding: (m) => {
      if (m.type === 'skjerm' || m.type === 'hei') {
        sistSkjerm = Date.now()
        oppdaterStatus()
      }
      lyttere.forEach((f) => f(m))
    },
    paTilkoblet: () => {
      tilkoblet()
      oppdaterStatus()
      // Mobilen sender alt den viser på nytt hver gang den (gjen)oppretter forbindelsen – som når
      // eksamenstjeneren sier «hei» til en ny tilkobling
      if (SPEIL === 'send') lyttere.forEach((f) => f({ type: 'hei' }))
    },
  })
  // Pulsen forteller presentasjonen at mobilen er koblet til (vises i presentatørvisningen)
  if (SPEIL === 'send') window.setInterval(() => sendSpeil({ type: 'puls' }), 3000)
  window.setInterval(oppdaterStatus, 1000)
}

if (SPEIL && typeof window !== 'undefined') {
  if (ROM) kobleViaRele(ROM)
  else koble()
}

/** Send til de andre (avsenderen sender tilstand, storskjermen sender bare «hei» og «nullstill»). */
export function sendSpeil(m: Melding) {
  if (!SPEIL) return
  const sendt = rele ? rele.send(m) : ws?.readyState === 1 ? (ws.send(JSON.stringify(m)), true) : false
  // Klokke og puls er gamle før de kommer frem, og en nullstilling som venter, kunne nådd mobilen midt i omvisningen
  if (!sendt && m.type !== 'klokke' && m.type !== 'puls' && m.type !== 'nullstill') ko = [...ko.filter((x) => x.type !== m.type), m]
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
