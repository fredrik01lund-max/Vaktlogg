// Reléet over internett: sensors mobil og storskjermen møtes i et «rom» med en kort kode, via offentlige
// tjenester uten konto. Brukes når presentasjonen ikke kjøres fra eksamenstjeneren, f.eks. fra GitHub Pages.
//
// Tre veier samtidig, så det holder at én av dem kommer gjennom nettet dere er på:
//  - to MQTT-meglere (HiveMQ og EMQX) over WebSocket med TLS, på port 8884 og 8084
//  - Yjs sin demotjener (y-websocket) på vanlig port 443, som også slipper gjennom nett som stenger andre porter.
//    Der sendes meldingene som «awareness»-tilstand, som tjeneren videresender til alle i samme rom.
// Hver melding sendes på alle veiene som er åpne; mottakeren sorterer bort duplikatene.
//
// Meldingene er demotilstanden til den fiktive restauranten – ingen personopplysninger. Rommet er en hash av koden.
//
// Samme fil ligger i Vaktlogg Experience (src/lib/rele.ts) og i prototypen (src/lib/rele.ts): hold dem like.

export const MEGLERE = ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt']
export const YJS = ['wss://demos.yjs.dev/ws/']

export type ReleMelding = { type: string; [k: string]: unknown }
export type Rele = {
  /** Sender på alle veier som er åpne. false: ingen er åpne akkurat nå. */
  send: (m: ReleMelding) => boolean
  /** Antall veier som er åpne og lytter i rommet. */
  apne: () => number
  lukk: () => void
}

/** Romkoden: små bokstaver og tall, uten tegn som lett forveksles (i, l, o, 0, 1). */
export const ROMTEGN = 'abcdefghjkmnpqrstuvwxyz23456789'
export const vaskKode = (k: string | null | undefined) => (k ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12)
export const lagKode = (n = 5) => Array.from({ length: n }, () => ROMTEGN[Math.floor(Math.random() * ROMTEGN.length)]).join('')

const enc = new TextEncoder()
const dec = new TextDecoder()

/** Rommet: en hash av koden, så koden selv ikke står i klartekst hos tjenestene. */
function emne(kode: string) {
  let a = 0x811c9dc5
  let b = 0x01000193
  for (const c of 'vaktlogg-experience:' + kode) {
    a = Math.imul(a ^ c.charCodeAt(0), 0x01000193) >>> 0
    b = Math.imul(b ^ c.charCodeAt(0), 0x5bd1e995) >>> 0
  }
  return 'vaktlogg-xp/' + a.toString(36) + b.toString(36)
}

// ── MQTT 3.1.1, bare det vi trenger: CONNECT, SUBSCRIBE, PUBLISH (QoS 0), PINGREQ ──
function lengde(n: number) {
  const ut: number[] = []
  do {
    let x = n % 128
    n = Math.floor(n / 128)
    if (n > 0) x |= 128
    ut.push(x)
  } while (n > 0)
  return ut
}
function tekst(s: string) {
  const u = enc.encode(s)
  const ut = new Uint8Array(u.length + 2)
  ut[0] = u.length >> 8
  ut[1] = u.length & 255
  ut.set(u, 2)
  return ut
}
function pakke(type: number, deler: Uint8Array[]) {
  const n = deler.reduce((s, d) => s + d.length, 0)
  const hode = [type, ...lengde(n)]
  const ut = new Uint8Array(hode.length + n)
  ut.set(hode, 0)
  let i = hode.length
  for (const d of deler) {
    ut.set(d, i)
    i += d.length
  }
  return ut
}
const CONNECT = (id: string) => pakke(0x10, [tekst('MQTT'), new Uint8Array([4, 2, 0, 30]), tekst(id)])
const SUBSCRIBE = (t: string) => pakke(0x82, [new Uint8Array([0, 1]), tekst(t), new Uint8Array([0])])
const PUBLISH = (t: string, data: string) => pakke(0x30, [tekst(t), enc.encode(data)])
const PINGREQ = new Uint8Array([0xc0, 0])

// ── y-websocket «awareness»: [varUint 1, varUint8Array([varUint antall, (varUint id, varUint klokke, varString json)…])] ──
function varUint(n: number) {
  const b: number[] = []
  while (n > 127) {
    b.push(128 | (n & 127))
    n = Math.floor(n / 128)
  }
  b.push(n)
  return b
}
function awareness(klient: number, klokke: number, json: string) {
  const s = enc.encode(json)
  const hode = [...varUint(1), ...varUint(klient), ...varUint(klokke), ...varUint(s.length)]
  const innhold = hode.length + s.length
  const ytre = [...varUint(1), ...varUint(innhold)]
  const ut = new Uint8Array(ytre.length + innhold)
  ut.set(ytre, 0)
  ut.set(hode, ytre.length)
  ut.set(s, ytre.length + hode.length)
  return ut
}
/** Leser tilstandene i en awareness-melding (andre meldingstyper, som Yjs-synkronisering, hoppes over). */
function lesAwareness(buf: Uint8Array): { id: number; json: string }[] {
  let i = 0
  const u = () => {
    let n = 0
    let m = 1
    for (;;) {
      if (i >= buf.length) throw new Error('kort')
      const b = buf[i++]
      n += (b & 127) * m
      m *= 128
      if (b < 128) return n
    }
  }
  try {
    if (u() !== 1) return []
    u()
    const antall = u()
    const ut: { id: number; json: string }[] = []
    for (let k = 0; k < antall; k++) {
      const id = u()
      u()
      const l = u()
      ut.push({ id, json: dec.decode(buf.subarray(i, i + l)) })
      i += l
    }
    return ut
  } catch {
    return []
  }
}

/** t: når meldingen ble sendt. Yjs-tjeneren gir en ny klient den siste tilstanden til alle i rommet idet den kobler
 *  til – en gammel melding derfra (f.eks. en nullstilling fra for lenge siden) skal ikke gjøres på nytt. */
type Pakke = { f: string; n: number; t?: number; m: ReleMelding }
const FOR_GAMMEL = 5000

type Vei = { klar: () => boolean; send: (data: string) => void; stopp: () => void }

/** Koble til rommet. paMelding får meldinger fra de andre (aldri ens egne), paTilkoblet kalles hver gang
 *  en vei er klar – da bør avsenderen sende alt på nytt, slik eksamenstjeneren ber om med «hei». */
export function kobleRele(kode: string, { paMelding, paTilkoblet }: { paMelding: (m: ReleMelding) => void; paTilkoblet?: () => void }): Rele {
  const tema = emne(kode)
  const meg = Math.random().toString(36).slice(2, 10)
  let nr = 0
  const sist = new Map<string, number>()
  let lukket = false

  function motta(data: string, gamleMulig = false) {
    let p: Pakke
    try {
      p = JSON.parse(data) as Pakke
    } catch {
      return
    }
    if (!p || p.f === meg || typeof p.n !== 'number' || !p.m || typeof p.m.type !== 'string') return
    // Bare der gamle meldinger kan dukke opp (rett etter at Yjs-veien har koblet til): da teller klokka
    if (gamleMulig && typeof p.t === 'number' && Date.now() - p.t > FOR_GAMMEL) return
    // Samme melding kommer fra hver vei: bare den første teller. Kommer en eldre melding av samme slag
    // etter en nyere (fra en tregere vei), hoppes den over, så skjermen aldri går baklengs.
    const nokkel = p.f + ':' + p.m.type
    if ((sist.get(nokkel) ?? 0) >= p.n) return
    sist.set(nokkel, p.n)
    paMelding(p.m)
  }

  /** Felles for alle veiene: koble til på nytt med økende ventetid, og sjekk forbindelsen når mobilen våkner. */
  function vei(url: string, protokoll: string | undefined, h: { apnet: (ws: WebSocket) => void; melding: (ws: WebSocket, data: ArrayBuffer) => void; sjekk: (ws: WebSocket, dod: () => void) => void }) {
    let ws: WebSocket | null = null
    let klar = false
    let venteTid = 1000
    const lukk = () => {
      try {
        ws?.close()
      } catch {
        /* allerede lukket */
      }
    }
    const koble = () => {
      if (lukket) return
      try {
        ws = protokoll ? new WebSocket(url, protokoll) : new WebSocket(url)
      } catch {
        window.setTimeout(koble, venteTid)
        return
      }
      const denne = ws
      denne.binaryType = 'arraybuffer'
      denne.onopen = () => h.apnet(denne)
      denne.onmessage = (e) => h.melding(denne, e.data as ArrayBuffer)
      denne.onclose = () => {
        if (ws !== denne) return
        klar = false
        ws = null
        if (lukket) return
        window.setTimeout(koble, venteTid)
        venteTid = Math.min(venteTid * 1.6, 8000)
      }
      denne.onerror = () => lukk()
    }
    const sjekkNa = () => ws && ws.readyState === 1 && h.sjekk(ws, lukk)
    const pingId = window.setInterval(sjekkNa, 20000)
    // Mobilen våkner: sjekk med en gang om forbindelsen fortsatt lever
    const synlig = () => document.visibilityState === 'visible' && sjekkNa()
    document.addEventListener('visibilitychange', synlig)
    koble()
    return {
      klarNa: () => {
        klar = true
        venteTid = 1000
        paTilkoblet?.()
      },
      ws: () => ws,
      klar: () => klar && ws?.readyState === 1,
      stopp: () => {
        clearInterval(pingId)
        document.removeEventListener('visibilitychange', synlig)
        lukk()
      },
    }
  }

  function mqtt(url: string): Vei {
    let buf = new Uint8Array(0)
    let ping = 0
    let pong = 0
    const v = vei(url, 'mqtt', {
      apnet: (ws) => {
        buf = new Uint8Array(0)
        ws.send(CONNECT('vx' + meg + Math.random().toString(36).slice(2, 6)))
      },
      melding: (ws, data) => {
        const ny = new Uint8Array(data)
        const samlet = new Uint8Array(buf.length + ny.length)
        samlet.set(buf, 0)
        samlet.set(ny, buf.length)
        buf = samlet
        // En WebSocket-ramme kan inneholde flere MQTT-pakker, eller bare en del av én
        for (;;) {
          if (buf.length < 2) return
          let n = 0
          let gang = 1
          let i = 1
          let b = 0
          do {
            if (i >= buf.length) return
            b = buf[i++]
            n += (b & 127) * gang
            gang *= 128
          } while (b & 128)
          if (buf.length < i + n) return
          const hode = buf[0]
          const kropp = buf.slice(i, i + n)
          buf = buf.slice(i + n)
          const type = hode >> 4
          if (type === 2) {
            // CONNACK
            if (kropp[1] === 0) ws.send(SUBSCRIBE(tema))
            else ws.close()
          } else if (type === 9) v.klarNa() // SUBACK: vi lytter i rommet
          else if (type === 3) {
            const tl = (kropp[0] << 8) | kropp[1]
            let j = 2 + tl
            if (((hode & 15) >> 1) & 3) j += 2
            motta(dec.decode(kropp.subarray(j)))
          } else if (type === 13) pong = Date.now()
        }
      },
      sjekk: (ws, dod) => {
        ping = Date.now()
        ws.send(PINGREQ)
        // Svarer ikke megleren, er forbindelsen død (f.eks. etter at mobilen har sovet): koble til på nytt
        window.setTimeout(() => pong < ping && dod(), 4000)
      },
    })
    return { klar: v.klar, send: (data) => v.ws()?.send(PUBLISH(tema, data)), stopp: v.stopp }
  }

  function yjs(base: string): Vei {
    // Klient-id og klokke slik Yjs vil ha dem: tjeneren videresender bare tilstander med høyere klokke enn sist
    const id = Math.floor(Math.random() * 0x7fffffff)
    let klokke = 0
    let ekko = 0
    let ping = 0
    let apnet = 0
    const v = vei(base + tema.replace('/', '-'), undefined, {
      apnet: () => {
        apnet = Date.now()
        v.klarNa()
      },
      melding: (_ws, data) => {
        const tidlig = Date.now() - apnet < 2500
        for (const t of lesAwareness(new Uint8Array(data))) {
          if (t.id === id) ekko = Date.now()
          else if (t.json !== 'null') motta(t.json, tidlig)
        }
      },
      sjekk: (ws, dod) => {
        // Tjeneren sender vår egen tilstand tilbake til oss også: det er svaret på pingen
        ping = Date.now()
        ws.send(awareness(id, ++klokke, JSON.stringify({ f: meg, n: 0, m: { type: 'ping' } })))
        window.setTimeout(() => ekko < ping && dod(), 5000)
      },
    })
    return { klar: v.klar, send: (data) => v.ws()?.send(awareness(id, ++klokke, data)), stopp: v.stopp }
  }

  const veier: Vei[] = [...MEGLERE.map(mqtt), ...YJS.map(yjs)]
  return {
    send(m) {
      const apne = veier.filter((x) => x.klar())
      if (!apne.length) return false
      const data = JSON.stringify({ f: meg, n: ++nr, t: Date.now(), m } satisfies Pakke)
      for (const x of apne) {
        try {
          x.send(data)
        } catch {
          /* forbindelsen ble borte akkurat nå */
        }
      }
      return true
    },
    apne: () => veier.filter((x) => x.klar()).length,
    lukk() {
      lukket = true
      veier.forEach((x) => x.stopp())
    },
  }
}
